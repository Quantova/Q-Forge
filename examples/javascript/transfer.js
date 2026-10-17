#!/usr/bin/env node
// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

'use strict';
const { client, toQtov, toQuon, readSeed, indexOf, banner } = require('./_common');

async function main() {
  banner('Quantova native transfer with QCore.js');
  const c = client();
  const info = await c.nodeInfo();
  console.log(`Chain ${info.chain_id}, transfer fee ${info.fee && info.fee.transfer_quon} Quon`);
  const seed = readSeed();
  const to = process.env.QUANTOVA_TO;
  if (!seed || !to) {
    console.log('\nSet QUANTOVA_SEED_FILE to a file readable only by you that holds the 64 hex character seed of a funded');
    console.log('account, and QUANTOVA_TO to the recipient Q1 address, then run again. QUANTOVA_AMOUNT defaults to 1.5 QTOV.');
    return;
  }
  const index = indexOf();
  const amount = toQuon(process.env.QUANTOVA_AMOUNT || '1.5');
  const maxFee = process.env.QUANTOVA_MAX_FEE || '1000';
  const from = c.address(seed, index);
  const account = await c.account(from);
  console.log(`From ${from}  balance ${toQtov(account.balance || 0)} QTOV`);
  console.log(`To   ${to}  amount ${toQtov(amount)} QTOV`);
  const result = await c.transfer(seed, index, to, amount, maxFee);
  console.log(`Submitted ${result.signed.tx_id}, signed with ML-DSA-65`);
  console.log(JSON.stringify(result.outcome));
  seed.fill(0);
}

main().catch((e) => { console.error('error', e.message); process.exit(1); });
