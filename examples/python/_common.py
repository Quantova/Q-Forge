# Copyright 2026 Quantova Inc
# SPDX-License-Identifier: Apache-2.0 OR MIT

import os
import re
import stat

from quantova_qcore import Client, Network

TESTNET = Network.testnet()
GATEWAY = os.environ.get("QUANTOVA_GATEWAY", TESTNET.rpc_url).rstrip("/")
QSTAMP_CONTRACT = "Q1D6TZFRL203P3DFAFVUPZUHGUCM4EWGH6063XNS42VA5235RNQWXS7FXEWX"
QUON = 1_000_000


def connect():
    chain = os.environ.get("QUANTOVA_CHAIN") or TESTNET.chain_id
    if GATEWAY == TESTNET.rpc_url and chain == TESTNET.chain_id:
        return Client(GATEWAY, network=TESTNET)
    return Client(GATEWAY, network=Network("custom", chain_id=chain, rpc_url=GATEWAY))


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


def read_seed():
    path = os.environ.get("QUANTOVA_SEED_FILE")
    if not path:
        return None
    st = os.lstat(path)
    if not stat.S_ISREG(st.st_mode) or st.st_mode & 0o077:
        raise ValueError("the seed file must be a regular file readable only by its owner, chmod 600")
    with open(path, "r", encoding="ascii") as f:
        text = f.read().strip()
    if not re.fullmatch(r"[0-9a-f]{64}", text):
        raise ValueError("the seed file holds 64 lowercase hex characters")
    return bytearray.fromhex(text)


def wipe(seed):
    if seed is not None:
        seed[:] = bytes(len(seed))


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


def banner(title):
    line = "=" * 64
    print(line)
    print("  " + title)
    print(line)
