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

The Quantova network is live, and its native asset TQTOV runs on test ahead of
the mainnet launch.

## Start here

* New to Quantova, read [docs/getting-started.md](docs/getting-started.md).
* Want the full list of tools, read [docs/tools-catalog.md](docs/tools-catalog.md).
* Building something, read [docs/for-developers.md](docs/for-developers.md).
* Evaluating for an organization, read [docs/for-companies.md](docs/for-companies.md).
* Why post quantum, read [docs/post-quantum-overview.md](docs/post-quantum-overview.md).

## Quick example

Connect to the Quantova gateway and read the chain, no keys required.

Install QCore.js with `npm install @quantovainc/qcore@0.9.1`. Build QCore.py from its 0.9.0 release commit bca87c94cd2e52166f875c0967a03d66b41ac4ff, next to QCore.rs at commit d2112c88b6b31d84f0d27d122b9b38dfd561eabb, with the pinned commands under Running the examples below. QCore.py imports as `quantova_qcore`.

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

Build and submit an ML-DSA-65 signed transfer.

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

The seed file holds the 64 hex character seed of a funded account and must be readable only by you. `read_seed` and `readSeed` are the readers in [snippets/README.md](snippets/README.md), which refuse a file anyone else can read, decode the hex into a fresh array and wipe the raw bytes. Amounts are whole numbers of Quon, one QTOV is one million Quon, and the last argument is the largest fee you allow, so the client refuses to sign if the gateway reports a higher fee. Pass no nonce for a normal send. An accepted outcome means the gateway took the transaction. The examples then prove it final with `confirmTransaction` against a genesis hash and the validator roster of the epoch of its block, which you pin in `examples/finality-pin.json`, and they refuse to sign with exit status 3 when they could not prove it unless you pass `--accept-unconfirmed`. Signing for Q-test-net-01 needs QCore 0.9.0 or later and the network genesis pinned, because the chain only accepts transactions signed over its genesis.

Read a QVM container and call it.

```js
async function callContract(c, seed) {
  const container = await c.container(CONTRACT);
  const storage = await c.storage(CONTRACT);
  return c.call(seed, 0, CONTRACT, ARGS_HEX, 30000n, '50000');
}
```

ARGS_HEX are the call arguments produced from the interface that the Quanta compiler emits for the contract. QCore.py offers the same call and storage methods, and the container read is in QCore.js.

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
* **faucet**, free TQTOV, the native test asset of the live network.
* **QNS**, the name service under the capital Q top level domain.

**Verify**
* **pq-test-vectors**, known answer vectors and a verifier for the Q-Crypto primitives.
* **node-conformance-tests**, a read only checker for a running node.

## Endpoints

Quantova speaks a plain HTTP gateway. Every call is an HTTP POST to `/v1/<method>`
with a flat JSON body. There is no WebSocket transport.

| Environment | Gateway base URL |
|---|---|
| Live network Q-test-net-01 | `https://rpc-testnet.quantova.org` |
| Local dev | `http://127.0.0.1:8645` |

The live network is named Q-test-net-01, and its native asset TQTOV is a test asset ahead of
the mainnet launch. The examples sign for Q-test-net-01 unless `QUANTOVA_CHAIN` names another chain, such as that of a local node. The gateway methods are `node_info`, `head`, `validators`,
`chain_params`, `get_account`, `get_transaction`, `submit_transaction`,
`get_block`, `supply`, `get_container`, `get_storage`, and `get_events`.

Get free TQTOV from the faucet, install the QMask wallet, and
register names with QNS.

## Running the examples

Build QCore.py once, outside this repository, from the exact 0.9.0 release commits, inside a virtual environment with maturin 1.15.0 pinned to the sha256 of every wheel PyPI publishes for it and installed from wheels only, so pip refuses any other bytes and never runs a source build, with the Rust compiler pinned to rustc 1.98.0 through rustup, and with the locked dependency set. You need Python 3.11 or later, because maturin needs no further packages there, and rustup.

```bash
QDIR="$HOME/quantova-src"
mkdir -p "$QDIR"
cat > "$QDIR/maturin-requirements.txt" <<'EOF'
maturin==1.15.0 \
    --hash=sha256:0ebf9767892725083138e671c34482c660317a2f3d6a29fc0e0f34e9d8c99136 \
    --hash=sha256:126e12e618b4db42f68c779a56d41f82a390145ba36ac3f621d057eb34f5ad9d \
    --hash=sha256:4f9d33e6c3f9615c8caceecbbbd440f8eb25a3ddeb687077682cd5eca2e9ae15 \
    --hash=sha256:552c2be4afd43fe8d5c9f3ec8d4c4756d973b8dcbe94c14084390301f50243e1 \
    --hash=sha256:653020a63525bb224e5ab0adf02e17a2e08bc86dbea7fc1399c9a56d7529b99e \
    --hash=sha256:6bf6dc62e22d4dcfd5a51244ff0d58975fa4979c48209fe84159617648956d82 \
    --hash=sha256:7ab7eebffd7b8debca2265985de4eaeb332141276d24b9560b5ad484d4b3add1 \
    --hash=sha256:7eb066372f541f8eb4909c79c5d9bd0b9e8125980bdf1ec9e8aba23c6c8d6c55 \
    --hash=sha256:bf29beddd0c6708f112db51d5275fc28b28b9e9c9c5faae387eaef662918b176 \
    --hash=sha256:c40b4eae7bf5ef1f4b1af8d623fe4105016f93578fb15b764e741d08ec3b92dd \
    --hash=sha256:c7dc0c66c78d3debdd9c5aa807e861fbcbf07f3505d34b125df74c03986b0f48 \
    --hash=sha256:cd35772633f489841132bc8e71d6fc7f842df30b9c05cd5cdf1ee1ddcb744cc7 \
    --hash=sha256:da649988be98e87e009e51b1bf0d301b6a301bc0cecbdd60d40d8ba60748d1ca
EOF
cd "$QDIR" &&
git clone https://github.com/Quantova/QCore.rs QCore.rs &&
git clone https://github.com/Quantova/QCore.py QCore.py &&
git -C QCore.rs checkout --quiet d2112c88b6b31d84f0d27d122b9b38dfd561eabb &&
git -C QCore.py checkout --quiet bca87c94cd2e52166f875c0967a03d66b41ac4ff &&
test "$(git -C QCore.rs rev-parse HEAD)" = d2112c88b6b31d84f0d27d122b9b38dfd561eabb &&
test "$(git -C QCore.py rev-parse HEAD)" = bca87c94cd2e52166f875c0967a03d66b41ac4ff &&
python3 -c 'import sys; sys.exit(sys.version_info < (3, 11))' &&
python3 -m venv qcore-venv &&
. qcore-venv/bin/activate &&
pip install --only-binary :all: --require-hashes -r maturin-requirements.txt &&
{ rustup run 1.98.0 rustc --version || rustup toolchain install 1.98.0 --profile minimal; } &&
(cd QCore.py && rustup run 1.98.0 maturin develop --release --locked)
```

Each step runs only when the one before it succeeded, so a checkout that does not match the release commits stops before any of its code runs. The block stops at its first check on a Python older than 3.11, and `_common.py` refuses to run on one. Then run the examples from your clone of this repository, with `qcore-venv` still active for Python.

```bash
cd examples/python
export QUANTOVA_GATEWAY=https://rpc-testnet.quantova.org
python connect.py

cd ../javascript
npm ci
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
