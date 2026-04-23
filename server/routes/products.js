const express = require('express');
const router = express.Router();
const { products } = require('../data/store');

// GET /api/products - List all products
router.get('/', (req, res) => {
  const { category, minPrice, maxPrice, search } = req.query;
  let result = products.findAll();

  // Filter by category
  if (category) {
    result = result.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }

  // Filter by price range
  if (minPrice) {
    result = result.filter(p => p.price >= parseFloat(minPrice));
  }
  if (maxPrice) {
    result = result.filter(p => p.price <= parseFloat(maxPrice));
  }

  // Search by name
  if (search) {
    const searchLower = search.toLowerCase();
    result = result.filter(p => p.name.toLowerCase().includes(searchLower));
  }

  res.json(result);
});

// GET /api/products/:id - Get single product
router.get('/:id', (req, res) => {
  const product = products.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

// POST /api/products - Create product (admin)
router.post('/', (req, res) => {
  const { name, description, price, category, image, stock } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required' });
  }

  const product = products.create({
    name,
    description: description || '',
    price: parseFloat(price),
    category: category || 'General',
    image: image || '',
    stock: stock || 0,
    rating: 0
  });

  res.status(201).json(product);
});

// PUT /api/products/:id - Update product (admin)
router.put('/:id', (req, res) => {
  const product = products.update(req.params.id, req.body);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

// DELETE /api/products/:id - Delete product (admin)
router.delete('/:id', (req, res) => {
  const deleted = products.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.status(204).send();
});

module.exports = router;