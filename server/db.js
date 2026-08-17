import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from workspace root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbConfig = {
  host: process.env.DB_HOST || '165.99.74.72',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'nextpostmedia_garage',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nextpostmedia_garage',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
  timezone: '+06:00', // Bangladesh Standard Time (BST)
};

export const pool = mysql.createPool(dbConfig);

// Helper function to test DB connection
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL database:', dbConfig.database, 'at', dbConfig.host);
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Transaction wrapper helper
export async function withTransaction(callback) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export default pool;
