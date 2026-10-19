// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Client, Network, core } = require('@quantovainc/qcore');

const NETWORK = Network.testnet();
const GATEWAY = (process.env.QUANTOVA_GATEWAY || NETWORK.rpcUrl).replace(/\/+$/, '');
const QSTAMP_CONTRACT = 'Q1D6TZFRL203P3DFAFVUPZUHGUCM4EWGH6063XNS42VA5235RNQWXS7FXEWX';
const QUON = 1_000_000n;
const DEFAULT_PIN = path.join(__dirname, '..', 'finality-pin.json');
const SEED_FILE_MAX = 80;
const PIN_FILE_MAX = 4 * 1024 * 1024;
const PRINT_MAX = 96;
const UNCONFIRMED_EXIT = 3;
const OPEN_FLAGS = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0);
const PRINT_TABLE = [[0x0, 0x8, 2], [0x9, 0xd, 1], [0xe, 0x1b, 2], [0x1c, 0x20, 1], [0x7f, 0x84, 2], [0x85, 0x85, 1], [0x86, 0x9f, 2], [0xa0, 0xa0, 1], [0xad, 0xad, 2], [0x300, 0x34e, 3], [0x34f, 0x34f, 2], [0x350, 0x36f, 3], [0x483, 0x489, 3], [0x600, 0x605, 2], [0x61c, 0x61c, 2], [0x6dd, 0x6dd, 2], [0x70f, 0x70f, 2], [0x890, 0x891, 2], [0x8e2, 0x8e2, 2], [0x115f, 0x1160, 1], [0x1680, 0x1680, 1], [0x17b4, 0x17b5, 2], [0x180b, 0x180d, 2], [0x180e, 0x180e, 1], [0x180f, 0x180f, 2], [0x1ab0, 0x1aff, 3], [0x1dc0, 0x1dff, 3], [0x2000, 0x200a, 1], [0x200b, 0x200f, 2], [0x2028, 0x2029, 1], [0x202a, 0x202e, 2], [0x202f, 0x202f, 1], [0x205f, 0x205f, 1], [0x2060, 0x206f, 2], [0x20d0, 0x20ff, 3], [0x2800, 0x2800, 1], [0x3000, 0x3000, 1], [0x3164, 0x3164, 1], [0xd800, 0xf8ff, 2], [0xfdd0, 0xfdef, 2], [0xfe00, 0xfe0f, 2], [0xfe20, 0xfe2f, 3], [0xfeff, 0xfeff, 2], [0xffa0, 0xffa0, 1], [0xfff0, 0xffff, 2], [0x110bd, 0x110bd, 2], [0x110cd, 0x110cd, 2], [0x13430, 0x1345f, 2], [0x1bca0, 0x1bca3, 2], [0x1d165, 0x1d169, 3], [0x1d16d, 0x1d172, 3], [0x1d173, 0x1d17a, 2], [0x1d17b, 0x1d182, 3], [0x1d185, 0x1d18b, 3], [0x1d1aa, 0x1d1ad, 3], [0x1fffe, 0x1ffff, 2], [0x2fffe, 0x2ffff, 2], [0x3fffe, 0x3ffff, 2], [0x4fffe, 0x4ffff, 2], [0x5fffe, 0x5ffff, 2], [0x6fffe, 0x6ffff, 2], [0x7fffe, 0x7ffff, 2], [0x8fffe, 0x8ffff, 2], [0x9fffe, 0x9ffff, 2], [0xafffe, 0xaffff, 2], [0xbfffe, 0xbffff, 2], [0xcfffe, 0xcffff, 2], [0xdfffe, 0xe0fff, 2], [0xf0000, 0x10ffff, 2]];
const OPTIONS = new Set(['--accept-unconfirmed', '--send-again']);
const SEND_AGAIN = process.argv.includes('--send-again');
const ACCEPT_UNCONFIRMED = process.argv.includes('--accept-unconfirmed') || process.env.QUANTOVA_ACCEPT_UNCONFIRMED === '1';

class Unconfirmed extends Error {}

class Unsigned extends Error {}

function printKind(cp) {
  let lo = 0;
  let hi = PRINT_TABLE.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const row = PRINT_TABLE[mid];
    if (cp < row[0]) hi = mid - 1;
    else if (cp > row[1]) lo = mid + 1;
    else return row[2];
  }
  return 0;
}

