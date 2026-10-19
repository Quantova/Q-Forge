# Getting Started

This guide takes you from nothing to reading the chain and submitting your first
ML-DSA-65 signed transaction with the Quantova tools.

## 1. Pick a client

Quantova has two official clients with the same surface, both binding to the Rust
core QCore.rs.

For JavaScript and TypeScript, install the pinned package.

```bash
npm install @quantovainc/qcore@0.9.1
```

For Python, build QCore.py outside your project from the exact 0.9.0 release commits, inside a virtual environment with maturin 1.15.0 pinned to the sha256 of every wheel PyPI publishes for it and installed from wheels only, so pip refuses any other bytes and never runs a source build, with the Rust compiler pinned to rustc 1.98.0 through rustup, and with the locked dependency set. You need Python 3.11 or later, because maturin needs no further packages there, and rustup.

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

Each step runs only when the one before it succeeded, so a checkout that does not match the release commits stops before any of its code runs. The block stops at its first check on a Python older than 3.11, and `_common.py` refuses to run on one. Keep `qcore-venv` active when you run Python code against QCore.py.

## 2. Choose a gateway

Point the client at a gateway. Every call is an HTTP POST to `/v1/<method>` with a
flat JSON body. There is no WebSocket transport.

| Environment | Gateway base URL |
|---|---|
| Live network Q-test-net-01 | `https://rpc-testnet.quantova.org` |
| Local dev | `http://127.0.0.1:8645` |

The live network is named Q-test-net-01, and its native asset TQTOV is a test asset ahead of the mainnet launch. The examples sign for Q-test-net-01 unless `QUANTOVA_CHAIN` names another chain, such as that of a local node.

```bash
export QUANTOVA_GATEWAY=https://rpc-testnet.quantova.org
```

## 3. Connect and read

Install QCore.js with `npm install @quantovainc/qcore@0.9.1`. Build QCore.py from its 0.9.0 release commit bca87c94cd2e52166f875c0967a03d66b41ac4ff, next to QCore.rs at commit d2112c88b6b31d84f0d27d122b9b38dfd561eabb, with the pinned commands in step 1 above. QCore.py imports as `quantova_qcore`.

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

Runnable versions are [../examples/python/connect.py](../examples/python/connect.py)
and [../examples/javascript/connect.js](../examples/javascript/connect.js).

## 4. Get a wallet and test funds

1. Install QMask and create an account. Its Q1 address begins with a capital Q.
2. Claim free TQTOV for your address from the faucet.

## 5. Submit your first transaction

A transfer is built, signed with ML-DSA-65, and submitted through the gateway
`submit_transaction` method. The runnable examples show the full flow end to end.

* [../examples/python/transfer.py](../examples/python/transfer.py)
* [../examples/javascript/transfer.js](../examples/javascript/transfer.js)

Every Quantova transaction is signed with ML-DSA-65 (FIPS 204). Transactions and
account keys use ML-DSA-65, and the client reaches the gateway over standard TLS.
Amounts are in Quon. One QTOV is one million Quon, and the native asset of the live
network Q-test-net-01 is TQTOV, a test asset.

An accepted transaction is not yet proven final. The examples prove finality with
`confirmTransaction` against a genesis hash and the validator roster of the epoch of
the block, which you pin in `examples/finality-pin.json` or in a file named by
`QUANTOVA_FINALITY_FILE`. When no roster is pinned they refuse to sign and exit with
status 3, unless you pass `--accept-unconfirmed`, and a second run of the same transfer
never pays twice. Signing for Q-test-net-01 needs QCore 0.9.0 or later and the network
genesis pinned, because the chain only accepts transactions signed over its genesis. See
[../examples/javascript/README.md](../examples/javascript/README.md) for the pin format.

## 6. Go further

* Contracts on the QVM, deploy and call Quanta contracts, see
  [../examples/python/contract_call.py](../examples/python/contract_call.py).
* Verify your work with the pq-test-vectors and node-conformance-tests tools.

See the full [tools catalog](tools-catalog.md), [for developers](for-developers.md),
and [for companies](for-companies.md).
