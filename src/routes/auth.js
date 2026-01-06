const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Authentication middleware: verifies JWT and attaches `req.user`.
// Use this middleware on routes that require authentication, e.g.
// app.use('/wallet', require('./auth'), walletRoutes);
module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId);
    if (!user) return res.status(401).json({ message: 'Invalid token' });
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
