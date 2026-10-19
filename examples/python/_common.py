# Copyright 2026 Quantova Inc
# SPDX-License-Identifier: Apache-2.0 OR MIT

import hashlib
import json
import os
import re
import stat
import sys
import time

if sys.version_info < (3, 11):
    raise SystemExit("error the examples need Python 3.11 or later")

from quantova_qcore import Client, Network, valid_address, validity_blocks

NETWORK = Network.testnet()
GATEWAY = os.environ.get("QUANTOVA_GATEWAY", NETWORK.rpc_url).rstrip("/")
QSTAMP_CONTRACT = "Q1D6TZFRL203P3DFAFVUPZUHGUCM4EWGH6063XNS42VA5235RNQWXS7FXEWX"
QUON = 1_000_000
DEFAULT_PIN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "finality-pin.json")
SEED_FILE_MAX = 80
PIN_FILE_MAX = 4 * 1024 * 1024
PRINT_MAX = 96
UNCONFIRMED_EXIT = 3
PRINT_TABLE = ((0x0, 0x8, 2), (0x9, 0xd, 1), (0xe, 0x1b, 2), (0x1c, 0x20, 1), (0x7f, 0x84, 2), (0x85, 0x85, 1), (0x86, 0x9f, 2), (0xa0, 0xa0, 1), (0xad, 0xad, 2), (0x300, 0x34e, 3), (0x34f, 0x34f, 2), (0x350, 0x36f, 3), (0x483, 0x489, 3), (0x600, 0x605, 2), (0x61c, 0x61c, 2), (0x6dd, 0x6dd, 2), (0x70f, 0x70f, 2), (0x890, 0x891, 2), (0x8e2, 0x8e2, 2), (0x115f, 0x1160, 1), (0x1680, 0x1680, 1), (0x17b4, 0x17b5, 2), (0x180b, 0x180d, 2), (0x180e, 0x180e, 1), (0x180f, 0x180f, 2), (0x1ab0, 0x1aff, 3), (0x1dc0, 0x1dff, 3), (0x2000, 0x200a, 1), (0x200b, 0x200f, 2), (0x2028, 0x2029, 1), (0x202a, 0x202e, 2), (0x202f, 0x202f, 1), (0x205f, 0x205f, 1), (0x2060, 0x206f, 2), (0x20d0, 0x20ff, 3), (0x2800, 0x2800, 1), (0x3000, 0x3000, 1), (0x3164, 0x3164, 1), (0xd800, 0xf8ff, 2), (0xfdd0, 0xfdef, 2), (0xfe00, 0xfe0f, 2), (0xfe20, 0xfe2f, 3), (0xfeff, 0xfeff, 2), (0xffa0, 0xffa0, 1), (0xfff0, 0xffff, 2), (0x110bd, 0x110bd, 2), (0x110cd, 0x110cd, 2), (0x13430, 0x1345f, 2), (0x1bca0, 0x1bca3, 2), (0x1d165, 0x1d169, 3), (0x1d16d, 0x1d172, 3), (0x1d173, 0x1d17a, 2), (0x1d17b, 0x1d182, 3), (0x1d185, 0x1d18b, 3), (0x1d1aa, 0x1d1ad, 3), (0x1fffe, 0x1ffff, 2), (0x2fffe, 0x2ffff, 2), (0x3fffe, 0x3ffff, 2), (0x4fffe, 0x4ffff, 2), (0x5fffe, 0x5ffff, 2), (0x6fffe, 0x6ffff, 2), (0x7fffe, 0x7ffff, 2), (0x8fffe, 0x8ffff, 2), (0x9fffe, 0x9ffff, 2), (0xafffe, 0xaffff, 2), (0xbfffe, 0xbffff, 2), (0xcfffe, 0xcffff, 2), (0xdfffe, 0xe0fff, 2), (0xf0000, 0x10ffff, 2))
OPEN_FLAGS = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_NONBLOCK", 0) | getattr(os, "O_CLOEXEC", 0)
ACCEPT_UNCONFIRMED = "--accept-unconfirmed" in sys.argv[1:] or os.environ.get("QUANTOVA_ACCEPT_UNCONFIRMED") == "1"
SEND_AGAIN = "--send-again" in sys.argv[1:]
OPTIONS = ("--accept-unconfirmed", "--send-again")
BECH32 = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"
_ENFORCED = {}


