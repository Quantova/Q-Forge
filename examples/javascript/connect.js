#!/usr/bin/env node
// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

/**
 * Connect to Quantova and read chain state (QCore.js).
 *
 * Run
 *   export QUANTOVA_GATEWAY=http://127.0.0.1:8645   // or https://testnet.quantova.io
 *   node connect.js
 *
 * In a full app with QCore.js installed
 *   const { QCore } = require('@quantovainc/qcore');
 *   const q = new QCore(process.env.QUANTOVA_GATEWAY);
 *   const head = await q.head();
 *   const account = await q.getAccount(ADDRESS);
 */
'use strict';
const { gw, toQtov, banner } = require('./_common');

const ADDRESS = 'Q1GZD3AGFY5U426V9NX6UNE06ZC4YVKNK3GU9L3C';

async function main() {
  banner('Quantova connect and read (QCore.js)');

  const info = await gw('node_info');
  console.log(`Node ${info.version || info.node || 'quantovad'} on chain ${info.chain_id || info.chain || 'Q-test-net'}`);

  const head = await gw('head');
  console.log(`Head height ${head.height}`);

  const account = await gw('get_account', { address: ADDRESS });
  console.log(`Balance of ${ADDRESS} ${toQtov(account.balance || 0)} QTOV  nonce ${account.nonce || 0}`);
}
main().catch((e) => { console.error('error', e.message); process.exit(1); });
