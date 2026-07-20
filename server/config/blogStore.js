/* ==========================================================================
   config/blogStore.js — key/value backed store for blog posts (via
   lib/dataStore, so it works both locally/Termux and on Vercel).
   No markdown engine, no DB — content is stored as sanitized-on-write plain
   text/HTML the admin author controls, consistent with the rest of the
   flat-file-style architecture.
   ========================================================================== */

const { getJSON, setJSON } = require('../../lib/dataStore');

const KEY = 'blog';
const EMPTY = { nextId: 1, entries: [] };

function read() { return getJSON(KEY, EMPTY); }
function write(data) { return setJSON(KEY, data); }

function slugify(title) {
  return String(title).toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

async function addPost({ title, excerpt, content, published }) {
  const data = await read();
  const id = data.nextId;
  let slug = slugify(title) || `post-${id}`;
  const existingSlugs = new Set(data.entries.map((e) => e.slug));
  let uniqueSlug = slug, n = 2;
  while (existingSlugs.has(uniqueSlug)) { uniqueSlug = `${slug}-${n}`; n += 1; }

  const entry = {
    id, slug: uniqueSlug, title, excerpt: excerpt || '', content,
    published: Boolean(published), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  data.entries.push(entry);
  data.nextId = id + 1;
  await write(data);
  return entry;
}

async function updatePost(id, updates) {
  const data = await read();
  const entry = data.entries.find((e) => e.id === Number(id));
  if (!entry) return null;
  Object.assign(entry, updates, { updatedAt: new Date().toISOString() });
  await write(data);
  return entry;
}

async function deletePost(id) {
  const data = await read();
  const before = data.entries.length;
  data.entries = data.entries.filter((e) => e.id !== Number(id));
  await write(data);
  return data.entries.length < before;
}

async function getAllPosts() {
  const data = await read();
  return data.entries.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
async function getPublishedPosts() { return (await getAllPosts()).filter((p) => p.published); }
async function getPostBySlug(slug) {
  const data = await read();
  return data.entries.find((e) => e.slug === slug && e.published);
}

module.exports = { addPost, updatePost, deletePost, getAllPosts, getPublishedPosts, getPostBySlug };