class Unconfirmed(Exception):
    pass


class Unsigned(Exception):
    pass


def _print_kind(cp):
    lo, hi = 0, len(PRINT_TABLE) - 1
    while lo <= hi:
        mid = (lo + hi) >> 1
        row = PRINT_TABLE[mid]
        if cp < row[0]:
            hi = mid - 1
        elif cp > row[1]:
            lo = mid + 1
        else:
            return row[2]
    return 0


def printable(value, limit=PRINT_MAX):
    try:
        text = str(value)
    except Exception:
        text = "?"
    out = []
    marks = 0
    for ch in text:
        kind = _print_kind(ord(ch))
        if kind == 1:
            if out and out[-1] != " ":
                out.append(" ")
            marks = 0
            continue
        if kind == 2:
            continue
        if kind == 3:
            marks += 1
            if marks > 2:
                continue
        else:
            marks = 0
        out.append(ch)
    while out and out[-1] == " ":
        out.pop()
    return "".join(out) if len(out) <= limit else "".join(out[: limit - 3]) + "..."


def check_options(positional=False):
    for arg in sys.argv[1:]:
        if (arg not in OPTIONS) if arg.startswith("--") else not positional:
            raise ValueError(f"unknown option {printable(arg)}, the options are --accept-unconfirmed and --send-again")


def public_chain(name):
    return isinstance(name, str) and re.match(r"Q-(test|main)-net-", name) is not None


def height(value, label):
    if isinstance(value, bool) or not isinstance(value, int) or value < 0 or value > 2**53 - 1:
        raise RuntimeError(f"the gateway reported a {label} that is not a whole number")
    return value


def chain_id():
    return os.environ.get("QUANTOVA_CHAIN") or NETWORK.chain_id


def connect():
    chain = chain_id()
    pin = finality_pin()
    pinned = pin["genesis_hash"] if pin else None
    built_in = getattr(NETWORK, "genesis_hash", None) if chain == NETWORK.chain_id else None
    built_in = built_in.lower() if isinstance(built_in, str) else None
    if pinned and built_in and pinned != built_in:
        raise ValueError(f"the finality pin names genesis {pinned} but QCore.py carries genesis {built_in} for {printable(chain)}, refusing to sign for either")
    genesis = pinned or built_in
    name = NETWORK.name if GATEWAY == NETWORK.rpc_url and chain == NETWORK.chain_id else "custom"
    fields = {"chain_id": chain, "rpc_url": GATEWAY, "explorer_url": NETWORK.explorer_url, "is_mainnet": False}
    try:
        network = Network(name, genesis_hash=genesis, **fields) if genesis else Network(name, **fields)
    except TypeError:
        network = Network(name, **fields)
    c = Client(GATEWAY, network=network)
    enforced = bool(genesis) and getattr(c.network, "genesis_hash", None) == genesis and getattr(c, "_pinned_genesis", None) == genesis
    _ENFORCED[id(c)] = enforced
    if pinned and not enforced:
        raise ValueError("the finality pin names a genesis hash but the installed QCore.py does not sign over a pinned genesis, refusing to sign. Build QCore.py 0.9.0 or later, or leave genesis_hash empty")
    return c


def node_info(c, signing):
    info = c.node_info()
    chain = chain_id()
    if not isinstance(info, dict) or info.get("chain_id") != chain:
        shown = info.get("chain_id") if isinstance(info, dict) else None
        raise RuntimeError(f"the gateway names chain {printable(shown)} but the examples are configured for {printable(chain)}")
    pin = finality_pin()
    if pin and info.get("genesis_hash") != pin["genesis_hash"]:
        raise RuntimeError(f"the gateway names genesis {printable(info.get('genesis_hash'))} but {printable(chain)} is pinned to genesis {pin['genesis_hash']}")
    head = height(info.get("head_height"), "head height")
    if signing:
        if public_chain(chain) and not _ENFORCED.get(id(c)):
            raise ValueError(f"signing for {printable(chain)} needs QCore.py 0.9.0 or later and the genesis hash of the network pinned in examples/finality-pin.json, refusing to sign")
        if not ACCEPT_UNCONFIRMED:
            if not has_roster(pin):
                raise Unsigned("no validator roster is pinned, so the finality of this transaction could not be proven and nothing was signed")
            require_rosters(pin, head)
    return info, head


