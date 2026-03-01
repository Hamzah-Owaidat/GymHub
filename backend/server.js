require('dotenv').config();
const http = require('http');
const app = require('./app');

const PORT = process.env.PORT || 8080;

const server = http.createServer(app);

function start() {
  server.listen(PORT, () => {
    console.log(`GymHub server listening on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.ENVIRONMENT || 'development'}`);
  });
}

const SHUTDOWN_TIMEOUT_MS = 10000;

function shutdown(signal) {
  console.log(`\n${signal} received. Closing server...`);
  const forceExit = setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  server.close((err) => {
    clearTimeout(forceExit);
    if (err) {
      console.error('Error closing server:', err);
      process.exit(1);
    }
    console.log('Server closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
