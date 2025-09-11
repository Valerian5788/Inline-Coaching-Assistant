import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;
dotenv.config();

// Database connection pool
export const db = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
db.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

db.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
  process.exit(-1);
});

// Set coach context for RLS
export const setCoachContext = async (coachId) => {
  const client = await db.connect();
  try {
    await client.query('SET app.current_coach_id = $1', [coachId]);
    return client;
  } catch (error) {
    client.release();
    throw error;
  }
};

// Helper to run queries with coach context
export const queryWithCoachContext = async (coachId, query, params = []) => {
  const client = await setCoachContext(coachId);
  try {
    const result = await client.query(query, params);
    return result;
  } finally {
    client.release();
  }
};