def to_qtov(quon_value):
    q = int(quon_value)
    whole, frac = divmod(q, QUON)
    frac_text = str(frac).rjust(6, "0").rstrip("0")
    return f"{whole}.{frac_text}" if frac_text else str(whole)


def to_quon(qtov_value):
    text = str(qtov_value)
    if not re.fullmatch(r"(0|[1-9][0-9]{0,12})(\.[0-9]{1,6})?", text):
        raise ValueError("an amount is a decimal number of QTOV with at most six decimal places")
    whole, _, frac = text.partition(".")
    return int(whole) * QUON + int(frac.ljust(6, "0") or "0")


def _nibble(c):
    if 48 <= c <= 57:
        return c - 48
    if 97 <= c <= 102:
        return c - 87
    return -1


def _decode_seed(raw, length):
    end = length
    while end > 64 and raw[end - 1] in (9, 10, 13, 32):
        end -= 1
    seed = bytearray(32)
    ok = end == 64 and length < len(raw)
    for i in range(32):
        hi = _nibble(raw[2 * i])
        lo = _nibble(raw[2 * i + 1])
        if hi < 0 or lo < 0:
            ok = False
        seed[i] = ((hi & 15) << 4) | (lo & 15)
    if not ok:
        wipe(seed)
        raise ValueError("the seed file holds 64 lowercase hex characters")
    return seed


def _open_plain(path, refusal):
    try:
        return os.open(path, OPEN_FLAGS)
    except FileNotFoundError:
        raise
    except OSError:
        raise ValueError(refusal) from None


def _owned(st):
    return not hasattr(os, "getuid") or st.st_uid == os.getuid()


def _read_into(fd, buffer):
    length = 0
    view = memoryview(buffer)
    try:
        with os.fdopen(os.dup(fd), "rb", buffering=0) as f:
            while length < len(buffer):
                n = f.readinto(view[length:])
                if not n:
                    break
                length += n
    finally:
        view.release()
    return length


def read_seed():
    path = os.environ.get("QUANTOVA_SEED_FILE")
    if not path:
        return None
    loose = "the seed file must be a regular file readable only by its owner, chmod 600"
    raw = bytearray(SEED_FILE_MAX)
    try:
        fd = _open_plain(path, loose)
        try:
            opened = os.fstat(fd)
            if not stat.S_ISREG(opened.st_mode) or opened.st_mode & 0o077 or not _owned(opened):
                raise ValueError(loose)
            length = _read_into(fd, raw)
        finally:
            os.close(fd)
        return _decode_seed(raw, length)
    finally:
        wipe(raw)


def _read_pin_file(path):
    shown = printable(path)
    fd = _open_plain(path, f"the finality pin {shown} must be a regular file, not a link, writable only by its owner")
    try:
        st = os.fstat(fd)
        if not stat.S_ISREG(st.st_mode):
            raise ValueError(f"the finality pin {shown} is not a regular file")
        if st.st_mode & 0o022:
            raise ValueError(f"the finality pin {shown} is writable by other users, run chmod go-w on it")
        if not _owned(st):
            raise ValueError(f"the finality pin {shown} belongs to another user, it must be owned by the user running the examples")
        buffer = bytearray(PIN_FILE_MAX + 1)
        length = _read_into(fd, buffer)
        if length > PIN_FILE_MAX:
            raise ValueError(f"the finality pin {shown} is too large")
        return bytes(buffer[:length]).decode("utf-8")
    finally:
        os.close(fd)


def require_address(name, value):
    if not isinstance(value, str) or not valid_address(value):
        raise ValueError(f"{name} {printable(value)} is not a Q1 address")
    return value.upper()


def wipe(seed):
    if seed is not None:
        for i in range(len(seed)):
            seed[i] = 0


def whole_env(name, fallback):
    text = os.environ.get(name) or fallback
    if not re.fullmatch(r"0|[1-9][0-9]{0,18}", text):
        raise ValueError(f"{name} is a whole number")
    return text


def expected_nonce():
    text = os.environ.get("QUANTOVA_NONCE")
    if not text:
        return None
    if not re.fullmatch(r"0|[1-9][0-9]{0,18}", text):
        raise ValueError("QUANTOVA_NONCE is a whole number")
    return int(text)


