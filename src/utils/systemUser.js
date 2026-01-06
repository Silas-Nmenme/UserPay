const User = require('../models/User');
const crypto = require('crypto');

// Ensure a system user exists. Returns the User document. Accepts optional session.
async function ensureSystemUser(session = null) {
  // If a SYSTEM_USER_ID is configured, try to use that first
  if (process.env.SYSTEM_USER_ID) {
    const sys = session ? await User.findById(process.env.SYSTEM_USER_ID).session(session) : await User.findById(process.env.SYSTEM_USER_ID);
    if (sys) return sys;
  }

  // Try to find a user with the reserved username 'system'
  const query = User.findOne({ username: 'system' });
  const found = session ? await query.session(session) : await query.exec();
  if (found) return found;

  // Create a minimal system user
  const sysUser = new User({
    username: 'system',
    email: process.env.SYSTEM_EMAIL || 'system@userpay.local',
    password: crypto.randomBytes(16).toString('hex'),
    isVerified: true,
    balance: 0
  });

  if (session) return await sysUser.save({ session });
  return await sysUser.save();
}

module.exports = ensureSystemUser;
