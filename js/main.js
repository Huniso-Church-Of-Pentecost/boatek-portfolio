/* ==========================================================================
   main.js — navigation, scroll progress, mobile menu, contact form,
   back-to-top, footer year, and PWA registration
   ========================================================================== */

(function () {
  /* ---------------------------------------------------------------- */
  /* Nav scroll state + active section highlight                       */
  /* ---------------------------------------------------------------- */
  function initNav() {
    const nav = document.getElementById('nav');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('main section[id]');
    const scrollProgress = document.getElementById('scrollProgress');

    function onScroll() {
      const y = window.scrollY;
      nav.classList.toggle('scrolled', y > 20);

      // scroll progress bar
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (y / docHeight) * 100 : 0;
      scrollProgress.style.width = progress + '%';

      // active section
      let currentId = sections[0]?.id;
      const offset = 140;
      sections.forEach((section) => {
        if (y + offset >= section.offsetTop) currentId = section.id;
      });
      navLinks.forEach((link) => {
        link.classList.toggle('active', link.dataset.section === currentId);
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------------------------------------------------------------- */
  /* Mobile hamburger menu                                             */
  /* ---------------------------------------------------------------- */
  function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const menu = document.getElementById('mobileMenu');
    if (!hamburger || !menu) return;

    function close() {
      hamburger.classList.remove('active');
      menu.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
    function toggle() {
      const isOpen = menu.classList.toggle('active');
      hamburger.classList.toggle('active', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    }

    hamburger.addEventListener('click', toggle);
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  /* ---------------------------------------------------------------- */
  /* Smooth scroll for in-page anchors (native scroll-behavior handles  */
  /* most, this just accounts for the fixed nav height offset)         */
  /* ---------------------------------------------------------------- */
  function initSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const id = link.getAttribute('href');
        if (id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        const navH = document.getElementById('nav').offsetHeight;
        const top = target.getBoundingClientRect().top + window.scrollY - (navH - 1);
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Back to top                                                        */
  /* ---------------------------------------------------------------- */
  function initBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ---------------------------------------------------------------- */
  /* Footer year                                                        */
  /* ---------------------------------------------------------------- */
  function initFooterYear() {
    const el = document.getElementById('footerYear');
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ---------------------------------------------------------------- */
  /* Queue banner — shows current pending count on load                */
  /* ---------------------------------------------------------------- */
  function initQueueBanner() {
    const countEl = document.getElementById('queueCount');
    if (!countEl) return;
    fetch('/api/contact/queue/status')
      .then((res) => res.json())
      .then((data) => {
        const n = data.pending || 0;
        countEl.textContent = n === 0 ? 'No one ahead — great time to reach out' : `${n} ${n === 1 ? 'person' : 'people'} ahead of you`;
      })
      .catch(() => {
        countEl.textContent = 'Unavailable right now';
      });
  }

  /* ---------------------------------------------------------------- */
  /* Contact form — client-side validation + submission to /api/contact*/
  /* ---------------------------------------------------------------- */
  function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    const submitBtn = document.getElementById('submitBtn');
    const successBox = document.getElementById('formSuccess');
    const successText = document.getElementById('formSuccessText');

    const validators = {
      name: (v) => v.trim().length >= 2 || 'Please enter your full name.',
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Enter a valid email address.',
      project: (v) => v.trim().length > 0 || 'Please select a project type.',
      budget: (v) => v.trim().length > 0 || 'Please select a budget range.',
      message: (v) => v.trim().length >= 10 || 'Message should be at least 10 characters.'
    };

    function setError(field, message) {
      const group = form.querySelector(`#${field}`).closest('.form-group');
      const errorEl = form.querySelector(`[data-error-for="${field}"]`);
      if (message) {
        group.classList.add('invalid');
        errorEl.textContent = message;
      } else {
        group.classList.remove('invalid');
        errorEl.textContent = '';
      }
    }

    function validateField(field) {
      const el = form.querySelector(`#${field}`);
      const result = validators[field](el.value);
      setError(field, result === true ? '' : result);
      return result === true;
    }

    Object.keys(validators).forEach((field) => {
      const el = form.querySelector(`#${field}`);
      el.addEventListener('blur', () => validateField(field));
      el.addEventListener('input', () => {
        if (el.closest('.form-group').classList.contains('invalid')) validateField(field);
      });
      el.addEventListener('change', () => {
        if (el.closest('.form-group').classList.contains('invalid')) validateField(field);
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fields = Object.keys(validators);
      const allValid = fields.map(validateField).every(Boolean);
      if (!allValid) {
        form.querySelector('.invalid input, .invalid select, .invalid textarea')?.focus();
        return;
      }

      const payload = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        project: form.project.value,
        budget: form.budget.value,
        message: form.message.value.trim(),
        website: form.website ? form.website.value : ''
      };

      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
      successBox.classList.remove('show');

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.message || 'Something went wrong. Please try again.');
        }

        successText.textContent = data.queuePosition
          ? `Message sent — you're #${data.queuePosition} in the queue. I'll get back to you within 24 hours.`
          : `Message sent — I'll get back to you within 24 hours.`;
        successBox.classList.add('show');
        form.reset();
        document.getElementById('budget').innerHTML = '<option value="" disabled selected>Select project type first</option>';
        document.getElementById('budget').disabled = true;
        Object.keys(validators).forEach((field) => setError(field, ''));
        initQueueBanner(); // refresh the live count
      } catch (err) {
        setError('message', err.message || 'Unable to send. Please try again or email me directly.');
      } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      }
    });
  }

  /* ---------------------------------------------------------------- */
  /* PWA — service worker registration + install prompt toast          */
  /* ---------------------------------------------------------------- */
  function initPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.warn('Service worker registration failed:', err);
        });
      });
    }

    let deferredPrompt = null;
    const toast = createToast();

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      showInstallToast();
    });

    function createToast() {
      const el = document.createElement('div');
      el.className = 'toast';
      el.innerHTML = `<span>Install this site as an app</span><button type="button">Install</button>`;
      document.body.appendChild(el);
      el.querySelector('button').addEventListener('click', async () => {
        el.classList.remove('show');
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
      });
      return el;
    }

    function showInstallToast() {
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 8000);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Init                                                               */
  /* ---------------------------------------------------------------- */
  function init() {
    initNav();
    initMobileMenu();
    initSmoothAnchors();
    initBackToTop();
    initFooterYear();
    initContactForm();
    initQueueBanner();
    initPWA();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