def index_of():
    text = os.environ.get("QUANTOVA_INDEX", "0")
    if not re.fullmatch(r"0|[1-9][0-9]{0,8}", text):
        raise ValueError("QUANTOVA_INDEX is a whole number")
    return int(text)


def _roster_slots(members, where):
    if not isinstance(members, list) or not members:
        raise ValueError(f"{where} needs a non empty list of validators")
    slots = None
    for m in members:
        if not isinstance(m, dict):
            raise ValueError(f"{where} holds an entry that is not a validator")
        raw = m.get("root_slots")
        if isinstance(raw, int) and not isinstance(raw, bool):
            raw = str(raw)
        if not isinstance(raw, str) or not re.fullmatch(r"[1-9][0-9]{0,9}", raw):
            raise ValueError(f"{where} gives a validator no whole number of root slots")
        if slots is not None and slots != int(raw):
            raise ValueError(f"{where} gives its validators different root slot counts")
        slots = int(raw)
    return slots


_loaded_pin = []


def finality_pin():
    if _loaded_pin:
        return _loaded_pin[0]
    user = os.environ.get("QUANTOVA_FINALITY_FILE") or None
    path = user or DEFAULT_PIN
    shown = printable(path)
    try:
        text = _read_pin_file(path)
    except FileNotFoundError:
        if user:
            raise ValueError(f"the finality pin {shown} does not exist") from None
        _loaded_pin.append(None)
        return None
    try:
        pin = json.loads(text)
    except ValueError:
        raise ValueError(f"the finality pin {shown} could not be read as JSON") from None
    if not isinstance(pin, dict):
        raise ValueError(f"the finality pin {shown} is not a JSON object")
    roster = pin.get("roster", [])
    listed = pin.get("epochs", [])
    if not isinstance(roster, list):
        raise ValueError(f"the finality pin {shown} needs a validator roster list, empty while no roster is published")
    if not isinstance(listed, list):
        raise ValueError(f"the finality pin {shown} needs its epochs as a list of epoch and roster pairs")
    genesis = pin.get("genesis_hash")
    if not genesis and not roster and not listed:
        if user:
            raise ValueError(f"the finality pin {shown} names no genesis hash and no validator roster")
        _loaded_pin.append(None)
        return None
    if pin.get("chain_id") != chain_id():
        raise ValueError(f"the finality pin {shown} is for chain {printable(pin.get('chain_id'))}, not {printable(chain_id())}")
    if not isinstance(genesis, str) or not re.fullmatch(r"[0-9a-fA-F]{64}", genesis):
        raise ValueError(f"the finality pin {shown} needs a genesis hash of 64 hex characters")
    epoch_length = _roster_slots(roster, f"the roster of {shown}") if roster else None
    epochs = {}
    for entry in listed:
        if not isinstance(entry, dict):
            raise ValueError(f"the finality pin {shown} lists an epoch that is not an epoch and roster pair")
        epoch = entry.get("epoch")
        if isinstance(epoch, str) and re.fullmatch(r"0|[1-9][0-9]{0,15}", epoch):
            epoch = int(epoch)
        if isinstance(epoch, bool) or not isinstance(epoch, int) or epoch < 0 or epoch > 2**53 - 1:
            raise ValueError(f"the finality pin {shown} names an epoch that is not a whole number")
        if epoch in epochs:
            raise ValueError(f"the finality pin {shown} names epoch {epoch} twice")
        slots = _roster_slots(entry.get("roster"), f"the roster of epoch {epoch} in {shown}")
        if epoch_length is not None and slots != epoch_length:
            raise ValueError(f"the finality pin {shown} gives its rosters different root slot counts")
        epoch_length = slots
        epochs[epoch] = entry.get("roster")
    loaded = {"file": shown, "genesis_hash": genesis.lower(), "roster": roster or None, "epochs": epochs, "epoch_length": epoch_length}
    _loaded_pin.append(loaded)
    return loaded


def has_roster(pin):
    return bool(pin and (pin["roster"] or pin["epochs"]))


