const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'store.json');

// In-memory store
let store = {
  products: [],
  users: [],
  carts: {},
  orders: []
};

// Load data from file
function loadStore() {
  try {
    const data = fs.readFileSync(dataPath, 'utf8');
    store = JSON.parse(data);
  } catch (err) {
    console.log('No existing store found, starting fresh');
  }
}

// Save data to file
function saveStore() {
  fs.writeFileSync(dataPath, JSON.stringify(store, null, 2));
}

// Reset to seed data
function resetStore() {
  const seedData = require('./store.json');
  store = { ...seedData, users: [], carts: {}, orders: [] };
  saveStore();
}

// Initialize
loadStore();

// Product operations
const products = {
  findAll: () => store.products,
  findById: (id) => store.products.find(p => p.id === id),
  findByCategory: (category) => store.products.filter(p => p.category === category),
  create: (product) => {
    const newProduct = { ...product, id: Date.now().toString() };
    store.products.push(newProduct);
    saveStore();
    return newProduct;
  },
  update: (id, updates) => {
    const index = store.products.findIndex(p => p.id === id);
    if (index === -1) return null;
    store.products[index] = { ...store.products[index], ...updates };
    saveStore();
    return store.products[index];
  },
  delete: (id) => {
    const index = store.products.findIndex(p => p.id === id);
    if (index === -1) return false;
    store.products.splice(index, 1);
    saveStore();
    return true;
  }
};

// User operations
const users = {
  findAll: () => store.users,
  findById: (id) => store.users.find(u => u.id === id),
  findByEmail: (email) => store.users.find(u => u.email === email),
  create: (user) => {
    const newUser = { ...user, id: Date.now().toString(), createdAt: new Date().toISOString() };
    store.users.push(newUser);
    saveStore();
    return newUser;
  }
};

// Cart operations
const carts = {
  get: (userId) => store.carts[userId] || { items: [] },
  addItem: (userId, productId, quantity = 1) => {
    if (!store.carts[userId]) store.carts[userId] = { items: [] };
    const cart = store.carts[userId];
    const existingItem = cart.items.find(i => i.productId === productId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ productId, quantity });
    }
    saveStore();
    return cart;
  },
  updateItem: (userId, productId, quantity) => {
    if (!store.carts[userId]) return null;
    const cart = store.carts[userId];
    const item = cart.items.find(i => i.productId === productId);
    if (!item) return null;
    if (quantity <= 0) {
      cart.items = cart.items.filter(i => i.productId !== productId);
    } else {
      item.quantity = quantity;
    }
    saveStore();
    return cart;
  },
  removeItem: (userId, productId) => {
    if (!store.carts[userId]) return null;
    store.carts[userId].items = store.carts[userId].items.filter(i => i.productId !== productId);
    saveStore();
    return store.carts[userId];
  },
  clear: (userId) => {
    store.carts[userId] = { items: [] };
    saveStore();
    return store.carts[userId];
  }
};

// Order operations
const orders = {
  findAll: () => store.orders,
  findByUser: (userId) => store.orders.filter(o => o.userId === userId),
  findById: (id) => store.orders.find(o => o.id === id),
  create: (order) => {
    const newOrder = { ...order, id: 'ORD-' + Date.now(), createdAt: new Date().toISOString() };
    store.orders.push(newOrder);
    saveStore();
    return newOrder;
  }
};

module.exports = {
  store,
  products,
  users,
  carts,
  orders,
  resetStore,
  loadStore,
  saveStore
};