const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Import database connection
const connectDB = require('./src/config/db');

// Import routes
const authMiddleware = require('./src/routes/auth');
const userRoutes = require('./src/routes/user');
const walletRoutes = require('./src/routes/wallet');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// serve static files
app.use(express.static(path.join(__dirname, 'public')));


// CORS configuration
const FRONTEND_URL = process.env.FRONTEND_URL || "https://userpay.netlify.app";
app.use(cors({
  origin: [FRONTEND_URL, "https://userpay.netlify.app" ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));


// Set view engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Routes
// Public auth endpoints (register/login/verify)
app.use('/auth', userRoutes);

// Protected wallet endpoints
app.use('/api/wallet', authMiddleware, walletRoutes);

// Basic route
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.render('index', { title: 'UserPay' });
  }
});

// Error handler (should be after routes)
app.use(require('./src/middleware/errorHandler'));

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Allowed frontend origin: ${FRONTEND_URL}`);
  });
}).catch((error) => {
  console.error("MongoDB Connection Failed:", error.message);
  process.exit(1);
});
