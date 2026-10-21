# For Developers

How to use the Quantova tools to build, with the common workflows and where each
tool fits. Every workflow below is post quantum by default. Your transactions are
signed with ML-DSA-65 and verified on chain. Nodes talk to each other over a channel
keyed with ML-KEM-768 and sealed with ChaCha20-Poly1305, and your client reaches the
gateway over ordinary HTTPS.

## Set up

```bash
npm install @quantovainc/qcore@0.10.0
export QUANTOVA_GATEWAY=https://q-test-net-01.quantova.org
```

Get a wallet with QMask and free TQTOV from the faucet as in
[getting-started.md](getting-started.md).

## Read state

```python
import sys
import unicodedata

from quantova_qcore import Client, Network

printable = lambda v: "".join(ch for ch in str(v) if unicodedata.category(ch) not in ("Cc", "Cf", "Zl", "Zp"))

try:
    c = Client("https://q-test-net-01.quantova.org", network=Network.testnet())
    print("head   ", printable(c.head()["height"]))
    print("account", printable(c.account("Q1ZF0T2M759GVM5NMLTVQWQKPPX972HTEKG2C2TZ008QEW22N0XFLSESWNG0")["balance"]))
except Exception as err:
    sys.exit("error " + printable(err))
```

```js
const { Client, Network } = require('@quantovainc/qcore');

const printable = (v) => String(v).replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, '');

async function main() {
  const c = new Client('https://q-test-net-01.quantova.org', { network: Network.testnet() });
  console.log('head   ', printable((await c.head()).height));
  console.log('account', printable((await c.account('Q1ZF0T2M759GVM5NMLTVQWQKPPX972HTEKG2C2TZ008QEW22N0XFLSESWNG0')).balance));
}

main().catch((e) => { console.error(printable(e.message)); process.exit(1); });
```

Under the client, each read is an HTTP POST to a gateway method such as `head`,
`get_account`, `get_block`, or `get_storage`. Full runnable code is in
[../examples/*/connect.*](../examples).

## Submit a transaction, signed with ML-DSA-65

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

The seed file holds the 64 hex character seed of a funded account and must be readable only by you. `read_seed` and `readSeed` are the readers in [../snippets/README.md](../snippets/README.md), which refuse a file anyone else can read, decode the hex into a fresh array and wipe the raw bytes. Amounts are whole numbers of Quon, one QTOV is one million Quon, and the last argument is the largest fee you allow, so the client refuses to sign if the gateway reports a higher fee. Pass no nonce for a normal send. An accepted outcome is not yet proven final, so the examples prove it with `confirmTransaction` against a genesis hash and validator roster you pin. See
[../examples/python/transfer.py](../examples/python/transfer.py) and
[../examples/javascript/transfer.js](../examples/javascript/transfer.js).

## Work with QVM containers

The QVM is a deterministic register machine that runs compiled containers, with
post quantum signature verification, hashing, and Merkle proof checking as native
instructions. Contracts are written in Quanta, compiled to a container that the QVM
executes. Quanta is designed so that whole classes of vulnerability are caught at
compile time. You read container state with `get_container` and `get_storage`, and
you invoke a container by submitting a signed transaction.

```js
async function callContract(c, seed) {
  const container = await c.container(CONTRACT);
  const storage = await c.storage(CONTRACT);
  return c.call(seed, 0, CONTRACT, ARGS_HEX, 30000n, '1000');
}
```

ARGS_HEX are the call arguments produced from the interface that the Quanta compiler emits for the contract. QCore.py offers the same call and storage methods, and the container read is in QCore.js.

QAsset is the fungible token standard and QCollectible is the non fungible
standard. Full runnable code is in
[../examples/python/contract_call.py](../examples/python/contract_call.py).

## Verify your implementation

Before you ship, check your code against the protocol with the verification tools.

* **pq-test-vectors**, confirm your address derivation, hashing, and ML-DSA-65
  signature handling match the known answer vectors.
* **node-conformance-tests**, confirm the node you build against is a canonical
  Quantova node with healthy QORUS finality.

## Reference

* Gateway endpoints, genesis, and network parameters, the **chain-params** tool.
* Snippets for quick copy paste, [../snippets](../snippets).
* Patterns and full programs, the **examples** tool and [../examples](../examples).
