# Copyright 2026 Quantova Inc
# SPDX-License-Identifier: Apache-2.0 OR MIT

import os

from _common import send_once, banner, chain_id, connect, expected_nonce, index_of, node_info, printable, read_seed, require_address, run, settle, to_qtov, to_quon, whole_env, wipe


def main():
    banner("Quantova native transfer with QCore.py")
    c = connect()
    seed = read_seed()
    try:
        order = None
        if seed is not None and os.environ.get("QUANTOVA_TO"):
            order = {
                "to": require_address("QUANTOVA_TO", os.environ.get("QUANTOVA_TO")),
                "index": index_of(),
                "amount": to_quon(os.environ.get("QUANTOVA_AMOUNT", "1.5")),
                "max_fee": whole_env("QUANTOVA_MAX_FEE", "1000"),
                "nonce": expected_nonce(),
            }
        info, _ = node_info(c, order is not None)
        print(f"Chain {printable(chain_id())}, transfer fee {printable(info.get('fee', {}).get('transfer_quon'))} Quon")
        if order is None:
            print("\nSet QUANTOVA_SEED_FILE to a file readable only by you that holds the 64 hex character seed of a funded")
            print("account, and QUANTOVA_TO to the recipient Q1 address, then run again. QUANTOVA_AMOUNT defaults to 1.5 QTOV.")
            return
        sender = c.address(seed, order["index"])
        print(f"From {sender}  balance {to_qtov(c.account(sender).get('balance', 0))} QTOV")
        print(f"To   {order['to']}  amount {to_qtov(order['amount'])} QTOV")
        signed, outcome = send_once(c, "transfer", sender, {"to": order["to"], "amount": str(order["amount"])}, order["nonce"], lambda nonce: c.transfer(seed, order["index"], order["to"], order["amount"], order["max_fee"], nonce))
        print(f"Submitted {signed['tx_id']}, signed with ML-DSA-65")
        settle(c, signed, outcome)
    finally:
        wipe(seed)


if __name__ == "__main__":
    run(main)
