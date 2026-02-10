const mongoose = require('mongoose');

const cryptoTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cryptoType: {
    type: String,
    enum: ['BTC', 'ETH', 'USDT'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  toAddress: {
    type: String,
    required: true
  },
  txHash: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  fee: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('CryptoTransaction', cryptoTransactionSchema);
