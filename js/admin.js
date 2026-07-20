/* ==========================================================================
   admin.js — dashboard logic for admin.html
   ========================================================================== */

(function () {
  const loginScreen = document.getElementById('loginScreen');
  const dashboard = document.getElementById('dashboard');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');

  function getAuthHeader() {
    const token = sessionStorage.getItem('adminAuth');
    return token ? { Authorization: `Basic ${token}` } : {};
  }

  async function adminFetch(path, options = {}) {
    let res;
    try {
      res = await fetch(path, {
        ...options,
        headers: { ...(options.headers || {}), 'Content-Type': 'application/json', ...getAuthHeader() }
      });
    } catch (networkErr) {
      throw new Error(`Network error reaching ${path}: ${networkErr.message}`);
    }
    if (res.status === 401) {
      sessionStorage.removeItem('adminAuth');
      showLogin('Session expired — please sign in again.');
      throw new Error('Unauthorized (401)');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${data.message || 'Request failed.'} (HTTP ${res.status})`);
    return data;
  }

  function showLogin(message) {
    loginScreen.hidden = false;
    dashboard.hidden = true;
    if (message) {
      loginError.textContent = message;
      loginError.hidden = false;
    }
  }

  function showDashboard() {
    loginScreen.hidden = true;
    dashboard.hidden = false;
    loadPanel('overview');
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('adminUser').value;
    const pass = document.getElementById('adminPass').value;
    const token = btoa(`${user}:${pass}`);
    sessionStorage.setItem('adminAuth', token);

    try {
      await adminFetch('/api/admin/whoami');
      loginError.hidden = true;
      showDashboard();
    } catch (err) {
      sessionStorage.removeItem('adminAuth');
      loginError.textContent = err.message || 'Sign-in failed.';
      loginError.hidden = false;
      console.error('[admin] Login failed:', err);
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('adminAuth');
    showLogin();
  });

  /* ---------------------------------------------------------------- */
  /* Tabs                                                                */
  /* ---------------------------------------------------------------- */
  const loadedPanels = new Set();

  document.getElementById('adminTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-tab]');
    if (!btn) return;
    const tab = btn.dataset.tab;

    document.querySelectorAll('#adminTabs button').forEach((b) => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.admin-panel').forEach((p) => { p.hidden = p.dataset.panel !== tab; });

    loadPanel(tab);
  });

  function loadPanel(tab) {
    if (loadedPanels.has(tab)) return;
    loadedPanels.add(tab);

    const loaders = {
      overview: loadOverview,
      inquiries: loadInquiries,
      bookings: loadBookings,
      testimonials: loadTestimonials,
      blog: loadBlog,
      payments: loadPayments
    };
    loaders[tab]?.().catch((err) => console.error(`[admin] Failed to load ${tab}:`, err.message));
  }

  function fmtDate(iso) {
    try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
    catch (e) { return iso; }
  }
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }
  function emptyRow(cols, label) {
    return `<tr class="admin-empty-row"><td colspan="${cols}">${label}</td></tr>`;
  }

  /* ---------------------------------------------------------------- */
  /* Overview                                                            */
  /* ---------------------------------------------------------------- */
  async function loadOverview() {
    const [stats, inquiries, bookings, testimonials] = await Promise.all([
      adminFetch('/api/admin/stats'),
      adminFetch('/api/admin/inquiries'),
      adminFetch('/api/admin/bookings'),
      adminFetch('/api/admin/testimonials')
    ]);

    const pendingTestimonials = testimonials.testimonials.filter((t) => t.status === 'pending').length;
    const pendingBookings = bookings.bookings.filter((b) => b.status === 'pending').length;

    document.getElementById('overviewStats').innerHTML = `
      <div class="admin-stat-card"><div class="admin-stat-num">${stats.totalVisits.toLocaleString()}</div><div class="admin-stat-label">Total Visits</div></div>
      <div class="admin-stat-card"><div class="admin-stat-num">${inquiries.inquiries.length}</div><div class="admin-stat-label">Total Inquiries</div></div>
      <div class="admin-stat-card"><div class="admin-stat-num">${pendingBookings}</div><div class="admin-stat-label">Pending Bookings</div></div>
      <div class="admin-stat-card"><div class="admin-stat-num">${pendingTestimonials}</div><div class="admin-stat-label">Testimonials to Review</div></div>
    `;

    drawVisitsChart(stats.daily || []);
  }

  function drawVisitsChart(daily) {
    const canvas = document.getElementById('visitsChart');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 600;
    const height = 90;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (!daily.length) return;
    const max = Math.max(1, ...daily.map((d) => d.visits));
    const barWidth = width / daily.length;

    daily.forEach((d, i) => {
      const barHeight = (d.visits / max) * (height - 20);
      ctx.fillStyle = 'rgba(45, 212, 191, 0.75)';
      ctx.fillRect(i * barWidth + 2, height - barHeight, barWidth - 4, barHeight);
    });

    ctx.fillStyle = 'rgba(139, 147, 167, 0.8)';
    ctx.font = '10px sans-serif';
    ctx.fillText(daily[0]?.date?.slice(5) || '', 2, height - 2);
    ctx.fillText(daily[daily.length - 1]?.date?.slice(5) || '', width - 34, height - 2);
  }

  /* ---------------------------------------------------------------- */
  /* Inquiries                                                           */
  /* ---------------------------------------------------------------- */
  async function loadInquiries() {
    const { inquiries } = await adminFetch('/api/admin/inquiries');
    const tbody = document.querySelector('#inquiriesTable tbody');
    tbody.innerHTML = inquiries.length ? inquiries.map((i) => `
      <tr>
        <td>${fmtDate(i.createdAt)}</td>
        <td>${escapeHtml(i.name)}</td>
        <td>${escapeHtml(i.email)}</td>
        <td>${escapeHtml(i.project)}</td>
        <td>${escapeHtml(i.budget)}</td>
        <td class="wrap">${escapeHtml(i.message)}</td>
      </tr>
    `).join('') : emptyRow(6, 'No inquiries yet.');
  }

  /* ---------------------------------------------------------------- */
  /* Bookings                                                            */
  /* ---------------------------------------------------------------- */
  async function loadBookings() {
    const { bookings } = await adminFetch('/api/admin/bookings');
    const tbody = document.querySelector('#bookingsTable tbody');
    tbody.innerHTML = bookings.length ? bookings.map((b) => `
      <tr data-id="${b.id}">
        <td>${fmtDate(b.createdAt)}</td>
        <td>${escapeHtml(b.name)}</td>
        <td>${escapeHtml(b.email)}</td>
        <td>${escapeHtml(b.date)} ${escapeHtml(b.time)}</td>
        <td class="wrap">${escapeHtml(b.notes)}</td>
        <td><span class="status-pill status-${b.status}">${b.status}</span></td>
        <td>
          <select class="js-booking-status">
            ${['pending', 'confirmed', 'cancelled'].map((s) => `<option value="${s}" ${s === b.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
      </tr>
    `).join('') : emptyRow(7, 'No booking requests yet.');

    tbody.querySelectorAll('.js-booking-status').forEach((select) => {
      select.addEventListener('change', async () => {
        const id = select.closest('tr').dataset.id;
        try {
          await adminFetch(`/api/admin/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ status: select.value }) });
          loadedPanels.delete('bookings');
          loadedPanels.delete('overview');
          loadPanel('bookings');
        } catch (err) { alert(err.message); }
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Testimonials                                                        */
  /* ---------------------------------------------------------------- */
  async function loadTestimonials() {
    const { testimonials } = await adminFetch('/api/admin/testimonials');
    const tbody = document.querySelector('#testimonialsTable tbody');
    tbody.innerHTML = testimonials.length ? testimonials.map((t) => `
      <tr data-id="${t.id}">
        <td>${fmtDate(t.createdAt)}</td>
        <td>${escapeHtml(t.name)}</td>
        <td>${t.rating}/5</td>
        <td class="wrap">${escapeHtml(t.message)}</td>
        <td><span class="status-pill status-${t.status}">${t.status}</span></td>
        <td>
          ${t.status !== 'approved' ? '<button class="row-action js-approve">Approve</button>' : ''}
          ${t.status !== 'rejected' ? '<button class="row-action js-reject">Reject</button>' : ''}
          <button class="row-action js-delete">Delete</button>
        </td>
      </tr>
    `).join('') : emptyRow(6, 'No testimonials submitted yet.');

    tbody.querySelectorAll('tr[data-id]').forEach((row) => {
      const id = row.dataset.id;
      row.querySelector('.js-approve')?.addEventListener('click', () => setTestimonialStatus(id, 'approved'));
      row.querySelector('.js-reject')?.addEventListener('click', () => setTestimonialStatus(id, 'rejected'));
      row.querySelector('.js-delete')?.addEventListener('click', () => deleteTestimonialRow(id));
    });
  }
  async function setTestimonialStatus(id, status) {
    try {
      await adminFetch(`/api/admin/testimonials/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      loadedPanels.delete('testimonials'); loadedPanels.delete('overview');
      loadPanel('testimonials');
    } catch (err) { alert(err.message); }
  }
  async function deleteTestimonialRow(id) {
    if (!confirm('Delete this testimonial permanently?')) return;
    try {
      await adminFetch(`/api/admin/testimonials/${id}`, { method: 'DELETE' });
      loadedPanels.delete('testimonials'); loadedPanels.delete('overview');
      loadPanel('testimonials');
    } catch (err) { alert(err.message); }
  }

  /* ---------------------------------------------------------------- */
  /* Blog                                                                */
  /* ---------------------------------------------------------------- */
  const postModal = document.getElementById('postModalOverlay');
  const postForm = document.getElementById('postForm');

  function openPostModal(post) {
    document.getElementById('postModalTitle').textContent = post ? 'Edit Post' : 'New Post';
    document.getElementById('postId').value = post?.id || '';
    document.getElementById('postTitle').value = post?.title || '';
    document.getElementById('postExcerpt').value = post?.excerpt || '';
    document.getElementById('postContent').value = post?.content || '';
    document.getElementById('postPublished').checked = Boolean(post?.published);
    postModal.classList.add('open');
  }
  function closePostModal() { postModal.classList.remove('open'); }

  document.getElementById('newPostBtn').addEventListener('click', () => openPostModal(null));
  document.getElementById('postModalClose').addEventListener('click', closePostModal);
  postModal.addEventListener('click', (e) => { if (e.target === postModal) closePostModal(); });

  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('postId').value;
    const payload = {
      title: document.getElementById('postTitle').value.trim(),
      excerpt: document.getElementById('postExcerpt').value.trim(),
      content: document.getElementById('postContent').value,
      published: document.getElementById('postPublished').checked
    };

    try {
      if (id) {
        await adminFetch(`/api/admin/blog/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await adminFetch('/api/admin/blog', { method: 'POST', body: JSON.stringify(payload) });
      }
      closePostModal();
      loadedPanels.delete('blog');
      loadPanel('blog');
    } catch (err) { alert(err.message); }
  });

  async function loadBlog() {
    const { posts } = await adminFetch('/api/admin/blog');
    const tbody = document.querySelector('#blogTable tbody');
    tbody.innerHTML = posts.length ? posts.map((p) => `
      <tr data-id="${p.id}">
        <td>${escapeHtml(p.title)}</td>
        <td><span class="status-pill ${p.published ? 'status-approved' : 'status-pending'}">${p.published ? 'published' : 'draft'}</span></td>
        <td>${fmtDate(p.updatedAt)}</td>
        <td>
          <button class="row-action js-edit-post">Edit</button>
          <button class="row-action js-delete-post">Delete</button>
        </td>
      </tr>
    `).join('') : emptyRow(4, 'No posts yet.');

    tbody.querySelectorAll('tr[data-id]').forEach((row) => {
      const id = row.dataset.id;
      const post = posts.find((p) => String(p.id) === id);
      row.querySelector('.js-edit-post').addEventListener('click', () => openPostModal(post));
      row.querySelector('.js-delete-post').addEventListener('click', async () => {
        if (!confirm('Delete this post permanently?')) return;
        try {
          await adminFetch(`/api/admin/blog/${id}`, { method: 'DELETE' });
          loadedPanels.delete('blog');
          loadPanel('blog');
        } catch (err) { alert(err.message); }
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Payments                                                            */
  /* ---------------------------------------------------------------- */
  async function loadPayments() {
    const { payments } = await adminFetch('/api/admin/payments');
    const tbody = document.querySelector('#paymentsTable tbody');
    tbody.innerHTML = payments.length ? payments.map((p) => `
      <tr>
        <td>${fmtDate(p.recordedAt)}</td>
        <td>${escapeHtml(p.reference)}</td>
        <td>${escapeHtml(p.amount)} ${escapeHtml(p.currency)}</td>
        <td>${escapeHtml(p.email)}</td>
        <td><span class="status-pill status-${p.status}">${p.status}</span></td>
      </tr>
    `).join('') : emptyRow(5, 'No payments yet.');
  }

  /* ---------------------------------------------------------------- */
  /* Boot                                                                */
  /* ---------------------------------------------------------------- */
  if (sessionStorage.getItem('adminAuth')) {
    adminFetch('/api/admin/whoami').then(showDashboard).catch(() => showLogin());
  } else {
    showLogin();
  }
})();
