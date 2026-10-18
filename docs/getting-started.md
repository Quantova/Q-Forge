# Getting Started

This guide takes you from nothing to reading the chain and submitting your first
ML-DSA-65 signed transaction with the Quantova tools.

## 1. Pick a client

Quantova has two official clients with the same surface, both binding to the Rust
core QCore.rs.

```bash
# JavaScript and TypeScript
npm install @quantovainc/qcore@0.7.0

# Python
git clone --branch v0.7.0 https://github.com/Quantova/QCore.rs
git clone --branch v0.7.0 https://github.com/Quantova/QCore.py
(cd QCore.py && maturin develop)
```

## 2. Choose a gateway

Point the client at a gateway. Every call is an HTTP POST to `/v1/<method>` with a
flat JSON body. There is no WebSocket transport.

| Environment | Gateway base URL |
|---|---|
| Testnet | `https://rpc-testnet.quantova.org` |
| Local dev | `http://127.0.0.1:8645` |

Mainnet is not yet live. The live network is named Q-test-net-01, and the examples sign for it unless `QUANTOVA_CHAIN` names another chain, such as that of a local node.

```bash
export QUANTOVA_GATEWAY=https://rpc-testnet.quantova.org
```

## 3. Connect and read

Install QCore.js with `npm install @quantovainc/qcore@0.7.0` and QCore.py from its v0.7.0 tag, cloned next to QCore.rs at the same tag, with `maturin develop`, as its README describes. QCore.py imports as `quantova_qcore`.

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
* Verify your work with the pq-test-vectors and node-conformance-tests tools.

See the full [tools catalog](tools-catalog.md), [for developers](for-developers.md),
and [for companies](for-companies.md).
