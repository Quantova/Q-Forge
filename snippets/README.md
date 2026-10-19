# Snippets

Short copy paste code for common Quantova tasks, in QCore.js and QCore.py. For full
runnable programs, see [../examples](../examples). Install QCore.js with `npm install @quantovainc/qcore@0.8.0`. Build QCore.py from its 0.8.0 release commit 84d458ba1d69b3a654cfbbe67dea3b500c210e52, next to QCore.rs at commit 71ad1a1e76fbbec26dd5ebcda8d7713655ec08ff, with the pinned commands in [../examples/python/README.md](../examples/python/README.md). QCore.py imports as `quantova_qcore`.

## Connect and read an account

```python
import sys
import unicodedata

from quantova_qcore import Client, Network

printable = lambda v: "".join(ch for ch in str(v) if unicodedata.category(ch) not in ("Cc", "Cf", "Zl", "Zp"))

try:
    c = Client("https://rpc-testnet.quantova.org", network=Network.testnet())
    print("head   ", printable(c.head()["height"]))
    print("account", printable(c.account("Q1ZF0T2M759GVM5NMLTVQWQKPPX972HTEKG2C2TZ008QEW22N0XFLSESWNG0")["balance"]))
except Exception as err:
    sys.exit("error " + printable(err))
```

```js
const { Client, Network } = require('@quantovainc/qcore');

const printable = (v) => String(v).replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, '');

async function main() {
  const c = new Client('https://rpc-testnet.quantova.org', { network: Network.testnet() });
  console.log('head   ', printable((await c.head()).height));
  console.log('account', printable((await c.account('Q1ZF0T2M759GVM5NMLTVQWQKPPX972HTEKG2C2TZ008QEW22N0XFLSESWNG0')).balance));
}

main().catch((e) => { console.error(printable(e.message)); process.exit(1); });
```

Balances are in Quon, one QTOV is one million Quon.

## Read a seed file safely

The seed file holds the 64 hex character seed of a funded account. These readers open the file without following a symbolic link and without waiting on a pipe, check the opened file itself and refuse anything that is not a regular file or that anyone but you can read, then decode the hex into a fresh array without ever building a hex string, and wipe the raw bytes they read.

```python
import os
import stat


def read_seed(path):
    loose = "the seed file must be a regular file readable only by you, chmod 600"
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    except OSError:
        raise ValueError(loose) from None
    raw = bytearray(80)
    n = 0
    try:
        st = os.fstat(fd)
        if not stat.S_ISREG(st.st_mode) or st.st_mode & 0o077:
            raise ValueError(loose)
        with os.fdopen(os.dup(fd), "rb", buffering=0) as f:
            view = memoryview(raw)
            while n < len(raw):
                got = f.readinto(view[n:])
                if not got:
                    break
                n += got
            view.release()
    finally:
        os.close(fd)
    nib = lambda c: c - 48 if 48 <= c <= 57 else c - 87 if 97 <= c <= 102 else -1
    seed = bytearray(32)
    ok = 64 <= n <= 66 and all(raw[i] in (10, 13) for i in range(64, n))
    for i in range(32):
        hi, lo = nib(raw[2 * i]), nib(raw[2 * i + 1])
        ok = ok and hi >= 0 and lo >= 0
        seed[i] = ((hi & 15) << 4) | (lo & 15)
    for i in range(len(raw)):
        raw[i] = 0
    if not ok:
        seed[:] = bytes(32)
        raise ValueError("the seed file holds 64 lowercase hex characters")
    return seed
```

```js
const fs = require('fs');

function readSeed(file) {
  const loose = 'the seed file must be a regular file readable only by you, chmod 600';
  let fd;
  try {
    fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  } catch {
    throw new Error(loose);
  }
  const raw = new Uint8Array(80);
  let n = 0;
  try {
    const st = fs.fstatSync(fd);
    if (!st.isFile() || (st.mode & 0o077) !== 0) throw new Error(loose);
    for (let got = 1; got > 0 && n < raw.length; n += got) got = fs.readSync(fd, raw, n, raw.length - n, n);
  } finally {
    fs.closeSync(fd);
  }
  const nib = (c) => (c >= 48 && c <= 57 ? c - 48 : c >= 97 && c <= 102 ? c - 87 : -1);
  const seed = new Uint8Array(32);
  let ok = n >= 64 && n <= 66;
  for (let i = 64; i < n; i++) ok = ok && (raw[i] === 10 || raw[i] === 13);
  for (let i = 0; i < 32; i++) {
    const hi = nib(raw[2 * i]);
    const lo = nib(raw[2 * i + 1]);
    ok = ok && hi >= 0 && lo >= 0;
    seed[i] = ((hi & 15) << 4) | (lo & 15);
  }
  raw.fill(0);
  if (!ok) { seed.fill(0); throw new Error('the seed file holds 64 lowercase hex characters'); }
  return seed;
}
```

## Sign and submit a transfer

```python
seed = read_seed("account.seed")
try:
    signed, outcome = c.transfer(seed, 0, RECIPIENT, 1_500_000, "1000")
finally:
    seed[:] = bytes(32)
```

```js
async function send(c) {
  const seed = readSeed('account.seed');
  try {
    return await c.transfer(seed, 0, RECIPIENT, 1_500_000n, '1000');
  } finally {
    seed.fill(0);
  }
}
```

Amounts are whole numbers of Quon, one QTOV is one million Quon, and the last argument is the largest fee you allow, so the client refuses to sign if the gateway reports a higher fee. Pass no nonce for a normal send.

An accepted outcome means the gateway took the transaction. To prove it final, call `c.confirmTransaction(txId, genesisHash, roster)` in QCore.js or `c.confirm_transaction(tx_id, genesis_hash, roster)` in QCore.py with a genesis hash you pinned yourself and the validator roster you pinned for the epoch of the block, as the examples do with `examples/finality-pin.json`. Build the client so that the pinned genesis is the one it signs over, as `client()` and `connect()` in the examples do, and sign for Q-test-net-01 only with QCore 0.9.0 or later and the network genesis pinned, because the chain only accepts transactions signed over its genesis and QCore 0.8.0 cannot sign over one.

## Read and call a QVM container

```js
async function callContract(c, seed) {
  const container = await c.container(CONTRACT);
  const storage = await c.storage(CONTRACT);
  return c.call(seed, 0, CONTRACT, ARGS_HEX, 30000n, '50000');
}
```

ARGS_HEX are the call arguments produced from the interface that the Quanta compiler emits for the contract. QCore.py offers the same call and storage methods, and the container read is in QCore.js.

Every transaction built with these snippets is signed with ML-DSA-65 (FIPS 204)
and verified on chain. Transactions and account keys use ML-DSA-65. The client
reaches the gateway over standard TLS.
