const express = require('express');
const { listPosts, getPost } = require('../controllers/blogController');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(listPosts));
router.get('/:slug', asyncHandler(getPost));

module.exports = router;
