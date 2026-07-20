/* ==========================================================================
   blog.js — renders the post list or a single post, based on ?post=slug
   ========================================================================== */

(function () {
  const content = document.getElementById('blogContent');

  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch (e) { return iso; }
  }
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('post');

  if (slug) {
    loadPost(slug);
  } else {
    loadList();
  }

  function loadList() {
    fetch('/api/blog')
      .then((res) => res.json())
      .then((data) => {
        const posts = data.posts || [];
        document.title = 'Blog — Foster / Boatek Labs';

        if (!posts.length) {
          content.innerHTML = '<p class="blog-empty">No posts published yet — check back soon.</p>';
          return;
        }

        content.innerHTML = posts.map((p) => `
          <article class="blog-list-item">
            <h2><a href="blog.html?post=${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a></h2>
            <p class="blog-meta">${fmtDate(p.createdAt)}</p>
            <p>${escapeHtml(p.excerpt || '')}</p>
          </article>
        `).join('');
      })
      .catch(() => { content.innerHTML = '<p class="blog-empty">Could not load posts right now.</p>'; });
  }

  function loadPost(postSlug) {
    fetch(`/api/blog/${encodeURIComponent(postSlug)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => {
        const post = data.post;
        document.title = `${post.title} — Foster / Boatek Labs`;
        content.innerHTML = `
          <h1 class="blog-post-title">${escapeHtml(post.title)}</h1>
          <p class="blog-meta" style="margin-bottom:28px;">${fmtDate(post.createdAt)}</p>
          <div class="blog-post-body">${post.content}</div>
        `;
      })
      .catch(() => {
        content.innerHTML = '<p class="blog-empty">Post not found. <a href="blog.html">Back to all posts</a></p>';
      });
  }
})();
