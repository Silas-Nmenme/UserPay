const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { validationResult } = require('express-validator');
const ensureSystemUser = require('../utils/systemUser');

// Get wallet balance
const getBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.userId);
    res.json({ balance: user.balance, username: user.username });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Transfer funds
const transferFunds = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { toUsername, password } = req.body;
  const amount = Number(req.body.amount);

  // Verify password
  const fromUser = await User.findById(req.user._id || req.user.userId);
  const isPasswordValid = await fromUser.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Invalid password' });
  }

  if (password === fromUser.email) {
    return res.status(400).json({ message: 'Password cannot be the same as email' });
  }

  const toUser = await User.findOne({ username: toUsername });
  if (!toUser) {
    return res.status(404).json({ message: 'Recipient not found' });
  }

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  fromUser.otp = otp;
  fromUser.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await fromUser.save();

  // Send OTP email
  try {
    const mailer = require('../utils/mailer');
    await mailer.sendOTP({ user: fromUser, otp });
  } catch (err) {
    console.error('Failed to send OTP email:', err);
    return res.status(500).json({ message: 'Failed to send OTP' });
  }

  // Create pending transaction
  const transaction = new Transaction({
    fromUser: fromUser._id,
    toUser: toUser._id,
    amount,
    type: 'transfer',
    status: 'pending'
  });

  const savedTransaction = await transaction.save();

  res.json({ message: 'Transfer initiated. Please confirm with OTP.', transactionId: savedTransaction._id });
};

// Confirm transfer with OTP
const confirmTransfer = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { transactionId, otp } = req.body;

  const userId = req.user._id || req.user.userId;
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) {
    return res.status(404).json({ message: 'Transaction not found' });
  }

  if (transaction.fromUser.toString() !== userId) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  if (transaction.status !== 'pending') {
    return res.status(400).json({ message: 'Transaction is not pending' });
  }

  const fromUser = await User.findById(transaction.fromUser);
  if (!fromUser.otp || fromUser.otp !== otp || new Date() > fromUser.otpExpires) {
    return res.status(401).json({ message: 'Invalid or expired OTP' });
  }

  const session = await mongoose.startSession();
  let savedTransaction = null;
  try {
    await session.withTransaction(async () => {
      const fromUser = await User.findById(transaction.fromUser).session(session);
      const toUser = await User.findById(transaction.toUser).session(session);

      if (Number(fromUser.balance) < transaction.amount) {
        throw new Error('Insufficient balance');
      }

      fromUser.balance = Number(fromUser.balance) - transaction.amount;
      toUser.balance = Number(toUser.balance) + transaction.amount;

      await fromUser.save({ session });
      await toUser.save({ session });

      transaction.status = 'completed';
      savedTransaction = await transaction.save({ session });
    });
  } catch (err) {
    // Fallback for standalone MongoDB
    const msg = err && err.message ? err.message.toLowerCase() : '';
    if (msg.includes('transaction numbers are only allowed') || msg.includes('not a replica set member') || msg.includes('transactions are not supported')) {
      try {
        const fromUser = await User.findById(transaction.fromUser);
        const toUser = await User.findById(transaction.toUser);

        if (Number(fromUser.balance) < transaction.amount) return res.status(400).json({ message: 'Insufficient balance' });

        fromUser.balance = Number(fromUser.balance) - transaction.amount;
        toUser.balance = Number(toUser.balance) + transaction.amount;

        await fromUser.save();
        await toUser.save();

        transaction.status = 'completed';
        const savedTransaction = await transaction.save();

        // Send emails non-blocking
        try {
          const mailer = require('../utils/mailer');
          const fromUserFinal = await User.findById(savedTransaction.fromUser);
          const toUserFinal = await User.findById(savedTransaction.toUser);
          mailer.sendTransferEmails({ transaction: savedTransaction, fromUser: fromUserFinal, toUser: toUserFinal, fromBalance: fromUserFinal.balance, toBalance: toUserFinal.balance });
        } catch (e) { console.error('Email error (fallback):', e); }

        await session.endSession();
        return res.json({ message: 'Transfer successful', transaction: savedTransaction });
      } catch (fallbackErr) {
        await session.endSession();
        return res.status(500).json({ message: fallbackErr.message });
      }
    }

    await session.endSession();
    if (err.message === 'Insufficient balance') return res.status(400).json({ message: err.message });
    return res.status(500).json({ message: err.message });
  }
  await session.endSession();

  // Clear OTP
  fromUser.otp = undefined;
  fromUser.otpExpires = undefined;
  await fromUser.save();

  // Send email notifications (debit to sender, credit to recipient) — non-blocking
  try {
    const mailer = require('../utils/mailer');
    const fromUserFinal = await User.findById(savedTransaction.fromUser);
    const toUserFinal = await User.findById(savedTransaction.toUser);
    const fromBalance = fromUserFinal.balance;
    const toBalance = toUserFinal.balance;
    mailer.sendTransferEmails({ transaction: savedTransaction, fromUser: fromUserFinal, toUser: toUserFinal, fromBalance, toBalance })
      .then(results => console.info('Email send results:', results))
      .catch(err => console.error('Email send error:', err));
  } catch (err) {
    console.error('Failed to send transaction emails:', err);
  }

  res.json({ message: 'Transfer successful', transaction: savedTransaction });
};

