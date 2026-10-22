'use strict';

const { Router } = require('express');
const { authenticate } = require('../../common/middlewares/authMiddleware');
const {
  handleGetWishlist,
  handleAddToWishlist,
  handleRemoveFromWishlist,
  handleCheckWishlist,
} = require('./wishlist.controller');

const router = Router();

// Routes for /api/wishlist (standardized to t_wishlist schema)
router.get('/wishlist', authenticate, handleGetWishlist);
router.post('/wishlist', authenticate, handleAddToWishlist);
router.delete('/wishlist/:hotelId', authenticate, handleRemoveFromWishlist);
router.get('/wishlist/check/:hotelId', authenticate, handleCheckWishlist);

// Aliases for /api/watchlist
router.get('/watchlist', authenticate, handleGetWishlist);
router.post('/watchlist', authenticate, handleAddToWishlist);
router.delete('/watchlist/:hotelId', authenticate, handleRemoveFromWishlist);
router.get('/watchlist/check/:hotelId', authenticate, handleCheckWishlist);

module.exports = router;
