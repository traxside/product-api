import mysql from 'mysql2/promise';
import { config } from './config.js';

// Shared connection pool — created after config.js has loaded and validated .env
const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10
});

export default pool;
