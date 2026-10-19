import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const LANG = process.argv[2] === "py" ? "py" : "js";
const EXT = LANG;
const PYTHON = process.env.PYTHON || "python3";
const SOURCE = path.join(ROOT, "examples", LANG === "js" ? "javascript" : "python");
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), "forge-checks-"));
const STATE = path.join(WORK, "state");
const MODULES = LANG === "js" && process.env.CHECK_QCORE ? linkCore(process.env.CHECK_QCORE) : path.join(SOURCE, "node_modules");
const UNSAFE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u00ad\u034f\u115f\u1160\u180b-\u180f\u200b-\u200f\u202a-\u202e\u2060-\u206f\u3164\ufe00-\ufe0f\ufeff\uffa0\u{e0000}-\u{e0fff}]|[\u0300-\u036f]{3}/u;
const ACCEPT = ["--accept-unconfirmed"];
const RECIPIENT = "Q1ZF0T2M759GVM5NMLTVQWQKPPX972HTEKG2C2TZ008QEW22N0XFLSESWNG0";
let failures = 0;
let passes = 0;

function linkCore(dir) {
  const modules = path.join(WORK, "proof-core", "node_modules");
  fs.mkdirSync(path.join(modules, "@quantovainc"), { recursive: true });
  fs.symlinkSync(path.resolve(dir), path.join(modules, "@quantovainc", "qcore"));
  return modules;
}

function coreVersion() {
  if (LANG === "js") return JSON.parse(fs.readFileSync(path.join(MODULES, "@quantovainc", "qcore", "package.json"), "utf8")).version;
  return spawnSync(PYTHON, ["-c", "import importlib.metadata as m; print(m.version('quantova-qcore'))"], { encoding: "utf8" }).stdout.trim();
}

const VERSION = coreVersion();
const SIGNS_GENESIS = VERSION.split(".").map(Number).reduce((a, n) => a * 1000 + n, 0) >= 9000;

function check(name, ok, detail) {
  if (ok) {
    passes += 1;
    console.log(`ok   ${LANG} ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL ${LANG} ${name}${detail ? "\n     " + JSON.stringify(String(detail)).slice(0, 700) : ""}`);
  }
}

function tree(pinText) {
  const top = fs.mkdtempSync(path.join(WORK, "tree-"));
  const dir = path.join(top, "examples", path.basename(SOURCE));
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(SOURCE)) {
    if (/\.(js|py|json)$/.test(f)) fs.copyFileSync(path.join(SOURCE, f), path.join(dir, f));
  }
  if (LANG === "js") fs.symlinkSync(MODULES, path.join(dir, "node_modules"));
  const pin = path.join(top, "examples", "finality-pin.json");
  fs.writeFileSync(pin, pinText === undefined ? fs.readFileSync(path.join(ROOT, "examples", "finality-pin.json")) : pinText);
  fs.chmodSync(pin, 0o644);
  return dir;
}

const BASE = tree();

function file(name, data, mode = 0o600) {
  const f = path.join(WORK, name);
  fs.writeFileSync(f, data, { mode });
  fs.chmodSync(f, mode);
  return f;
}

const newSeed = (name) => file(name, crypto.randomBytes(32).toString("hex") + "\n");

const SEAM = path.join(WORK, "foreign-owner.cjs");
fs.writeFileSync(SEAM, `const fs = require("fs");
const foreign = process.env.CHECK_FOREIGN || "";
const open = fs.openSync;
const fstat = fs.fstatSync;
const marked = new Set();
fs.openSync = function (file, ...rest) {
  const fd = open.call(this, file, ...rest);
  if (foreign && String(file).includes(foreign)) marked.add(fd);
  else marked.delete(fd);
  return fd;
};
fs.fstatSync = function (fd, ...rest) {
  const st = fstat.call(this, fd, ...rest);
  if (marked.has(fd)) st.uid += 1;
  return st;
};
`);
const PYSEAM = path.join(WORK, "pyseam");
fs.mkdirSync(PYSEAM);
fs.writeFileSync(path.join(PYSEAM, "sitecustomize.py"), `import os

_foreign = os.environ.get("CHECK_FOREIGN", "")
_open = os.open
_fstat = os.fstat
_marked = set()


def _seam_open(file, *args, **kwargs):
    fd = _open(file, *args, **kwargs)
    if _foreign and _foreign in os.fsdecode(file):
        _marked.add(fd)
    else:
        _marked.discard(fd)
    return fd


def _seam_fstat(fd, *args, **kwargs):
    st = _fstat(fd, *args, **kwargs)
    if fd in _marked:
        fields = list(st)
        fields[4] += 1
        return os.stat_result(fields)
    return st


if _foreign:
    os.open = _seam_open
    os.fstat = _seam_fstat
`);

