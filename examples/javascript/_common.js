// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

'use strict';

const fs = require('fs');
const { Client, Network } = require('@quantovainc/qcore');

const GATEWAY = process.env.QUANTOVA_GATEWAY || 'https://rpc-testnet.quantova.org';
const QSTAMP_CONTRACT = 'Q1D6TZFRL203P3DFAFVUPZUHGUCM4EWGH6063XNS42VA5235RNQWXS7FXEWX';
const QUON = 1_000_000n;

function client() {
  return new Client(GATEWAY, { network: Network.testnet() });
}

function toQtov(quon) {
  const p = BigInt(quon);
  const whole = p / QUON;
  const frac = (p % QUON).toString().padStart(6, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : `${whole}`;
}

function toQuon(qtov) {
  const text = String(qtov);
  if (!/^(0|[1-9][0-9]{0,12})(\.[0-9]{1,6})?$/.test(text)) throw new Error('an amount is a decimal number of QTOV with at most six decimal places');
  const [whole, frac = ''] = text.split('.');
  return BigInt(whole) * QUON + BigInt(frac.padEnd(6, '0'));
}

function readSeed() {
  const file = process.env.QUANTOVA_SEED_FILE;
  if (!file) return null;
  const st = fs.lstatSync(file);
  if (!st.isFile() || (st.mode & 0o077) !== 0) throw new Error('the seed file must be a regular file readable only by its owner, chmod 600');
  const hex = fs.readFileSync(file, 'utf8').trim();
  if (!/^[0-9a-f]{64}$/.test(hex)) throw new Error('the seed file holds 64 lowercase hex characters');
  return Uint8Array.from(Buffer.from(hex, 'hex'));
}

function indexOf() {
  const text = process.env.QUANTOVA_INDEX || '0';
  if (!/^(0|[1-9][0-9]{0,8})$/.test(text)) throw new Error('QUANTOVA_INDEX is a whole number');
  return Number(text);
}

function banner(title) {
  const line = '='.repeat(64);
  console.log(line);
  console.log('  ' + title);
  console.log(line);
}

module.exports = { client, toQtov, toQuon, readSeed, indexOf, banner, GATEWAY, QSTAMP_CONTRACT, QUON };
