#!/usr/bin/env node
// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

/**
 * Example 3, QNS name resolution (QCore.js)
 *
 * Resolve a Quantova name under the capital Q top level domain to a Q1 address
 * through the on chain QNS registry container.
 *
 * Run
 *   export QUANTOVA_GATEWAY=http://127.0.0.1:8645
 *   node qns_resolve.js
 *
 * In a full app with QCore.js installed
 *   const { QCore } = require('@qunatovainc/qcore');
 *   const q = new QCore(process.env.QUANTOVA_GATEWAY);
 *   const qns = q.qns(QNS_REGISTRY);
 *   const addr = await qns.resolve('alice.Q');     // returns a Q1 address or null
 *   const owner = await qns.owner('alice.Q');
 */
'use strict';
const { gw, banner } = require('./_common');

const QNS_REGISTRY = 'Q1SNR7WZ2K9V5C3XM8H6U0AGNE2STV4YP93QDF';   // example QNS registry container
const NAME = 'alice.Q';

async function main() {
  banner('Quantova example, QNS name resolution (QCore.js)');

  const head = await gw('head');
  console.log(`Head height ${head.height}`);
  console.log(`QNS registry ${QNS_REGISTRY}`);

  // QCore.js does the name lookup inside qns.resolve(). Here we read the registry
  // storage directly to show the resolved record.
  const slot = await gw('get_storage', { address: QNS_REGISTRY, key: 'resolve:' + NAME });
  console.log(`\nresolve('${NAME}')  returns ${slot.value || null}`);

  console.log("\nQNS maps human names under the capital Q top level domain to Quantova");
  console.log("accounts through the on chain registry container. QCore.js exposes this");
  console.log("as q.qns(registry).resolve('alice.Q').");
}

main().catch((e) => { console.error('error', e.message); process.exit(1); });