function run(dir, script, env, args = [], timeout = 120000, seam = false) {
  const cmd = LANG === "js" ? process.execPath : PYTHON;
  const lead = seam && LANG === "js" ? ["--require", SEAM] : [];
  const r = spawnSync(cmd, [...lead, `${script}.${EXT}`, ...args], {
    cwd: dir,
    encoding: "utf8",
    timeout,
    env: Object.assign({ PATH: process.env.PATH, HOME: process.env.HOME, PYTHONDONTWRITEBYTECODE: "1", QUANTOVA_STATE_DIR: STATE, QUANTOVA_GATEWAY: "http://127.0.0.1:9" }, seam && LANG === "py" ? { PYTHONPATH: PYSEAM } : {}, env),
  });
  const out = (r.stdout || "") + (r.stderr || "");
  check(`${script} ${args.join(" ")} prints no control, bidi or filler character`, !UNSAFE.test(out), out);
  return { status: r.error ? "timeout" : r.status, out, stdout: r.stdout || "" };
}

async function gateway(settings) {
  const cfg = Object.assign({ chain: "Q-local-1", genesis: "ab".repeat(32), head: 5000 }, settings);
  const f = path.join(WORK, `gateway-${crypto.randomBytes(4).toString("hex")}.json`);
  fs.writeFileSync(f, JSON.stringify(cfg));
  const child = spawn(process.execPath, [path.join(HERE, "gateway.mjs"), f], { stdio: ["ignore", "pipe", "inherit"] });
  const url = await new Promise((resolve, reject) => {
    child.stdout.on("data", (d) => {
      const m = String(d).match(/GATEWAY (\S+)/);
      if (m) resolve(m[1]);
    });
    child.on("exit", () => reject(new Error("the check gateway did not start")));
  });
  return {
    url,
    state: async () => (await fetch(url + "/state")).json(),
    stop: () => new Promise((r) => {
      child.removeAllListeners("exit");
      child.on("exit", r);
      child.kill("SIGTERM");
    }),
  };
}

const rosters = (f) => JSON.parse(fs.readFileSync(f, "utf8"));

