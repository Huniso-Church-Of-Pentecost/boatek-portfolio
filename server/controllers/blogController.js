const { getPublishedPosts, getPostBySlug } = require('../config/blogStore');

async function listPosts(req, res) {
  const posts = (await getPublishedPosts()).map(({ content, ...rest }) => rest); // omit full body from list view
  res.json({ posts });
}

async function getPost(req, res) {
  const post = await getPostBySlug(req.params.slug);
  if (!post) return res.status(404).json({ message: 'Post not found.' });
  res.json({ post });
}

module.exports = { listPosts, getPost };
