const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
const logFormat = process.env.ENVIRONMENT === 'production' ? 'combined' : 'dev';
app.use(morgan(logFormat));

// API routes
app.use('/', routes);
app.use('/api/auth', require('./routes/auth'));

// 404
app.use((req, res, next) => {
  res.status(404).json({ success: false, error: 'Not Found' });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
