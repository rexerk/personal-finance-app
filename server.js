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

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/tags',       require('./routes/tags'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/budgets',      require('./routes/budgets'));

app.get('/', (req, res) => res.send('Finance API is running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
