import app from './app.js';
import { config } from './config.js';
import pool from './db.js';

const server = app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`Swagger UI available at http://localhost:${config.port}/api-docs`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use. Stop the other process and restart.`);
  } else {
    console.error('Server failed to start:', err.message);
  }
  process.exit(1);
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n${signal} received. Shutting down gracefully...`);

  const forceExitTimer = setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    if (typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  server.close(async (err) => {
    clearTimeout(forceExitTimer);

    if (err) {
      console.error('Error closing HTTP server:', err.message);
    }

    try {
      await pool.end();
    } catch (poolErr) {
      console.error('Error closing database pool:', poolErr.message);
      process.exit(1);
    }

    process.exit(err ? 1 : 0);
  });

  // Close idle keep-alive connections so shutdown does not wait for clients.
  if (typeof server.closeIdleConnections === 'function') {
    server.closeIdleConnections();
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
