/* ==========================================================================
   config/paymentStore.js — key/value backed record of verified deposits
   ========================================================================== */

const { getJSON, setJSON } = require('../../lib/dataStore');

const KEY = 'payments';
const EMPTY = { entries: [] };

function read() { return getJSON(KEY, EMPTY); }
function write(data) { return setJSON(KEY, data); }

async function recordPayment({ reference, amount, currency, email, status }) {
  const data = await read();
  const existing = data.entries.find((e) => e.reference === reference);
  if (existing) return existing;
  const entry = { reference, amount, currency, email, status, recordedAt: new Date().toISOString() };
  data.entries.push(entry);
  await write(data);
  return entry;
}

async function getAllPayments() { return (await read()).entries; }

module.exports = { recordPayment, getAllPayments };
