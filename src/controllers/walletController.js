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

  const { toUsername } = req.body;
  const amount = Number(req.body.amount);

  const session = await mongoose.startSession();
  let savedTransaction = null;
  try {
    await session.withTransaction(async () => {
      const fromUser = await User.findById(req.user._id || req.user.userId).session(session);
      const toUser = await User.findOne({ username: toUsername }).session(session);

      if (!toUser) {
        throw new Error('Recipient not found');
      }

      if (Number(fromUser.balance) < amount) {
        throw new Error('Insufficient balance');
      }

      const transaction = new Transaction({
        fromUser: fromUser._id,
        toUser: toUser._id,
        amount,
        type: 'transfer',
        status: 'pending'
      });

      fromUser.balance = Number(fromUser.balance) - amount;
      toUser.balance = Number(toUser.balance) + amount;

      await fromUser.save({ session });
      await toUser.save({ session });

      transaction.status = 'completed';
      savedTransaction = await transaction.save({ session });
    });
    } catch (err) {
      // Fallback for standalone MongoDB (no replica set) where transactions are unsupported
      const msg = err && err.message ? err.message.toLowerCase() : '';
      if (msg.includes('transaction numbers are only allowed') || msg.includes('not a replica set member') || msg.includes('transactions are not supported')) {
        try {
          // Non-transactional fallback: best-effort update
          const fromUser = await User.findById(req.user._id || req.user.userId);
          const toUser = await User.findOne({ username: toUsername });
          if (!toUser) return res.status(404).json({ message: 'Recipient not found' });
          if (Number(fromUser.balance) < amount) return res.status(400).json({ message: 'Insufficient balance' });

          const transaction = new Transaction({
            fromUser: fromUser._id,
            toUser: toUser._id,
            amount,
            type: 'transfer',
            status: 'pending'
          });

          fromUser.balance = Number(fromUser.balance) - amount;
          toUser.balance = Number(toUser.balance) + amount;

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
      if (err.message === 'Recipient not found') return res.status(404).json({ message: err.message });
      if (err.message === 'Insufficient balance') return res.status(400).json({ message: err.message });
      return res.status(500).json({ message: err.message });
    }
  await session.endSession();

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
  topup,
  getTransactions
};
