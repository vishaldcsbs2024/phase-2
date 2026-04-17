const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { listAdminRules, updateAdminRule } = require('../services/adminRuleService');

const router = express.Router();

router.get('/', verifyToken, async (req, res, next) => {
  try {
    const rules = await listAdminRules();
    res.status(200).json({
      success: true,
      data: { rules },
      error: '',
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:key', verifyToken, async (req, res, next) => {
  try {
    const value = Number(req.body?.value);
    if (!Number.isFinite(value)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Numeric value is required',
      });
    }

    const updated = await updateAdminRule({
      key: req.params.key,
      value,
      description: req.body?.description,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Rule not found',
      });
    }

    res.status(200).json({
      success: true,
      data: { rule: updated },
      error: '',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
