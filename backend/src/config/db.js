const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const DB_CLIENT = process.env.DB_CLIENT || 'sqlite'; // 'mysql' or 'sqlite'
let pool = null;
let sqliteDb = null;

// Helper to sanitize parameters for SQL (turn undefined into null)
function sanitizeParams(params) {
  if (!Array.isArray(params)) return [];
  return params.map(p => (p === undefined ? null : p));
}

// Initialize SQLite database
function initSqlite() {
  const { DatabaseSync } = require('node:sqlite');
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'mashalitic.db');
  const isNew = !fs.existsSync(dbPath);
  sqliteDb = new DatabaseSync(dbPath);

  // Enable foreign keys and WAL mode for high performance
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  sqliteDb.exec('PRAGMA journal_mode = WAL;');

  if (isNew) {
    const schemaPath = path.join(__dirname, '../database/schema-sqlite.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      sqliteDb.exec(schemaSql);
      console.log('✅ SQLite database initialized with schema');
    }
  }

  console.log('🚀 Database Connected: SQLite (Local Embedded Engine) ->', dbPath);
}

// Initialize MySQL pool
async function initMysql() {
  const mysql = require('mysql2/promise');
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mashalitic_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      decimalNumbers: true
    });

    const [rows] = await pool.query('SELECT 1 as test');
    console.log('🚀 Database Connected: MySQL 8.0+ -> mashalitic_db');
  } catch (err) {
    console.warn('⚠️ MySQL connection failed (' + err.message + '). Falling back to SQLite engine.');
    pool = null;
    initSqlite();
  }
}

// Initialize DB according to configuration
async function initialize() {
  if (DB_CLIENT === 'mysql') {
    await initMysql();
  } else {
    initSqlite();
  }
}

// Unified Query Function
async function query(sql, params = []) {
  const cleanParams = sanitizeParams(params);

  if (pool) {
    // MySQL query execution
    try {
      const [results] = await pool.query(sql, cleanParams);
      if (Array.isArray(results)) {
        return { rows: results, count: results.length };
      } else {
        return {
          insertId: results.insertId,
          affectedRows: results.affectedRows,
          rows: []
        };
      }
    } catch (err) {
      console.error('MySQL Query Error:', err.message, '\nSQL:', sql, '\nParams:', cleanParams);
      throw err;
    }
  } else {
    // SQLite execution
    if (!sqliteDb) {
      initSqlite();
    }

    try {
      const trimmed = sql.trim();
      const isSelect = /^SELECT|^PRAGMA|^SHOW|^EXPLAIN/i.test(trimmed);

      const stmt = sqliteDb.prepare(sql);
      if (isSelect) {
        const rows = stmt.all(...cleanParams);
        return { rows, count: rows.length };
      } else {
        const info = stmt.run(...cleanParams);
        return {
          insertId: Number(info.lastInsertRowid),
          affectedRows: Number(info.changes),
          rows: []
        };
      }
    } catch (err) {
      console.error('SQLite Query Error:', err.message, '\nSQL:', sql, '\nParams:', cleanParams);
      throw err;
    }
  }
}

// Unified Transaction Runner
async function transaction(callback) {
  if (pool) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const trxQuery = async (sql, params = []) => {
        const [results] = await connection.query(sql, sanitizeParams(params));
        if (Array.isArray(results)) {
          return { rows: results, count: results.length };
        } else {
          return {
            insertId: results.insertId,
            affectedRows: results.affectedRows,
            rows: []
          };
        }
      };
      const result = await callback(trxQuery);
      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } else {
    if (!sqliteDb) initSqlite();
    sqliteDb.exec('BEGIN TRANSACTION;');
    try {
      const trxQuery = async (sql, params = []) => {
        return query(sql, params);
      };
      const result = await callback(trxQuery);
      sqliteDb.exec('COMMIT;');
      return result;
    } catch (err) {
      sqliteDb.exec('ROLLBACK;');
      throw err;
    }
  }
}

module.exports = {
  initialize,
  query,
  transaction,
  getPool: () => pool,
  getSqliteDb: () => sqliteDb
};
