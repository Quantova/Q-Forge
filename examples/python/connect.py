#!/usr/bin/env python3
# Copyright 2026 Quantova Inc
# SPDX-License-Identifier: Apache-2.0 OR MIT

"""Connect to Quantova and read chain state (QCore.py).

The simplest use of the Quantova tools, point the client at a gateway and read the
chain. No keys, no signing.

Run
    export QUANTOVA_GATEWAY=http://127.0.0.1:8645   # or https://rpc-testnet.quantova.org
    python connect.py
"""

from _common import banner, connect, to_qtov

ADDRESS = "Q1VYSLG0VFZ73N4EM86E7YECA0EERNVJP254FLAVJ7UKE987UCLTQSUF6H9U"  # any Q1 address to inspect


def main():
    banner("Quantova connect and read (QCore.py)")
    q = connect()

    info = q.node_info()
    print(f"Node {info.get('version', 'quantovad')} on chain {info.get('chain_id', 'Q-test-net-1')}")

    head = q.head()
    print(f"Head height {head['height']}")

    account = q.get_account(ADDRESS)
    print(f"Balance of {ADDRESS} {to_qtov(account.get('balance', 0))} QTOV  nonce {account.get('nonce', 0)}")


if __name__ == "__main__":
    main()
