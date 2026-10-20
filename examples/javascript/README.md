# JavaScript examples (QCore.js)

Runnable samples using the official JavaScript client. Point them at any gateway.

```bash
npm ci
export QUANTOVA_GATEWAY=https://q-test-net-01.quantova.org   # or http://127.0.0.1:8645
```

`npm ci` installs the pinned `@quantovainc/qcore` 0.9.1 from the lockfile.

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
seed file also submits a call. Leave `QUANTOVA_NONCE` unset for a normal send, so the
client picks the nonce and never signs two transactions for one nonce. Set it only to
replace a transaction that never landed, to the nonce you recorded when you signed
that transaction, which the gateway must still report. The client signs for the live network Q-test-net-01 by default.
`QUANTOVA_CHAIN` names another chain, such as that of a local node, and the client
then signs only for that chain. Every request goes only to the configured gateway.
Plain HTTP is accepted only for a local gateway. The seed file is read into a fresh
array without building a hex string, and the raw bytes and the seed are wiped after use.

An accepted transaction is not yet proven final. When `../finality-pin.json`, or the
file named by `QUANTOVA_FINALITY_FILE`, holds a genesis hash and validator rosters you
trust for the configured chain, the signing examples wait until the gateway reports
the transaction finalised and then prove it with `confirmTransaction`, using the roster pinned
for the epoch of its block. Sortition roots change every epoch, so list one roster per
epoch under `epochs`, each entry an `epoch` number with its `roster`. A roster under
`roster` serves any epoch that `epochs` does not name. The epoch of a block is its height
divided by the `root_slots` of its validators. Before signing, the examples check that
the pin holds a roster for every epoch the transaction can land in, and refuse to sign
otherwise. A pin file must be a regular file that only its owner can write, it is never
read through a symbolic link, and a filled pin that names another chain stops the
examples. Take the genesis hash and rosters from a source you trust, never from the
gateway you send through.

When no validator roster is pinned, the finality of a transaction cannot be proven, so
the signing examples print NOT SIGNED and exit with status 3 before they sign anything.
When a roster is pinned but misses an epoch the transaction can land in, they stop with
exit status 1, also before signing. Pass `--accept-unconfirmed`, or set
`QUANTOVA_ACCEPT_UNCONFIRMED=1`, to sign anyway. When the result then cannot be proven
the examples print NOT CONFIRMED, say that you accepted it, and exit with status 0. A
proof that fails always ends with exit status 1.

Before they sign, the signing examples record the transaction in a session file of your
own user under `~/.quantova/transfer-sessions` or `~/.quantova/call-sessions`, one file
per sender, chain and transaction, created with mode 600 in directories with mode 700.
Just before the signed transaction leaves for the gateway the file records its id, which
the client computes when it signs. A second run of the same transfer or call therefore
never pays twice, also when the recipient or contract address is written in lower case,
because every address is read in its upper case form. When the earlier transaction is final it signs nothing and proves that
one, when it has not landed and the account is still at the same nonce it signs again at
that nonce so at most one of them can land, and when the account has moved on it stops
and asks you to check by hand. Pass `--send-again` to send an identical transaction on
purpose. `QUANTOVA_STATE_DIR` moves the `~/.quantova` directory.

The repository ships the pin empty until the values for Q-test-net-01 are published.
Signing for Q-test-net-01 or any mainnet chain needs QCore 0.9.0 or later and the genesis
hash of that network pinned in `../finality-pin.json`, because the chain only accepts
transactions signed over its genesis, so without both the examples refuse to sign.
Reading the chain works with any release. QCore 0.9.0 and later sign over the pinned
genesis and refuse a gateway that names another one, and a genesis built into the client
that differs from the pin stops the examples. QCore 0.8.0 and earlier
cannot sign over a genesis, so with them the examples sign only for a local chain that
`QUANTOVA_CHAIN` names and stop at once when a genesis hash is pinned. A pin file must be a regular file
owned by the user who runs the examples that nobody else can write.
