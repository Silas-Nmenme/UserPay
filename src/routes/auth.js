const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');


const router = express.Router();

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Register user
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate unique username
    let username;
    do {
      username = 'user' + crypto.randomBytes(4).toString('hex');
    } while (await User.findOne({ username }));

    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = new User({
      username,
      email,
      password,
      verificationToken
    });

    await user.save();

    // Send verification email
    const verificationUrl = `${process.env.BASE_URL}/auth/verify/${verificationToken}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify your UserPay account',
      html: `<p>Click <a href="${verificationUrl}">here</a> to verify your account.</p>`
    });

    res.status(201).json({ message: 'User registered. Check your email for verification.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify email
router.get('/verify/:token', async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });
    if (!user) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.json({ message: 'Account verified successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(401).json({ message: 'Please verify your email first' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token, user: { id: user._id, username: user.username, balance: user.balance } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