function printable(value, limit = PRINT_MAX) {
  let text;
  try {
    text = String(value);
  } catch {
    text = '?';
  }
  const out = [];
  let marks = 0;
  for (const ch of text) {
    const kind = printKind(ch.codePointAt(0));
    if (kind === 1) {
      if (out.length > 0 && out[out.length - 1] !== ' ') out.push(' ');
      marks = 0;
      continue;
    }
    if (kind === 2) continue;
    if (kind === 3) {
      marks += 1;
      if (marks > 2) continue;
    } else {
      marks = 0;
    }
    out.push(ch);
  }
  while (out.length > 0 && out[out.length - 1] === ' ') out.pop();
  return out.length > limit ? out.slice(0, limit - 3).join('') + '...' : out.join('');
}

function checkOptions(positional) {
  const given = process.argv.slice(2);
  for (const arg of given) {
    if (arg.startsWith('--') ? !OPTIONS.has(arg) : !positional) throw new Error(`unknown option ${printable(arg)}, the options are --accept-unconfirmed and --send-again`);
  }
}

function publicChain(name) {
  return typeof name === 'string' && /^Q-(test|main)-net-/.test(name);
}

function height(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`the gateway reported a ${label} that is not a whole number`);
  return value;
}

function gatewayOnly(url, init) {
  if (!String(url).startsWith(GATEWAY + '/v1/')) throw new Error('refusing a request outside the configured gateway');
  return fetch(url, init);
}

function chainId() {
  const chain = process.env.QUANTOVA_CHAIN;
  return chain && chain.length > 0 ? chain : NETWORK.chainId;
}

const ENFORCED = new WeakMap();

function client() {
  const chain = chainId();
  const pin = finalityPin();
  const pinned = pin ? pin.genesisHash : null;
  const builtIn = chain === NETWORK.chainId && typeof NETWORK.genesisHash === 'string' ? NETWORK.genesisHash.toLowerCase() : null;
  if (pinned && builtIn && pinned !== builtIn) {
    throw new Error(`the finality pin names genesis ${pinned} but QCore.js carries genesis ${builtIn} for ${printable(chain)}, refusing to sign for either`);
  }
  const genesis = pinned || builtIn;
  const network = new Network({
    name: GATEWAY === NETWORK.rpcUrl && chain === NETWORK.chainId ? NETWORK.name : 'custom',
    chainId: chain,
    rpcUrl: GATEWAY,
    explorerUrl: NETWORK.explorerUrl,
    isMainnet: false,
    genesisHash: genesis || undefined,
  });
  const c = new Client(GATEWAY, { network, expectedChainId: chain, fetch: gatewayOnly });
  const enforced = Boolean(genesis) && c.network && c.network.genesisHash === genesis && c._pinnedGenesis === genesis;
  ENFORCED.set(c, enforced);
  if (pinned && !enforced) {
    throw new Error('the finality pin names a genesis hash but the installed QCore.js does not sign over a pinned genesis, refusing to sign. Install QCore.js 0.9.0 or later, or leave genesis_hash empty');
  }
  return c;
}

