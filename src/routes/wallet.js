const express = require('express');
const { body } = require('express-validator');
const walletController = require('../controllers/walletController');

const router = express.Router();

// Get wallet balance
// This route expects `req.user` to be set by the central auth middleware.
router.get('/balance', walletController.getBalance);

// Transfer funds
router.post('/transfer', [
  body('toUsername').isString().notEmpty(),
  body('amount').isFloat({ gt: 0 })
], walletController.transferFunds);

// Confirm transfer with OTP
router.post('/transfer/confirm', [
  body('transactionId').isMongoId(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric()
], walletController.confirmTransfer);

// Demo top-up: increases authenticated user's balance and records a deposit transaction
router.post('/topup', [ body('amount').isFloat({ gt: 0 }) ], walletController.topup);

// Get transaction history
router.get('/transactions', walletController.getTransactions);

module.exports = router;
