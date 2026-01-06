const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Access denied' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token' });
  }
};

// Get wallet balance
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    res.json({ balance: user.balance, username: user.username });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Transfer funds
router.post('/transfer', authenticateToken, async (req, res) => {
  try {
    const { toUsername, amount } = req.body;

    if (amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const fromUser = await User.findById(req.user.userId);
    const toUser = await User.findOne({ username: toUsername });

    if (!toUser) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    if (fromUser.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Create transaction
    const transaction = new Transaction({
      fromUser: fromUser._id,
      toUser: toUser._id,
      amount,
      type: 'transfer'
    });

    // Update balances
    fromUser.balance -= amount;
    toUser.balance += amount;

    await transaction.save();
    await fromUser.save();
    await toUser.save();

    res.json({ message: 'Transfer successful', transaction });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get transaction history
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const transactions = await Transaction.find({
      $or: [{ fromUser: req.user.userId }, { toUser: req.user.userId }]
    }).populate('fromUser', 'username').populate('toUser', 'username').sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
