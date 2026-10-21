#!/usr/bin/env node
// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

'use strict';
const { sendOnce, client, nodeInfo, readSeed, requireAddress, wipe, indexOf, wholeEnv, expectedNonce, banner, printable, settle, run, QSTAMP_CONTRACT } = require('./_common');

async function main() {
  banner('Quantova QVM container read and call with QCore.js');
  const c = client();
  const contract = requireAddress('QUANTOVA_CONTRACT', process.env.QUANTOVA_CONTRACT || QSTAMP_CONTRACT);
  const seed = readSeed();
  try {
    const args = process.env.QUANTOVA_CALL_ARGS;
    const ready = Boolean(seed && args);
    if (ready && !/^([0-9a-f]{2})+$/.test(args)) throw new Error('QUANTOVA_CALL_ARGS is lowercase hex');
    const order = ready ? {
      index: indexOf(),
      meter: BigInt(wholeEnv('QUANTOVA_METER', '30000')),
      maxFee: wholeEnv('QUANTOVA_MAX_FEE', '1000'),
      nonce: expectedNonce(),
    } : null;
    await nodeInfo(c, Boolean(order));
    const container = await c.container(contract);
    console.log(`Container ${contract}`);
    console.log(`Code size ${printable(container.size)} bytes`);
    const storage = await c.storage(contract);
    console.log(`Storage slots ${printable(storage.count)}`);
    if (!order) {
      console.log('\nTo call the container, set QUANTOVA_SEED_FILE and QUANTOVA_CALL_ARGS, the hex call arguments');
      console.log('produced from the interface that the Quanta compiler emits for the contract.');
      return;
    }
    const from = c.address(seed, order.index);
    const result = await sendOnce(c, 'call', from, { contract, args }, order.nonce, (nonce) => c.call(seed, order.index, contract, args, order.meter, order.maxFee, nonce));
    console.log(`Submitted ${result.signed.tx_id}, signed with ML-DSA-65`);
    await settle(c, result);
  } finally {
    wipe(seed);
  }
}

run(main);
