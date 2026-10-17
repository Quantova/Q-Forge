#!/usr/bin/env node
// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

'use strict';
const { client, readSeed, indexOf, banner, QSTAMP_CONTRACT } = require('./_common');

async function main() {
  banner('Quantova QVM container read and call with QCore.js');
  const c = client();
  const contract = process.env.QUANTOVA_CONTRACT || QSTAMP_CONTRACT;
  const container = await c.container(contract);
  console.log(`Container ${contract}`);
  console.log(`Code size ${container.size} bytes`);
  const storage = await c.storage(contract);
  console.log(`Storage slots ${storage.count}`);
  const seed = readSeed();
  const args = process.env.QUANTOVA_CALL_ARGS;
  if (!seed || !args) {
    console.log('\nTo call the container, set QUANTOVA_SEED_FILE and QUANTOVA_CALL_ARGS, the hex call arguments');
    console.log('produced from the interface that the Quanta compiler emits for the contract.');
    return;
  }
  if (!/^([0-9a-f]{2})+$/.test(args)) throw new Error('QUANTOVA_CALL_ARGS is lowercase hex');
  const meter = BigInt(process.env.QUANTOVA_METER || '30000');
  const maxFee = process.env.QUANTOVA_MAX_FEE || '50000';
  const result = await c.call(seed, indexOf(), contract, args, meter, maxFee);
  console.log(`Submitted ${result.signed.tx_id}, signed with ML-DSA-65`);
  console.log(JSON.stringify(result.outcome));
  seed.fill(0);
}

main().catch((e) => { console.error('error', e.message); process.exit(1); });