async function offline() {
  const owner = newSeed("owner.seed");
  const loose = newSeed("loose.seed");
  fs.chmodSync(loose, 0o640);
  const link = path.join(WORK, "link.seed");
  fs.symlinkSync(owner, link);
  const fifo = path.join(WORK, "seed.fifo");
  execFileSync("mkfifo", ["-m", "600", fifo]);
  for (const [label, seed] of [["group readable", loose], ["symbolic link", link], ["fifo", fifo], ["directory", WORK]]) {
    const r = run(BASE, "transfer", { QUANTOVA_SEED_FILE: seed, QUANTOVA_TO: RECIPIENT }, [], 20000);
    check(`a ${label} seed file is refused`, r.status === 1 && r.out.includes("chmod 600"), r.out);
  }
  const sample = crypto.randomBytes(32).toString("hex");
  for (const [label, text] of [["upper case", sample.toUpperCase()], ["non hex", "zz" + sample.slice(2)], ["short", sample.slice(1)], ["long", sample + "0"], ["prefixed", "0x" + sample]]) {
    const r = run(BASE, "transfer", { QUANTOVA_SEED_FILE: file(`seed-${label.replace(/ /g, "-")}.seed`, text + "\n"), QUANTOVA_TO: RECIPIENT }, [], 20000);
    check(`a ${label} seed is refused`, r.status === 1 && r.out.includes("64 lowercase hex characters"), r.out);
  }
  const good = JSON.stringify({ chain_id: "Q-test-net-01", genesis_hash: "ab".repeat(32), roster: [] });
  const world = file("world.json", good, 0o666);
  const group = file("group.json", good, 0o620);
  const target = file("target.json", good);
  const plink = path.join(WORK, "pin-link.json");
  fs.symlinkSync(target, plink);
  const pfifo = path.join(WORK, "pin.fifo");
  execFileSync("mkfifo", ["-m", "600", pfifo]);
  const pdir = fs.mkdtempSync(path.join(WORK, "pin-dir-"));
  const cases = [["world writable", world, "writable by other users"], ["group writable", group, "writable by other users"], ["symbolic link", plink, "not a link"], ["fifo", pfifo, "not a regular file"], ["directory", pdir, "not a regular file"]];
  const foreign = ["/etc/hosts", "/etc/passwd"].find((f) => fs.existsSync(f) && fs.statSync(f).uid !== process.getuid() && (fs.statSync(f).mode & 0o022) === 0);
  if (foreign) cases.push(["foreign owned", foreign, "belongs to another user"]);
  for (const [label, pin, want] of cases) {
    for (const script of ["transfer", "connect"]) {
      const r = run(BASE, script, { QUANTOVA_SEED_FILE: owner, QUANTOVA_TO: RECIPIENT, QUANTOVA_FINALITY_FILE: pin }, [], 20000);
      check(`${script} refuses a ${label} pin`, r.status === 1 && r.out.includes(want), r.out);
    }
  }
  const other = file("other.json", JSON.stringify({ chain_id: "Q-other-9", genesis_hash: "ab".repeat(32), roster: [] }));
  let r = run(BASE, "transfer", { QUANTOVA_SEED_FILE: owner, QUANTOVA_TO: RECIPIENT, QUANTOVA_FINALITY_FILE: other });
  check("a named pin for another chain is refused", r.status === 1 && r.out.includes("is for chain Q-other-9"), r.out);
  const filled = tree(good);
  r = run(filled, "transfer", { QUANTOVA_SEED_FILE: owner, QUANTOVA_TO: RECIPIENT, QUANTOVA_CHAIN: "Q-local-1" });
  check("a filled default pin for another chain is refused", r.status === 1 && r.out.includes("is for chain Q-test-net-01"), r.out);
  r = run(BASE, "transfer", { QUANTOVA_SEED_FILE: owner, QUANTOVA_TO: RECIPIENT, QUANTOVA_CHAIN: "Q-local-1" });
  check("the shipped empty pin is ignored for another chain", r.status === 1 && !r.out.includes("is for chain"), r.out);
  r = run(BASE, "transfer", { QUANTOVA_SEED_FILE: owner, QUANTOVA_TO: RECIPIENT, QUANTOVA_FINALITY_FILE: target });
  if (SIGNS_GENESIS) check("a genesis pin is accepted by a core that signs over it", !r.out.includes("does not sign over a pinned genesis"), r.out);
  else check("a genesis pin is refused by a core that cannot sign over it", r.status === 1 && r.out.includes("does not sign over a pinned genesis"), r.out);
  r = run(BASE, "transfer", { QUANTOVA_SEED_FILE: owner, QUANTOVA_TO: "Q1" + "\u{3164}".repeat(40) + " ".repeat(40) + "\u{fe0f}\u{e0100}\u{180b}" + "Z" + "\u{338}".repeat(90) + "Z".repeat(400) });
  check("an odd recipient is cleaned and capped in the error", r.status === 1 && r.out.includes("is not a Q1 address") && !r.out.includes("Z".repeat(97)) && !/ {2}/.test(r.out.split("\n").filter((l) => l.startsWith("error")).join("")) && !/\u{338}{3}/u.test(r.out), r.out);
  r = run(BASE, "transfer", { QUANTOVA_SEED_FILE: owner, QUANTOVA_TO: RECIPIENT }, ["--accept-unconfirmd"]);
  check("an unknown option is refused", r.status === 1 && r.out.includes("unknown option"), r.out);
  if (LANG === "js") {
    const probe = `process.env.QUANTOVA_SEED_FILE = process.argv[1]; const { readSeed } = require(${JSON.stringify(path.join(BASE, "_common.js"))}); const s = readSeed(); s.fill(0); require("v8").writeHeapSnapshot(process.argv[2]);`;
    const hex = fs.readFileSync(owner, "utf8").trim();
    const snap = path.join(WORK, "seed.heapsnapshot");
    spawnSync(process.execPath, ["-e", probe, owner, snap], { cwd: BASE, encoding: "utf8" });
    check("the seed leaves no hex copy in the heap", fs.existsSync(snap) && !fs.readFileSync(snap, "latin1").includes(hex));
    fs.rmSync(snap, { force: true });
  }
}

