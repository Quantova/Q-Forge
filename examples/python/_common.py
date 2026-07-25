# Copyright 2026 Quantova Inc
# SPDX-License-Identifier: Apache-2.0 OR MIT

"""Shared configuration and helpers for the Quantova Python examples.

Each example imports connect() to get a configured QCore client and small
formatting helpers. Point QUANTOVA_GATEWAY at any gateway.

    export QUANTOVA_GATEWAY=https://testnet.quantova.io   # public testnet
    export QUANTOVA_GATEWAY=http://127.0.0.1:8645          # local node (default)

Every gateway call is an HTTP POST to /v1/<method> with a flat JSON body.
"""

import os

from qcore import QCore

# One QTOV is one million Quon. Quon is the base unit.
QUON = 1_000_000

# Default to a local node, override with QUANTOVA_GATEWAY.
GATEWAY = os.environ.get("QUANTOVA_GATEWAY", "http://127.0.0.1:8645")


def use_demo_backend():
    """Register a DEMO post quantum crypto backend so the signing examples run end
    to end offline.

    This is for demonstration only. In a real app you register Quantova's native
    Q-Crypto backend instead, the wallet API is identical, so the example code does
    not change. The demo backend produces deterministic, well formed signatures but
    is NOT cryptographically secure and must never be used with real value.
    """
    import hashlib

    from qcore import crypto_backend

    class _DemoBackend:
        def ml_dsa_65_pair_from_seed(self, seed):
            # Mimic Quantova's account shape. A real account derives a Q1 bech32m
            # address from a SHA-3 and SHAKE hash of the ML-DSA-65 public key. This
            # demo returns a deterministic stand in only.
            digest = hashlib.sha3_256(b"ml-dsa-65" + bytes(seed)).digest()
            return {"public_key": digest, "address": "Q1DEMO" + digest.hex()[:34].upper()}

        def ml_dsa_65_sign(self, seed, public_key, message):
            return hashlib.sha3_512(b"ml-dsa-65" + bytes(seed) + bytes(message)).digest()

        def ml_dsa_65_verify(self, public_key, message, signature):
            return len(signature) == 64

    crypto_backend.set_backend(_DemoBackend())
    return True


def connect():
    """Return a QCore client pointed at GATEWAY."""
    return QCore(GATEWAY)


def to_qtov(quon_value):
    """Format an integer Quon value as a human TQTOV or QTOV string."""
    if isinstance(quon_value, str):
        quon_value = int(quon_value, 16) if quon_value.startswith("0x") else int(quon_value)
    whole = quon_value / QUON
    return f"{whole:,.6f}".rstrip("0").rstrip(".")


def to_quon(qtov_value):
    """Convert a QTOV amount, int, float, or str, to integer Quon."""
    return int(round(float(qtov_value) * QUON))


def num(hex_or_int):
    """Coerce a hex string or int to int."""
    if isinstance(hex_or_int, str):
        return int(hex_or_int, 16) if hex_or_int.startswith("0x") else int(hex_or_int)
    return int(hex_or_int)


def banner(title):
    line = "=" * 64
    print(line)
    print(f"  {title}")
    print(line)
