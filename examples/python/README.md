# Python examples (QCore.py)

Runnable samples using the official Python client. Point them at any gateway.

```bash
pip install qcore
export QUANTOVA_GATEWAY=http://127.0.0.1:8645   # or https://testnet.quantova.io
```

| File | What it shows |
|---|---|
| [connect.py](connect.py) | Connect and read chain state, node info, head, and an account, no keys |
| [transfer.py](transfer.py) | ML-DSA-65 signed QTOV transfer |
| [contract_call.py](contract_call.py) | QAsset read and invoke on the QVM, a compiled container |
| [qns_resolve.py](qns_resolve.py) | Resolve a name under the capital Q top level domain |

```bash
python connect.py
python transfer.py
python contract_call.py
python qns_resolve.py
```

The signing examples register a clearly labeled demonstration backend so they run
end to end offline. A real app registers Quantova's native Q-Crypto backend
instead, and the wallet API is identical.
