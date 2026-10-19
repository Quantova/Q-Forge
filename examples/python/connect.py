# Copyright 2026 Quantova Inc
# SPDX-License-Identifier: Apache-2.0 OR MIT

import os
import sys

from _common import GATEWAY, banner, chain_id, connect, height, node_info, printable, run, to_qtov


def main():
    banner("Quantova connect and read with QCore.py")
    c = connect()
    info, head = node_info(c, False)
    print(f"Gateway {printable(GATEWAY)}")
    print(f"Chain   {printable(chain_id())}  genesis {printable(info.get('genesis_hash'))}  head {head}")
    top = c.head()
    print(f"Head    {height(top.get('height') if isinstance(top, dict) else None, 'head height')}")
    given = [a for a in sys.argv[1:] if not a.startswith("--")]
    address = os.environ.get("QUANTOVA_ADDRESS") or (given[0] if given else None)
    if not address:
        print("\nGive an address with QUANTOVA_ADDRESS or as the first argument to read its balance.")
        return
    account = c.account(address)
    print(f"\n{printable(address)}")
    print(f"Balance {to_qtov(account.get('balance', 0))} QTOV   nonce {height(account.get('nonce', 0), 'nonce')}")


if __name__ == "__main__":
    run(main, True)
