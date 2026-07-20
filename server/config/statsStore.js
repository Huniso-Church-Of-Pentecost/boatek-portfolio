/* ==========================================================================
   config/statsStore.js — key/value backed visitor counter.
   ========================================================================== */

const { getJSON, setJSON } = require('../../lib/dataStore');

const KEY = 'stats';
const EMPTY = { totalVisits: 0, dailyVisits: {} };

function read() { return getJSON(KEY, EMPTY); }
function write(data) { return setJSON(KEY, data); }

async function incrementVisit() {
  const data = await read();
  data.totalVisits = (data.totalVisits || 0) + 1;

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  data.dailyVisits = data.dailyVisits || {};
  data.dailyVisits[today] = (data.dailyVisits[today] || 0) + 1;

  await write(data);
  return data.totalVisits;
}

async function getVisitCount() { return (await read()).totalVisits || 0; }

async function getDailyVisits(days = 14) {
  const data = await read();
  const daily = data.dailyVisits || {};
  const result = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, visits: daily[key] || 0 });
  }
  return result;
}

module.exports = { incrementVisit, getVisitCount, getDailyVisits };
