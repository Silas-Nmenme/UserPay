const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/register', userController.register);
router.get('/verify/:token', userController.verify);
router.post('/login', userController.login);
router.post('/resend-verification', userController.resendVerificationToken);
router.get('/profile', authMiddleware, userController.getProfile);

module.exports = router;
