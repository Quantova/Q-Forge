# Copyright 2026 Quantova Inc
# SPDX-License-Identifier: Apache-2.0 OR MIT

import os
import re

from _common import send_once, QSTAMP_CONTRACT, banner, connect, expected_nonce, index_of, node_info, printable, read_seed, require_address, run, settle, whole_env, wipe


def main():
    banner("Quantova QVM contract read and call with QCore.py")
    c = connect()
    contract = require_address("QUANTOVA_CONTRACT", os.environ.get("QUANTOVA_CONTRACT", QSTAMP_CONTRACT))
    seed = read_seed()
    try:
        args = os.environ.get("QUANTOVA_CALL_ARGS")
        order = None
        if seed is not None and args:
            if not re.fullmatch(r"(?:[0-9a-f]{2})+", args):
                raise ValueError("QUANTOVA_CALL_ARGS is lowercase hex")
            order = {
                "index": index_of(),
                "meter": int(whole_env("QUANTOVA_METER", "30000")),
                "max_fee": whole_env("QUANTOVA_MAX_FEE", "50000"),
                "nonce": expected_nonce(),
            }
        _, head = node_info(c, order is not None)
        print(f"Head {head}")
        print(f"Contract {contract}")
        storage = c.storage(contract)
        print(f"Storage slots {printable(storage.get('count') if isinstance(storage, dict) else None)}")
        if order is None:
            print("\nTo call the container, set QUANTOVA_SEED_FILE and QUANTOVA_CALL_ARGS, the hex call arguments")
            print("produced from the interface that the Quanta compiler emits for the contract.")
            return
        sender = c.address(seed, order["index"])
        signed, outcome = send_once(c, "call", sender, {"contract": contract, "args": args}, order["nonce"], lambda nonce: c.call(seed, order["index"], contract, args, order["meter"], order["max_fee"], nonce))
        print(f"Submitted {signed['tx_id']}, signed with ML-DSA-65")
        settle(c, signed, outcome)
    finally:
        wipe(seed)


if __name__ == "__main__":
    run(main)
