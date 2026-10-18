# Python examples (QCore.py)

Runnable samples using the official Python client. Point them at any gateway.

```bash
git clone --branch v0.6.1 https://github.com/Quantova/QCore.rs
git clone --branch v0.6.1 https://github.com/Quantova/QCore.py
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
`QUANTOVA_AMOUNT` and `QUANTOVA_MAX_FEE` set the transfer, the amount in QTOV with
at most six decimal places and the fee ceiling as a whole number of Quon that you
choose yourself, so the client refuses to sign when the gateway reports a higher fee.
`QUANTOVA_CONTRACT` selects the container to read, and `QUANTOVA_CALL_ARGS` with a
seed file also submits a call. `QUANTOVA_NONCE` names the nonce you expect when you
sign again after a transaction that never landed, and it must be the nonce the
gateway reports. The client signs for the testnet chain Q-test-net-01 by default.
`QUANTOVA_CHAIN` names another chain, such as that of a local node, and the client
then signs only for that chain. The seed is held in a bytearray and wiped after use.
Plain HTTP is accepted only for a local gateway.
