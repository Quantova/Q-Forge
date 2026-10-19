#!/usr/bin/env node
// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

'use strict';
const { sendOnce, client, nodeInfo, toQtov, toQuon, readSeed, requireAddress, wipe, indexOf, wholeEnv, expectedNonce, banner, printable, settle, run, chainId } = require('./_common');

async function main() {
  banner('Quantova native transfer with QCore.js');
  const c = client();
  const seed = readSeed();
  try {
    const ready = Boolean(seed && process.env.QUANTOVA_TO);
    const order = ready ? {
      to: requireAddress('QUANTOVA_TO', process.env.QUANTOVA_TO),
      index: indexOf(),
      amount: toQuon(process.env.QUANTOVA_AMOUNT || '1.5'),
      maxFee: wholeEnv('QUANTOVA_MAX_FEE', '1000'),
      nonce: expectedNonce(),
    } : null;
    const { info } = await nodeInfo(c, Boolean(order));
    console.log(`Chain ${printable(chainId())}, transfer fee ${printable(info.fee && info.fee.transfer_quon)} Quon`);
    if (!order) {
      console.log('\nSet QUANTOVA_SEED_FILE to a file readable only by you that holds the 64 hex character seed of a funded');
      console.log('account, and QUANTOVA_TO to the recipient Q1 address, then run again. QUANTOVA_AMOUNT defaults to 1.5 QTOV.');
      return;
    }
    const from = c.address(seed, order.index);
    const account = await c.account(from);
    console.log(`From ${from}  balance ${toQtov(account.balance || 0)} QTOV`);
    console.log(`To   ${order.to}  amount ${toQtov(order.amount)} QTOV`);
    const result = await sendOnce(c, 'transfer', from, { to: order.to, amount: String(order.amount) }, order.nonce, (nonce) => c.transfer(seed, order.index, order.to, order.amount, order.maxFee, nonce));
    console.log(`Submitted ${result.signed.tx_id}, signed with ML-DSA-65`);
    await settle(c, result);
  } finally {
    wipe(seed);
  }
}

run(main);
