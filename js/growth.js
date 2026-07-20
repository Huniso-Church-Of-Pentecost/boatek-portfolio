/* ==========================================================================
   growth.js — business-facing features layered on top of main.js/features.js:
   call booking, testimonial submission + community wall, case study modals,
   and a Paystack deposit flow. Nothing here touches existing files' behavior.
   ========================================================================== */

(function () {
  function toast(message, opts) {
    // reuse features.js's toast if it's already been initialized on window
    if (window.BoatekToast) return window.BoatekToast(message, opts);
    console.log('[toast]', message);
  }

  /* ---------------------------------------------------------------- */
  /* Generic modal helper                                               */
  /* ---------------------------------------------------------------- */
  function createModal({ title, subtitle, bodyHtml }) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true" aria-label="${title}">
        <div class="modal-header">
          <div>
            <h3>${title}</h3>
            ${subtitle ? `<p>${subtitle}</p>` : ''}
          </div>
          <button type="button" class="modal-close" aria-label="Close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
      </div>
    `;
    document.body.appendChild(overlay);

    function open() { overlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
    function close() { overlay.classList.remove('open'); document.body.style.overflow = ''; }

    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('open')) close(); });

    return { overlay, open, close };
  }

  function honeypotField() {
    return `
      <div class="hp-field" aria-hidden="true">
        <label>Leave this field empty</label>
        <input type="text" name="website" tabindex="-1" autocomplete="off">
      </div>
    `;
  }

  /* ---------------------------------------------------------------- */
  /* Book a Call modal                                                   */
  /* ---------------------------------------------------------------- */
  function initBookingModal() {
    const trigger = document.getElementById('bookCallBtn');
    if (!trigger) return;

    const todayIso = new Date().toISOString().slice(0, 10);

    const modal = createModal({
      title: 'Book a Free Call',
      subtitle: "15–20 minutes to talk through your project. I'll confirm by email.",
      bodyHtml: `
        <form id="bookingForm" novalidate>
          ${honeypotField()}
          <div class="form-group">
            <label for="bookName">Name</label>
            <input type="text" id="bookName" name="name" required>
          </div>
          <div class="form-group">
            <label for="bookEmail">Email</label>
            <input type="email" id="bookEmail" name="email" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="bookDate">Preferred date</label>
              <input type="date" id="bookDate" name="date" min="${todayIso}" required>
            </div>
            <div class="form-group">
              <label for="bookTime">Preferred time</label>
              <input type="time" id="bookTime" name="time" required>
            </div>
          </div>
          <div class="form-group">
            <label for="bookNotes">What's the project about? (optional)</label>
            <textarea id="bookNotes" name="notes" rows="3"></textarea>
          </div>
          <button type="submit" class="btn btn-primary magnetic modal-submit">
            <i class="fa-solid fa-calendar-check"></i><span>Request Call</span>
          </button>
          <p class="modal-note">Times are in your local timezone — I'll confirm what works on my end.</p>
        </form>
      `
    });

    trigger.addEventListener('click', () => {
      modal.open();
      setTimeout(() => modal.overlay.querySelector('#bookName')?.focus(), 50);
    });

    const form = modal.overlay.querySelector('#bookingForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      const payload = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        date: form.date.value,
        time: form.time.value,
        notes: form.notes.value.trim(),
        website: form.website.value
      };

      try {
        const res = await fetch('/api/booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Something went wrong.');

        toast("Request sent — I'll confirm by email shortly.");
        form.reset();
        modal.close();
      } catch (err) {
        toast(err.message || 'Could not send the request. Please try again.', { warn: true });
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  /* ---------------------------------------------------------------- */
  /* Leave a Testimonial modal + community testimonials wall            */
  /* ---------------------------------------------------------------- */
  function initTestimonialModal() {
    const trigger = document.getElementById('leaveTestimonialBtn');
    if (!trigger) return;

    let rating = 5;

    const modal = createModal({
      title: 'Leave a Testimonial',
      subtitle: "Worked together before? I'd appreciate a few words — reviewed before it goes live.",
      bodyHtml: `
        <form id="testimonialForm" novalidate>
          ${honeypotField()}
          <div class="form-group">
            <label>Rating</label>
            <div class="star-rating" id="starRating">
              ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" aria-label="${n} star${n > 1 ? 's' : ''}"><i class="fa-solid fa-star"></i></button>`).join('')}
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="testName">Name</label>
              <input type="text" id="testName" name="name" required>
            </div>
            <div class="form-group">
              <label for="testRole">Role (optional)</label>
              <input type="text" id="testRole" name="role" placeholder="Founder, Acme Co.">
            </div>
          </div>
          <div class="form-group">
            <label for="testMessage">Your testimonial</label>
            <textarea id="testMessage" name="message" rows="4" required></textarea>
          </div>
          <button type="submit" class="btn btn-primary magnetic modal-submit">
            <i class="fa-regular fa-star"></i><span>Submit</span>
          </button>
        </form>
      `
    });

    trigger.addEventListener('click', () => {
      modal.open();
      setTimeout(() => modal.overlay.querySelector('#testName')?.focus(), 50);
    });

    const stars = modal.overlay.querySelectorAll('#starRating button');
    function renderStars() {
      stars.forEach((s) => s.classList.toggle('active', Number(s.dataset.star) <= rating));
    }
    stars.forEach((s) => s.addEventListener('click', () => { rating = Number(s.dataset.star); renderStars(); }));
    renderStars();

    const form = modal.overlay.querySelector('#testimonialForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      const payload = {
        name: form.name.value.trim(),
        role: form.role.value.trim(),
        rating,
        message: form.message.value.trim(),
        website: form.website.value
      };

      try {
        const res = await fetch('/api/testimonials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Something went wrong.');

        toast(data.message || "Thanks! It'll appear once reviewed.");
        form.reset();
        rating = 5;
        renderStars();
        modal.close();
      } catch (err) {
        toast(err.message || 'Could not submit. Please try again.', { warn: true });
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  function loadCommunityTestimonials() {
    const wrap = document.getElementById('communityTestimonials');
    if (!wrap) return;

    fetch('/api/testimonials')
      .then((res) => res.json())
      .then((data) => {
        const list = data.testimonials || [];
        if (!list.length) return;

        wrap.innerHTML = list.map((t) => {
          const initials = t.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
          const starsHtml = '★'.repeat(t.rating) + '☆'.repeat(5 - t.rating);
          return `
            <div class="community-testimonial-card">
              <div class="stars">${starsHtml}</div>
              <p>"${escapeHtml(t.message)}"</p>
              <p class="author-name">${escapeHtml(t.name)}</p>
              ${t.role ? `<p class="author-role">${escapeHtml(t.role)}</p>` : ''}
            </div>
          `;
        }).join('');
        wrap.hidden = false;
      })
      .catch(() => { /* non-essential, fail silently */ });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------------------------------------------------------------- */
  /* Case study modals                                                  */
  /* ---------------------------------------------------------------- */
  function initCaseStudyModals() {
    const buttons = document.querySelectorAll('.js-case-study-btn');
    if (!buttons.length) return;

    const modal = createModal({ title: 'Case Study', bodyHtml: '<div id="caseStudyBody"></div>' });
    const titleEl = modal.overlay.querySelector('.modal-header h3');
    const bodyEl = modal.overlay.querySelector('#caseStudyBody');

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.project-card');
        const heading = card?.querySelector('h3')?.textContent || 'Project';
        const problem = card?.dataset.caseProblem || '';
        const approach = card?.dataset.caseApproach || '';
        const result = card?.dataset.caseResult || '';

        titleEl.textContent = heading;
        bodyEl.innerHTML = `
          <div class="case-study-section"><h4>The Problem</h4><p>${escapeHtml(problem)}</p></div>
          <div class="case-study-section"><h4>The Approach</h4><p>${escapeHtml(approach)}</p></div>
          <div class="case-study-section"><h4>The Result</h4><p>${escapeHtml(result)}</p></div>
        `;
        modal.open();
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Paystack deposit flow                                              */
  /* ---------------------------------------------------------------- */
  function initDepositFlow() {
    const cta = document.getElementById('depositCta');
    const payBtn = document.getElementById('depositPayBtn');
    const amountInput = document.getElementById('depositAmount');
    if (!cta || !payBtn) return;

    fetch('/api/config')
      .then((res) => res.json())
      .then((config) => {
        if (!config.paystackPublicKey) {
          payBtn.disabled = true;
          payBtn.title = 'Payments are not configured yet';
          return;
        }

        payBtn.addEventListener('click', () => {
          if (typeof PaystackPop === 'undefined') {
            toast('Payment library failed to load. Check your connection and try again.', { warn: true });
            return;
          }

          const amount = Math.max(10, Number(amountInput.value) || 50);
          const email = window.prompt('Email for the payment receipt:');
          if (!email) return;

          const handler = PaystackPop.setup({
            key: config.paystackPublicKey,
            email,
            amount: amount * 100, // Paystack expects the smallest currency unit
            currency: 'USD',
            ref: 'deposit_' + Date.now(),
            callback: (response) => {
              fetch('/api/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reference: response.reference })
              })
                .then((res) => res.json())
                .then((data) => {
                  if (data.status === 'success') {
                    toast('Deposit received — thank you! I\u2019ll follow up by email.');
                  } else {
                    toast('Payment could not be verified. Contact me with reference ' + response.reference, { warn: true });
                  }
                })
                .catch(() => toast('Payment made but verification failed — contact me with reference ' + response.reference, { warn: true }));
            },
            onClose: () => {}
          });
          handler.openIframe();
        });
      })
      .catch(() => {
        payBtn.disabled = true;
      });
  }

  /* ---------------------------------------------------------------- */
  /* Init                                                                */
  /* ---------------------------------------------------------------- */
  function init() {
    initBookingModal();
    initTestimonialModal();
    loadCommunityTestimonials();
    initCaseStudyModals();
    initDepositFlow();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
