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
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// CORS configuration - allow multiple origins and provide helpful dev defaults
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://userpay.netlify.app';
const allowedOrigins = [FRONTEND_URL, 'https://userpay.netlify.app', 'http://localhost:8080', 'http://localhost:3000'];
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') console.log('Incoming request origin:', req.headers.origin);
  next();
});

app.use(cors({
  origin: function(origin, callback){
    // allow requests with no origin (e.g., mobile apps, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    return callback(new Error('CORS policy: Origin not allowed'));
  },
  methods: ['GET','POST','PUT','DELETE','PATCH'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}));

// serve static files (after CORS so static requests are checked too)
app.use(express.static(path.join(__dirname, 'public')));


// Set view engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Routes
// Public auth endpoints (register/login/verify)
app.use('/auth', userRoutes);
// also mount at /user for frontend compatibility
app.use('/user', userRoutes);

// Protected wallet endpoints
app.use('/api/wallet', authMiddleware, walletRoutes);
// also mount at /wallet for frontend compatibility
app.use('/wallet', authMiddleware, walletRoutes);

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
