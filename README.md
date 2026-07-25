# Quantova Tools

The toolkit hub for building on and integrating with Quantova, a post quantum
Layer 1 blockchain. This repository is the catalog. It lists the tools Quantova
publishes, shows how to use them with runnable code, and documents the stack for
developers and for companies.

Quantova is post quantum across the stack. The cryptography is Q-Crypto,
Quantova's implementation of the NIST post quantum standards, written against the
published FIPS documents, so the keys, signatures, and hashing that secure the
network are designed to withstand both classical and quantum attack. Account
authority uses ML-DSA-65 under FIPS 204.

Quantova is on testnet, ahead of a mainnet launch, and has not yet completed
external security audit.

## Start here

* New to Quantova, read [docs/getting-started.md](docs/getting-started.md).
* Want the full list of tools, read [docs/tools-catalog.md](docs/tools-catalog.md).
* Building something, read [docs/for-developers.md](docs/for-developers.md).
* Evaluating for an organization, read [docs/for-companies.md](docs/for-companies.md).
* Why post quantum, read [docs/post-quantum-overview.md](docs/post-quantum-overview.md).

## Quick example

Connect to the Quantova gateway and read the chain, no keys required.

```python
# QCore.py  (pip install qcore)
from qcore import QCore

q = QCore("https://testnet.quantova.io")
print("head   ", q.head()["height"])
print("account", q.get_account("Q1GZD3AGFY5U426V9NX6UNE06ZC4YVKNK3GU9L3C")["balance"])
```

```js
// QCore.js  (npm install @qunatovainc/qcore)
const { QCore } = require('@qunatovainc/qcore');

const q = new QCore('https://testnet.quantova.io');
console.log('head   ', (await q.head()).height);
console.log('account', (await q.getAccount('Q1GZD3AGFY5U426V9NX6UNE06ZC4YVKNK3GU9L3C')).balance);
```

Build and submit an ML-DSA-65 signed transfer.

```python
# derive an ML-DSA-65 account, its Q1 address begins with a capital Q
sender = q.wallet.create()
signed = q.wallet.sign_transfer(sender, to="Q1GP3FR9CVK3XAJSQGC7DU47WCDUVTFDYMY0H82C", amount=1_500_000)
q.submit_transaction(signed)   # amount is in Quon, one QTOV is one million Quon
```

Read a QAsset token balance from its container storage.

```python
token = q.contract(TOKEN_ADDRESS)          # a Quanta contract, a compiled container
balance = token.balance_of(HOLDER)          # a single word map value
```

Resolve a name under the capital Q top level domain.

```python
addr = q.qns(QNS_REGISTRY).resolve("alice.Q")   # returns a Q1 address
```

Full runnable programs for each of these are in [examples/](examples), in both
QCore.js and QCore.py, and copy paste snippets are in [snippets/](snippets).

## The tools

A short index. The full catalog with descriptions is in
[docs/tools-catalog.md](docs/tools-catalog.md).

**Build**
* **QCore.js**, the official JavaScript and TypeScript client, published on npm as `@qunatovainc/qcore`.
* **QCore.py**, the official Python client.
* **QCore.rs**, the Rust core the other clients bind to.
* **QMask**, the native post quantum wallet browser extension.
* **QVM**, the Quantova Virtual Machine, a deterministic register machine that runs compiled containers.
* **Quanta**, the contract language, compiled to QVM containers and designed so that whole classes of vulnerability are caught at compile time.
* **examples**, runnable sample programs.

**Network and assets**
* **chain-params**, gateway endpoints, genesis, and network parameters.
* **faucet**, free testnet asset, TQTOV.
* **QNS**, the name service under the capital Q top level domain.

**Verify**
* **pq-test-vectors**, known answer vectors and a verifier for the Q-Crypto primitives.
* **node-conformance-tests**, a read only checker for a running node.

## Endpoints

Quantova speaks a plain HTTP gateway. Every call is an HTTP POST to `/v1/<method>`
with a flat JSON body. There is no WebSocket transport.

| Environment | Gateway base URL |
|---|---|
| Testnet | `https://testnet.quantova.io` |
| Local dev | `http://127.0.0.1:8645` |

Mainnet is not yet live. The gateway methods are `node_info`, `head`, `validators`,
`chain_params`, `get_account`, `get_transaction`, `submit_transaction`,
`get_block`, `supply`, `get_container`, `get_storage`, and `get_events`.

Get free TQTOV for the testnet from the faucet, install the QMask wallet, and
register names with QNS.

## Running the examples

```bash
# Python
cd examples/python
pip install qcore
export QUANTOVA_GATEWAY=https://testnet.quantova.io
python connect.py

# JavaScript
cd examples/javascript
npm install @qunatovainc/qcore
export QUANTOVA_GATEWAY=https://testnet.quantova.io
node connect.js
```

See [examples/python/README.md](examples/python/README.md) and
[examples/javascript/README.md](examples/javascript/README.md).

## Repository layout

```
Quantova-tools/
  docs/        getting-started, tools-catalog, for-developers, for-companies, post-quantum-overview
  examples/    runnable sample programs in QCore.js and QCore.py
  snippets/    short copy paste code for common tasks
  LICENSE-APACHE
  LICENSE-MIT
  LICENSE-OVERVIEW.md
  README.md
```

## License

Licensed under the Apache 2.0 and MIT licenses, copyright 2026 Quantova Inc. See
[LICENSE-APACHE](LICENSE-APACHE), [LICENSE-MIT](LICENSE-MIT), and
[LICENSE-OVERVIEW.md](LICENSE-OVERVIEW.md).
