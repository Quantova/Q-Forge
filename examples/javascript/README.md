# JavaScript examples (QCore.js)

Runnable samples using the official JavaScript client. Point them at any gateway.

```bash
npm install @qunatovainc/qcore
export QUANTOVA_GATEWAY=http://127.0.0.1:8645   # or https://testnet.quantova.io
```

| File | What it shows |
|---|---|
| [connect.js](connect.js) | Connect and read chain state, node info, head, and an account |
| [transfer.js](transfer.js) | Native QTOV transfer, signed with ML-DSA-65 |
| [contract_call.js](contract_call.js) | QAsset read and invoke on the QVM, a compiled container |
| [qns_resolve.js](qns_resolve.js) | Resolve a name under the capital Q top level domain |

```bash
node connect.js
node transfer.js
node contract_call.js
node qns_resolve.js
```

Each file's header shows the idiomatic QCore.js API for that task. The runnable body
calls the Quantova gateway directly through a small helper (`_common.js`), an HTTP
POST to `/v1/<method>` with a flat JSON body, so the samples run without the
`@qunatovainc/qcore` package installed.
