const express = require('express');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { get, set, del } = require('../config/redis');
const { verifyToken, generateToken } = require('../middleware/auth');

const router = express.Router();

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// POST /register
router.post('/register', async (req, res, next) => {
  try {
    const { phone, name, platform, city } = req.body;

    if (!phone || !name || !platform || !city) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Phone, name, platform, and city are required'
      });
    }

    // Check if partner exists
    const existingResult = await query(
      'SELECT id FROM partners WHERE phone = $1',
      [phone]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Phone number already registered'
      });
    }

    const otp = generateOTP();
    await set(`otp:${phone}`, { otp, name, platform, city }, 300);

    res.status(200).json({
      success: true,
      data: {
        phone,
        message: 'OTP sent successfully',
        otp_for_testing: otp // Remove in production
      },
      error: ''
    });
  } catch (error) {
    next(error);
  }
});

// POST /verify-otp
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Phone and OTP are required'
      });
    }

    const otpData = await get(`otp:${phone}`);

    if (!otpData) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'OTP expired'
      });
    }

    if (otpData.otp !== otp) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Invalid OTP'
      });
    }

    const partnerId = uuidv4();
    const password = await bcrypt.hash(otp + phone, 10); // Simple hashing for demo

    await query(
      'INSERT INTO partners (id, phone, name, platform, city, kyc_verified, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
      [partnerId, phone, otpData.name, otpData.platform, otpData.city, true]
    );

    await del(`otp:${phone}`);

    const token = generateToken(partnerId, 'partner');

    res.status(200).json({
      success: true,
      data: {
        partner_id: partnerId,
        token,
        phone,
        name: otpData.name
      },
      error: ''
    });
  } catch (error) {
    next(error);
  }
});

// GET /profile
router.get('/profile', verifyToken, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, phone, name, platform, city, kyc_verified, created_at FROM partners WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Partner not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
      error: ''
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
