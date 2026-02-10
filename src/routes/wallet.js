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

// Get crypto balances
router.get('/crypto/balance', walletController.getCryptoBalance);

// Send crypto
router.post('/crypto/send', [
  body('cryptoType').isIn(['BTC', 'ETH', 'USDT']),
  body('toAddress').isString().notEmpty(),
  body('memo').isString().notEmpty(),
  body('amount').isFloat({ gt: 0 }),
  body('password').isString().notEmpty()
], walletController.sendCrypto);

// Confirm crypto send with OTP
router.post('/crypto/send/confirm', [
  body('transactionId').isMongoId(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric()
], walletController.confirmCryptoSend);

// Get crypto transaction history
router.get('/crypto/transactions', walletController.getCryptoTransactions);

// Demo crypto top-up: increases authenticated user's crypto balance and records a deposit transaction
router.post('/crypto/topup', [
  body('cryptoType').isIn(['BTC', 'ETH', 'USDT']),
  body('amount').isFloat({ gt: 0 })
], walletController.cryptoTopup);

// Get transaction history
router.get('/transactions', walletController.getTransactions);

module.exports = router;
