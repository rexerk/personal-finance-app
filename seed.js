const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('./models/User');
const Account = require('./models/Account');
const Category = require('./models/Category');
const Tag = require('./models/Tag');
const Transaction = require('./models/Transaction');
const Budget = require('./models/Budget');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany();
    await Account.deleteMany();
    await Category.deleteMany();
    await Tag.deleteMany();
    await Transaction.deleteMany();
    await Budget.deleteMany();
    console.log('Cleared existing data');

    //Users
    const password = await bcrypt.hash('password123', 10);

    const john = await User.create({
      email: 'john@example.com',
      password_hash: password
    });
    const jane = await User.create({
      email: 'jane@example.com',
      password_hash: password
    });
    console.log('Users created');

    //Categories
    const [groceries, rent, utilities, dining, transport, salary, freelance, entertainment, healthcare, shopping] =
      await Category.insertMany([
        { user_id: john._id, category_name: 'Groceries',     category_type: 'expense' },
        { user_id: john._id, category_name: 'Rent',          category_type: 'expense' },
        { user_id: john._id, category_name: 'Utilities',     category_type: 'expense' },
        { user_id: john._id, category_name: 'Dining Out',    category_type: 'expense' },
        { user_id: john._id, category_name: 'Transport',     category_type: 'expense' },
        { user_id: john._id, category_name: 'Salary',        category_type: 'income'  },
        { user_id: john._id, category_name: 'Freelance',     category_type: 'income'  },
        { user_id: jane._id, category_name: 'Entertainment', category_type: 'expense' },
        { user_id: jane._id, category_name: 'Healthcare',    category_type: 'expense' },
        { user_id: jane._id, category_name: 'Shopping',      category_type: 'expense' },
      ]);
    console.log('Categories created');

    //Accounts
    const [johnChecking, johnSavings, janeChecking] = await Account.insertMany([
      { user_id: john._id, account_name: 'John Checking', account_type: 'checking', balance: 3200.00 },
      { user_id: john._id, account_name: 'John Savings',  account_type: 'savings',  balance: 8500.00 },
      { user_id: jane._id, account_name: 'Jane Checking', account_type: 'checking', balance: 5100.00 },
    ]);
    console.log('Accounts created');

    //Tags
    const [essential, recurring, vacation, workRelated, subscriptions] = await Tag.insertMany([
      { user_id: john._id, tag_name: 'essential'     },
      { user_id: john._id, tag_name: 'recurring'     },
      { user_id: john._id, tag_name: 'vacation'      },
      { user_id: john._id, tag_name: 'work-related'  },
      { user_id: jane._id, tag_name: 'subscriptions' },
    ]);
    console.log('Tags created');

    //Transactions
    await Transaction.insertMany([
      // John - income
      {
        account_id:       johnChecking._id,
        category_id:      salary._id,
        tag_ids:          [recurring._id],
        amount:           4500.00,
        transaction_type: 'income',
        description:      'Monthly salary',
        transaction_date: new Date('2025-04-01')
      },
      {
        account_id:       johnChecking._id,
        category_id:      freelance._id,
        tag_ids:          [workRelated._id],
        amount:           800.00,
        transaction_type: 'income',
        description:      'Freelance web project',
        transaction_date: new Date('2025-04-10')
      },
      // John - expenses
      {
        account_id:       johnChecking._id,
        category_id:      rent._id,
        tag_ids:          [essential._id, recurring._id],
        amount:           1200.00,
        transaction_type: 'expense',
        description:      'April rent',
        transaction_date: new Date('2025-04-01')
      },
      {
        account_id:       johnChecking._id,
        category_id:      groceries._id,
        tag_ids:          [essential._id],
        amount:           145.30,
        transaction_type: 'expense',
        description:      'Weekly grocery run',
        transaction_date: new Date('2025-04-05')
      },
      {
        account_id:       johnChecking._id,
        category_id:      groceries._id,
        tag_ids:          [essential._id],
        amount:           98.75,
        transaction_type: 'expense',
        description:      'Grocery run',
        transaction_date: new Date('2025-04-12')
      },
      {
        account_id:       johnChecking._id,
        category_id:      dining._id,
        tag_ids:          [],
        amount:           62.40,
        transaction_type: 'expense',
        description:      'Dinner with friends',
        transaction_date: new Date('2025-04-08')
      },
      {
        account_id:       johnChecking._id,
        category_id:      transport._id,
        tag_ids:          [recurring._id],
        amount:           85.00,
        transaction_type: 'expense',
        description:      'Monthly bus pass',
        transaction_date: new Date('2025-04-02')
      },
      {
        account_id:       johnChecking._id,
        category_id:      utilities._id,
        tag_ids:          [essential._id, recurring._id],
        amount:           110.00,
        transaction_type: 'expense',
        description:      'Electric bill',
        transaction_date: new Date('2025-04-06')
      },
      {
        account_id:       johnChecking._id,
        category_id:      dining._id,
        tag_ids:          [vacation._id],
        amount:           210.00,
        transaction_type: 'expense',
        description:      'Vacation dinner',
        transaction_date: new Date('2025-04-15')
      },
      // Jane - expenses
      {
        account_id:       janeChecking._id,
        category_id:      entertainment._id,
        tag_ids:          [subscriptions._id],
        amount:           15.99,
        transaction_type: 'expense',
        description:      'Streaming subscription',
        transaction_date: new Date('2025-04-03')
      },
      {
        account_id:       janeChecking._id,
        category_id:      healthcare._id,
        tag_ids:          [],
        amount:           250.00,
        transaction_type: 'expense',
        description:      'Dental appointment',
        transaction_date: new Date('2025-04-09')
      },
      {
        account_id:       janeChecking._id,
        category_id:      shopping._id,
        tag_ids:          [],
        amount:           340.00,
        transaction_type: 'expense',
        description:      'Clothing purchase',
        transaction_date: new Date('2025-04-11')
      },
    ]);
    console.log('Transactions created');

    //Budgets
    await Budget.insertMany([
      { user_id: john._id, category_id: groceries._id,  monthly_limit: 300.00, month: 4, year: 2025 },
      { user_id: john._id, category_id: dining._id,     monthly_limit: 150.00, month: 4, year: 2025 },
      { user_id: john._id, category_id: transport._id,  monthly_limit: 100.00, month: 4, year: 2025 },
      { user_id: john._id, category_id: utilities._id,  monthly_limit: 150.00, month: 4, year: 2025 },
      { user_id: jane._id, category_id: entertainment._id, monthly_limit: 50.00,  month: 4, year: 2025 },
      { user_id: jane._id, category_id: shopping._id,   monthly_limit: 200.00, month: 4, year: 2025 },
    ]);
    console.log('Budgets created');

    console.log('\n Seed complete! Test users:');
    console.log('  email: john@example.com  password: password123');
    console.log('  email: jane@example.com  password: password123');

    await mongoose.disconnect();

  } catch (err) {
    console.error('Seed error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seed();
