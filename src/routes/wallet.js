const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = express.Router();

// Get wallet balance
// This route expects `req.user` to be set by the central auth middleware.
router.get('/balance', async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.userId);
    res.json({ balance: user.balance, username: user.username });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Transfer funds
router.post('/transfer', async (req, res) => {
  try {
    const { toUsername } = req.body;
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const fromUser = await User.findById(req.user._id || req.user.userId);
    const toUser = await User.findOne({ username: toUsername });

    if (!toUser) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    if (Number(fromUser.balance) < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Create transaction
    const transaction = new Transaction({
      fromUser: fromUser._id,
      toUser: toUser._id,
      amount,
      type: 'transfer'
    });

    // Update balances using numeric arithmetic to avoid string concat
    fromUser.balance = Number(fromUser.balance) - amount;
    toUser.balance = Number(toUser.balance) + amount;

    // Save users first, then mark transaction completed and save it
    await fromUser.save();
    await toUser.save();

    transaction.status = 'completed';
    await transaction.save();

    res.json({ message: 'Transfer successful', transaction });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Demo top-up: increases authenticated user's balance and records a deposit transaction
router.post('/topup', async (req, res) => {
  try {

    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const userId = req.user._id || req.user.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // For demo top-up, treat the deposit as coming from the same user (or system)

    const transaction = new Transaction({
      fromUser: user._id,
      toUser: user._id,
      amount,
      type: 'deposit',
      status: 'completed'
    });

    user.balance = Number(user.balance) + amount;

    await transaction.save();
    await user.save();

    res.json({ message: 'Top-up successful', balance: user.balance, transaction });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get transaction history
router.get('/transactions', async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const transactions = await Transaction.find({
      $or: [{ fromUser: userId }, { toUser: userId }]
    }).populate('fromUser', 'username').populate('toUser', 'username').sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


module.exports = router;
