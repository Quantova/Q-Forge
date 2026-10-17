# Copyright 2026 Quantova Inc
# SPDX-License-Identifier: Apache-2.0 OR MIT

import os
import sys

from _common import GATEWAY, banner, connect, to_qtov


def main():
    banner("Quantova connect and read with QCore.py")
    c = connect()
    info = c.node_info()
    print(f"Gateway {GATEWAY}")
    print(f"Chain   {info['chain_id']}  genesis {info['genesis_hash']}")
    print(f"Head    {c.head()['height']}")
    address = os.environ.get("QUANTOVA_ADDRESS") or (sys.argv[1] if len(sys.argv) > 1 else None)
    if not address:
        print("\nGive an address with QUANTOVA_ADDRESS or as the first argument to read its balance.")
        return
    account = c.account(address)
    print(f"\n{address}")
    print(f"Balance {to_qtov(account.get('balance', 0))} QTOV   nonce {account.get('nonce', 0)}")


if __name__ == "__main__":
    main()
