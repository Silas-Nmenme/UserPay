const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Salt rounds for password hashing
const SALT_ROUNDS = 10;

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Password strength check (at least 6 characters)
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (!existingUser.isVerified) {
        // Resend verification email for unverified users
        const verificationToken = crypto.randomBytes(32).toString('hex');
        existingUser.verificationToken = verificationToken;
        existingUser.verificationTokenExpires = Date.now() + 10 * 60 * 1000;
        await existingUser.save();

        const verificationUrl = `${process.env.BASE_URL}/auth/verify/${verificationToken}`;
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Verify your UserPay account',
          html: `<p>Click <a href="${verificationUrl}">here</a> to verify your account.</p>`
        });

        return res.status(200).json({ message: 'Verification email resent. Check your email for verification.' });
      } else {
        return res.status(400).json({ message: 'User already exists' });
      }
    }

    let username;
    do {
      username = 'user' + crypto.randomBytes(4).toString('hex');
    } while (await User.findOne({ username }));

    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = new User({ username, email, password: hashedPassword, verificationToken, verificationTokenExpires: Date.now() + 10 * 60 * 1000 });
    await user.save();

    res.status(201).json({ message: 'User registered. Check your email for verification.' });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    res.status(500).json({ message: error.message });
  }
};

exports.verify = async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });
    if (!user || user.verificationTokenExpires < Date.now()) return res.status(400).json({ message: 'Invalid or expired token' });

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.json({ message: 'Account verified successfully' });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    res.status(500).json({ message: error.message });
  }
};

exports.resendVerificationToken = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.isVerified) return res.status(400).json({ message: 'User is already verified' });

    const verificationToken = crypto.randomBytes(32).toString('hex');

    user.verificationToken = verificationToken;
    user.verificationTokenExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const verificationUrl = `${process.env.BASE_URL}/auth/verify/${verificationToken}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify your UserPay account',
      html: `<p>Click <a href="${verificationUrl}">here</a> to verify your account.</p>`
    });

    res.json({ message: 'Verification email resent. Check your email.' });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Temporarily skip verification check for testing
    // if (!user.isVerified) {
    //   return res.status(401).json({ message: 'Please verify your email first' });
    // }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '10m' });

    // Send login email notification — non-blocking
    try {
      const mailer = require('../utils/mailer');
      mailer.sendLoginEmail({ user })
        .then(() => console.info('Login email sent'))
        .catch(err => console.error('Login email send error:', err));
    } catch (err) {
      console.error('Failed to send login email:', err);
    }

    res.json({ token, user: { id: user._id, username: user.username, balance: user.balance } });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    res.status(500).json({ message: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    // Support both auth styles safely
    const userId = req.user?.userId || req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(userId)
      .select('_id username email balance createdAt');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      balance: user.balance,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('getProfile error:', error);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
};

