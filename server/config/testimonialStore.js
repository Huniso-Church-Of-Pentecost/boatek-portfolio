/* ==========================================================================
   config/testimonialStore.js — key/value backed store for client
   testimonials. New submissions default to status "pending" and only
   appear on the public site once an admin flips them to "approved".
   ========================================================================== */

const { getJSON, setJSON } = require('../../lib/dataStore');

const KEY = 'testimonials';
const EMPTY = { nextId: 1, entries: [] };

function read() { return getJSON(KEY, EMPTY); }
function write(data) { return setJSON(KEY, data); }

async function addTestimonial({ name, role, company, rating, message }) {
  const data = await read();
  const id = data.nextId;
  const entry = {
    id, name, role: role || '', company: company || '',
    rating: Math.min(5, Math.max(1, Number(rating) || 5)),
    message, status: 'pending', createdAt: new Date().toISOString()
  };
  data.entries.push(entry);
  data.nextId = id + 1;
  await write(data);
  return entry;
}

async function getApprovedTestimonials() {
  const data = await read();
  return data.entries.filter((e) => e.status === 'approved');
}

async function getAllTestimonials() { return (await read()).entries; }

async function updateTestimonialStatus(id, status) {
  const data = await read();
  const entry = data.entries.find((e) => e.id === Number(id));
  if (!entry) return null;
  entry.status = status;
  await write(data);
  return entry;
}

async function deleteTestimonial(id) {
  const data = await read();
  const before = data.entries.length;
  data.entries = data.entries.filter((e) => e.id !== Number(id));
  await write(data);
  return data.entries.length < before;
}

module.exports = { addTestimonial, getApprovedTestimonials, getAllTestimonials, updateTestimonialStatus, deleteTestimonial };
