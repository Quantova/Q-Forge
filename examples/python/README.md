# Python examples (QCore.py)

Runnable samples using the official Python client. Point them at any gateway.

```bash
git clone --branch v0.4.0 https://github.com/Quantova/QCore.py
(cd QCore.py && maturin develop)
export QUANTOVA_GATEWAY=https://rpc-testnet.quantova.org   # or http://127.0.0.1:8645
```

| File | What it shows |
|---|---|
| [connect.py](connect.py) | Connect and read chain state, node info, head, and an account, no keys |
| [transfer.py](transfer.py) | ML-DSA-65 signed QTOV transfer |
| [contract_call.py](contract_call.py) | Read a QVM contract account and call it |

```bash
python connect.py
QUANTOVA_SEED_FILE=account.seed QUANTOVA_TO=Q1... python transfer.py
QUANTOVA_CONTRACT=Q1... python contract_call.py
```

Signing examples read the account seed from the file named by `QUANTOVA_SEED_FILE`.
The file holds the 64 hex character seed and must be readable only by you
(`chmod 600`), otherwise the examples refuse to run. `QUANTOVA_TO`,
`QUANTOVA_AMOUNT` and `QUANTOVA_MAX_FEE` set the transfer, with amounts as whole
numbers of Quon. `QUANTOVA_CONTRACT` selects the container to read, and
`QUANTOVA_CALL_ARGS` with a seed file also submits a call. Plain HTTP is accepted
only for a local gateway.
