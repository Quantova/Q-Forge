# Post Quantum Overview

What it means that Quantova is post quantum, and how that property holds across the
whole stack.

## The threat

Elliptic curve and RSA signatures that secure classical blockchains can be broken
by a sufficiently capable quantum computer running Shor's algorithm. Because public
keys and signatures are public on chain, an adversary can record them now and forge
them once the hardware exists, a harvest now, decrypt later exposure that makes a
chain's entire history retroactively forgeable.

## Quantova's answer

Quantova is post quantum across the whole stack. The cryptography is Q-Crypto,
Quantova's implementation of the NIST post quantum standards, written against the
published FIPS documents, with no classical public key cryptography anywhere in the
chain.

* **Signatures**, ML-DSA-65 (FIPS 204) for account and validator authority.
* **Key exchange**, ML-KEM-768 (FIPS 203).
* **Hash based signatures**, SLH-DSA (FIPS 205).
* **Hashing**, SHA-3 and SHAKE (FIPS 202). Hash functions are not broken by the
  quantum attack that breaks elliptic curves.
* **Transport channel**, ChaCha20-Poly1305.

## Accounts and addresses

Every account is derived from an ML-DSA-65 public key. The address is a hash of the
public key under SHA-3 and SHAKE, encoded as a Q1 bech32m string written with a
capital Q. The account is the post quantum key.

## Consensus

Consensus is QORUS. A committee is sampled each round to attest to the proposed
block, and finality is recorded as a single aggregated certificate signed with
ML-DSA-65. The committee is bounded, so the work to finalize a block does not grow
with the validator set. Because leader selection and finality use post quantum
primitives, the agreement layer is post quantum too.

## How the property holds across the tools

Because the post quantum guarantee is fixed at the lowest layers, every tool
inherits it.

* **QCore.js and QCore.py** build and sign transactions with ML-DSA-65.
* **QMask** manages post quantum keys and produces ML-DSA-65 signatures.
* **QVM** executes compiled containers, and the transaction authorizing each
  invoke is ML-DSA-65 signed.
* **QNS** registrations and updates are ML-DSA-65 signed, so name ownership is post
  quantum.
* **pq-test-vectors** lets anyone confirm an implementation's address derivation,
  hashing, and signatures are correct.

## In short

Quantova is post quantum across the whole stack, with keys, signatures, finality,
and randomness built on the NIST post quantum standards and designed to withstand
both classical and quantum attack. The network is on testnet and has not yet
completed external security audit.
