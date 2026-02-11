const rateLimit = require('express-rate-limit');

// General rate limiter for wallet endpoints
const walletRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter limiter for sensitive operations like transfers and crypto sends
const sensitiveOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many sensitive operations from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// User-based limiter for authenticated operations
const userBasedLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each user to 10 requests per windowMs
  keyGenerator: (req) => {
    if (req.user) {
      return req.user._id.toString();
    }
    // For IPv6 compatibility, use the ipKeyGenerator
    return rateLimit.ipKeyGenerator(req);
  },
  message: 'Too many requests from this user, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  walletRateLimiter,
  sensitiveOperationLimiter,
  userBasedLimiter,
};
