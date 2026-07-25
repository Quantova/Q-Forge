#!/usr/bin/env python3
# Copyright 2026 Quantova Inc
# SPDX-License-Identifier: Apache-2.0 OR MIT

"""Example 1, Native transfer (QCore.py)

Send TQTOV from one Quantova account to another. Shows connecting, reading a
balance and nonce, reading the fee from the chain parameters, deriving an ML-DSA-65
account, and signing the transfer before submitting it through the gateway.

Run
    export QUANTOVA_GATEWAY=http://127.0.0.1:8645   # or https://testnet.quantova.io
    python transfer.py

This example registers a DEMO post quantum backend so it runs end to end offline.
In a real app you register Quantova's native Q-Crypto backend instead, the wallet
API is identical.
"""

from _common import banner, connect, to_quon, to_qtov, use_demo_backend

RECIPIENT = "Q1GP3FR9CVK3XAJSQGC7DU47WCDUVTFDYMY0H82C"  # example Q1 address, replace with a real one
AMOUNT_QTOV = 1.5


def main():
    banner("Quantova example, native TQTOV transfer (QCore.py)")
    use_demo_backend()  # demo only, real apps register the native Q-Crypto backend
    q = connect()

    head = q.head()
    print(f"Head height {head['height']}")

    # derive an ML-DSA-65 sender account, its Q1 address begins with a capital Q
    sender = q.wallet.create()
    print(f"Sender (ML-DSA-65) {sender.address}")

    account = q.get_account(sender.address)
    print(f"Balance {to_qtov(account.get('balance', 0))} TQTOV   nonce {account.get('nonce', 0)}")

    # fee comes from the chain parameters
    params = q.chain_params()
    print(f"Base fee {params.get('base_fee', params.get('min_fee', 'n/a'))} Quon")

    # build the transfer and sign it with ML-DSA-65
    amount = to_quon(AMOUNT_QTOV)
    signed = q.wallet.sign_transfer(sender, to=RECIPIENT, amount=amount)
    print(f"\nTransfer {AMOUNT_QTOV} TQTOV to {RECIPIENT}  (amount {amount} Quon)")
    print(f"ML-DSA-65 signature {signed.signature_hex[:34]}...")

    # submit through the gateway
    try:
        result = q.submit_transaction(signed)
        print(f"Submitted. tx hash {result['hash']}")
        tx = q.get_transaction(result["hash"])
        print(f"Included in block {tx.get('block')}   status {tx.get('status')}")
    except Exception as e:
        print(f"(submit step {e})")


if __name__ == "__main__":
    main()
