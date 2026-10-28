import dotenv from 'dotenv';

// Load environment variables once, before any module reads them.
dotenv.config();

const REQUIRED_KEYS = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_NAME'];

function readRequired(key) {
  const value = process.env[key];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value.trim();
}

function readPort(key, fallback) {
  const raw = process.env[key];
  const value = raw === undefined || raw.trim() === '' ? fallback : raw.trim();

  if (!/^\d+$/.test(value)) {
    throw new Error(`Environment variable ${key} must be a valid port number (1-65535)`);
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Environment variable ${key} must be a valid port number (1-65535)`);
  }

  return port;
}

const missingKeys = REQUIRED_KEYS.filter((key) => {
  const value = process.env[key];
  return typeof value !== 'string' || value.trim() === '';
});

if (missingKeys.length > 0) {
  throw new Error(`Missing required environment variable(s): ${missingKeys.join(', ')}`);
}

export const config = Object.freeze({
  port: readPort('PORT', '3000'),
  db: Object.freeze({
    host: readRequired('DB_HOST'),
    port: readPort('DB_PORT'),
    user: readRequired('DB_USER'),
    password: process.env.DB_PASSWORD ?? '',
    database: readRequired('DB_NAME')
  })
});

export default config;
