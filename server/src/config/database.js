const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../gigshield.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database open error:', err);
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

const testConnection = async () => {
  return new Promise((resolve) => {
    db.get('SELECT 1', (err) => {
      if (err) {
        console.error('✗ Database connection failed:', err.message);
        resolve(false);
      } else {
        console.log('✓ Database connected (SQLite)');
        resolve(true);
      }
    });
  });
};

const initializeDatabase = async () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS partners (
          id TEXT PRIMARY KEY,
          business_name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          otp_code TEXT,
          otp_expires_at DATETIME,
          jwt_token TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS policies (
          id TEXT PRIMARY KEY,
          partner_id TEXT NOT NULL REFERENCES partners(id),
          policy_number TEXT UNIQUE NOT NULL,
          worker_name TEXT NOT NULL,
          income_per_month REAL NOT NULL,
          coverage_period_months INTEGER NOT NULL,
          premium_amount REAL NOT NULL,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME
        );

        CREATE TABLE IF NOT EXISTS claims (
          id TEXT PRIMARY KEY,
          policy_id TEXT NOT NULL REFERENCES policies(id),
          claim_type TEXT NOT NULL,
          incident_date DATETIME NOT NULL,
          description TEXT,
          claimed_amount REAL NOT NULL,
          status TEXT DEFAULT 'pending',
          fraud_checks_passed INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS disruptions (
          id TEXT PRIMARY KEY,
          policy_id TEXT NOT NULL REFERENCES policies(id),
          start_date DATETIME NOT NULL,
          end_date DATETIME,
          reason TEXT,
          days_disrupted INTEGER,
          income_loss REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS payouts (
          id TEXT PRIMARY KEY,
          claim_id TEXT NOT NULL REFERENCES claims(id),
          amount REAL NOT NULL,
          status TEXT DEFAULT 'processed',
          utr TEXT UNIQUE,
          processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `, (err) => {
        if (err) {
          console.error('Database initialization error:', err);
          reject(err);
        } else {
          console.log('✓ Database tables initialized');
          resolve();
        }
      });
    });
  });
};

const query = async (text, params = []) => {
  return new Promise((resolve, reject) => {
    if (text.trim().toUpperCase().startsWith('SELECT')) {
      db.all(text, params, (err, rows) => {
        if (err) {
          console.error('Database error:', err);
          reject(err);
        } else {
          resolve({ rows: rows || [], rowCount: rows ? rows.length : 0 });
        }
      });
    } else {
      db.run(text, params, function(err) {
        if (err) {
          console.error('Database error:', err);
          reject(err);
        } else {
          resolve({ changes: this.changes, lastID: this.lastID });
        }
      });
    }
  });
};

const getClient = async () => {
  return db;
};

module.exports = { query, getClient, testConnection, initializeDatabase, db };