// Demo top-up: increases authenticated user's balance and records a deposit transaction
const topup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const amount = Number(req.body.amount);

  const session = await mongoose.startSession();
  let savedTransaction = null;
  try {
    await session.withTransaction(async () => {
      const userId = req.user._id || req.user.userId;
      const user = await User.findById(userId).session(session);
      if (!user) throw new Error('User not found');

      // Support SYSTEM_USER_ID as the source of deposits (recommended)
      let fromUserId = user._id;
      if (process.env.SYSTEM_USER_ID) {
        // verify system user exists
        const sys = await User.findById(process.env.SYSTEM_USER_ID).session(session);
        if (!sys) throw new Error('SYSTEM_USER_ID not found');
        fromUserId = sys._id;
      } else {
        // ensure a system user exists (auto-create if missing)
        const sys = await ensureSystemUser(session);
        fromUserId = sys._id;
      }

      const transaction = new Transaction({
        fromUser: fromUserId,
        toUser: user._id,
        amount,
        type: 'deposit',
        status: 'completed'
      });

      user.balance = Number(user.balance) + amount;

      await user.save({ session });
      savedTransaction = await transaction.save({ session });
    });
  } catch (err) {
    // Fallback for standalone MongoDB
    const msg = err && err.message ? err.message.toLowerCase() : '';
    if (msg.includes('transaction numbers are only allowed') || msg.includes('not a replica set member') || msg.includes('transactions are not supported')) {
      try {
        const userId = req.user._id || req.user.userId;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const fromUserId = process.env.SYSTEM_USER_ID || user._id;
        if (process.env.SYSTEM_USER_ID) {
          const sys = await User.findById(process.env.SYSTEM_USER_ID);
          if (!sys) return res.status(500).json({ message: 'SYSTEM_USER_ID not found' });
        }

        const transaction = new Transaction({ fromUser: fromUserId, toUser: user._id, amount, type: 'deposit', status: 'completed' });
        user.balance = Number(user.balance) + amount;

        await user.save();
        const savedTransaction = await transaction.save();

        // Send top-up email notification — non-blocking
        try {
          const mailer = require('../utils/mailer');
          mailer.sendTopupEmail({ transaction: savedTransaction, user, newBalance: user.balance })
            .then(() => console.info('Top-up email sent (fallback)'))
            .catch(err => console.error('Top-up email send error (fallback):', err));
        } catch (e) { console.error('Email error (fallback):', e); }

        await session.endSession();
        return res.json({ message: 'Top-up successful', balance: user.balance, transaction: savedTransaction });
      } catch (fallbackErr) {
        await session.endSession();
        return res.status(500).json({ message: fallbackErr.message });
      }
    }

    await session.endSession();
    if (err.message === 'User not found') return res.status(404).json({ message: err.message });
    return res.status(500).json({ message: err.message });
  }
  await session.endSession();

  // Send top-up email notification — non-blocking
  try {
    const mailer = require('../utils/mailer');
    const userFinal = await User.findById(savedTransaction.toUser);
    const newBalance = userFinal.balance;
    mailer.sendTopupEmail({ transaction: savedTransaction, user: userFinal, newBalance })
      .then(() => console.info('Top-up email sent'))
      .catch(err => console.error('Top-up email send error:', err));
  } catch (err) {
    console.error('Failed to send top-up email:', err);
  }

  res.json({ message: 'Top-up successful', balance: (await User.findById(savedTransaction.toUser)).balance, transaction: savedTransaction });
};

// Get transaction history
const getTransactions = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const transactions = await Transaction.find({
      $or: [{ fromUser: userId }, { toUser: userId }]
    }).populate('fromUser', 'username').populate('toUser', 'username').sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getBalance,
  transferFunds,
  confirmTransfer,
  topup,
  getTransactions
};