async function gatewayText() {
  const owner = newSeed("text.seed");
  let g = await gateway({ chain: "Q-local-1", chainShown: "Q-local-1\u001b[2K\u{202e}" + "\u{3164}".repeat(40) + " ".repeat(120) + "Chain   Q-main-net-1  genesis verified" });
  let r = run(BASE, "connect", { QUANTOVA_GATEWAY: g.url, QUANTOVA_CHAIN: "Q-local-1" });
  const t = run(BASE, "transfer", { QUANTOVA_GATEWAY: g.url, QUANTOVA_CHAIN: "Q-local-1", QUANTOVA_SEED_FILE: owner, QUANTOVA_TO: RECIPIENT }, ACCEPT);
  let s = await g.state();
  await g.stop();
  check("connect checks the chain before printing it and caps gateway text", r.status === 1 && r.out.includes("names chain") && !/^Chain/m.test(r.out) && !/ {2}/.test(r.out.split("\n").filter((l) => l.startsWith("error")).join("")), r.out);
  check("a gateway for another chain gets nothing signed", t.status === 1 && s.submits === 0, t.out);
  g = await gateway({ chain: "Q-local-1", headRaw: JSON.stringify("5001" + " ".repeat(150) + "Chain   Q-main-net-1") });
  r = run(BASE, "connect", { QUANTOVA_GATEWAY: g.url, QUANTOVA_CHAIN: "Q-local-1" });
  await g.stop();
  check("a head height that is not a number is refused before the chain is printed", r.status === 1 && !/^Chain/m.test(r.out) && r.out.includes("head height"), r.out);
  g = await gateway({ chain: "Q-local-1", rejectReason: "\u001b]0;x\u0007\u{3164}\u{fe0f}" + " ".repeat(50) + "x".repeat(400) });
  r = run(BASE, "transfer", { QUANTOVA_GATEWAY: g.url, QUANTOVA_CHAIN: "Q-local-1", QUANTOVA_SEED_FILE: owner, QUANTOVA_TO: RECIPIENT }, ACCEPT);
  await g.stop();
  check("a refusal reason from the gateway is capped", r.status === 1 && r.out.includes("refused") && !r.out.includes("x".repeat(97)), r.out);
}

async function unconfirmed() {
  const owner = newSeed("u.seed");
  const env = (url, more = {}) => Object.assign({ QUANTOVA_GATEWAY: url, QUANTOVA_CHAIN: "Q-local-1", QUANTOVA_SEED_FILE: owner, QUANTOVA_TO: RECIPIENT }, more);
  const g = await gateway({ chain: "Q-local-1" });
  let r = run(BASE, "transfer", env(g.url));
  let s = await g.state();
  check("with no roster pinned nothing is signed unless unconfirmed results are accepted", r.status === 3 && r.out.includes("NOT SIGNED") && s.submits === 0, r.out);
  r = run(BASE, "transfer", env(g.url), ACCEPT);
  s = await g.state();
  check("an accepted unconfirmed transfer exits 0 and says it is not confirmed", r.status === 0 && r.out.includes("NOT CONFIRMED, accepted") && s.submits === 1, r.out);
  r = run(BASE, "transfer", env(g.url, { QUANTOVA_ACCEPT_UNCONFIRMED: "1" }));
  s = await g.state();
  check("an identical transfer is not sent again", r.status === 0 && s.submits === 1 && r.out.includes("already sent"), r.out);
  r = run(BASE, "transfer", env(g.url), ["--accept-unconfirmed", "--send-again"]);
  s = await g.state();
  check("--send-again sends another identical transfer", r.status === 0 && s.submits === 2, r.out);
  r = run(BASE, "contract_call", env(g.url, { QUANTOVA_CONTRACT: RECIPIENT, QUANTOVA_CALL_ARGS: "00112233" }), ACCEPT);
  s = await g.state();
  check("an accepted unconfirmed call exits 0", r.status === 0 && r.out.includes("NOT CONFIRMED, accepted") && s.submits === 3, r.out);
  r = run(BASE, "contract_call", env(g.url, { QUANTOVA_CONTRACT: RECIPIENT, QUANTOVA_CALL_ARGS: "00112233" }), ACCEPT);
  s = await g.state();
  check("an identical call is not sent again", s.submits === 3 && r.out.includes("already sent"), r.out);
  await g.stop();
}

