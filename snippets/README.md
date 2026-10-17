# Snippets

Short copy paste code for common Quantova tasks, in QCore.js and QCore.py. For full
runnable programs, see [../examples](../examples). Install QCore.js with `npm install @quantovainc/qcore@0.4.2` and QCore.py from its v0.4.0 tag with `maturin develop`, as its README describes.

## Connect and read an account

```python
from qcore import Client, Network

c = Client("https://rpc-testnet.quantova.org", network=Network.testnet())
print("head   ", c.head()["height"])
print("account", c.account("Q1ZF0T2M759GVM5NMLTVQWQKPPX972HTEKG2C2TZ008QEW22N0XFLSESWNG0")["balance"])
```

```js
const { Client, Network } = require('@quantovainc/qcore');

const c = new Client('https://rpc-testnet.quantova.org', { network: Network.testnet() });
console.log('head   ', (await c.head()).height);
console.log('account', (await c.account('Q1ZF0T2M759GVM5NMLTVQWQKPPX972HTEKG2C2TZ008QEW22N0XFLSESWNG0')).balance);
```

Balances are in Quon, one QTOV is one million Quon.

## Sign and submit a transfer

```python
with open("account.seed", encoding="ascii") as f:
    seed = bytes.fromhex(f.read().strip())
signed, outcome = c.transfer(seed, 0, RECIPIENT, 1_500_000, "1000")
```

```js
const seed = Uint8Array.from(Buffer.from(fs.readFileSync('account.seed', 'utf8').trim(), 'hex'));
const { signed, outcome } = await c.transfer(seed, 0, RECIPIENT, 1_500_000n, '1000');
seed.fill(0);
```

The seed file holds the 64 hex character seed of a funded account and must be readable only by you. Amounts are whole numbers of Quon, one QTOV is one million Quon, and the last argument is the largest fee you allow, so the client refuses to sign if the gateway reports a higher fee.

## Read and call a QVM container

```js
const container = await c.container(CONTRACT);
const storage = await c.storage(CONTRACT);
const { signed, outcome } = await c.call(seed, 0, CONTRACT, ARGS_HEX, 30000n, '50000');
```

ARGS_HEX are the call arguments produced from the interface that the Quanta compiler emits for the contract. QCore.py offers the same call method, and container and storage reads are in QCore.js.

Every transaction built and signed with these snippets is signed with ML-DSA-65
(FIPS 204) and verified on chain. There is no classical key path anywhere in the
chain.
