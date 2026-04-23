const express = require('express');
const router = express.Router();
const { orders, carts, products } = require('../data/store');
const { authMiddleware } = require('./users');

// POST /api/orders - Create order from cart
router.post('/', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const cart = carts.get(userId);

  if (!cart.items || cart.items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  // Calculate order items with product details
  const orderItems = cart.items.map(item => {
    const product = products.findById(item.productId);
    if (!product) return null;
    return {
      productId: item.productId,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      subtotal: product.price * item.quantity
    };
  }).filter(Boolean);

  if (orderItems.length === 0) {
    return res.status(400).json({ error: 'No valid items in cart' });
  }

  const total = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

  // Create order
  const order = orders.create({
    userId,
    items: orderItems,
    total,
    status: 'pending',
    shippingAddress: req.body.shippingAddress || {}
  });

  // Clear cart after order
  carts.clear(userId);

  res.status(201).json(order);
});

// GET /api/orders - Get user's orders
router.get('/', authMiddleware, (req, res) => {
  const userOrders = orders.findByUser(req.user.id);
  res.json(userOrders);
});

// GET /api/orders/:id - Get order details
router.get('/:id', authMiddleware, (req, res) => {
  const order = orders.findById(req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Only allow user to view their own orders
  if (order.userId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json(order);
});

module.exports = router;