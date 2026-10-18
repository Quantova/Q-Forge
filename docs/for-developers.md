# For Developers

How to use the Quantova tools to build, with the common workflows and where each
tool fits. Every workflow below is post quantum by default. Your transactions are
signed with ML-DSA-65 and verified on chain. Nodes talk to each other over a channel
keyed with ML-KEM-768 and sealed with ChaCha20-Poly1305, and your client reaches the
gateway over ordinary HTTPS.

## Set up

```bash
npm install @quantovainc/qcore@0.7.0
export QUANTOVA_GATEWAY=https://rpc-testnet.quantova.org
```

Get a wallet with QMask and free TQTOV from the faucet as in
[getting-started.md](getting-started.md).

## Read state

```python
from quantova_qcore import Client, Network

c = Client("https://rpc-testnet.quantova.org", network=Network.testnet())
print("head   ", c.head()["height"])
print("account", c.account("Q1ZF0T2M759GVM5NMLTVQWQKPPX972HTEKG2C2TZ008QEW22N0XFLSESWNG0")["balance"])
```

```js
const { Client, Network } = require('@quantovainc/qcore');

const c = new Client('https://rpc-testnet.quantova.org', { network: Network.testnet() });
console.log('head   ', (await c.head()).height);
console.log('account', (await c.account('Q1ZF0T2M759GVM5NMLTVQWQKPPX972HTEKG2C2TZ008QEW22N0XFLSESWNG0')).balance);
```

Under the client, each read is an HTTP POST to a gateway method such as `head`,
`get_account`, `get_block`, or `get_storage`. Full runnable code is in
[../examples/*/connect.*](../examples).

## Submit a transaction, signed with ML-DSA-65

```python
with open("account.seed", encoding="ascii") as f:
    seed = bytearray.fromhex(f.read().strip())
signed, outcome = c.transfer(seed, 0, RECIPIENT, 1_500_000, "1000")
seed[:] = bytes(32)
```

```js
const seed = Uint8Array.from(Buffer.from(fs.readFileSync('account.seed', 'utf8').trim(), 'hex'));
const { signed, outcome } = await c.transfer(seed, 0, RECIPIENT, 1_500_000n, '1000');
seed.fill(0);
```

The seed file holds the 64 hex character seed of a funded account and must be readable only by you. Amounts are whole numbers of Quon, one QTOV is one million Quon, and the last argument is the largest fee you allow, so the client refuses to sign if the gateway reports a higher fee. See
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
const container = await c.container(CONTRACT);
const storage = await c.storage(CONTRACT);
const { signed, outcome } = await c.call(seed, 0, CONTRACT, ARGS_HEX, 30000n, '50000');
```

ARGS_HEX are the call arguments produced from the interface that the Quanta compiler emits for the contract. QCore.py offers the same call method, and container and storage reads are in QCore.js.

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
