#!/usr/bin/env node
// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

/**
 * Example 2, QVM container call (QCore.js)
 *
 * Read from and invoke a QAsset token on the Quantova Virtual Machine. The QVM is
 * a register machine that runs compiled containers. Contracts are written in
 * Quanta and compiled to a container. You read container state through the gateway
 * with get_container and get_storage, and you invoke a container by submitting an
 * ML-DSA-65 signed transaction.
 *
 * Run
 *   export QUANTOVA_GATEWAY=http://127.0.0.1:8645
 *   node contract_call.js
 *
 * In a full app with QCore.js installed
 *   const { QCore } = require('@quantovainc/qcore');
 *   const q = new QCore(process.env.QUANTOVA_GATEWAY);
 *   const token = q.contract(TOKEN);
 *   const bal = await token.balanceOf(HOLDER);                // a single word map value
 *   const signed = token.buildTransfer(sender, { to: HOLDER, amount: 25n });
 *   await q.submitTransaction(signed);
 */
'use strict';
const { gw, banner } = require('./_common');

const TOKEN = 'Q1QDF7WZ2R9V5C3XM8H6U0AGNE2SKTV4YP9CJ3';   // example QAsset container
const HOLDER = 'Q1GP3FR9CVK3XAJSQGC7DU47WCDUVTFDYMY0H82C'; // example holder

async function main() {
  banner('Quantova example, QVM container call (QAsset) (QCore.js)');

  const head = await gw('head');
  console.log(`Head height ${head.height}`);

  // Confirm the container exists on chain.
  const container = await gw('get_container', { address: TOKEN });
  console.log(`Token container ${TOKEN}`);
  console.log(`code size ${container.size || (container.code ? container.code.length : 'n/a')} bytes`);

  // Read a QAsset balance. Secured contract state is a map from a 32 byte key to a
  // single word value, so a balance reads back as one word.
  const key = 'balance:' + HOLDER;
  const slot = await gw('get_storage', { address: TOKEN, key });
  console.log(`\nbalanceOf(${HOLDER}) = ${slot.value || 0}  (a single word map value)`);

  // Invoke transfer 25 units. QCore.js encodes the Quanta call and the wallet
  // ML-DSA-65 signs the transaction, then submits it.
  console.log('\nInvoke transfer 25 units of the QAsset');
  console.log('In QCore.js the wallet signs the invoke with ML-DSA-65, then submits it.');
  console.log('  q.submit_transaction({ transaction: <ML-DSA-65 signed invoke hex> })');
}

main().catch((e) => { console.error('error', e.message); process.exit(1); });
