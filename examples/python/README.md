# Python examples (QCore.py)

Runnable samples using the official Python client. Point them at any gateway.

QCore.py is not on PyPI, so you build it from source. Clone QCore.rs and QCore.py into a directory of their own, outside this repository, and check out the exact release commits by hash. A tag can be moved, a commit hash cannot. Build inside a virtual environment with maturin 1.15.0 pinned to the sha256 of every wheel PyPI publishes for it and installed from wheels only, so pip refuses any other bytes and never runs a source build, with the Rust compiler pinned to rustc 1.98.0 through rustup, and with the locked dependency set. You need Python 3.11 or later, because maturin needs no further packages there, and rustup.

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
git -C QCore.rs checkout --quiet a8453162c84be24921315ef3b5c50c14e320a079 &&
git -C QCore.py checkout --quiet 1ddca965c203126cc04ed825b133df3ebb4e4dab &&
test "$(git -C QCore.rs rev-parse HEAD)" = a8453162c84be24921315ef3b5c50c14e320a079 &&
test "$(git -C QCore.py rev-parse HEAD)" = 1ddca965c203126cc04ed825b133df3ebb4e4dab &&
python3 -c 'import sys; sys.exit(sys.version_info < (3, 11))' &&
python3 -m venv qcore-venv &&
. qcore-venv/bin/activate &&
pip install --only-binary :all: --require-hashes -r maturin-requirements.txt &&
{ rustup run 1.98.0 rustc --version || rustup toolchain install 1.98.0 --profile minimal; } &&
(cd QCore.py && rustup run 1.98.0 maturin develop --release --locked)
```

Each step runs only when the one before it succeeded, so a checkout that does not match the two release commits stops the build before any code from it runs. The block stops at its first check on a Python older than 3.11, and `_common.py` refuses to run on one. The commits are QCore.rs a8453162c84be24921315ef3b5c50c14e320a079 and QCore.py 1ddca965c203126cc04ed825b133df3ebb4e4dab, the 0.9.0 release. `--locked` builds with the Cargo.lock in QCore.py and fails if it would change. Keep `qcore-venv` active when you run the examples.

```bash
export QUANTOVA_GATEWAY=https://q-test-net-01.quantova.org   # or http://127.0.0.1:8645
```

| File | What it shows |
|---|---|
| [connect.py](connect.py) | Connect and read chain state, node info, head, and an account, no keys |
| [transfer.py](transfer.py) | ML-DSA-65 signed QTOV transfer |
| [contract_call.py](contract_call.py) | Read a QVM contract's storage and call it |

```bash
python connect.py
QUANTOVA_SEED_FILE=account.seed QUANTOVA_TO=Q1... python transfer.py
QUANTOVA_CONTRACT=Q1... python contract_call.py
```

Signing examples read the account seed from the file named by `QUANTOVA_SEED_FILE`.
The file holds the 64 hex character seed and must be readable only by you
(`chmod 600`), otherwise the examples refuse to run. `QUANTOVA_TO`,
`QUANTOVA_AMOUNT` and `QUANTOVA_MAX_FEE` set the transfer, the amount in QTOV with
at most six decimal places and the fee ceiling as a whole number of Quon that you
choose yourself, so the client refuses to sign when the gateway reports a higher fee.
`QUANTOVA_CONTRACT` selects the container to read, and `QUANTOVA_CALL_ARGS` with a
seed file also submits a call. Leave `QUANTOVA_NONCE` unset for a normal send, so the
client picks the nonce and never signs two transactions for one nonce. Set it only to
replace a transaction that never landed, to the nonce you recorded when you signed
that transaction, which the gateway must still report. The client signs for the live network Q-test-net-01 by default.
`QUANTOVA_CHAIN` names another chain, such as that of a local node, and the client
then signs only for that chain. The seed file is read into a bytearray and decoded
without building a hex string, and both are wiped after use. Plain HTTP is accepted
only for a local gateway.

An accepted transaction is not yet proven final. When `../finality-pin.json`, or the
file named by `QUANTOVA_FINALITY_FILE`, holds a genesis hash and validator rosters you
trust for the configured chain, the signing examples wait until the gateway reports
the transaction finalised and then prove it with `confirm_transaction`, using the roster pinned
for the epoch of its block. Sortition roots change every epoch, so list one roster per
epoch under `epochs`, each entry an `epoch` number with its `roster`. A roster under
`roster` serves any epoch that `epochs` does not name. The epoch of a block is its height
divided by the `root_slots` of its validators. Before signing, the examples check that
the pin holds a roster for every epoch the transaction can land in, and refuse to sign
otherwise. A pin file must be a regular file that only its owner can write, it is never
read through a symbolic link, and a filled pin that names another chain stops the
examples. Take the genesis hash and rosters from a source you trust, never from the
gateway you send through.

When no validator roster is pinned, the finality of a transaction cannot be proven, so
the signing examples print NOT SIGNED and exit with status 3 before they sign anything.
When a roster is pinned but misses an epoch the transaction can land in, they stop with
exit status 1, also before signing. Pass `--accept-unconfirmed`, or set
`QUANTOVA_ACCEPT_UNCONFIRMED=1`, to sign anyway. When the result then cannot be proven
the examples print NOT CONFIRMED, say that you accepted it, and exit with status 0. A
proof that fails always ends with exit status 1.

Before they sign, the signing examples record the transaction in a session file of your
own user under `~/.quantova/transfer-sessions` or `~/.quantova/call-sessions`, one file
per sender, chain and transaction, created with mode 600 in directories with mode 700.
Just before the signed transaction leaves for the gateway the file records its id, which
the client computes when it signs. A second run of the same transfer or call therefore
never pays twice, also when the recipient or contract address is written in lower case,
because every address is read in its upper case form. When the earlier transaction is final it signs nothing and proves that
one, when it has not landed and the account is still at the same nonce it signs again at
that nonce so at most one of them can land, and when the account has moved on it stops
and asks you to check by hand. Pass `--send-again` to send an identical transaction on
purpose. `QUANTOVA_STATE_DIR` moves the `~/.quantova` directory.

The repository ships the pin empty until the values for Q-test-net-01 are published.
Signing for Q-test-net-01 or any mainnet chain needs QCore 0.10.0 or later and the genesis
hash of that network pinned in `../finality-pin.json`, because the chain only accepts
transactions signed over its genesis, so without both the examples refuse to sign.
Reading the chain works with any release. QCore 0.10.0 and later sign over the pinned
genesis and refuse a gateway that names another one, and a genesis built into the client
that differs from the pin stops the examples. QCore 0.8.0 and earlier
cannot sign over a genesis, so with them the examples sign only for a local chain that
`QUANTOVA_CHAIN` names and stop at once when a genesis hash is pinned. A pin file must be a regular file
owned by the user who runs the examples that nobody else can write.
