#!/usr/bin/env python3
# Copyright 2026 Quantova Inc
# SPDX-License-Identifier: Apache-2.0 OR MIT

"""Example 3, QNS name resolution (QCore.py)

Resolve a Quantova name under the capital Q top level domain to a Q1 address
through the on chain QNS registry container, look up its owner, and reverse resolve
an address back to a name.

Run
    export QUANTOVA_GATEWAY=http://127.0.0.1:8645
    python qns_resolve.py
"""

from _common import banner, connect

QNS_REGISTRY = "Q1SNR7WZ2K9V5C3XM8H6U0AGNE2STV4YP93QDF"  # example QNS registry container
NAME = "alice.Q"


def main():
    banner("Quantova example, QNS name resolution (QCore.py)")
    q = connect()
    print(f"Head height {q.head()['height']}")

    qns = q.qns(QNS_REGISTRY)
    print(f"QNS registry {QNS_REGISTRY}")

    addr = qns.resolve(NAME)
    print(f"\nresolve('{NAME}')  returns {addr}")

    try:
        owner = qns.owner(NAME)
        print(f"owner('{NAME}')    returns {owner}")
    except Exception as e:
        print(f"owner('{NAME}')    returns (not available {e})")

    if addr:
        try:
            name = qns.reverse(addr)
            print(f"reverse({addr[:12]}...) returns {name}")
        except Exception as e:
            print(f"reverse(...)       returns (not available {e})")

    print("\nQNS maps human names under the capital Q top level domain to Quantova")
    print("accounts through the on chain registry container.")


if __name__ == "__main__":
    main()
