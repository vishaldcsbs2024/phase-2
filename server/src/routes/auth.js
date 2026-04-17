const express = require('express');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { verifyToken, generateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { phoneNumber, fullName, password, city, workType, weeklyIncome } = req.body || {};

    if (!phoneNumber || !fullName || !password) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'phoneNumber, fullName and password are required',
      });
    }

    const existing = await query('SELECT id FROM partners WHERE phone_number = ? OR phone = ? LIMIT 1', [phoneNumber, phoneNumber]);
    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Phone number already registered',
      });
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(String(password), 10);

    await query(
      `INSERT INTO partners (
        id, phone, phone_number, password_hash, full_name, city, work_type, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, phoneNumber, phoneNumber, passwordHash, fullName, city || 'Chennai', workType || 'Delivery'],
    );

    await query(
      `INSERT INTO users (
        id, name, phone_number, work_type, weekly_income, city, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, fullName, phoneNumber, workType || 'Delivery', Number(weeklyIncome || 0), city || 'Chennai'],
    );

    const token = generateToken(id, 'partner');

    res.status(201).json({
      success: true,
      data: {
        partner: {
          id,
          phone_number: phoneNumber,
          full_name: fullName,
          city: city || 'Chennai',
          work_type: workType || 'Delivery',
        },
        token,
      },
      error: '',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { phoneNumber, password } = req.body || {};
    if (!phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'phoneNumber and password are required',
      });
    }

    const result = await query(
      'SELECT id, phone_number, full_name, city, work_type, password_hash FROM partners WHERE phone_number = ? OR phone = ? LIMIT 1',
      [phoneNumber, phoneNumber],
    );

    const partner = result.rows[0];
    if (!partner) {
      return res.status(401).json({
        success: false,
        data: null,
        error: 'Invalid credentials',
      });
    }

    const passwordOk = await bcrypt.compare(String(password), String(partner.password_hash || ''));
    if (!passwordOk) {
      return res.status(401).json({
        success: false,
        data: null,
        error: 'Invalid credentials',
      });
    }

    const token = generateToken(partner.id, 'partner');

    res.status(200).json({
      success: true,
      data: {
        partner: {
          id: partner.id,
          phone_number: partner.phone_number,
          full_name: partner.full_name,
          city: partner.city,
          work_type: partner.work_type,
        },
        token,
      },
      error: '',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/profile', verifyToken, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, phone_number, full_name, city, work_type, created_at FROM partners WHERE id = ? LIMIT 1',
      [req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
      error: '',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
