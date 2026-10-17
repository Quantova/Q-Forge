# JavaScript examples (QCore.js)

Runnable samples using the official JavaScript client. Point them at any gateway.

```bash
npm ci
export QUANTOVA_GATEWAY=https://rpc-testnet.quantova.org   # or http://127.0.0.1:8645
```

`npm ci` installs the pinned `@quantovainc/qcore` 0.4.2 from the lockfile.

| File | What it shows |
|---|---|
| [connect.js](connect.js) | Connect and read chain state, node info, head, and an account |
| [transfer.js](transfer.js) | Native QTOV transfer, signed with ML-DSA-65 |
| [contract_call.js](contract_call.js) | Read a QVM container and its storage, and call it |

```bash
node connect.js
QUANTOVA_SEED_FILE=account.seed QUANTOVA_TO=Q1... node transfer.js
QUANTOVA_CONTRACT=Q1... node contract_call.js
```

Signing examples read the account seed from the file named by `QUANTOVA_SEED_FILE`.
The file holds the 64 hex character seed and must be readable only by you
(`chmod 600`), otherwise the examples refuse to run. `QUANTOVA_TO`,
`QUANTOVA_AMOUNT` and `QUANTOVA_MAX_FEE` set the transfer, with amounts as whole
numbers of Quon. `QUANTOVA_CONTRACT` selects the container to read, and
`QUANTOVA_CALL_ARGS` with a seed file also submits a call. Plain HTTP is accepted
only for a local gateway.
