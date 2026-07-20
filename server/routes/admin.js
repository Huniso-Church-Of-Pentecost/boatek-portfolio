/* ==========================================================================
   routes/admin.js — protected dashboard API (Basic Auth via adminAuth).
   Read/manage inquiries, bookings, testimonials, blog posts, and stats.
   ========================================================================== */

const express = require('express');
const { adminAuth } = require('../middleware/adminAuth');
const { asyncHandler } = require('../utils/asyncHandler');
const { getQueueEntries } = require('../config/queueStore');
const { getAllBookings, updateBookingStatus } = require('../config/bookingStore');
const { getAllTestimonials, updateTestimonialStatus, deleteTestimonial } = require('../config/testimonialStore');
const { getAllPosts, addPost, updatePost, deletePost } = require('../config/blogStore');
const { getAllPayments } = require('../config/paymentStore');
const { getVisitCount, getDailyVisits } = require('../config/statsStore');

const router = express.Router();
router.use(adminAuth);

router.get('/whoami', (req, res) => res.json({ ok: true }));

router.get('/inquiries', asyncHandler(async (req, res) => res.json({ inquiries: await getQueueEntries() })));

router.get('/bookings', asyncHandler(async (req, res) => res.json({ bookings: await getAllBookings() })));
router.patch('/bookings/:id', asyncHandler(async (req, res) => {
  const { status } = req.body || {};
  if (!['pending', 'confirmed', 'cancelled'].includes(status)) return res.status(400).json({ message: 'Invalid status.' });
  const entry = await updateBookingStatus(req.params.id, status);
  if (!entry) return res.status(404).json({ message: 'Booking not found.' });
  res.json({ booking: entry });
}));

router.get('/testimonials', asyncHandler(async (req, res) => res.json({ testimonials: await getAllTestimonials() })));
router.patch('/testimonials/:id', asyncHandler(async (req, res) => {
  const { status } = req.body || {};
  if (!['pending', 'approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status.' });
  const entry = await updateTestimonialStatus(req.params.id, status);
  if (!entry) return res.status(404).json({ message: 'Testimonial not found.' });
  res.json({ testimonial: entry });
}));
router.delete('/testimonials/:id', asyncHandler(async (req, res) => {
  const ok = await deleteTestimonial(req.params.id);
  if (!ok) return res.status(404).json({ message: 'Testimonial not found.' });
  res.json({ message: 'Deleted.' });
}));

router.get('/blog', asyncHandler(async (req, res) => res.json({ posts: await getAllPosts() })));
router.post('/blog', asyncHandler(async (req, res) => {
  const { title, excerpt, content, published } = req.body || {};
  if (!title || !content) return res.status(400).json({ message: 'Title and content are required.' });
  const post = await addPost({ title, excerpt, content, published });
  res.status(201).json({ post });
}));
router.put('/blog/:id', asyncHandler(async (req, res) => {
  const post = await updatePost(req.params.id, req.body || {});
  if (!post) return res.status(404).json({ message: 'Post not found.' });
  res.json({ post });
}));
router.delete('/blog/:id', asyncHandler(async (req, res) => {
  const ok = await deletePost(req.params.id);
  if (!ok) return res.status(404).json({ message: 'Post not found.' });
  res.json({ message: 'Deleted.' });
}));

router.get('/payments', asyncHandler(async (req, res) => res.json({ payments: await getAllPayments() })));

router.get('/stats', asyncHandler(async (req, res) => {
  res.json({ totalVisits: await getVisitCount(), daily: await getDailyVisits() });
}));

module.exports = router;
