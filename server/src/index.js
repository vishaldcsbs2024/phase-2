const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection, initializeDatabase } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

const partnersRouter = require('./routes/partners');
const premiumRouter = require('./routes/premium');
const claimsRouter = require('./routes/claims');
const demoRouter = require('./routes/demo');
const aiRouter = require('./routes/ai');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: { status: 'ok' },
    error: ''
  });
});

// Routes
app.use('/api/partners', partnersRouter);
app.use('/api/premium', premiumRouter);
app.use('/api/claims', claimsRouter);
app.use('/api/demo', demoRouter);
app.use('/api/ai', aiRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    error: 'Route not found'
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('Failed to connect to database. Please check your DATABASE_URL.');
      process.exit(1);
    }

    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`✓ GigShield backend running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`\nAPI Routes:`);
      console.log(`  POST   /api/partners/register`);
      console.log(`  POST   /api/partners/verify-otp`);
      console.log(`  GET    /api/partners/profile (protected)`);
      console.log(`  POST   /api/premium/quote`);
      console.log(`  POST   /api/premium/enroll (protected)`);
      console.log(`  GET    /api/claims/my-claims (protected)`);
      console.log(`  POST   /api/claims/manual (protected)`);
      console.log(`  GET    /api/demo/trigger-scenario`);
      console.log(`\n🤖 AI FEATURES (NEW):`);
      console.log(`  POST   /api/ai/ai-quote (Dynamic ML-based pricing)`);
      console.log(`  POST   /api/ai/disruption-check (5+ automated triggers)`);
      console.log(`  POST   /api/ai/zero-touch-claim (Auto-approval)`);
      console.log(`  POST   /api/ai/auto-file-disruption-claim`);
      console.log(`  POST   /api/ai/auto-paycheck (Location + weather + traffic paycheck)`);
      console.log(`  GET    /api/ai/ai-features-summary`);
      console.log(`  GET    /api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
