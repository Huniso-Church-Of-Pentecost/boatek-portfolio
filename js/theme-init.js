/* ==========================================================================
   theme-init.js — applies the saved theme before first paint to avoid a
   flash of the wrong theme. Must be loaded synchronously in <head>, before
   any stylesheet that depends on [data-theme]. Kept tiny and dependency-free
   on purpose. Shared by every page (index, blog, resume, admin) so the
   logic only lives in one place.
   ========================================================================== */
(function () {
  try {
    var saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.setAttribute('data-theme', saved);
    }
  } catch (e) {
    /* localStorage unavailable (privacy mode, etc.) — fall back to default theme */
  }
})();
