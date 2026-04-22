const express = require('express');
const connectDB = require('./db');
require('dotenv').config();

// Import all models
require('./models/User');
require('./models/Category');
require('./models/Account');
require('./models/Tag');
require('./models/Transaction');
require('./models/Budget');

const app = express();

// Connect to database
connectDB();

// Middleware
app.use(express.json());

// Placeholder route to confirm server is running
app.get('/', (req, res) => {
    res.send('Finance API is running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
