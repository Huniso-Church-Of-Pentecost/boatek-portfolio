/* ==========================================================================
   animations.js — scroll reveal, tilt, magnetic buttons, cursor glow,
   typing effect, animated counters, testimonial slider
   ========================================================================== */

(function () {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- */
  /* Scroll reveal (IntersectionObserver)                              */
  /* ---------------------------------------------------------------- */
  function initScrollReveal() {
    const revealEls = document.querySelectorAll('.reveal-on-scroll');
    if (!revealEls.length) return;

    // stagger index per parent grid
    const grids = document.querySelectorAll('.skills-grid, .projects-grid, .services-grid, .why-grid, .faq-list');
    grids.forEach((grid) => {
      Array.from(grid.children).forEach((child, i) => {
        child.style.setProperty('--i', i);
      });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );

    revealEls.forEach((el) => observer.observe(el));
  }

  /* ---------------------------------------------------------------- */
  /* Cursor glow follow                                                 */
  /* ---------------------------------------------------------------- */
  function initCursorGlow() {
    const glow = document.getElementById('cursorGlow');
    if (!glow || prefersReducedMotion || window.matchMedia('(pointer: coarse)').matches) {
      if (glow) glow.style.display = 'none';
      return;
    }
    let tx = 0, ty = 0, cx = 0, cy = 0;
    window.addEventListener('mousemove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
      glow.style.opacity = '1';
    });
    document.addEventListener('mouseleave', () => { glow.style.opacity = '0'; });

    function loop() {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      glow.style.transform = `translate(${cx}px, ${cy}px)`;
      requestAnimationFrame(loop);
    }
    loop();
  }

  /* ---------------------------------------------------------------- */
  /* Magnetic buttons                                                   */
  /* ---------------------------------------------------------------- */
  function initMagneticButtons() {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const buttons = document.querySelectorAll('.magnetic');

    buttons.forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translate(0, 0)';
      });

      // ripple on click
      btn.addEventListener('click', (e) => {
        const rect = btn.getBoundingClientRect();
        btn.style.setProperty('--ripple-x', `${e.clientX - rect.left}px`);
        btn.style.setProperty('--ripple-y', `${e.clientY - rect.top}px`);
        btn.classList.remove('rippling');
        void btn.offsetWidth; // restart animation
        btn.classList.add('rippling');
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Card tilt (3D)                                                     */
  /* ---------------------------------------------------------------- */
  function initCardTilt() {
    if (window.matchMedia('(pointer: coarse)').matches || prefersReducedMotion) return;
    const cards = document.querySelectorAll('.project-card, .skill-card, .service-card');

    cards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(700px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-4px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Hero typing effect                                                 */
  /* ---------------------------------------------------------------- */
  function initTyping() {
    const el = document.getElementById('typingText');
    if (!el) return;
    const phrases = [
      'building your next website...',
      'writing clean, maintainable code...',
      'optimizing for speed...',
      'shipping on time, every time...'
    ];
    let phraseIndex = 0, charIndex = 0, deleting = false;

    function tick() {
      const current = phrases[phraseIndex];
      if (!deleting) {
        el.textContent = current.slice(0, charIndex + 1);
        charIndex++;
        if (charIndex === current.length) {
          deleting = true;
          setTimeout(tick, 1400);
          return;
        }
      } else {
        el.textContent = current.slice(0, charIndex - 1);
        charIndex--;
        if (charIndex === 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
        }
      }
      setTimeout(tick, deleting ? 30 : 55);
    }
    tick();
  }

  /* ---------------------------------------------------------------- */
  /* Animated counters (hero stats)                                     */
  /* ---------------------------------------------------------------- */
  function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((c) => observer.observe(c));

    function animateCounter(el) {
      const target = parseInt(el.dataset.count, 10);
      const duration = 1400;
      const start = performance.now();

      function frame(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target);
        if (progress < 1) requestAnimationFrame(frame);
        else el.textContent = target;
      }
      requestAnimationFrame(frame);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Testimonial slider                                                 */
  /* ---------------------------------------------------------------- */
  function initTestimonialSlider() {
    const track = document.getElementById('testimonialTrack');
    if (!track) return;
    const slides = Array.from(track.children);
    const dotsWrap = document.getElementById('testimonialDots');
    const prevBtn = document.getElementById('testimonialPrev');
    const nextBtn = document.getElementById('testimonialNext');
    let current = 0;
    let autoTimer = null;

    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'tdot';
      dot.setAttribute('aria-label', `Go to testimonial ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
    });
    const dots = Array.from(dotsWrap.children);

    function render() {
      slides.forEach((s, i) => s.classList.toggle('active', i === current));
      dots.forEach((d, i) => d.classList.toggle('active', i === current));
    }

    function goTo(i) {
      current = (i + slides.length) % slides.length;
      render();
      resetAuto();
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    function resetAuto() {
      clearInterval(autoTimer);
      autoTimer = setInterval(next, 6000);
    }

    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);

    render();
    resetAuto();
  }

  /* ---------------------------------------------------------------- */
  /* FAQ accordion                                                      */
  /* ---------------------------------------------------------------- */
  function initFaq() {
    const items = document.querySelectorAll('.faq-item');
    items.forEach((item) => {
      const btn = item.querySelector('.faq-question');
      btn.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        items.forEach((i) => {
          i.classList.remove('open');
          i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          item.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Init                                                               */
  /* ---------------------------------------------------------------- */
  function init() {
    initScrollReveal();
    initCursorGlow();
    initMagneticButtons();
    initCardTilt();
    initTyping();
    initCounters();
    initTestimonialSlider();
    initFaq();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
