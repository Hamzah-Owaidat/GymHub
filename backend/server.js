require('dotenv').config();
const express = require('express');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'GymHub API', status: 'ok' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', environment: process.env.ENVIRONMENT || 'development' });
});

app.listen(PORT, () => {
  console.log(`GymHub server running on http://localhost:${PORT}`);
});