async function retries() {
  const owner = newSeed("retry.seed");
  const env = (url) => ({ QUANTOVA_GATEWAY: url, QUANTOVA_CHAIN: "Q-local-1", QUANTOVA_SEED_FILE: owner, QUANTOVA_TO: RECIPIENT, QUANTOVA_AMOUNT: "2.5" });
  let g = await gateway({ chain: "Q-local-1", rejectSubmit: 1 });
  const first = run(BASE, "transfer", env(g.url), ACCEPT);
  const again = run(BASE, "transfer", env(g.url), ACCEPT);
  let s = await g.state();
  await g.stop();
  check("a refused transfer is signed again at the same nonce and lands once", first.status === 1 && again.status === 0 && s.submits === 2 && again.out.includes("signed again at that nonce"), JSON.stringify([first.out, again.out, s.submits]));
  const owner2 = newSeed("lost.seed");
  g = await gateway({ chain: "Q-local-1", dropSubmit: 1 });
  const lost = run(BASE, "transfer", Object.assign(env(g.url), { QUANTOVA_SEED_FILE: owner2 }), ACCEPT);
  const rerun = run(BASE, "transfer", Object.assign(env(g.url), { QUANTOVA_SEED_FILE: owner2 }), ACCEPT);
  s = await g.state();
  await g.stop();
  check("a transfer whose submit answer was lost is not sent twice", lost.status === 1 && rerun.status === 0 && s.submits === 1 && rerun.out.includes("already sent"), JSON.stringify([lost.out, rerun.out, s.submits]));
}

async function spelling() {
  const owner = newSeed("case.seed");
  const env = (url, more) => Object.assign({ QUANTOVA_GATEWAY: url, QUANTOVA_CHAIN: "Q-local-1", QUANTOVA_SEED_FILE: owner }, more);
  const g = await gateway({ chain: "Q-local-1" });
  const first = run(BASE, "transfer", env(g.url, { QUANTOVA_TO: RECIPIENT }), ACCEPT);
  const lower = run(BASE, "transfer", env(g.url, { QUANTOVA_TO: RECIPIENT.toLowerCase() }), ACCEPT);
  let s = await g.state();
  check("a transfer rerun with the recipient written in lower case is not sent again", first.status === 0 && lower.status === 0 && lower.out.includes("already sent") && s.submits === 1, JSON.stringify([lower.out, s.submits]));
  const call = run(BASE, "contract_call", env(g.url, { QUANTOVA_CONTRACT: RECIPIENT, QUANTOVA_CALL_ARGS: "0011" }), ACCEPT);
  const callLower = run(BASE, "contract_call", env(g.url, { QUANTOVA_CONTRACT: RECIPIENT.toLowerCase(), QUANTOVA_CALL_ARGS: "0011" }), ACCEPT);
  s = await g.state();
  await g.stop();
  check("a call rerun with the contract written in lower case is not sent again", call.status === 0 && callLower.status === 0 && callLower.out.includes("already sent") && s.submits === 2, JSON.stringify([callLower.out, s.submits]));
}

