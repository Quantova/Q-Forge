# Copyright 2026 Quantova Inc
# SPDX-License-Identifier: Apache-2.0 OR MIT

import json
import os
import re

from _common import QSTAMP_CONTRACT, banner, connect, expected_nonce, index_of, read_seed, whole_env, wipe


def main():
    banner("Quantova QVM container call with QCore.py")
    c = connect()
    print(f"Head {c.head()['height']}")
    contract = os.environ.get("QUANTOVA_CONTRACT", QSTAMP_CONTRACT)
    print(f"Container {contract}")
    seed = read_seed()
    args = os.environ.get("QUANTOVA_CALL_ARGS")
    if seed is None or not args:
        print("\nTo call the container, set QUANTOVA_SEED_FILE and QUANTOVA_CALL_ARGS, the hex call arguments")
        print("produced from the interface that the Quanta compiler emits for the contract.")
        return
    try:
        if not re.fullmatch(r"(?:[0-9a-f]{2})+", args):
            raise ValueError("QUANTOVA_CALL_ARGS is lowercase hex")
        meter = int(whole_env("QUANTOVA_METER", "30000"))
        max_fee = whole_env("QUANTOVA_MAX_FEE", "50000")
        signed, outcome = c.call(seed, index_of(), contract, args, meter, max_fee, expected_nonce())
        print(f"Submitted {signed['tx_id']}, signed with ML-DSA-65")
        print(json.dumps(outcome))
    finally:
        wipe(seed)


if __name__ == "__main__":
    main()
