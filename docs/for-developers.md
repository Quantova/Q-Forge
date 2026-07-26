# For Developers

How to use the Quantova tools to build, with the common workflows and where each
tool fits. Every workflow below is post quantum by default. Your transactions are
signed with ML-DSA-65 and verified on chain, and the transport channel is secured
with ChaCha20-Poly1305.

## Set up

```bash
npm install @quantovainc/qcore      # or: pip install qcore
export QUANTOVA_GATEWAY=https://testnet.quantova.io
```

Get a wallet with QMask and free TQTOV from the faucet as in
[getting-started.md](getting-started.md).

## Read state

```python
from qcore import QCore
q = QCore("https://testnet.quantova.io")
head = q.head()
account = q.get_account("Q1GZD3AGFY5U426V9NX6UNE06ZC4YVKNK3GU9L3C")
```

```js
const { QCore } = require('@quantovainc/qcore');
const q = new QCore('https://testnet.quantova.io');
const head = await q.head();
const account = await q.getAccount('Q1GZD3AGFY5U426V9NX6UNE06ZC4YVKNK3GU9L3C');
```

Under the client, each read is an HTTP POST to a gateway method such as `head`,
`get_account`, `get_block`, or `get_storage`. Full runnable code is in
[../examples/*/connect.*](../examples).

## Submit a transaction, signed with ML-DSA-65

```python
# QCore.py, derive an account and sign a transfer
from qcore import QCore
q = QCore("https://testnet.quantova.io")
sender = q.wallet.create()                 # Q1 address begins with a capital Q
signed = q.wallet.sign_transfer(sender, to=RECIPIENT, amount=1_500_000)  # Quon
q.submit_transaction(signed)
```

A real app registers Quantova's native Q-Crypto backend and submits through the
client. The wallet API is the shape shown in the examples. See
[../examples/python/transfer.py](../examples/python/transfer.py) and
[../examples/javascript/transfer.js](../examples/javascript/transfer.js).

## Work with QVM containers

The QVM is a deterministic register machine that runs compiled containers, with
post quantum signature verification, hashing, and Merkle proof checking as native
instructions. Contracts are written in Quanta, compiled to a container that the QVM
executes. Quanta is designed so that whole classes of vulnerability are caught at
compile time. You read container state with `get_container` and `get_storage`, and
you invoke a container by submitting a signed transaction.

```python
token = q.contract(TOKEN_ADDRESS)          # a QAsset contract, a compiled container
balance = token.balance_of(HOLDER)          # a single word map value
signed = token.build_transfer(sender, to=HOLDER, amount=25)
q.submit_transaction(signed)
```

QAsset is the fungible token standard and QCollectible is the non fungible
standard. Full runnable code is in
[../examples/python/contract_call.py](../examples/python/contract_call.py).

## Resolve and use names, QNS

```python
qns = q.qns(QNS_REGISTRY)
addr = qns.resolve("alice.Q")     # returns a Q1 address
```

Names live under the capital Q top level domain, for example `alice.Q`. Full
runnable code is in
[../examples/python/qns_resolve.py](../examples/python/qns_resolve.py). Register
names with QNS.

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