async function movedNonce() {
  const owner = newSeed("moved.seed");
  const env = (url, amount) => ({ QUANTOVA_GATEWAY: url, QUANTOVA_CHAIN: "Q-local-1", QUANTOVA_SEED_FILE: owner, QUANTOVA_TO: RECIPIENT, QUANTOVA_AMOUNT: amount });
  const g = await gateway({ chain: "Q-local-1", rejectSubmit: 1 });
  const first = run(BASE, "transfer", env(g.url, "3.5"), ACCEPT);
  const other = run(BASE, "transfer", env(g.url, "4.5"), ACCEPT);
  const again = run(BASE, "transfer", env(g.url, "3.5"), ACCEPT);
  const s = await g.state();
  await g.stop();
  check("a recorded send whose nonce was taken by another transaction is not signed again", first.status === 1 && other.status === 0 && again.status === 1 && again.out.includes("is now at nonce 1") && s.submits === 2, JSON.stringify([first.out, other.out, again.out, s.submits]));
}

async function foreignOwner() {
  const owner = newSeed("foreign.seed");
  const env = (url, foreign) => ({ QUANTOVA_GATEWAY: url, QUANTOVA_CHAIN: "Q-local-1", QUANTOVA_SEED_FILE: owner, QUANTOVA_TO: RECIPIENT, CHECK_FOREIGN: foreign });
  let r = run(BASE, "transfer", env("http://127.0.0.1:9", owner), ACCEPT, 120000, true);
  check("a seed file owned by another user is refused", r.status === 1 && r.out.includes("chmod 600"), r.out);
  r = run(BASE, "transfer", env("http://127.0.0.1:9", path.join(WORK, "nothing-here")), ACCEPT, 120000, true);
  check("the same seed file owned by the user passes the owner check", r.status === 1 && !r.out.includes("chmod 600") && r.out.includes("error"), r.out);
  const g = await gateway({ chain: "Q-local-1" });
  const first = run(BASE, "transfer", env(g.url, path.join(WORK, "nothing-here")), ACCEPT, 120000, true);
  const again = run(BASE, "transfer", env(g.url, "transfer-sessions"), ACCEPT, 120000, true);
  const s = await g.state();
  await g.stop();
  check("a session file owned by another user is refused and nothing is signed", first.status === 0 && again.status === 1 && again.out.includes("session file") && again.out.includes("owned by you") && s.submits === 1, JSON.stringify([first.out, again.out, s.submits]));
}

async function genesis() {
  const owner = newSeed("g.seed");
  const G = "c3".repeat(32);
  const pinG = file("pin-g.json", JSON.stringify({ chain_id: "Q-test-net-01", genesis_hash: G, roster: [] }));
  const env = (url, more = {}) => Object.assign({ QUANTOVA_GATEWAY: url, QUANTOVA_SEED_FILE: owner, QUANTOVA_TO: RECIPIENT }, more);
  let g = await gateway({ chain: "Q-test-net-01", genesis: "ab".repeat(32) });
  let r = run(BASE, "transfer", env(g.url, { QUANTOVA_FINALITY_FILE: pinG }), ACCEPT);
  const c = run(BASE, "connect", env(g.url, { QUANTOVA_FINALITY_FILE: pinG }));
  let s = await g.state();
  await g.stop();
  check("a gateway with another genesis than the pin gets nothing signed", r.status === 1 && s.submits === 0, r.out);
  check("connect refuses a gateway with another genesis than the pin", c.status === 1 && !/^Chain/m.test(c.out), c.out);
  g = await gateway({ chain: "Q-test-net-01", genesis: G });
  r = run(BASE, "transfer", env(g.url, { QUANTOVA_FINALITY_FILE: pinG }));
  s = await g.state();
  if (SIGNS_GENESIS) check("a genesis pin without a roster signs nothing unless unconfirmed results are accepted", r.status === 3 && r.out.includes("NOT SIGNED") && s.submits === 0, r.out);
  else check("a genesis pin on a core that cannot sign over it signs nothing", r.status === 1 && s.submits === 0 && r.out.includes("does not sign over a pinned genesis"), r.out);
  r = run(BASE, "transfer", env(g.url, { QUANTOVA_FINALITY_FILE: pinG }), ACCEPT);
  s = await g.state();
  await g.stop();
  if (SIGNS_GENESIS) check("a matching genesis pin signs when unconfirmed results are accepted", r.status === 0 && s.submits === 1, r.out);
  else check("a genesis pin on a core that cannot sign over it signs nothing even when unconfirmed results are accepted", r.status === 1 && s.submits === 0, r.out);
  g = await gateway({ chain: "Q-test-net-01", genesis: G });
  r = run(BASE, "transfer", env(g.url), ACCEPT);
  s = await g.state();
  await g.stop();
  check("the public chain with no pinned genesis gets nothing signed", r.status === 1 && s.submits === 0 && /needs QCore\.(js|py) 0\.9\.0 or later and the genesis hash/.test(r.out), r.out);
}

