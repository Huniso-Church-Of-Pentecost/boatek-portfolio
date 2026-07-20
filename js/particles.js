/* ==========================================================================
   particles.js — animated network-mesh background (canvas, vanilla JS)
   Nodes drift slowly, connect to nearby nodes, and react to the cursor.
   ========================================================================== */

(function () {
  const canvas = document.getElementById('meshCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width, height, dpr;
  let nodes = [];
  let mouse = { x: -9999, y: -9999, active: false };
  let rafId = null;

  const CONFIG = {
    colorNode: 'rgba(59, 111, 224, 0.55)',
    colorNodeAlt: 'rgba(45, 212, 191, 0.45)',
    colorLine: 'rgba(59, 111, 224, 0.14)',
    linkDistance: 140,
    mouseDistance: 160,
    density: 18000, // px^2 per node — lower = more nodes
    maxNodes: 110,
    speed: 0.18
  };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildNodes();
  }

  function buildNodes() {
    const count = Math.min(CONFIG.maxNodes, Math.floor((width * height) / CONFIG.density));
    nodes = [];
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * CONFIG.speed,
        vy: (Math.random() - 0.5) * CONFIG.speed,
        r: Math.random() * 1.6 + 1,
        alt: Math.random() > 0.75
      });
    }
  }

  function step() {
    ctx.clearRect(0, 0, width, height);

    // update + draw nodes
    for (let n of nodes) {
      n.x += n.vx;
      n.y += n.vy;

      if (n.x < 0 || n.x > width) n.vx *= -1;
      if (n.y < 0 || n.y > height) n.vy *= -1;

      // gentle pull toward cursor
      if (mouse.active) {
        const dx = mouse.x - n.x;
        const dy = mouse.y - n.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONFIG.mouseDistance) {
          n.x -= dx * 0.0025;
          n.y -= dy * 0.0025;
        }
      }
    }

    // draw connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONFIG.linkDistance) {
          const opacity = 1 - dist / CONFIG.linkDistance;
          ctx.strokeStyle = `rgba(59, 111, 224, ${opacity * 0.16})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // connection to mouse
      if (mouse.active) {
        const dx = nodes[i].x - mouse.x, dy = nodes[i].y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONFIG.mouseDistance) {
          const opacity = 1 - dist / CONFIG.mouseDistance;
          ctx.strokeStyle = `rgba(45, 212, 191, ${opacity * 0.35})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }
    }

    // draw node dots (after lines so they sit on top)
    for (let n of nodes) {
      ctx.beginPath();
      ctx.fillStyle = n.alt ? CONFIG.colorNodeAlt : CONFIG.colorNode;
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }

    rafId = requestAnimationFrame(step);
  }

  function handlePointerMove(e) {
    const point = e.touches ? e.touches[0] : e;
    mouse.x = point.clientX;
    mouse.y = point.clientY;
    mouse.active = true;
  }

  function handlePointerLeave() {
    mouse.active = false;
  }

  function init() {
    resize();
    window.addEventListener('resize', debounce(resize, 200));
    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('mouseleave', handlePointerLeave);

    // pause when tab hidden to save battery/CPU
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
      } else if (!prefersReducedMotion) {
        rafId = requestAnimationFrame(step);
      }
    });

    if (!prefersReducedMotion) {
      rafId = requestAnimationFrame(step);
    } else {
      // draw a single static frame for reduced-motion users
      step_once();
    }
  }

  function step_once() {
    ctx.clearRect(0, 0, width, height);
    for (let n of nodes) {
      ctx.beginPath();
      ctx.fillStyle = n.alt ? CONFIG.colorNodeAlt : CONFIG.colorNode;
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function debounce(fn, delay) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
