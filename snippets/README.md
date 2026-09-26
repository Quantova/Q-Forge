# Snippets

Short copy paste code for common Quantova tasks, in QCore.js and QCore.py. For full
runnable programs, see [../examples](../examples).

## Connect

```python
from qcore import QCore
q = QCore("https://rpc-testnet.quantova.org")
print(q.head()["height"])
```

```js
const { QCore } = require('@quantovainc/qcore');
const q = new QCore('https://rpc-testnet.quantova.org');
console.log((await q.head()).height);
```

## Read an account

```python
account = q.get_account("Q1VYSLG0VFZ73N4EM86E7YECA0EERNVJP254FLAVJ7UKE987UCLTQSUF6H9U")
print(account["balance"])   # in Quon, one QTOV is one million Quon
```

```js
const account = await q.getAccount('Q1VYSLG0VFZ73N4EM86E7YECA0EERNVJP254FLAVJ7UKE987UCLTQSUF6H9U');
```

## Create an ML-DSA-65 account

```python
account = q.wallet.create()   # its Q1 address begins with a capital Q
print(account.address)
```

## Sign and submit a transfer

```python
signed = q.wallet.sign_transfer(account, to=RECIPIENT, amount=1_500_000)  # Quon
q.submit_transaction(signed)
```

## Read a QAsset balance from a container

```python
token = q.contract(TOKEN_ADDRESS)   # a Quanta contract, a compiled container
print(token.balance_of(HOLDER))      # a single word map value
```

## Resolve a name

```python
addr = q.qns(QNS_REGISTRY).resolve("alice.Q")   # a name under the capital Q domain
```

Every transaction built and signed with these snippets is signed with ML-DSA-65
(FIPS 204) and verified on chain. There is no classical key path anywhere in the
chain.
