'use strict';

require('./config/env'); // Load & validate env vars first
const express = require('express');
const cors = require('cors');

const errorHandler = require('./common/middlewares/errorHandler');
const connectionRoute = require('./features/connection_test/connection.route');

const authRoute = require('./features/auth/auth.route');
const hotelRoute = require('./features/hotels/hotel.route');
const env = require('./config/env');

const app = express();

// ─── Global Middlewares ───────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Request Logger (dev only) ────────────────────────────────────────────────
if (env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'success', message: 'AVORA Backend is running 🚀' });
});

app.use('/api', connectionRoute);
app.use('/api', authRoute);
app.use('/api', hotelRoute);

// ─── Global Error Handler (must be LAST) ─────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  console.log(`\n🚀 AVORA Backend running on http://localhost:${env.PORT}`);
  console.log(`   ENV: ${env.NODE_ENV}`);
  console.log(`   API: http://localhost:${env.PORT}/api/system-codes\n`);
});
