# Quantova Tools Catalog

The set of tools Quantova publishes for building on and verifying the network.
Everything here is post quantum by construction. Accounts, signatures, and
authorization use the Q-Crypto stack, ML-DSA-65 signatures and SHA-3 with SHAKE
hashing. Quantova is on testnet, ahead of a mainnet launch.

## Build on Quantova

| Tool | What it is | Use it to |
|---|---|---|
| **QCore.js** | Official JavaScript and TypeScript client, npm `@quantovainc/qcore` | Connect, read state, build and ML-DSA-65 sign transactions, call QVM containers, resolve names, from web apps and Node |
| **QCore.py** | Official Python client | The same, from Python, for backends, scripts, and data tooling |
| **QCore.rs** | The Rust core the clients bind to | Build native services and custom bindings on the same core |
| **QMask** | Native post quantum wallet browser extension | Create accounts, sign transactions, and inject a post quantum signer for apps |
| **QVM** | Quantova Virtual Machine, a deterministic register machine that runs compiled containers | Deploy and run Quanta contracts, invoked by ML-DSA-65 signed transactions |
| **Quanta** | The contract language, compiled to QVM containers | Write contracts where whole classes of vulnerability are caught at compile time |
| **examples** | Runnable sample programs in QCore.js and QCore.py | Learn the common flows by running real code, transfer, container call, naming |

## Network and assets

| Tool | What it is | Use it to |
|---|---|---|
| **chain-params** | Gateway endpoints, genesis, and network parameters | Connect a node or client to the testnet, read the network parameters |
| **faucet** | Free testnet asset, TQTOV | Get TQTOV to build and test without spending anything of value |
| **QNS** | The Quantova Name Service, names under the capital Q top level domain | Register names such as `alice.Q` that resolve to Quantova accounts |

Assets on Quantova follow two standards. QAsset is the fungible token standard and
QCollectible is the non fungible standard. The base asset is QTOV, its base unit is
the Quon, and one QTOV is one million Quon. The testnet asset is TQTOV.

## Verify

| Tool | What it is | Use it to |
|---|---|---|
| **pq-test-vectors** | Known answer test vectors and a verifier | Confirm any implementation matches the protocol, address derivation, hashing, and the ML-DSA-65 signature scheme |
| **node-conformance-tests** | Read only node checker | Confirm a running node is a canonical Quantova node with healthy QORUS consensus and finality |

Both verification tools are read only and hold no keys. They confirm correctness
and conformance. They are not a security audit. External audits are still ahead.

## How the tools fit together

* **Develop** with QCore.js or QCore.py against the gateway in **chain-params**,
  using **QMask** for signing and the **faucet** for test funds.
* **Name** your accounts and contracts with **QNS**.
* **Verify** your implementation with **pq-test-vectors** and the node you build
  against with **node-conformance-tests**.

See [getting-started.md](getting-started.md) to begin, [for-developers.md](for-developers.md)
for build workflows, and [for-companies.md](for-companies.md) for adopting the tools
in an organization.
