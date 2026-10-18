# JavaScript examples (QCore.js)

Runnable samples using the official JavaScript client. Point them at any gateway.

```bash
npm ci
export QUANTOVA_GATEWAY=https://rpc-testnet.quantova.org   # or http://127.0.0.1:8645
```

`npm ci` installs the pinned `@quantovainc/qcore` 0.7.0 from the lockfile.

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
`QUANTOVA_AMOUNT` and `QUANTOVA_MAX_FEE` set the transfer, the amount in QTOV with
at most six decimal places and the fee ceiling as a whole number of Quon that you
choose yourself, so the client refuses to sign when the gateway reports a higher fee.
`QUANTOVA_CONTRACT` selects the container to read, and `QUANTOVA_CALL_ARGS` with a
seed file also submits a call. `QUANTOVA_NONCE` names the nonce you expect when you
sign again after a transaction that never landed, and it must be the nonce the
gateway reports. The client signs for the testnet chain Q-test-net-01 by default.
`QUANTOVA_CHAIN` names another chain, such as that of a local node, and the client
then signs only for that chain. Every request goes only to the configured gateway.
Plain HTTP is accepted only for a local gateway.
