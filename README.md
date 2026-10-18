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

Install QCore.js with `npm install @quantovainc/qcore@0.6.1` and QCore.py from its v0.6.1 tag, cloned next to QCore.rs at the same tag, with `maturin develop`, as its README describes. QCore.py imports as `quantova_qcore`.

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

Build and submit an ML-DSA-65 signed transfer.

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

The seed file holds the 64 hex character seed of a funded account and must be readable only by you. Amounts are whole numbers of Quon, one QTOV is one million Quon, and the last argument is the largest fee you allow, so the client refuses to sign if the gateway reports a higher fee.

Read a QVM container and call it.

```js
const container = await c.container(CONTRACT);
const storage = await c.storage(CONTRACT);
const { signed, outcome } = await c.call(seed, 0, CONTRACT, ARGS_HEX, 30000n, '50000');
```

ARGS_HEX are the call arguments produced from the interface that the Quanta compiler emits for the contract. QCore.py offers the same call method, and container and storage reads are in QCore.js.

Full runnable programs for each of these are in [examples/](examples), in both
QCore.js and QCore.py, and copy paste snippets are in [snippets/](snippets).

## The tools

A short index. The full catalog with descriptions is in
[docs/tools-catalog.md](docs/tools-catalog.md).

**Build**
* **QCore.js**, the official JavaScript and TypeScript client, published on npm as `@quantovainc/qcore`.
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
| Testnet | `https://rpc-testnet.quantova.org` |
| Local dev | `http://127.0.0.1:8645` |

Mainnet is not yet live. The testnet chain is named Q-test-net-01, and the examples sign
for it unless `QUANTOVA_CHAIN` names another chain, such as that of a local node. The gateway methods are `node_info`, `head`, `validators`,
`chain_params`, `get_account`, `get_transaction`, `submit_transaction`,
`get_block`, `supply`, `get_container`, `get_storage`, and `get_events`.

Get free TQTOV for the testnet from the faucet, install the QMask wallet, and
register names with QNS.

## Running the examples

```bash
# Python
cd examples/python
git clone --branch v0.6.1 https://github.com/Quantova/QCore.rs
git clone --branch v0.6.1 https://github.com/Quantova/QCore.py
(cd QCore.py && maturin develop)
export QUANTOVA_GATEWAY=https://rpc-testnet.quantova.org
python connect.py

# JavaScript
cd examples/javascript
npm ci
export QUANTOVA_GATEWAY=https://rpc-testnet.quantova.org
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