def roster_known(pin, block_height):
    return (block_height // pin["epoch_length"]) in pin["epochs"] or bool(pin["roster"])


def roster_for(pin, block_height):
    epoch = block_height // pin["epoch_length"]
    members = pin["epochs"].get(epoch) or pin["roster"]
    if not members:
        raise ValueError(f"the finality pin {pin['file']} holds no validator roster for epoch {epoch}, the epoch of block {block_height}")
    return members


def require_rosters(pin, head):
    if not has_roster(pin):
        return
    last = head + int(validity_blocks())
    at = head
    while True:
        roster_for(pin, min(at, last))
        if at >= last:
            break
        at += pin["epoch_length"]


def settle(c, signed, outcome):
    print(printable(json.dumps(outcome)))
    if not isinstance(outcome, dict) or outcome.get("verdict") != "accepted":
        reason = outcome.get("reason") if isinstance(outcome, dict) else None
        raise RuntimeError(f"the gateway refused the transaction, {printable(reason)}")
    pin = finality_pin()
    if not has_roster(pin):
        raise Unconfirmed("no validator roster is pinned, so finality could not be proven")
    tx_id = signed["tx_id"]
    deadline = time.monotonic() + 60
    while True:
        tx = c.transaction(tx_id)
        if isinstance(tx, dict) and tx.get("tx_id") == tx_id and tx.get("status") == "finalised":
            at = height(tx.get("height"), "transaction height")
            break
        if time.monotonic() > deadline:
            raise RuntimeError(f"timed out waiting for {printable(tx_id)} to be finalised")
        time.sleep(1)
    if not roster_known(pin, at):
        raise Unconfirmed(f"the finality pin holds no validator roster for the epoch of block {at}, so finality could not be proven")
    proof = c.confirm_transaction(tx_id, pin["genesis_hash"], roster_for(pin, at))
    if int(proof["height"]) != at:
        raise RuntimeError(f"the gateway placed {printable(tx_id)} at height {at} but proved it at height {proof['height']}")
    print(f"Final at height {proof['height']}, proven against the pinned genesis hash and validator roster")


def _state_dir(*parts):
    path = os.environ.get("QUANTOVA_STATE_DIR") or os.path.join(os.path.expanduser("~"), ".quantova")
    for part in ("",) + parts:
        if part:
            path = os.path.join(path, part)
        try:
            os.mkdir(path, 0o700)
        except FileExistsError:
            pass
        st = os.lstat(path)
        if not stat.S_ISDIR(st.st_mode) or st.st_mode & 0o077 or not _owned(st):
            raise ValueError(f"the state directory {printable(path)} must be a directory, not a link, owned by you and closed to other users, chmod 700")
    return path


def _safe_name(text):
    if re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9-]{0,63}", text):
        return text
    return hashlib.sha3_256(str(text).encode()).hexdigest()


def transaction_id(tx_hex):
    digest = hashlib.sha3_256(bytes.fromhex(tx_hex)).digest()
    data = []
    acc = 0
    bits = 0
    for b in digest:
        acc = ((acc << 8) | b) & 0xFFFF
        bits += 8
        while bits >= 5:
            bits -= 5
            data.append((acc >> bits) & 31)
    if bits > 0:
        data.append((acc << (5 - bits)) & 31)
    hrp = "qtx"
    values = [ord(ch) >> 5 for ch in hrp] + [0] + [ord(ch) & 31 for ch in hrp] + data + [0] * 6
    gen = (0x3B6A57B2, 0x26508E6D, 0x1EA119FA, 0x3D4233DD, 0x2A1462B3)
    chk = 1
    for v in values:
        top = chk >> 25
        chk = ((chk & 0x1FFFFFF) << 5) ^ v
        for i in range(5):
            if (top >> i) & 1:
                chk ^= gen[i]
    chk ^= 0x2BC830A3
    check = [(chk >> (5 * (5 - i))) & 31 for i in range(6)]
    return (hrp + "1" + "".join(BECH32[v] for v in data + check)).upper()


def _write_durable(path, text):
    tmp = f"{path}.{os.urandom(12).hex()}.tmp"
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o600)
    try:
        try:
            os.write(fd, text.encode())
            os.fsync(fd)
        finally:
            os.close(fd)
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except FileNotFoundError:
            pass
        raise
    dfd = os.open(os.path.dirname(path), os.O_RDONLY)
    try:
        os.fsync(dfd)
    finally:
        os.close(dfd)


