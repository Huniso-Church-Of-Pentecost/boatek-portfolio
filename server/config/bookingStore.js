/* ==========================================================================
   config/bookingStore.js — key/value backed store for call/booking requests
   ========================================================================== */

const { getJSON, setJSON } = require('../../lib/dataStore');

const KEY = 'bookings';
const EMPTY = { nextId: 1, entries: [] };

function read() { return getJSON(KEY, EMPTY); }
function write(data) { return setJSON(KEY, data); }

async function addBooking({ name, email, date, time, notes }) {
  const data = await read();
  const id = data.nextId;
  const entry = { id, name, email, date, time, notes, status: 'pending', createdAt: new Date().toISOString() };
  data.entries.push(entry);
  data.nextId = id + 1;
  await write(data);
  return entry;
}

async function getAllBookings() { return (await read()).entries; }

async function updateBookingStatus(id, status) {
  const data = await read();
  const entry = data.entries.find((e) => e.id === Number(id));
  if (!entry) return null;
  entry.status = status;
  await write(data);
  return entry;
}

module.exports = { addBooking, getAllBookings, updateBookingStatus };