function settleProbe(url, txId, pin) {
  const code = LANG === "js"
    ? `const { Client, Network } = require("@quantovainc/qcore"); const c = require("./_common"); const url = process.argv[1]; const id = process.argv[2]; const client = new Client(url, { network: new Network({ name: "custom", chainId: "Q-local-1", rpcUrl: url }), expectedChainId: "Q-local-1" }); c.settle(client, { signed: { tx_id: id }, outcome: { verdict: "accepted", tx_id: id } }).then(() => console.log("SETTLED"), (e) => { console.log("THROWN " + e.constructor.name + " " + e.message); process.exit(5); });`
    : `import sys\nsys.path.insert(0, ".")\nimport _common\nfrom quantova_qcore import Client, Network\nurl, tx = sys.argv[1], sys.argv[2]\nc = Client(url, network=Network("custom", chain_id="Q-local-1", rpc_url=url))\ntry:\n    _common.settle(c, {"tx_id": tx}, {"verdict": "accepted", "tx_id": tx})\n    print("SETTLED")\nexcept Exception as e:\n    print("THROWN " + type(e).__name__ + " " + str(e))\n    sys.exit(5)\n`;
  const args = LANG === "js" ? ["-e", code, url, txId] : ["-c", code, url, txId];
  const r = spawnSync(LANG === "js" ? process.execPath : PYTHON, args, { cwd: BASE, encoding: "utf8", timeout: 120000, env: Object.assign({ PATH: process.env.PATH, HOME: process.env.HOME, PYTHONDONTWRITEBYTECODE: "1", QUANTOVA_GATEWAY: url, QUANTOVA_CHAIN: "Q-local-1", QUANTOVA_FINALITY_FILE: pin }) });
  return { status: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

async function settleChecks() {
  const scenario = async (label, settings, pinFrom, want) => {
    const owner = newSeed(`s-${crypto.randomBytes(3).toString("hex")}.seed`);
    const out = path.join(WORK, `rosters-${crypto.randomBytes(3).toString("hex")}.json`);
    const g = await gateway(Object.assign({ chain: "Q-local-1", genesis: "c3".repeat(32), rosterOut: out }, settings));
    const sent = run(BASE, "transfer", { QUANTOVA_GATEWAY: g.url, QUANTOVA_CHAIN: "Q-local-1", QUANTOVA_SEED_FILE: owner, QUANTOVA_TO: RECIPIENT }, ACCEPT);
    const id = (sent.out.match(/Submitted (QTX1\S+),/) || [])[1];
    const pin = file(`pin-${crypto.randomBytes(3).toString("hex")}.json`, JSON.stringify(Object.assign({ chain_id: "Q-local-1", genesis_hash: "c3".repeat(32) }, pinFrom(rosters(out)))));
    const r = id ? settleProbe(g.url, id, pin) : { status: null, out: sent.out };
    await g.stop();
    check(label, want(r), r.out);
  };
  const plain = (x) => ({ roster: x.epochs[0].roster });
  await scenario("settle proves a final transaction against the pinned roster", {}, plain, (r) => r.status === 0 && r.out.includes("Final at height") && r.out.includes("SETTLED"));
  await scenario("settle waits while the gateway reports the transaction pending", { pendingPolls: 2 }, plain, (r) => r.status === 0 && r.out.includes("Final at height"));
  await scenario("settle fails on a certificate from validators outside the pin", { wrongRoster: true }, plain, (r) => r.status === 5 && !r.out.includes("Final at height") && !r.out.includes("Unconfirmed"));
  await scenario("settle fails when the gateway serves no proof", { noProofs: true }, plain, (r) => r.status === 5 && !r.out.includes("Final at height"));
  await scenario("settle proves a block of a later epoch with its own roster", { rotate: true, head: 16 * 313 - 1, rosterEpochs: 3 }, (x) => ({ roster: [], epochs: x.epochs }), (r) => r.status === 0 && r.out.includes("Final at height"));
  await scenario("settle refuses a transaction placed at another height than its proof", { heightSkew: 1 }, plain, (r) => r.status === 5 && r.out.includes("but proved it at height"));
  await scenario("settle uses the roster pinned for the epoch before the roster for other epochs", { rotate: true, head: 16 * 313 - 1, rosterEpochs: 3 }, (x) => ({ roster: x.epochs[0].roster, epochs: x.epochs.slice(1) }), (r) => r.status === 0 && r.out.includes("Final at height"));
  await scenario("settle does not use the roster of another epoch", { rotate: true, head: 16 * 313 - 1, rosterEpochs: 3 }, (x) => ({ roster: [], epochs: [x.epochs[2]] }), (r) => r.status === 5 && r.out.includes("Unconfirmed"));
}

async function proven() {
  if (!SIGNS_GENESIS) {
    console.log(`skip proven signing, QCore ${VERSION} cannot sign over a pinned genesis`);
    return;
  }
  const G = "c3".repeat(32);
  const scenario = async (label, settings, pinFrom, want, args = []) => {
    const owner = newSeed(`p-${crypto.randomBytes(3).toString("hex")}.seed`);
    const out = path.join(WORK, `rosters-${crypto.randomBytes(3).toString("hex")}.json`);
    const g = await gateway(Object.assign({ chain: "Q-test-net-01", genesis: G, rosterOut: out }, settings));
    const pin = file(`pin-${crypto.randomBytes(3).toString("hex")}.json`, JSON.stringify(Object.assign({ chain_id: "Q-test-net-01", genesis_hash: G }, pinFrom(rosters(out)))));
    const r = run(BASE, "transfer", { QUANTOVA_GATEWAY: g.url, QUANTOVA_SEED_FILE: owner, QUANTOVA_TO: RECIPIENT, QUANTOVA_FINALITY_FILE: pin }, args);
    const s = await g.state();
    await g.stop();
    check(label, want(r, s), r.out);
  };
  const plain = (x) => ({ roster: x.epochs[0].roster });
  await scenario("a transfer proven by certificate is final", {}, plain, (r) => r.status === 0 && r.out.includes("Final at height"));
  await scenario("a transfer first reported pending waits for finality", { pendingPolls: 2 }, plain, (r) => r.status === 0 && r.out.includes("Final at height"));
  await scenario("a certificate from validators outside the pin fails", { wrongRoster: true }, plain, (r) => r.status === 1);
  await scenario("the accept flag does not hide a failed proof", { wrongRoster: true }, plain, (r) => r.status === 1, ["--accept-unconfirmed"]);
  await scenario("per epoch rosters prove a transfer across an epoch change", { rotate: true, head: 16 * 313 - 1, rosterEpochs: 24 }, (x) => ({ roster: [], epochs: x.epochs }), (r) => r.status === 0 && r.out.includes("Final at height"));
  await scenario("a gateway that places the transfer at another height than its proof fails", { heightSkew: 1 }, plain, (r) => r.status === 1 && r.out.includes("but proved it at height"));
  await scenario("a roster pinned for the epoch wins over the roster for other epochs", { rotate: true, head: 16 * 313 - 1, rosterEpochs: 24 }, (x) => ({ roster: x.epochs[0].roster, epochs: x.epochs.slice(1) }), (r) => r.status === 0 && r.out.includes("Final at height"));
  await scenario("a pin without the roster of the coming epoch signs nothing", { rotate: true }, (x) => ({ roster: [], epochs: [x.epochs[2]] }), (r, s) => r.status === 1 && s.submits === 0 && r.out.includes("holds no validator roster for epoch"));
}

try {
  console.log(`${LANG} QCore ${VERSION}`);
  await offline();
  await gatewayText();
  await unconfirmed();
  await retries();
  await spelling();
  await movedNonce();
  await foreignOwner();
  await genesis();
  await settleChecks();
  await proven();
} finally {
  fs.rmSync(WORK, { recursive: true, force: true });
}
console.log(`${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
