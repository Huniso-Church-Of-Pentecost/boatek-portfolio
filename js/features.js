/* ==========================================================================
   features.js — additional interactive features layered on top of
   main.js / animations.js without touching their behavior.
   ========================================================================== */

(function () {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- */
  /* Mini-toast helper — reusable stacked toast notifications           */
  /* ---------------------------------------------------------------- */
  let toastStack = null;
  function showToast(message, { warn = false, duration = 3200 } = {}) {
    if (!toastStack) {
      toastStack = document.createElement('div');
      toastStack.className = 'mini-toast-stack';
      toastStack.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastStack);
    }
    const el = document.createElement('div');
    el.className = 'mini-toast' + (warn ? ' mini-toast-warn' : '');
    el.textContent = message;
    toastStack.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 350);
    }, duration);
  }
  window.BoatekToast = showToast;

  /* ---------------------------------------------------------------- */
  /* Theme toggle (dark/light, persisted)                               */
  /* ---------------------------------------------------------------- */
  function initThemeToggle() {
    const btns = document.querySelectorAll('.js-theme-toggle');
    const icons = document.querySelectorAll('.js-theme-icon');
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!btns.length) return;

    function apply(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      icons.forEach((icon) => { icon.className = (theme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon') + ' js-theme-icon'; });
      if (metaTheme) metaTheme.setAttribute('content', theme === 'light' ? '#f6f7fb' : '#070b14');
      try { localStorage.setItem('theme', theme); } catch (e) {}
    }

    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    apply(current);

    btns.forEach((btn) => btn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      apply(next);
    }));
  }

  /* ---------------------------------------------------------------- */
  /* Greeting badge — time-of-day aware (Ghana / Africa-Accra time)     */
  /* ---------------------------------------------------------------- */
  function initGreetingBadge() {
    const el = document.getElementById('greetingBadge');
    if (!el) return;

    let hour;
    try {
      hour = Number(
        new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Africa/Accra' }).format(new Date())
      );
    } catch (e) {
      hour = new Date().getHours();
    }

    let greeting = 'Good evening';
    if (hour >= 5 && hour < 12) greeting = 'Good morning';
    else if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    else if (hour >= 17 && hour < 21) greeting = 'Good evening';
    else greeting = 'Working late';

    el.innerHTML = `<span class="greeting-dot"></span>${greeting} — usually online and replying within 24h`;
  }

  /* ---------------------------------------------------------------- */
  /* Skill proficiency bars — appended into each .skill-card            */
  /* ---------------------------------------------------------------- */
  function initSkillBars() {
    const grid = document.getElementById('skillsGrid');
    if (!grid) return;

    // Approximate proficiency levels, keyed by the skill card heading text
    const levels = {
      'HTML': 96,
      'CSS': 94,
      'JavaScript': 92,
      'Node.js': 90,
      'Express': 88,
      'Git': 90,
      'GitHub': 90,
      'Responsive Design': 95,
      'REST APIs': 88,
      'Performance Optimization': 85
    };

    const cards = grid.querySelectorAll('.skill-card');
    cards.forEach((card) => {
      const heading = card.querySelector('h3');
      if (!heading) return;
      const level = levels[heading.textContent.trim()] ?? 85;

      const track = document.createElement('div');
      track.className = 'skill-bar-track';
      const fill = document.createElement('div');
      fill.className = 'skill-bar-fill';
      fill.dataset.level = level;
      track.appendChild(fill);

      const label = document.createElement('div');
      label.className = 'skill-bar-label';
      label.innerHTML = `<span>Proficiency</span><span>${level}%</span>`;

      card.appendChild(track);
      card.appendChild(label);
    });

    if (prefersReducedMotion) {
      grid.querySelectorAll('.skill-bar-fill').forEach((f) => { f.style.width = f.dataset.level + '%'; });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const fill = entry.target.querySelector('.skill-bar-fill');
            if (fill) fill.style.width = fill.dataset.level + '%';
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    cards.forEach((card) => observer.observe(card));
  }

  /* ---------------------------------------------------------------- */
  /* Live GitHub stats widget                                           */
  /* ---------------------------------------------------------------- */
  function ghEscapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  async function initGithubStats() {
    const widget = document.getElementById('githubStats');
    const gridEl = document.getElementById('githubStatsGrid');
    if (!widget || !gridEl) return;

    const username = widget.dataset.githubUser;
    if (!username) {
      gridEl.innerHTML = '<span class="github-stats-status">Set data-github-user on #githubStats to enable this widget.</span>';
      return;
    }

    const profileUrl = `https://github.com/${encodeURIComponent(username)}`;

    try {
      const profileRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
        headers: { Accept: 'application/vnd.github+json' }
      });

      if (profileRes.status === 404) throw new Error('not-found');
      if (profileRes.status === 403) throw new Error('rate-limited');
      if (!profileRes.ok) throw new Error('profile-error');

      const profile = await profileRes.json();

      // Organizations and users expose their public repo listing under
      // different endpoints in the GitHub REST API.
      const reposEndpoint = profile.type === 'Organization'
        ? `https://api.github.com/orgs/${encodeURIComponent(username)}/repos?sort=updated&per_page=100&type=public`
        : `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100&type=public`;

      const reposRes = await fetch(reposEndpoint, { headers: { Accept: 'application/vnd.github+json' } });
      if (reposRes.status === 403) throw new Error('rate-limited');
      const repos = reposRes.ok ? await reposRes.json() : [];

      // Aggregate stars/forks/languages across public, non-fork repos.
      const ownRepos = Array.isArray(repos) ? repos.filter((r) => !r.fork) : [];
      const totalStars = ownRepos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
      const totalForks = ownRepos.reduce((sum, r) => sum + (r.forks_count || 0), 0);

      const langCounts = {};
      ownRepos.forEach((r) => {
        if (r.language) langCounts[r.language] = (langCounts[r.language] || 0) + 1;
      });
      const topLanguages = Object.entries(langCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([lang]) => lang);

      const recentRepos = ownRepos.slice(0, 5);

      const profileRow = `
        <div class="github-profile-row">
          <img class="github-avatar" src="${ghEscapeHtml(profile.avatar_url)}" alt="${ghEscapeHtml(profile.name || profile.login)} avatar" loading="lazy" width="52" height="52">
          <div>
            <div class="github-profile-name">${ghEscapeHtml(profile.name || profile.login)}</div>
            ${profile.bio ? `<div class="github-profile-bio">${ghEscapeHtml(profile.bio)}</div>` : ''}
          </div>
        </div>`;

      const statGrid = `
        <div class="github-stat"><span class="github-stat-num">${profile.public_repos ?? ownRepos.length ?? '—'}</span><span class="github-stat-label">Public Repos</span></div>
        <div class="github-stat"><span class="github-stat-num">${totalStars}</span><span class="github-stat-label">Total Stars</span></div>
        <div class="github-stat"><span class="github-stat-num">${totalForks}</span><span class="github-stat-label">Total Forks</span></div>
        <div class="github-stat"><span class="github-stat-num">${profile.followers ?? '—'}</span><span class="github-stat-label">Followers</span></div>
        <a class="github-stat-link" href="${ghEscapeHtml(profile.html_url || profileUrl)}" target="_blank" rel="noopener">View profile &rarr;</a>`;

      const langRow = topLanguages.length
        ? `<div class="github-lang-row">${topLanguages.map((l) => `<span class="github-lang-chip">${ghEscapeHtml(l)}</span>`).join('')}</div>`
        : '';

      const repoList = recentRepos.length
        ? `<ul class="github-repos-list">${recentRepos.map((r) => `
            <li class="github-repo-item">
              <a href="${ghEscapeHtml(r.html_url)}" target="_blank" rel="noopener">${ghEscapeHtml(r.name)}</a>
              <span class="github-repo-meta"><i class="fa-solid fa-star" aria-hidden="true"></i> ${r.stargazers_count || 0} &nbsp; <i class="fa-solid fa-code-fork" aria-hidden="true"></i> ${r.forks_count || 0}</span>
            </li>`).join('')}</ul>`
        : '';

      gridEl.innerHTML = profileRow + statGrid + langRow + repoList;
    } catch (err) {
      const message = err.message === 'not-found'
        ? `No public GitHub profile found for "${ghEscapeHtml(username)}".`
        : err.message === 'rate-limited'
          ? 'GitHub API rate limit reached — stats will refresh shortly.'
          : 'GitHub stats unavailable right now.';
      gridEl.innerHTML = `<span class="github-stats-status">${message} <a class="github-stat-link" href="${profileUrl}" target="_blank" rel="noopener">Visit profile</a> instead.</span>`;
    }
  }

  /* ---------------------------------------------------------------- */
  /* Project search + tag filter                                        */
  /* ---------------------------------------------------------------- */
  function initProjectFilter() {
    const grid = document.getElementById('projectsGrid');
    const filtersEl = document.getElementById('projectsFilters');
    const searchInput = document.getElementById('projectSearch');
    const emptyEl = document.getElementById('projectsEmpty');
    if (!grid || !filtersEl || !searchInput) return;

    const cards = Array.from(grid.querySelectorAll('.project-card'));

    // build unique tag list from badges
    const tags = new Set();
    cards.forEach((card) => {
      card.querySelectorAll('.badge').forEach((b) => tags.add(b.textContent.trim()));
    });
    Array.from(tags).sort().forEach((tag) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'filter-chip';
      chip.dataset.filter = tag;
      chip.textContent = tag;
      filtersEl.appendChild(chip);
    });

    let activeFilter = 'all';

    function applyFilters() {
      const query = searchInput.value.trim().toLowerCase();
      let visibleCount = 0;

      cards.forEach((card) => {
        const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
        const desc = card.querySelector('p')?.textContent.toLowerCase() || '';
        const cardTags = Array.from(card.querySelectorAll('.badge')).map((b) => b.textContent.trim());

        const matchesFilter = activeFilter === 'all' || cardTags.includes(activeFilter);
        const matchesSearch = !query || title.includes(query) || desc.includes(query) || cardTags.some((t) => t.toLowerCase().includes(query));
        const visible = matchesFilter && matchesSearch;

        card.classList.toggle('is-hidden', !visible);
        if (visible) visibleCount += 1;
      });

      if (emptyEl) emptyEl.hidden = visibleCount !== 0;
    }

    filtersEl.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      activeFilter = chip.dataset.filter;
      filtersEl.querySelectorAll('.filter-chip').forEach((c) => c.classList.toggle('active', c === chip));
      applyFilters();
    });

    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(applyFilters, 120);
    });
  }

  /* ---------------------------------------------------------------- */
  /* Copy email button                                                  */
  /* ---------------------------------------------------------------- */
  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    // fallback for non-secure contexts (e.g. plain http on localhost is fine,
    // but some Termux/embedded webviews still lack the Clipboard API)
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } finally { ta.remove(); }
    return Promise.resolve();
  }

  function initCopyEmail() {
    const btn = document.getElementById('copyEmailBtn');
    const emailLink = document.getElementById('emailLink');
    if (!btn || !emailLink) return;

    btn.addEventListener('click', () => {
      const email = emailLink.textContent.trim();
      copyToClipboard(email).then(() => {
        btn.classList.add('copied');
        btn.innerHTML = '<i class="fa-solid fa-check"></i>';
        showToast('Email address copied to clipboard');
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = '<i class="fa-regular fa-copy"></i>';
        }, 2000);
      }).catch(() => showToast('Could not copy — email is ' + email, { warn: true }));
    });
  }

  /* ---------------------------------------------------------------- */
  /* Share row — copy link + X / LinkedIn / WhatsApp intents            */
  /* ---------------------------------------------------------------- */
  function initShareRow() {
    const copyBtn = document.getElementById('shareCopyLink');
    const shareX = document.getElementById('shareX');
    const shareLinkedin = document.getElementById('shareLinkedin');
    const shareWhatsapp = document.getElementById('shareWhatsapp');
    if (!copyBtn) return;

    const url = window.location.href;
    const title = document.title;

    if (shareX) shareX.href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
    if (shareLinkedin) shareLinkedin.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    if (shareWhatsapp) shareWhatsapp.href = `https://wa.me/?text=${encodeURIComponent(title + ' — ' + url)}`;

    copyBtn.addEventListener('click', () => {
      copyToClipboard(url).then(() => showToast('Page link copied to clipboard'))
        .catch(() => showToast('Could not copy the link', { warn: true }));
    });
  }

  /* ---------------------------------------------------------------- */
  /* Visitor counter (server-backed, one increment per session)         */
  /* ---------------------------------------------------------------- */
  function initVisitorCounter() {
    const el = document.getElementById('visitorCount');
    if (!el) return;

    let alreadyCounted = false;
    try { alreadyCounted = sessionStorage.getItem('visitCounted') === '1'; } catch (e) {}

    const method = alreadyCounted ? 'GET' : 'POST';
    fetch('/api/stats/visit', { method })
      .then((res) => res.json())
      .then((data) => {
        const n = data.totalVisits || 0;
        el.textContent = `${n.toLocaleString()} ${n === 1 ? 'visit' : 'visits'} to this site`;
        try { sessionStorage.setItem('visitCounted', '1'); } catch (e) {}
      })
      .catch(() => { /* fail silently — non-essential */ });
  }

  /* ---------------------------------------------------------------- */
  /* Accessibility toolbar: font size + high contrast + reduce motion  */
  /* ---------------------------------------------------------------- */
  function initAccessibilityToolbar() {
    const triggers = document.querySelectorAll('#accessibilityToggle, #accessibilityToggleMobile');
    if (!triggers.length) return;

    const panel = document.createElement('div');
    panel.className = 'a11y-panel';
    panel.innerHTML = `
      <h4>Accessibility</h4>
      <div class="a11y-row">
        <span>Text size</span>
        <div class="a11y-steppers">
          <button type="button" data-a11y="decrease" aria-label="Decrease text size">A-</button>
          <button type="button" data-a11y="reset" aria-label="Reset text size">A</button>
          <button type="button" data-a11y="increase" aria-label="Increase text size">A+</button>
        </div>
      </div>
      <div class="a11y-row">
        <span>High contrast</span>
        <button type="button" class="a11y-switch" id="a11yContrastSwitch" aria-label="Toggle high contrast" aria-pressed="false"></button>
      </div>
      <div class="a11y-row">
        <span>Reduce motion</span>
        <button type="button" class="a11y-switch" id="a11yMotionSwitch" aria-label="Toggle reduce motion" aria-pressed="false"></button>
      </div>
    `;
    document.body.appendChild(panel);

    const html = document.documentElement;
    const sizes = ['a11y-normal', 'a11y-large', 'a11y-larger'];

    function getSizeIndex() {
      if (html.classList.contains('a11y-larger')) return 2;
      if (html.classList.contains('a11y-large')) return 1;
      return 0;
    }
    function setSizeIndex(i) {
      html.classList.remove('a11y-large', 'a11y-larger');
      if (i === 1) html.classList.add('a11y-large');
      if (i === 2) html.classList.add('a11y-larger');
      try { localStorage.setItem('a11ySize', String(i)); } catch (e) {}
    }
    try {
      const savedSize = Number(localStorage.getItem('a11ySize'));
      if (savedSize) setSizeIndex(savedSize);
    } catch (e) {}

    panel.querySelectorAll('[data-a11y]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.a11y;
        let i = getSizeIndex();
        if (action === 'increase') i = Math.min(2, i + 1);
        else if (action === 'decrease') i = Math.max(0, i - 1);
        else i = 0;
        setSizeIndex(i);
      });
    });

    const contrastSwitch = panel.querySelector('#a11yContrastSwitch');
    const motionSwitch = panel.querySelector('#a11yMotionSwitch');

    function syncSwitch(el, on) {
      el.classList.toggle('on', on);
      el.setAttribute('aria-pressed', String(on));
    }

    let contrastOn = false, motionOn = false;
    try {
      contrastOn = localStorage.getItem('a11yContrast') === '1';
      motionOn = localStorage.getItem('a11yMotion') === '1';
    } catch (e) {}
    html.classList.toggle('a11y-contrast', contrastOn);
    if (motionOn) html.classList.add('a11y-force-reduced-motion');
    syncSwitch(contrastSwitch, contrastOn);
    syncSwitch(motionSwitch, motionOn);

    contrastSwitch.addEventListener('click', () => {
      contrastOn = !contrastOn;
      html.classList.toggle('a11y-contrast', contrastOn);
      syncSwitch(contrastSwitch, contrastOn);
      try { localStorage.setItem('a11yContrast', contrastOn ? '1' : '0'); } catch (e) {}
    });

    motionSwitch.addEventListener('click', () => {
      motionOn = !motionOn;
      html.classList.toggle('a11y-force-reduced-motion', motionOn);
      syncSwitch(motionSwitch, motionOn);
      try { localStorage.setItem('a11yMotion', motionOn ? '1' : '0'); } catch (e) {}
      showToast(motionOn ? 'Animations reduced' : 'Animations restored');
    });

    triggers.forEach((trigger) => trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('mobileMenu')?.classList.remove('active');
      document.getElementById('hamburger')?.classList.remove('active');
      document.body.style.overflow = '';
      panel.classList.toggle('open');
    }));
    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && ![...triggers].includes(e.target) && !e.target.closest('#accessibilityToggle, #accessibilityToggleMobile')) {
        panel.classList.remove('open');
      }
    });
  }

  /* ---------------------------------------------------------------- */
  /* Command palette (Ctrl/Cmd+K)                                       */
  /* ---------------------------------------------------------------- */
  function initCommandPalette() {
    const paletteBtns = document.querySelectorAll('.js-palette-trigger');

    const overlay = document.createElement('div');
    overlay.className = 'command-overlay';
    overlay.innerHTML = `
      <div class="command-palette" role="dialog" aria-modal="true" aria-label="Quick navigation">
        <div class="command-input-row">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="commandInput" placeholder="Jump to a section or run a command…" autocomplete="off">
          <kbd>Esc</kbd>
        </div>
        <div class="command-results" id="commandResults"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#commandInput');
    const results = overlay.querySelector('#commandResults');

    const navItems = Array.from(document.querySelectorAll('.nav-link')).map((a) => ({
      label: 'Go to ' + a.textContent.trim(),
      icon: 'fa-solid fa-arrow-right',
      run: () => { window.location.hash = a.getAttribute('href'); }
    }));

    const actionItems = [
      {
        label: 'Toggle light / dark theme',
        icon: 'fa-solid fa-circle-half-stroke',
        run: () => document.getElementById('themeToggle')?.click()
      },
      {
        label: 'Copy email address',
        icon: 'fa-regular fa-copy',
        run: () => document.getElementById('copyEmailBtn')?.click()
      },
      {
        label: 'Open resume',
        icon: 'fa-solid fa-file-arrow-down',
        run: () => window.open('resume.html', '_blank', 'noopener')
      },
      {
        label: 'Read the blog',
        icon: 'fa-solid fa-pen-nib',
        run: () => window.open('blog.html', '_blank', 'noopener')
      },
      {
        label: 'Book a call',
        icon: 'fa-solid fa-calendar-check',
        run: () => document.getElementById('bookCallBtn')?.click()
      },
      {
        label: 'Join WhatsApp community',
        icon: 'fa-brands fa-whatsapp',
        run: () => window.open('https://chat.whatsapp.com/Lwqd1vUnb4IHvlBtaA9sjX', '_blank', 'noopener')
      },
      {
        label: 'Scroll to top',
        icon: 'fa-solid fa-arrow-up',
        run: () => window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      {
        label: 'Open accessibility options',
        icon: 'fa-solid fa-universal-access',
        run: () => document.getElementById('accessibilityToggle')?.click()
      }
    ];

    const allItems = [...navItems, ...actionItems];
    let activeIndex = 0;

    function render(query) {
      const q = query.trim().toLowerCase();
      const matches = q ? allItems.filter((item) => item.label.toLowerCase().includes(q)) : allItems;
      results.innerHTML = '';

      if (!matches.length) {
        results.innerHTML = '<div class="command-empty">No matches — try a different term.</div>';
        return;
      }

      matches.forEach((item, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'command-item' + (i === activeIndex ? ' active' : '');
        btn.innerHTML = `<i class="${item.icon}"></i><span>${item.label}</span>`;
        btn.addEventListener('click', () => { item.run(); close(); });
        results.appendChild(btn);
      });
    }

    function open() {
      overlay.classList.add('open');
      activeIndex = 0;
      input.value = '';
      render('');
      setTimeout(() => input.focus(), 50);
      document.body.style.overflow = 'hidden';
    }
    function close() {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    input.addEventListener('input', () => { activeIndex = 0; render(input.value); });

    input.addEventListener('keydown', (e) => {
      const items = results.querySelectorAll('.command-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(items.length - 1, activeIndex + 1);
        render(input.value);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(0, activeIndex - 1);
        render(input.value);
      } else if (e.key === 'Enter') {
        items[activeIndex]?.click();
      } else if (e.key === 'Escape') {
        close();
      }
    });

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    paletteBtns.forEach((btn) => btn.addEventListener('click', () => {
      document.getElementById('mobileMenu')?.classList.remove('active');
      document.getElementById('hamburger')?.classList.remove('active');
      document.getElementById('hamburger')?.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      open();
    }));

    window.addEventListener('keydown', (e) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      if (modifier && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        overlay.classList.contains('open') ? close() : open();
      }
    });
  }

  /* ---------------------------------------------------------------- */
  /* Keyboard shortcuts panel ("?" key)                                 */
  /* ---------------------------------------------------------------- */
  function initShortcutsPanel() {
    const overlay = document.createElement('div');
    overlay.className = 'shortcuts-panel';
    overlay.innerHTML = `
      <div class="shortcuts-card" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
        <h3>Keyboard shortcuts</h3>
        <div class="shortcut-row"><span>Quick search / navigate</span><kbd>Ctrl/⌘ + K</kbd></div>
        <div class="shortcut-row"><span>Show this panel</span><kbd>?</kbd></div>
        <div class="shortcut-row"><span>Close any panel</span><kbd>Esc</kbd></div>
        <button type="button" class="shortcuts-close">Close</button>
      </div>
    `;
    document.body.appendChild(overlay);

    function open() { overlay.classList.add('open'); }
    function close() { overlay.classList.remove('open'); }

    overlay.querySelector('.shortcuts-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    window.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === '?' && !typing) { e.preventDefault(); open(); }
      if (e.key === 'Escape') close();
    });
  }

  /* ---------------------------------------------------------------- */
  /* Online / offline status toast                                      */
  /* ---------------------------------------------------------------- */
  function initConnectionStatus() {
    window.addEventListener('offline', () => showToast("You're offline — cached pages still work.", { warn: true, duration: 5000 }));
    window.addEventListener('online', () => showToast("Back online."));
  }

  /* ---------------------------------------------------------------- */
  /* Contact form: draft autosave + confetti on success                 */
  /* ---------------------------------------------------------------- */
  function initContactEnhancements() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const DRAFT_KEY = 'contactDraft';
    const fields = ['name', 'email', 'project', 'budget', 'message'];

    function readDraft() {
      try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { return null; }
    }
    function saveDraft() {
      const draft = {};
      fields.forEach((f) => { draft[f] = form.querySelector(`#${f}`)?.value || ''; });
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (e) {}
    }
    function clearDraft() {
      try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
    }

    const draft = readDraft();
    const hasContent = draft && Object.values(draft).some((v) => v && v.trim());

    if (hasContent) {
      const banner = document.createElement('div');
      banner.className = 'draft-banner';
      banner.innerHTML = `<span>You have an unsent draft message.</span><span><button type="button" id="restoreDraftBtn">Restore</button> &nbsp;·&nbsp; <button type="button" id="discardDraftBtn">Discard</button></span>`;
      form.prepend(banner);

      banner.querySelector('#restoreDraftBtn').addEventListener('click', () => {
        fields.forEach((f) => {
          const el = form.querySelector(`#${f}`);
          if (el && draft[f]) el.value = draft[f];
        });
        banner.remove();
        showToast('Draft restored');
      });
      banner.querySelector('#discardDraftBtn').addEventListener('click', () => {
        clearDraft();
        banner.remove();
      });
    }

    let saveTimer;
    fields.forEach((f) => {
      const el = form.querySelector(`#${f}`);
      if (!el) return;
      el.addEventListener('input', () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveDraft, 500);
      });
      el.addEventListener('change', saveDraft);
    });

    // watch the success box so we can clear the draft + celebrate,
    // without touching main.js's own submit handler
    const successBox = document.getElementById('formSuccess');
    if (successBox) {
      const observer = new MutationObserver(() => {
        if (successBox.classList.contains('show')) {
          clearDraft();
          const banner = form.querySelector('.draft-banner');
          if (banner) banner.remove();
          fireConfetti();
        }
      });
      observer.observe(successBox, { attributes: true, attributeFilter: ['class'] });
    }
  }

  /* ---------------------------------------------------------------- */
  /* Confetti burst                                                     */
  /* ---------------------------------------------------------------- */
  function fireConfetti() {
    if (prefersReducedMotion) return;

    let canvas = document.getElementById('confettiCanvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'confettiCanvas';
      document.body.appendChild(canvas);
    }
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');

    const colors = ['#3b6fe0', '#2dd4bf', '#f5a623', '#8b7cf6', '#f2f4f8'];
    const pieces = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.3,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: 2 + Math.random() * 3,
      speedX: -1.5 + Math.random() * 3,
      rotation: Math.random() * 360,
      rotationSpeed: -6 + Math.random() * 12
    }));

    let frame = 0;
    const maxFrames = 220;

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      frame += 1;
      if (frame < maxFrames) {
        requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    draw();
  }

  /* ---------------------------------------------------------------- */
  /* Konami code easter egg                                             */
  /* ---------------------------------------------------------------- */
  function initEasterEgg() {
    const sequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let progress = 0;

    window.addEventListener('keydown', (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      progress = key === sequence[progress] ? progress + 1 : (key === sequence[0] ? 1 : 0);
      if (progress === sequence.length) {
        progress = 0;
        showToast("You found the easter egg! Thanks for exploring this thoroughly. 🎉");
        fireConfetti();
      }
    });
  }

  /* ---------------------------------------------------------------- */
  /* Save Contact — downloads a .vcf so a client can add you to their   */
  /* phone contacts in one tap, no typing                               */
  /* ---------------------------------------------------------------- */
  function initVCardDownload() {
    const btn = document.getElementById('saveContactBtn');
    if (!btn) return;

    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:;Foster;;;',
      'FN:Foster (Boatek Labs)',
      'ORG:Boatek Labs',
      'TITLE:Full-Stack Web & AI Developer',
      'TEL;TYPE=CELL:+233537045514',
      'EMAIL;TYPE=INTERNET:boateklabs@gmail.com',
      'URL:' + window.location.origin,
      'NOTE:Full-stack web and AI developer — Ghana',
      'END:VCARD'
    ].join('\r\n');

    btn.addEventListener('click', () => {
      const blob = new Blob([vcard], { type: 'text/vcard' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Foster-BoatekLabs.vcf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('Contact card downloaded');
    });
  }

  /* ---------------------------------------------------------------- */
  /* Direct WhatsApp chat link — prefilled with whatever project type   */
  /* is currently selected in the contact form, falls back to generic   */
  /* ---------------------------------------------------------------- */
  function initWhatsappChatLink() {
    const link = document.getElementById('whatsappChatBtn');
    if (!link) return;
    const projectSelect = document.getElementById('project');

    function updateHref() {
      const projectType = projectSelect?.selectedOptions?.[0]?.textContent?.trim();
      const message = projectType && projectType !== 'Select project type'
        ? `Hi Foster, I'd like to talk about a ${projectType.toLowerCase()} project.`
        : "Hi Foster, I'd like to talk about a project.";
      link.href = `https://wa.me/233537045514?text=${encodeURIComponent(message)}`;
    }

    updateHref();
    projectSelect?.addEventListener('change', updateHref);
  }

  /* ---------------------------------------------------------------- */
  /* iOS "Add to Home Screen" hint — beforeinstallprompt never fires    */
  /* on iOS Safari, so those visitors never see the existing install    */
  /* toast in main.js. This fills that gap with iOS-specific steps.     */
  /* ---------------------------------------------------------------- */
  function initIosInstallHint() {
    const isIos = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    if (!isIos || isStandalone) return;

    let dismissed = false;
    try { dismissed = localStorage.getItem('iosInstallHintDismissed') === '1'; } catch (e) {}
    if (dismissed) return;

    setTimeout(() => {
      showToast('Tip: tap the Share icon, then "Add to Home Screen" to install this site as an app.', { duration: 7000 });
      try { localStorage.setItem('iosInstallHintDismissed', '1'); } catch (e) {}
    }, 4000);
  }

  /* ---------------------------------------------------------------- */
  /* Service worker update prompt — the SW activates immediately       */
  /* (skipWaiting), but an already-open tab keeps running old JS/HTML   */
  /* until it reloads. This tells the visitor a new version landed.     */
  /* ---------------------------------------------------------------- */
  function initSwUpdatePrompt() {
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;
    let hadControllerOnLoad = Boolean(navigator.serviceWorker.controller);

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadControllerOnLoad || refreshing) return;

      if (!toastStack) {
        toastStack = document.createElement('div');
        toastStack.className = 'mini-toast-stack';
        document.body.appendChild(toastStack);
      }
      const el = document.createElement('div');
      el.className = 'mini-toast';
      el.innerHTML = '<span>A new version of this site is available. </span><button type="button" style="text-decoration:underline;font-weight:600;">Refresh</button>';
      toastStack.appendChild(el);
      requestAnimationFrame(() => el.classList.add('show'));
      el.querySelector('button').addEventListener('click', () => {
        refreshing = true;
        window.location.reload();
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Init                                                                */
  /* ---------------------------------------------------------------- */
  function init() {
    initThemeToggle();
    initGreetingBadge();
    initSkillBars();
    initGithubStats();
    initProjectFilter();
    initCopyEmail();
    initShareRow();
    initVisitorCounter();
    initAccessibilityToolbar();
    initCommandPalette();
    initShortcutsPanel();
    initConnectionStatus();
    initContactEnhancements();
    initEasterEgg();
    initVCardDownload();
    initWhatsappChatLink();
    initIosInstallHint();
    initSwUpdatePrompt();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
