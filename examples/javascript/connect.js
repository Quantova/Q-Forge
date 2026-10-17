#!/usr/bin/env node
// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

'use strict';
const { client, toQtov, banner, GATEWAY } = require('./_common');

async function main() {
  banner('Quantova connect and read with QCore.js');
  const c = client();
  const info = await c.nodeInfo();
  console.log(`Gateway ${GATEWAY}`);
  console.log(`Chain   ${info.chain_id}  genesis ${info.genesis_hash}`);
  const head = await c.head();
  console.log(`Head    ${head.height}`);
  const address = process.env.QUANTOVA_ADDRESS || process.argv[2];
  if (!address) {
    console.log('\nGive an address with QUANTOVA_ADDRESS or as the first argument to read its balance.');
    return;
  }
  const account = await c.account(address);
  console.log(`\n${address}`);
  console.log(`Balance ${toQtov(account.balance || 0)} QTOV   nonce ${account.nonce || 0}`);
}

main().catch((e) => { console.error('error', e.message); process.exit(1); });
