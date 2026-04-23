const express = require('express');
const router = express.Router();
const { carts, products } = require('../data/store');
const { authMiddleware } = require('./users');

// Helper to get user ID from request
function getUserId(req) {
  return req.user?.id || 'guest';
}

// GET /api/cart - Get user's cart
router.get('/', authMiddleware, (req, res) => {
  const cart = carts.get(getUserId(req));

  // Enrich cart items with product details
  const enrichedItems = cart.items.map(item => {
    const product = products.findById(item.productId);
    return {
      ...item,
      product
    };
  }).filter(item => item.product); // Remove items with missing products

  res.json({
    items: enrichedItems,
    total: enrichedItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  });
});

// POST /api/cart/add - Add item to cart
router.post('/add', authMiddleware, (req, res) => {
  const { productId, quantity = 1 } = req.body;

  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  const product = products.findById(productId);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const cart = carts.addItem(getUserId(req), productId, quantity);
  res.json(cart);
});

// PUT /api/cart/update - Update cart item quantity
router.put('/update', authMiddleware, (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || quantity === undefined) {
    return res.status(400).json({ error: 'Product ID and quantity are required' });
  }

  const cart = carts.updateItem(getUserId(req), productId, quantity);
  res.json(cart);
});

// DELETE /api/cart/remove/:productId - Remove item from cart
router.delete('/remove/:productId', authMiddleware, (req, res) => {
  const cart = carts.removeItem(getUserId(req), req.params.productId);
  res.json(cart);
});

// DELETE /api/cart/clear - Clear cart
router.delete('/clear', authMiddleware, (req, res) => {
  const cart = carts.clear(getUserId(req));
  res.json({
    items: cart.items,
    total: 0
  });
});

module.exports = router;