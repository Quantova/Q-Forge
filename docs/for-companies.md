# For Companies

How an organization adopts the Quantova tools and builds on Quantova, a post
quantum Layer 1 blockchain. This is aimed at teams evaluating Quantova for
products, treasury, infrastructure, or compliance reasons.

Quantova is on testnet, ahead of a mainnet launch, and has not yet completed
external security audit. Plan around that. The stack is post quantum across the
whole design, with keys, signatures, and finality built on the NIST post quantum
standards.

## Why post quantum matters for an organization

Classical public key blockchains authenticate every transaction with elliptic
curve signatures that a sufficiently capable quantum computer can eventually break
with Shor's algorithm. The risk is not only future. A harvest now, decrypt later
adversary can record on chain public keys and signatures today and forge them
later. For an organization holding assets, issuing transactions, or relying on on
chain records, that is a long lived exposure.

Quantova removes it at the root. Accounts, validator authority, and every
transaction are secured with the Q-Crypto post quantum stack, with no elliptic
curve and no classical public key cryptography anywhere in the chain. Adopting the
Quantova tools means your integration is post quantum by default, not as an add on.
See [post-quantum-overview.md](post-quantum-overview.md).

## Adoption path

1. **Evaluate on testnet.** Build against `https://testnet.quantova.io` with
   QCore.js and QCore.py and free TQTOV from the faucet. No spend, full stack.
2. **Integrate the clients.** Use QCore.js for web and Node services and QCore.py
   for backends, data, and automation to read state and submit ML-DSA-65 signed
   transactions.
3. **Handle keys with QMask or your own signer.** QMask provides post quantum key
   management for users. For server side signing, integrate Quantova's native
   Q-Crypto backend through the client.
4. **Name your accounts and contracts** with QNS under the capital Q top level
   domain for human readable identifiers.
5. **Verify continuously**, see below, and track the road to mainnet, which is not
   yet live.

## Operating against a post quantum stack

The verification tools let an organization check what it runs and integrates.

* **Confirm your implementation is correct.** Run **pq-test-vectors** against your
  address derivation, hashing, and signature handling so your integration matches
  the protocol.
* **Confirm the node you depend on is genuine.** Run **node-conformance-tests**
  against any node, your own or a provider's, to confirm it is a canonical Quantova
  node with healthy QORUS consensus and finality, on a schedule or in CI.

Both tools are read only and hold no keys, so they are safe to run in your
infrastructure and safe to wire into automated checks. They confirm correctness and
conformance. They are not a substitute for the external audits still ahead.

## What to standardize internally

* **Endpoints and chain identity** from the **chain-params** tool, the gateway base
  URL, genesis, and network parameters, pinned in your configuration.
* **A verification step in CI**, pq-test-vectors for your code and
  node-conformance-tests for the node.
* **Key management policy**, how ML-DSA-65 signing keys are stored and rotated, and
  where signing happens.

## Licensing

The Quantova tools are published under the Apache 2.0 and MIT licenses, at your
option. See `LICENSE-APACHE` and `LICENSE-MIT`, and `LICENSE-OVERVIEW.md`.
