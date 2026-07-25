#!/usr/bin/env node
// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

/**
 * Example 1, Native transfer (QCore.js)
 *
 * Send TQTOV from one Quantova account to another. Shows reading the head, the
 * sender account and nonce, the chain params for the fee, and the shape of an
 * ML-DSA-65 signed transfer submitted through the gateway.
 *
 * Run
 *   export QUANTOVA_GATEWAY=http://127.0.0.1:8645   // or https://testnet.quantova.io
 *   node transfer.js
 *
 * In a full app with QCore.js installed
 *
 *   const { QCore } = require('@qunatovainc/qcore');
 *   const q = new QCore(process.env.QUANTOVA_GATEWAY);
 *   const sender = q.wallet.create();                         // ML-DSA-65 account, Q1 address
 *   const signed = q.wallet.signTransfer(sender, {
 *     to: RECIPIENT, amount: 1_500_000n });                   // amount in Quon
 *   const hash = await q.submitTransaction(signed);
 *
 * This runnable version calls the gateway directly (see _common.js) so it works
 * without the @qunatovainc/qcore package installed.
 */
'use strict';
const { gw, toQtov, toQuon, banner } = require('./_common');

const SENDER = 'Q1GZD3AGFY5U426V9NX6UNE06ZC4YVKNK3GU9L3C';     // example Q1 address
const RECIPIENT = 'Q1GP3FR9CVK3XAJSQGC7DU47WCDUVTFDYMY0H82C';   // example Q1 address
const AMOUNT_QTOV = 1.5;

async function main() {
  banner('Quantova example, native TQTOV transfer (QCore.js)');

  const head = await gw('head');
  console.log(`Head height ${head.height}`);

  const account = await gw('get_account', { address: SENDER });
  console.log(`Sender  ${SENDER}`);
  console.log(`Balance ${toQtov(account.balance || 0)} TQTOV   nonce ${account.nonce || 0}`);

  // fee comes from the chain parameters
  const params = await gw('chain_params');
  console.log(`Fee     base ${params.base_fee || params.min_fee || 'n/a'} Quon`);

  const amount = toQuon(AMOUNT_QTOV);
  console.log(`\nTransfer ${AMOUNT_QTOV} TQTOV to ${RECIPIENT}  (amount ${amount} Quon)`);
  console.log('In QCore.js the wallet builds and ML-DSA-65 signs this transfer, then submits it.');

  // In a full app, submit the signed transaction bytes here.
  //   const hash = (await gw('submit_transaction', { transaction: signedHex })).hash;
  console.log('\nSubmit with q.submit_transaction({ transaction: <ML-DSA-65 signed hex> })');
  console.log('Then read it back with q.get_transaction({ hash })');
}

main().catch((e) => { console.error('error', e.message); process.exit(1); });
