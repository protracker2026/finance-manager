const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files from the parent directory
app.use(express.static(path.join(__dirname, '../')));

// Routes
const aiRoutes = require('./routes/ai');
app.use('/api/ai', aiRoutes);

// Catch-all route to serve the frontend app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
