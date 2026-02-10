# TODO for Crypto Address and Memo Implementation

- [x] Update User model (src/models/User.js) to add cryptoMemos for BTC, ETH, USDT
- [x] Update CryptoTransaction model (src/models/CryptoTransaction.js) to add memo field
- [x] Update walletController.js: Modify getCryptoBalance to generate addresses and memos if missing
- [x] Update wallet routes (src/routes/wallet.js): Add memo validation in send crypto route
- [x] Update sendCrypto in walletController.js to include memo in transaction
