# Copyright 2026 Quantova Inc
# SPDX-License-Identifier: Apache-2.0 OR MIT

import json
import os

from _common import banner, connect, index_of, read_seed, to_qtov, to_quon


def main():
    banner("Quantova native transfer with QCore.py")
    c = connect()
    info = c.node_info()
    print(f"Chain {info['chain_id']}, transfer fee {info.get('fee', {}).get('transfer_quon')} Quon")
    seed = read_seed()
    to = os.environ.get("QUANTOVA_TO")
    if seed is None or not to:
        print("\nSet QUANTOVA_SEED_FILE to a file readable only by you that holds the 64 hex character seed of a funded")
        print("account, and QUANTOVA_TO to the recipient Q1 address, then run again. QUANTOVA_AMOUNT defaults to 1.5 QTOV.")
        return
    index = index_of()
    amount = to_quon(os.environ.get("QUANTOVA_AMOUNT", "1.5"))
    max_fee = os.environ.get("QUANTOVA_MAX_FEE", "1000")
    sender = c.address(seed, index)
    print(f"From {sender}  balance {to_qtov(c.account(sender).get('balance', 0))} QTOV")
    print(f"To   {to}  amount {to_qtov(amount)} QTOV")
    signed, outcome = c.transfer(seed, index, to, amount, max_fee)
    print(f"Submitted {signed['tx_id']}, signed with ML-DSA-65")
    print(json.dumps(outcome))


if __name__ == "__main__":
    main()
