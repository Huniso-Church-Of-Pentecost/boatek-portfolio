/* Wires the "Print / Save as PDF" button on resume.html without an inline
   onclick handler, so the page can run under a strict CSP (script-src 'self'). */
document.addEventListener('DOMContentLoaded', function () {
  var btn = document.getElementById('printResumeBtn');
  if (btn) btn.addEventListener('click', function () { window.print(); });
});
