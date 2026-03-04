const dotenv = require('dotenv');
const path = require('path');

// Load .env from the server directory for local dev
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const aiRoutes = require('../server/routes/ai');
app.use('/api/ai', aiRoutes);

// Export for Vercel Serverless
module.exports = app;
