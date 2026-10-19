#!/usr/bin/env node
// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

'use strict';
const { client, nodeInfo, toQtov, banner, printable, height, run, chainId, GATEWAY } = require('./_common');

async function main() {
  banner('Quantova connect and read with QCore.js');
  const c = client();
  const { info, head } = await nodeInfo(c, false);
  console.log(`Gateway ${printable(GATEWAY)}`);
  console.log(`Chain   ${printable(chainId())}  genesis ${printable(info.genesis_hash)}  head ${head}`);
  const top = await c.head();
  console.log(`Head    ${height(top && top.height, 'head height')}`);
  const address = process.env.QUANTOVA_ADDRESS || process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!address) {
    console.log('\nGive an address with QUANTOVA_ADDRESS or as the first argument to read its balance.');
    return;
  }
  const account = await c.account(address);
  console.log(`\n${printable(address)}`);
  console.log(`Balance ${toQtov(account.balance || 0)} QTOV   nonce ${height(account.nonce || 0, 'nonce')}`);
}

run(main, true);
