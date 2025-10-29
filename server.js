require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const connectDB = require('./src/config/database');
const errorHandler = require('./src/middlewares/errorHandler');
const { sanitizeMiddleware } = require('./src/middlewares/sanitize');

const authRoutes = require('./src/routes/authRoutes');
const talentRoutes = require('./src/routes/talentRoutes');
const contactRoutes = require('./src/routes/contactRoutes');
const requestRoutes = require('./src/routes/requestRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const adRoutes = require('./src/routes/adRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

const app = express();

connectDB();

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
}));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(sanitizeMiddleware);

app.use(hpp());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Talent and Beauty API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      talents: '/api/talents',
      contact: '/api/contact',
      requests: '/api/requests',
      payments: '/api/payments',
      ads: '/api/ads',
      admin: '/api/admin',
    },
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/talents', talentRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

module.exports = app;
