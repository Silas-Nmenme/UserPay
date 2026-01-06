const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Import database connection
const connectDB = require('./src/config/db');

// Import routes
const authRoutes = require('./src/routes/auth');
const walletRoutes = require('./src/routes/wallet');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Routes
app.use('/auth', authRoutes);
app.use('/wallet', walletRoutes);

// Basic route
app.get('/', (req, res) => {
  res.render('index', { title: 'UserPay' });
});

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch((error) => {
  console.error("MongoDB Connection Failed:", error.message);
  process.exit(1);
});