async function nodeInfo(c, signing) {
  const info = await c.nodeInfo();
  const chain = chainId();
  if (!info || info.chain_id !== chain) {
    throw new Error(`the gateway names chain ${printable(info && info.chain_id)} but the examples are configured for ${printable(chain)}`);
  }
  const pin = finalityPin();
  if (pin && info.genesis_hash !== pin.genesisHash) {
    throw new Error(`the gateway names genesis ${printable(info.genesis_hash)} but ${printable(chain)} is pinned to genesis ${pin.genesisHash}`);
  }
  const head = height(info.head_height, 'head height');
  if (signing) {
    if (publicChain(chain) && !ENFORCED.get(c)) {
      throw new Error(`signing for ${printable(chain)} needs QCore.js 0.9.0 or later and the genesis hash of the network pinned in examples/finality-pin.json, refusing to sign`);
    }
    if (!ACCEPT_UNCONFIRMED) {
      if (!hasRoster(pin)) throw new Unsigned('no validator roster is pinned, so the finality of this transaction could not be proven and nothing was signed');
      requireRosters(pin, head);
    }
  }
  return { info, head };
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

function nibble(c) {
  if (c >= 48 && c <= 57) return c - 48;
  if (c >= 97 && c <= 102) return c - 87;
  return -1;
}

function decodeSeed(raw, length) {
  let end = length;
  while (end > 64 && (raw[end - 1] === 10 || raw[end - 1] === 13 || raw[end - 1] === 32 || raw[end - 1] === 9)) end -= 1;
  const seed = new Uint8Array(32);
  let ok = end === 64 && length < raw.length;
  for (let i = 0; i < 32; i += 1) {
    const hi = nibble(raw[2 * i]);
    const lo = nibble(raw[2 * i + 1]);
    if (hi < 0 || lo < 0) ok = false;
    seed[i] = ((hi & 15) << 4) | (lo & 15);
  }
  if (!ok) {
    seed.fill(0);
    throw new Error('the seed file holds 64 lowercase hex characters');
  }
  return seed;
}

function openPlain(file, refusal) {
  try {
    return fs.openSync(file, OPEN_FLAGS);
  } catch (e) {
    if (e && e.code === 'ENOENT') throw e;
    throw new Error(refusal);
  }
}

function ownedByUser(st) {
  return typeof process.getuid !== 'function' || st.uid === process.getuid();
}

function readInto(fd, buffer) {
  let length = 0;
  for (;;) {
    const n = fs.readSync(fd, buffer, length, buffer.length - length, length);
    if (n === 0) break;
    length += n;
    if (length === buffer.length) break;
  }
  return length;
}

function readSeed() {
  const file = process.env.QUANTOVA_SEED_FILE;
  if (!file) return null;
  const loose = 'the seed file must be a regular file readable only by its owner, chmod 600';
  const raw = new Uint8Array(SEED_FILE_MAX);
  try {
    const fd = openPlain(file, loose);
    let length;
    try {
      const opened = fs.fstatSync(fd);
      if (!opened.isFile() || (opened.mode & 0o077) !== 0 || !ownedByUser(opened)) throw new Error(loose);
      length = readInto(fd, raw);
    } finally {
      fs.closeSync(fd);
    }
    return decodeSeed(raw, length);
  } finally {
    raw.fill(0);
  }
}

function readPinFile(file) {
  const shown = printable(file);
  const fd = openPlain(file, `the finality pin ${shown} must be a regular file, not a link, writable only by its owner`);
  try {
    const st = fs.fstatSync(fd);
    if (!st.isFile()) throw new Error(`the finality pin ${shown} is not a regular file`);
    if ((st.mode & 0o022) !== 0) throw new Error(`the finality pin ${shown} is writable by other users, run chmod go-w on it`);
    if (!ownedByUser(st)) throw new Error(`the finality pin ${shown} belongs to another user, it must be owned by the user running the examples`);
    const buffer = Buffer.alloc(PIN_FILE_MAX + 1);
    const length = readInto(fd, buffer);
    if (length > PIN_FILE_MAX) throw new Error(`the finality pin ${shown} is too large`);
    return buffer.subarray(0, length).toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
}

function requireAddress(name, value) {
  if (typeof value !== 'string' || !core.valid_address(value)) throw new Error(`${name} ${printable(value)} is not a Q1 address`);
  return value.toUpperCase();
}

function wipe(seed) {
  if (seed) seed.fill(0);
}

function wholeEnv(name, fallback) {
  const text = process.env[name] || fallback;
  if (!/^(0|[1-9][0-9]{0,18})$/.test(text)) throw new Error(name + ' is a whole number');
  return text;
}

function expectedNonce() {
  const text = process.env.QUANTOVA_NONCE;
  if (text === undefined || text === '') return undefined;
  if (!/^(0|[1-9][0-9]{0,18})$/.test(text)) throw new Error('QUANTOVA_NONCE is a whole number');
  return BigInt(text);
}

function indexOf() {
  const text = process.env.QUANTOVA_INDEX || '0';
  if (!/^(0|[1-9][0-9]{0,8})$/.test(text)) throw new Error('QUANTOVA_INDEX is a whole number');
  return Number(text);
}

function rosterSlots(members, where) {
  if (!Array.isArray(members) || members.length === 0) throw new Error(`${where} needs a non empty list of validators`);
  let slots = null;
  for (const m of members) {
    if (!m || typeof m !== 'object' || Array.isArray(m)) throw new Error(`${where} holds an entry that is not a validator`);
    const raw = typeof m.root_slots === 'number' && Number.isSafeInteger(m.root_slots) ? String(m.root_slots) : m.root_slots;
    if (typeof raw !== 'string' || !/^[1-9][0-9]{0,9}$/.test(raw)) throw new Error(`${where} gives a validator no whole number of root slots`);
    if (slots !== null && slots !== BigInt(raw)) throw new Error(`${where} gives its validators different root slot counts`);
    slots = BigInt(raw);
  }
  return slots;
}

let loadedPin;

function finalityPin() {
  if (loadedPin !== undefined) return loadedPin;
  const user = process.env.QUANTOVA_FINALITY_FILE || null;
  const file = user || DEFAULT_PIN;
  const shown = printable(file);
  let text;
  try {
    text = readPinFile(file);
  } catch (e) {
    if (e && e.code === 'ENOENT') {
      if (user) throw new Error(`the finality pin ${shown} does not exist`);
      return (loadedPin = null);
    }
    throw e;
  }
  let pin;
  try {
    pin = JSON.parse(text);
  } catch {
    throw new Error(`the finality pin ${shown} could not be read as JSON`);
  }
  if (!pin || typeof pin !== 'object' || Array.isArray(pin)) throw new Error(`the finality pin ${shown} is not a JSON object`);
  const roster = pin.roster === undefined ? [] : pin.roster;
  const listed = pin.epochs === undefined ? [] : pin.epochs;
  if (!Array.isArray(roster)) throw new Error(`the finality pin ${shown} needs a validator roster list, empty while no roster is published`);
  if (!Array.isArray(listed)) throw new Error(`the finality pin ${shown} needs its epochs as a list of epoch and roster pairs`);
  if (!pin.genesis_hash && roster.length === 0 && listed.length === 0) {
    if (user) throw new Error(`the finality pin ${shown} names no genesis hash and no validator roster`);
    return (loadedPin = null);
  }
  if (pin.chain_id !== chainId()) throw new Error(`the finality pin ${shown} is for chain ${printable(pin.chain_id)}, not ${printable(chainId())}`);
  if (typeof pin.genesis_hash !== 'string' || !/^[0-9a-f]{64}$/i.test(pin.genesis_hash)) throw new Error(`the finality pin ${shown} needs a genesis hash of 64 hex characters`);
  let epochLength = roster.length > 0 ? rosterSlots(roster, `the roster of ${shown}`) : null;
  const epochs = new Map();
  for (const entry of listed) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`the finality pin ${shown} lists an epoch that is not an epoch and roster pair`);
    const epoch = typeof entry.epoch === 'string' && /^(0|[1-9][0-9]{0,15})$/.test(entry.epoch) ? Number(entry.epoch) : entry.epoch;
    if (!Number.isSafeInteger(epoch) || epoch < 0) throw new Error(`the finality pin ${shown} names an epoch that is not a whole number`);
    if (epochs.has(epoch)) throw new Error(`the finality pin ${shown} names epoch ${epoch} twice`);
    const slots = rosterSlots(entry.roster, `the roster of epoch ${epoch} in ${shown}`);
    if (epochLength !== null && slots !== epochLength) throw new Error(`the finality pin ${shown} gives its rosters different root slot counts`);
    epochLength = slots;
    epochs.set(epoch, entry.roster);
  }
  loadedPin = { file: shown, genesisHash: pin.genesis_hash.toLowerCase(), roster: roster.length > 0 ? roster : null, epochs, epochLength };
  return loadedPin;
}

