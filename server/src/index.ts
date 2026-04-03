import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './utils/config.js';
import { initializeSchema } from './db/schema.js';
import { errorHandler } from './middleware/auth.js';
import { authRoutes } from './routes/auth.routes.js';
import { policyRoutes } from './routes/policy.routes.js';
import { claimRoutes } from './routes/claim.routes.js';
import { payoutRoutes } from './routes/payout.routes.js';
import { disruptionRoutes } from './routes/disruption.routes.js';
import { healthController } from './controllers/health.controller.js';
import { startAllJobs } from './jobs/cron.jobs.js';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/disruptions', disruptionRoutes);

// Health check
app.get('/health', (req, res, next) => {
  healthController.check(req, res).catch(next);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, data: null, error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

// Initialize and start server
const startServer = async () => {
  try {
    // Initialize database schema
    console.log('Initializing database...');
    await initializeSchema();

    // Start cron jobs
    startAllJobs();

    // Start server
    const server = app.listen(config.server.port, () => {
      console.log(`✓ GigShield backend running on http://localhost:${config.server.port}`);
      console.log(`Environment: ${config.server.nodeEnv}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
