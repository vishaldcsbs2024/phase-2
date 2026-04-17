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

const ensureColumns = async (tableName, columns) => {
  const existingColumns = await query(`PRAGMA table_info(${tableName})`);
  const columnNames = new Set((existingColumns.rows || []).map((column) => column.name));

  for (const [columnName, columnDefinition] of Object.entries(columns)) {
    if (!columnNames.has(columnName)) {
      await query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
    }
  }
};

const initializeDatabase = async () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS partners (
          id TEXT PRIMARY KEY,
          phone TEXT UNIQUE,
          phone_number TEXT UNIQUE,
          password_hash TEXT,
          name TEXT,
          full_name TEXT,
          email TEXT UNIQUE,
          platform TEXT,
          platforms TEXT,
          city TEXT,
          work_type TEXT,
          kyc_verified INTEGER DEFAULT 0,
          bank_account TEXT,
          ifsc_code TEXT,
          upi_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          phone_number TEXT UNIQUE NOT NULL,
          work_type TEXT NOT NULL,
          weekly_income REAL NOT NULL,
          city TEXT NOT NULL,
          token TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS policies (
          id TEXT PRIMARY KEY,
          partner_id TEXT,
          user_id TEXT,
          platform TEXT,
          city TEXT,
          policy_number TEXT UNIQUE,
          worker_name TEXT,
          income_per_month REAL,
          coverage_period_months INTEGER,
          premium_weekly REAL,
          premium_amount REAL,
          coverage_amount REAL NOT NULL,
          status TEXT DEFAULT 'active',
          active_from DATETIME DEFAULT CURRENT_TIMESTAMP,
          start_date DATETIME,
          expires_at DATETIME,
          end_date DATETIME,
          disrupted_days INTEGER DEFAULT 0,
          risk_band TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS claims (
          id TEXT PRIMARY KEY,
          policy_id TEXT,
          partner_id TEXT,
          user_id TEXT,
          disruption_id TEXT,
          claim_type TEXT,
          incident_date DATETIME,
          description TEXT,
          claimed_amount REAL,
          status TEXT DEFAULT 'pending',
          fraud_checks_passed INTEGER DEFAULT 1,
          disruption_type TEXT,
          location TEXT,
          daily_payout REAL,
          risk_score REAL,
          fraud_score REAL,
          decision TEXT,
          confidence_score REAL,
          claim_date DATE,
          reason TEXT,
          reasoning_json TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS disruptions (
          id TEXT PRIMARY KEY,
          policy_id TEXT,
          partner_id TEXT,
          user_id TEXT,
          disruption_type TEXT,
          type TEXT,
          location TEXT NOT NULL,
          latitude REAL,
          longitude REAL,
          source TEXT,
          severity_level INTEGER DEFAULT 1,
          severity INTEGER DEFAULT 1,
          risk_score REAL,
          status TEXT DEFAULT 'active',
          detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          resolved_at DATETIME,
          start_date DATETIME,
          end_date DATETIME,
          reason TEXT,
          days_disrupted INTEGER,
          income_loss REAL,
          claim_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS payouts (
          id TEXT PRIMARY KEY,
          claim_id TEXT NOT NULL,
          partner_id TEXT,
          user_id TEXT,
          payout_amount REAL NOT NULL,
          amount REAL,
          payout_date DATETIME,
          status TEXT DEFAULT 'pending',
          bank_reference TEXT,
          utr TEXT,
          gateway_reference TEXT,
          processing_started_at DATETIME,
          processed_at DATETIME,
          completed_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS fraud_logs (
          id TEXT PRIMARY KEY,
          claim_id TEXT,
          user_id TEXT,
          partner_id TEXT,
          fraud_score REAL,
          flags_json TEXT,
          decision TEXT,
          metadata_json TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `, async (err) => {
        if (err) {
          console.error('Database initialization error:', err);
          reject(err);
          return;
        }

        try {
          await ensureColumns('partners', {
            phone: 'TEXT',
            phone_number: 'TEXT',
            password_hash: 'TEXT',
            name: 'TEXT',
            full_name: 'TEXT',
            platform: 'TEXT',
            platforms: 'TEXT',
            city: 'TEXT',
            work_type: 'TEXT',
            updated_at: 'DATETIME',
          });

          await ensureColumns('users', {
            token: 'TEXT',
            updated_at: 'DATETIME',
          });

          await ensureColumns('policies', {
            partner_id: 'TEXT',
            user_id: 'TEXT',
            platform: 'TEXT',
            city: 'TEXT',
            policy_number: 'TEXT',
            worker_name: 'TEXT',
            income_per_month: 'REAL',
            coverage_period_months: 'INTEGER',
            premium_weekly: 'REAL',
            premium_amount: 'REAL',
            start_date: 'DATETIME',
            end_date: 'DATETIME',
            risk_band: 'TEXT',
            updated_at: 'DATETIME',
          });

          await ensureColumns('claims', {
            policy_id: 'TEXT',
            partner_id: 'TEXT',
            user_id: 'TEXT',
            disruption_id: 'TEXT',
            claim_type: 'TEXT',
            incident_date: 'DATETIME',
            description: 'TEXT',
            claimed_amount: 'REAL',
            disruption_type: 'TEXT',
            location: 'TEXT',
            daily_payout: 'REAL',
            risk_score: 'REAL',
            fraud_score: 'REAL',
            decision: 'TEXT',
            confidence_score: 'REAL',
            claim_date: 'DATE',
            reason: 'TEXT',
            reasoning_json: 'TEXT',
            updated_at: 'DATETIME',
          });

          await ensureColumns('disruptions', {
            policy_id: 'TEXT',
            partner_id: 'TEXT',
            user_id: 'TEXT',
            disruption_type: 'TEXT',
            type: 'TEXT',
            source: 'TEXT',
            latitude: 'REAL',
            longitude: 'REAL',
            severity: 'INTEGER',
            risk_score: 'REAL',
            status: "TEXT DEFAULT 'active'",
            resolved_at: 'DATETIME',
            end_date: 'DATETIME',
            reason: 'TEXT',
            days_disrupted: 'INTEGER',
            income_loss: 'REAL',
            claim_id: 'TEXT',
            updated_at: 'DATETIME',
          });

          await ensureColumns('payouts', {
            partner_id: 'TEXT',
            user_id: 'TEXT',
            payout_amount: 'REAL',
            amount: 'REAL',
            payout_date: 'DATETIME',
            bank_reference: 'TEXT',
            utr: 'TEXT',
            gateway_reference: 'TEXT',
            processing_started_at: 'DATETIME',
            processed_at: 'DATETIME',
            completed_at: 'DATETIME',
            updated_at: 'DATETIME',
          });

          await ensureColumns('fraud_logs', {
            claim_id: 'TEXT',
            user_id: 'TEXT',
            partner_id: 'TEXT',
            fraud_score: 'REAL',
            flags_json: 'TEXT',
            decision: 'TEXT',
            metadata_json: 'TEXT',
            updated_at: 'DATETIME',
          });

          console.log('✓ Database tables initialized');
          resolve();
        } catch (migrationError) {
          console.error('Database migration error:', migrationError);
          reject(migrationError);
        }
      });
    });
  });
};

const query = async (text, params = []) => {
  return new Promise((resolve, reject) => {
    const normalized = text.trim().toUpperCase();
    const returnsRows = normalized.startsWith('SELECT') || normalized.startsWith('WITH') || normalized.startsWith('PRAGMA') || normalized.includes(' RETURNING ');

    if (returnsRows) {
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