function hasRoster(pin) {
  return Boolean(pin && (pin.roster || pin.epochs.size > 0));
}

function rosterKnown(pin, blockHeight) {
  return pin.epochs.has(Number(BigInt(blockHeight) / pin.epochLength)) || Boolean(pin.roster);
}

function rosterFor(pin, blockHeight) {
  const epoch = BigInt(blockHeight) / pin.epochLength;
  const members = pin.epochs.get(Number(epoch)) || pin.roster;
  if (!members) throw new Error(`the finality pin ${pin.file} holds no validator roster for epoch ${epoch}, the epoch of block ${blockHeight}`);
  return members;
}

function requireRosters(pin, head) {
  if (!hasRoster(pin)) return;
  const last = BigInt(head) + BigInt(core.validityBlocks());
  for (let at = BigInt(head); ; at += pin.epochLength) {
    rosterFor(pin, at > last ? last : at);
    if (at >= last) break;
  }
}

async function settle(c, result) {
  const outcome = result.outcome || {};
  console.log(printable(JSON.stringify(outcome)));
  if (outcome.verdict !== 'accepted') throw new Error(`the gateway refused the transaction, ${printable(outcome.reason)}`);
  const pin = finalityPin();
  if (!hasRoster(pin)) throw new Unconfirmed('no validator roster is pinned, so finality could not be proven');
  const txId = result.signed.tx_id;
  const deadline = Date.now() + 60000;
  let tx;
  for (;;) {
    tx = await c.transaction(txId);
    if (tx && tx.tx_id === txId && tx.status === 'finalised' && Number.isSafeInteger(tx.height) && tx.height >= 0) break;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${printable(txId)} to be finalised`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!rosterKnown(pin, tx.height)) throw new Unconfirmed(`the finality pin holds no validator roster for the epoch of block ${tx.height}, so finality could not be proven`);
  const proof = await c.confirmTransaction(txId, pin.genesisHash, rosterFor(pin, tx.height));
  if (BigInt(proof.height) !== BigInt(tx.height)) throw new Error(`the gateway placed ${printable(txId)} at height ${tx.height} but proved it at height ${proof.height}`);
  console.log(`Final at height ${proof.height}, proven against the pinned genesis hash and validator roster`);
}

function stateDir(...parts) {
  let dir = process.env.QUANTOVA_STATE_DIR || path.join(os.homedir(), '.quantova');
  for (const part of ['', ...parts]) {
    if (part) dir = path.join(dir, part);
    try {
      fs.mkdirSync(dir, { mode: 0o700 });
    } catch (e) {
      if (!e || e.code !== 'EEXIST') throw e;
    }
    const st = fs.lstatSync(dir);
    if (!st.isDirectory() || (st.mode & 0o077) !== 0 || !ownedByUser(st)) {
      throw new Error(`the state directory ${printable(dir)} must be a directory, not a link, owned by you and closed to other users, chmod 700`);
    }
  }
  return dir;
}

function safeName(text) {
  return /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/.test(text) ? text : crypto.createHash('sha3-256').update(String(text)).digest('hex');
}

function transactionId(txHex) {
  const bytes = crypto.createHash('sha3-256').update(Buffer.from(txHex, 'hex')).digest();
  const charset = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  const data = [];
  let acc = 0;
  let bits = 0;
  for (const b of bytes) {
    acc = ((acc << 8) | b) & 0xffff;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      data.push((acc >> bits) & 31);
    }
  }
  if (bits > 0) data.push((acc << (5 - bits)) & 31);
  const hrp = 'qtx';
  const values = [...hrp].map((ch) => ch.charCodeAt(0) >> 5).concat([0], [...hrp].map((ch) => ch.charCodeAt(0) & 31), data, [0, 0, 0, 0, 0, 0]);
  const G = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i += 1) if ((top >>> i) & 1) chk ^= G[i];
  }
  chk ^= 0x2bc830a3;
  const check = [0, 1, 2, 3, 4, 5].map((i) => (chk >>> (5 * (5 - i))) & 31);
  return (hrp + '1' + data.concat(check).map((v) => charset[v]).join('')).toUpperCase();
}

function writeDurable(file, text) {
  const tmp = `${file}.${crypto.randomBytes(12).toString('hex')}.tmp`;
  const fd = fs.openSync(tmp, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW || 0), 0o600);
  try {
    try {
      fs.writeSync(fd, text);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmp, file);
  } catch (e) {
    fs.rmSync(tmp, { force: true });
    throw e;
  }
  const dir = fs.openSync(path.dirname(file), 'r');
  try {
    fs.fsyncSync(dir);
  } finally {
    fs.closeSync(dir);
  }
}

function readRecord(file, identity) {
  let text;
  try {
    const fd = openPlain(file, `the session file ${printable(file)} must be a regular file, not a link, owned by you`);
    try {
      const st = fs.fstatSync(fd);
      if (!st.isFile() || (st.mode & 0o077) !== 0 || !ownedByUser(st)) throw new Error(`the session file ${printable(file)} must be a regular file owned by you and closed to other users, chmod 600`);
      const buffer = Buffer.alloc(65537);
      const length = readInto(fd, buffer);
      text = buffer.subarray(0, length).toString('utf8');
    } finally {
      fs.closeSync(fd);
    }
  } catch (e) {
    if (e && e.code === 'ENOENT') return null;
    throw e;
  }
  let record;
  try {
    record = JSON.parse(text);
  } catch {
    record = null;
  }
  const valid = record && typeof record === 'object' && record.version === 1 && ['prepared', 'sent', 'accepted'].includes(record.state) &&
    typeof record.nonce === 'string' && /^(0|[1-9][0-9]{0,19})$/.test(record.nonce) &&
    (record.tx === null || (typeof record.tx === 'string' && /^QTX1[0-9A-Z]{58}$/.test(record.tx))) && record.identity === identity;
  if (!valid) throw new Error(`the session file ${printable(file)} is damaged or belongs to another transaction, check it before sending again`);
  return record;
}

async function sendOnce(c, kind, from, fields, given, sign) {
  const identity = crypto.createHash('sha3-256').update(JSON.stringify([kind, chainId(), from, fields])).digest('hex');
  const file = path.join(stateDir(`${kind}-sessions`, safeName(chainId())), `${safeName(from)}-${identity}.json`);
  let record = readRecord(file, identity);
  if (record && (record.state === 'prepared' || SEND_AGAIN)) record = null;
  const save = (patch) => {
    record = Object.assign({ version: 1, identity, kind, from }, record, patch);
    writeDurable(file, JSON.stringify(record, null, 2) + '\n');
  };
  let nonce;
  if (record) {
    if (record.tx) {
      const tx = await c.transaction(record.tx);
      if (tx && tx.tx_id === record.tx && tx.status === 'finalised') {
        console.log(`An identical ${kind} was already sent as ${record.tx}, nothing was signed. Pass --send-again to send another.`);
        return { signed: { tx_id: record.tx }, outcome: { verdict: 'accepted', tx_id: record.tx } };
      }
    }
    const account = await c.account(from);
    const now = BigInt(height(account.nonce, 'nonce'));
    if (now !== BigInt(record.nonce)) {
      throw new Error(`an identical ${kind} was sent at nonce ${record.nonce} as ${record.tx || 'a transaction whose id was not saved'} and the account is now at nonce ${now}. Check it by hand, or pass --send-again to send another.`);
    }
    console.log(`An identical ${kind} sent earlier at nonce ${now} has not landed, it is signed again at that nonce so at most one of them can land.`);
    nonce = now;
  } else {
    nonce = given !== undefined ? given : BigInt(height((await c.account(from)).nonce, 'nonce'));
    save({ state: 'prepared', nonce: String(nonce), tx: null });
  }
  const submit = c.submit.bind(c);
  c.submit = (txHex) => {
    save({ state: 'sent', tx: transactionId(txHex) });
    return submit(txHex);
  };
  const result = await sign(nonce);
  if (result.signed.tx_id !== record.tx) throw new Error(`the signed transaction ${result.signed.tx_id} is not the one recorded before it was sent, check ${printable(file)}`);
  if (result.outcome && result.outcome.verdict === 'accepted') save({ state: 'accepted' });
  return result;
}

function banner(title) {
  const line = '='.repeat(64);
  console.log(line);
  console.log('  ' + title);
  console.log(line);
}

function run(main, positional = false) {
  Promise.resolve().then(() => checkOptions(positional)).then(main).catch((e) => {
    if (e instanceof Unsigned) {
      console.error(`NOT SIGNED. ${printable(e.message, 600)}. Pin a validator roster, or pass --accept-unconfirmed to sign anyway.`);
      process.exit(UNCONFIRMED_EXIT);
    }
    if (e instanceof Unconfirmed) {
      if (ACCEPT_UNCONFIRMED) {
        console.log(`NOT CONFIRMED, accepted because --accept-unconfirmed was given. ${printable(e.message, 600)}`);
        return;
      }
      console.error(`NOT CONFIRMED. ${printable(e.message, 600)}. Pass --accept-unconfirmed to accept an unconfirmed result.`);
      process.exit(UNCONFIRMED_EXIT);
    }
    console.error('error', printable(e && e.message, 600));
    process.exit(1);
  });
}

module.exports = { sendOnce, transactionId, client, nodeInfo, toQtov, toQuon, readSeed, requireAddress, wipe, indexOf, wholeEnv, expectedNonce, banner, printable, height, settle, finalityPin, run, chainId, GATEWAY, QSTAMP_CONTRACT, QUON };
