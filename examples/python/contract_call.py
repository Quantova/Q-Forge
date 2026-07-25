#!/usr/bin/env python3
# Copyright 2026 Quantova Inc
# SPDX-License-Identifier: Apache-2.0 OR MIT

"""Example 2, QVM container call (QCore.py)

Read from and invoke a QAsset token on the Quantova Virtual Machine. The QVM is a
register machine that runs compiled containers. Contracts are written in Quanta and
compiled to a container. You read container state through the gateway with
get_container and get_storage, and you invoke a container by submitting an ML-DSA-65
signed transaction.

Run
    export QUANTOVA_GATEWAY=http://127.0.0.1:8645
    python contract_call.py
"""

from _common import banner, connect, use_demo_backend

TOKEN = "Q1QDF7WZ2R9V5C3XM8H6U0AGNE2SKTV4YP9CJ3"    # example QAsset container
HOLDER = "Q1GP3FR9CVK3XAJSQGC7DU47WCDUVTFDYMY0H82C"  # example holder


def main():
    banner("Quantova example, QVM container call (QAsset) (QCore.py)")
    use_demo_backend()
    q = connect()
    print(f"Head height {q.head()['height']}")

    # Confirm the container exists on chain.
    container = q.get_container(TOKEN)
    print(f"Token container {TOKEN}")
    print(f"code size {container.get('size', 'n/a')} bytes")

    token = q.contract(TOKEN)

    # Read a QAsset balance. Secured contract state is a map from a 32 byte key to a
    # single word value, so a balance reads back as one word.
    bal = token.balance_of(HOLDER)
    print(f"\nbalanceOf({HOLDER}) = {bal}  (a single word map value)")

    # Build and ML-DSA-65 sign an invoke, transfer 25 units.
    sender = q.wallet.create()
    signed = token.build_transfer(sender, to=HOLDER, amount=25)
    print(f"\nInvoke transfer 25 units of the QAsset, from {sender.address}")
    print(f"ML-DSA-65 signature {signed.signature_hex[:34]}...")

    try:
        result = q.submit_transaction(signed)
        print(f"Submitted. tx hash {result['hash']}")
        tx = q.get_transaction(result["hash"])
        print(f"status {tx.get('status')}")
    except Exception as e:
        print(f"(submit step {e})")


if __name__ == "__main__":
    main()
