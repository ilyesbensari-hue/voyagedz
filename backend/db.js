// ==========================================
// VOYAGE DZ - PostgreSQL Database Connection
// ==========================================
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Helper: run a query
const query = (text, params) => pool.query(text, params);

// Helper: get a single row
const getOne = async (text, params) => {
    const res = await pool.query(text, params);
    return res.rows[0] || null;
};

// Helper: get all rows
const getAll = async (text, params) => {
    const res = await pool.query(text, params);
    return res.rows;
};

// Helper: run insert and return last inserted id
const insert = async (text, params) => {
    const res = await pool.query(text + ' RETURNING id', params);
    return res.rows[0].id;
};

module.exports = { pool, query, getOne, getAll, insert };
