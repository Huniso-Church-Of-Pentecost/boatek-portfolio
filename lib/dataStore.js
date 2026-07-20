/* ==========================================================================
   lib/dataStore.js — environment-aware key/value persistence abstraction.

   Why this exists:
   Vercel's serverless functions run on a read-only filesystem (except /tmp,
   which is ephemeral and not shared across instances), so the project's
   original "write JSON to disk" stores would silently fail or lose data in
   production. This module picks the right backend automatically:

     1. Vercel KV / Upstash Redis — used whenever KV_REST_API_URL and
        KV_REST_API_TOKEN are present (these are auto-injected when you
        connect a Vercel KV store to the project, or set manually for any
        Upstash Redis REST-compatible database). This is the recommended,
        zero-extra-code path for production persistence on Vercel.
     2. Local JSON files under server/data/ — used when NOT running on
        Vercel (local dev, Termux/Android deployment), preserving the
        project's original flat-file behavior exactly.
     3. In-memory fallback — used only as a last resort on Vercel when no
        KV credentials are configured, so the app degrades gracefully
        instead of crashing. Data will NOT persist across cold starts or be
        shared between concurrent instances; a one-time warning is logged.

   To swap in Supabase, Postgres, Firebase, or MongoDB Atlas later, this is
   the only file that needs a new backend branch — every store in
   server/config/*.js talks to getJSON/setJSON only, never to fs directly.
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');

const IS_VERCEL = process.env.VERCEL === '1';
const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const HAS_KV = Boolean(KV_URL && KV_TOKEN);

const DATA_DIR = path.join(__dirname, '..', 'server', 'data');
const memoryStore = new Map();
let warnedNoPersistence = false;

/** Sends a single Redis command via the Upstash/Vercel KV REST API. */
async function kvCommand(args) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(KV_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args),
      signal: controller.signal
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`KV command failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.result;
  } finally {
    clearTimeout(timeout);
  }
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function fileFor(key) {
  return path.join(DATA_DIR, `${key}.json`);
}

function warnOnce() {
  if (warnedNoPersistence) return;
  warnedNoPersistence = true;
  console.warn(
    '[dataStore] Running on Vercel with no KV backend configured ' +
    '(KV_REST_API_URL / KV_REST_API_TOKEN not set). Falling back to ' +
    'in-memory storage — data will reset on every cold start and will not ' +
    'be shared across instances. Connect a Vercel KV / Upstash Redis store ' +
    'in your project\'s Storage tab to fix this, or adapt lib/dataStore.js ' +
    'to use Supabase, Postgres, Firebase, or MongoDB Atlas.'
  );
}

/**
 * Reads a JSON value by key. Returns `fallback` if the key doesn't exist yet.
 * @param {string} key
 * @param {*} fallback
 */
async function getJSON(key, fallback) {
  if (HAS_KV) {
    const raw = await kvCommand(['GET', key]);
    if (raw === null || raw === undefined) return fallback;
    try {
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[dataStore] Corrupt KV value for "${key}", using fallback:`, err.message);
      return fallback;
    }
  }

  if (!IS_VERCEL) {
    ensureDataDir();
    const file = fileFor(key);
    if (!fs.existsSync(file)) return fallback;
    try {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch (err) {
      console.error(`[dataStore] Corrupt file for "${key}", resetting:`, err.message);
      return fallback;
    }
  }

  warnOnce();
  return memoryStore.has(key) ? memoryStore.get(key) : fallback;
}

/**
 * Writes a JSON-serializable value by key.
 * @param {string} key
 * @param {*} value
 */
async function setJSON(key, value) {
  if (HAS_KV) {
    await kvCommand(['SET', key, JSON.stringify(value)]);
    return;
  }

  if (!IS_VERCEL) {
    ensureDataDir();
    fs.writeFileSync(fileFor(key), JSON.stringify(value, null, 2));
    return;
  }

  warnOnce();
  memoryStore.set(key, value);
}

module.exports = { getJSON, setJSON };
