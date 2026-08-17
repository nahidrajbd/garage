import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { testConnection } from './db.js';

import customersRouter from './routes/customers.js';
import jobCardsRouter from './routes/jobCards.js';
import quotationsRouter from './routes/quotations.js';
import invoicesRouter from './routes/invoices.js';
import expensesRouter from './routes/expenses.js';
import transactionsRouter from './routes/transactions.js';
import loansRouter from './routes/loans.js';
import inventoryRouter from './routes/inventory.js';
import settingsRouter from './routes/settings.js';
import metricsRouter from './routes/metrics.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import techniciansRouter from './routes/technicians.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'NextGarage MySQL API'
  });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/technicians', techniciansRouter);
app.use('/api/customers', customersRouter);
app.use('/api/job-cards', jobCardsRouter);
app.use('/api/quotations', quotationsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/loans', loansRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/metrics', metricsRouter);

// 404 Handler for API
app.use((req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`🚀 NextGarage backend server running on http://localhost:${PORT}`);
  await testConnection();
});

export default app;
