/* ==========================================================================
   config/queueStore.js — key/value backed queue for "Hire Me" submissions.
   ========================================================================== */

const { getJSON, setJSON } = require('../../lib/dataStore');

const KEY = 'queue';
const EMPTY = { nextId: 1, entries: [] };

function read() { return getJSON(KEY, EMPTY); }
function write(data) { return setJSON(KEY, data); }

/**
 * Adds a new entry to the queue and returns its position (1-indexed)
 * among currently "pending" entries.
 */
async function addToQueue({ name, email, project, budget, message }) {
  const data = await read();
  const id = data.nextId;

  const entry = {
    id, name, email, project, budget, message,
    status: 'pending', createdAt: new Date().toISOString()
  };

  data.entries.push(entry);
  data.nextId = id + 1;
  await write(data);

  const position = data.entries.filter((e) => e.status === 'pending').length;
  return { id, position };
}

async function getPendingCount() {
  const data = await read();
  return data.entries.filter((e) => e.status === 'pending').length;
}

async function getQueueEntries() {
  const data = await read();
  return data.entries.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

module.exports = { addToQueue, getPendingCount, getQueueEntries };
