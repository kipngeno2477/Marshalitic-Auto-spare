const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const db = require('./config/db');
const { seed } = require('./database/seed');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount API routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'MASHALITIC AUTO SPARES ERP',
    database: 'MongoDB',
    tagline: 'Drive with Confidence.',
    timestamp: new Date().toISOString()
  });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error occurred'
  });
});

// Start Server
async function startServer() {
  try {
    await db.initialize();
    
    // Auto-seed sample database if fresh
    const userCount = await db.getCollection('users').countDocuments({});
    if (userCount === 0) {
      console.log('📦 MongoDB database is empty. Seeding initial data...');
      await seed();
    }

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`  🚗 MASHALITIC AUTO SPARES - MANAGEMENT SYSTEM API   `);
      console.log(`  ⚡ Server running on http://localhost:${PORT}        `);
      console.log(`  🍃 Database: MongoDB (Active & Connected)           `);
      console.log(`  🛡️  Auth: JWT & RBAC Active                          `);
      console.log(`  💳 M-Pesa Daraja: Ready (Sandbox/Live)              `);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
