# Getting Started

This guide takes you from nothing to reading the chain and submitting your first
ML-DSA-65 signed transaction with the Quantova tools.

## 1. Pick a client

Quantova has two official clients with the same surface, both binding to the Rust
core QCore.rs.

```bash
# JavaScript and TypeScript
npm install @qunatovainc/qcore

# Python
pip install qcore
```

## 2. Choose a gateway

Point the client at a gateway. Every call is an HTTP POST to `/v1/<method>` with a
flat JSON body. There is no WebSocket transport.

| Environment | Gateway base URL |
|---|---|
| Testnet | `https://testnet.quantova.io` |
| Local dev | `http://127.0.0.1:8645` |

Mainnet is not yet live. Quantova is at the testnet and pre audit stage.

```bash
export QUANTOVA_GATEWAY=https://testnet.quantova.io
```

## 3. Connect and read

```python
# QCore.py
from qcore import QCore
q = QCore("https://testnet.quantova.io")
print("head", q.head()["height"])
```

```js
// QCore.js
const { QCore } = require('@qunatovainc/qcore');
const q = new QCore('https://testnet.quantova.io');
console.log('head', (await q.head()).height);
```

Runnable versions are [../examples/python/connect.py](../examples/python/connect.py)
and [../examples/javascript/connect.js](../examples/javascript/connect.js).

## 4. Get a wallet and test funds

1. Install QMask and create an account. Its Q1 address begins with a capital Q.
2. Claim free TQTOV for your address from the testnet faucet.

## 5. Submit your first transaction

A transfer is built, signed with ML-DSA-65, and submitted through the gateway
`submit_transaction` method. The runnable examples show the full flow end to end.

* [../examples/python/transfer.py](../examples/python/transfer.py)
* [../examples/javascript/transfer.js](../examples/javascript/transfer.js)

Every Quantova transaction is signed with ML-DSA-65 (FIPS 204). There is no
classical key path anywhere in the chain. Amounts are in Quon. One QTOV is one
million Quon, and the testnet asset is TQTOV.

## 6. Go further

* Contracts on the QVM, deploy and call Quanta contracts, see
  [../examples/python/contract_call.py](../examples/python/contract_call.py).
* Names with QNS, resolve names under the capital Q top level domain, see
  [../examples/python/qns_resolve.py](../examples/python/qns_resolve.py).
* Verify your work with the pq-test-vectors and node-conformance-tests tools.

See the full [tools catalog](tools-catalog.md), [for developers](for-developers.md),
and [for companies](for-companies.md).