def _read_record(path, identity):
    shown = printable(path)
    try:
        fd = _open_plain(path, f"the session file {shown} must be a regular file, not a link, owned by you")
    except FileNotFoundError:
        return None
    try:
        st = os.fstat(fd)
        if not stat.S_ISREG(st.st_mode) or st.st_mode & 0o077 or not _owned(st):
            raise ValueError(f"the session file {shown} must be a regular file owned by you and closed to other users, chmod 600")
        buffer = bytearray(65537)
        length = _read_into(fd, buffer)
    finally:
        os.close(fd)
    try:
        record = json.loads(bytes(buffer[:length]).decode("utf-8"))
    except ValueError:
        record = None
    valid = (
        isinstance(record, dict) and record.get("version") == 1 and record.get("state") in ("prepared", "sent", "accepted")
        and isinstance(record.get("nonce"), str) and re.fullmatch(r"0|[1-9][0-9]{0,19}", record["nonce"]) is not None
        and (record.get("tx") is None or (isinstance(record.get("tx"), str) and re.fullmatch(r"QTX1[0-9A-Z]{58}", record["tx"]) is not None))
        and record.get("identity") == identity
    )
    if not valid:
        raise ValueError(f"the session file {shown} is damaged or belongs to another transaction, check it before sending again")
    return record


def send_once(c, kind, sender, fields, given, sign):
    identity = hashlib.sha3_256(json.dumps([kind, chain_id(), sender, fields], separators=(",", ":")).encode()).hexdigest()
    path = os.path.join(_state_dir(f"{kind}-sessions", _safe_name(chain_id())), f"{_safe_name(sender)}-{identity}.json")
    state = {"record": _read_record(path, identity)}
    if state["record"] is not None and (state["record"]["state"] == "prepared" or SEND_AGAIN):
        state["record"] = None

    def save(**patch):
        record = {"version": 1, "identity": identity, "kind": kind, "from": sender}
        record.update(state["record"] or {})
        record.update(patch)
        state["record"] = record
        _write_durable(path, json.dumps(record, indent=2) + "\n")

    record = state["record"]
    if record is not None:
        if record.get("tx"):
            tx = c.transaction(record["tx"])
            if isinstance(tx, dict) and tx.get("tx_id") == record["tx"] and tx.get("status") == "finalised":
                print(f"An identical {kind} was already sent as {record['tx']}, nothing was signed. Pass --send-again to send another.")
                return {"tx_id": record["tx"]}, {"verdict": "accepted", "tx_id": record["tx"]}
        now = height(c.account(sender).get("nonce"), "nonce")
        if now != int(record["nonce"]):
            raise ValueError(f"an identical {kind} was sent at nonce {record['nonce']} as {record.get('tx') or 'a transaction whose id was not saved'} and the account is now at nonce {now}. Check it by hand, or pass --send-again to send another.")
        print(f"An identical {kind} sent earlier at nonce {now} has not landed, it is signed again at that nonce so at most one of them can land.")
        nonce = now
    else:
        nonce = given if given is not None else height(c.account(sender).get("nonce"), "nonce")
        save(state="prepared", nonce=str(nonce), tx=None)
    submit = c.submit

    def recorded_submit(tx_hex):
        save(state="sent", tx=transaction_id(tx_hex))
        return submit(tx_hex)

    c.submit = recorded_submit
    signed, outcome = sign(nonce)
    if signed.get("tx_id") != state["record"].get("tx"):
        raise RuntimeError(f"the signed transaction {printable(signed.get('tx_id'))} is not the one recorded before it was sent, check {printable(path)}")
    if isinstance(outcome, dict) and outcome.get("verdict") == "accepted":
        save(state="accepted")
    return signed, outcome


def run(main, positional=False):
    try:
        check_options(positional)
        main()
    except Unsigned as err:
        print(f"NOT SIGNED. {printable(err, 600)}. Pin a validator roster, or pass --accept-unconfirmed to sign anyway.", file=sys.stderr)
        sys.exit(UNCONFIRMED_EXIT)
    except Unconfirmed as err:
        if ACCEPT_UNCONFIRMED:
            print(f"NOT CONFIRMED, accepted because --accept-unconfirmed was given. {printable(err, 600)}")
            return
        print(f"NOT CONFIRMED. {printable(err, 600)}. Pass --accept-unconfirmed to accept an unconfirmed result.", file=sys.stderr)
        sys.exit(UNCONFIRMED_EXIT)
    except Exception as err:
        print("error", printable(err, 600), file=sys.stderr)
        sys.exit(1)


def banner(title):
    line = "=" * 64
    print(line)
    print("  " + title)
    print(line)
