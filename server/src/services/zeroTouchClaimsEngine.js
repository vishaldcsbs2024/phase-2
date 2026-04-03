/**
 * Zero-Touch Claims Service
 * Seamless, automated claim approval and processing
 * Auto-approves low-risk claims without manual intervention
 */

const { v4: uuidv4 } = require('uuid');

// Smart claim approval engine - determines if claim can auto-approve
const evaluateClaimApprovalEligibility = (claim = {}, workerData = {}, claimHistory = []) => {
  const {
    claimed_amount = 0,
    claim_type = 'weather',
    incident_date = new Date()
  } = claim;

  const {
    profile_completeness = 0.8,
    years_with_platform = 1,
    previous_claims = 0,
    average_monthly_income = 2500
  } = workerData;

  let autoApprovalScore = 0;
  const factors = {};

  // Factor 1: Profile Completeness (0-20 points)
  // Complete profiles are more trustworthy
  factors.profile_completeness = profile_completeness * 20;
  autoApprovalScore += factors.profile_completeness;

  // Factor 2: Account Age (0-15 points)
  // Older accounts are lower risk
  const accountAgeScore = Math.min(years_with_platform * 7.5, 15);
  factors.account_age = accountAgeScore;
  autoApprovalScore += accountAgeScore;

  // Factor 3: Claims History (0-20 points)
  // Too many claims = fraud risk, no claims = trustworthy
  if (previous_claims === 0) {
    factors.claims_history = 20;
  } else if (previous_claims <= 2) {
    factors.claims_history = 15;
  } else if (previous_claims <= 5) {
    factors.claims_history = 10;
  } else {
    factors.claims_history = 5;
  }
  autoApprovalScore += factors.claims_history;

  // Factor 4: Claim Type Risk Assessment (0-20 points)
  // Different claim types have different fraud risks
  const claimTypeRisks = {
    'weather': 0.95,        // 95% safe - weather is external
    'disruption': 0.90,     // 90% safe - platform verified
    'manual': 0.60,         // 60% safe - manual claims have higher fraud risk
    'medical': 0.70,        // 70% safe - requires documentation
    'accident': 0.50        // 50% safe - subjective
  };
  const typeRisk = claimTypeRisks[claim_type] || 0.70;
  factors.claim_type_risk = typeRisk * 20;
  autoApprovalScore += factors.claim_type_risk;

  // Factor 5: Claim Amount vs Income (0-25 points)
  // Claims too large relative to income are suspicious
  const monthlyIncomeLimit = average_monthly_income;
  const claimToIncomeRatio = claimed_amount / (monthlyIncomeLimit || 2500);
  
  let amountScore = 25;
  if (claimToIncomeRatio > 2) {
    amountScore = 5; // Claim > 2 months income = very suspicious
  } else if (claimToIncomeRatio > 1.5) {
    amountScore = 10;
  } else if (claimToIncomeRatio > 1) {
    amountScore = 15;
  } else if (claimToIncomeRatio > 0.5) {
    amountScore = 20;
  }
  factors.amount_reasonableness = amountScore;
  autoApprovalScore += amountScore;

  // Determine auto-approval eligibility
  const canAutoApprove = autoApprovalScore >= 75; // 75+ score = auto-approve
  const approvalConfidence = (autoApprovalScore / 100).toFixed(2);

  return {
    auto_approve_eligible: canAutoApprove,
    approval_confidence: parseFloat(approvalConfidence),
    approval_score: Math.round(autoApprovalScore),
    factors,
    reasoning: getApprovalReasoning(autoApprovalScore, factors)
  };
};

// Generate human-readable approval reasoning
const getApprovalReasoning = (score, factors) => {
  if (score >= 85) return '✓ Excellent profile - Auto-approved with high confidence';
  if (score >= 75) return '✓ Good profile - Auto-approved';
  if (score >= 60) return '⚠ Moderate risk - Requires manual review';
  if (score >= 40) return '⚠ Higher risk - Manual review + documentation needed';
  return '✗ High risk - Requires investigation';
};

// Zero-touch automatic claim filing (triggered by disruption detection)
const autoFileClaimFromDisruption = (disruptionData = {}, workerData = {}) => {
  const {
    disruptions = [],
    total_estimated_income_loss = 0,
    claim_auto_trigger = false
  } = disruptionData;

  if (!claim_auto_trigger) {
    return null;
  }

  const claimId = uuidv4();
  const autoFiledClaim = {
    id: claimId,
    claim_type: 'disruption_auto_filed',
    claimed_amount: total_estimated_income_loss,
    incident_date: new Date(),
    auto_filed: true,
    triggering_disruptions: disruptions.map(d => d.trigger),
    source: 'automated_disruption_detection',
    status: 'pending_approval', // Will be auto-approved by next check
    created_at: new Date()
  };

  return autoFiledClaim;
};

// Smart payoout calculation with income verification
const calculateSmartPayout = (claim = {}, workerData = {}, policies = []) => {
  const {
    claimed_amount = 0,
    claim_type = 'weather'
  } = claim;

  const {
    average_monthly_income = 2500
  } = workerData;

  // Find relevant policy
  const relevantPolicy = policies.find(p => p.status === 'active') || {};
  const coverageAmount = relevantPolicy.coverage_amount || claimed_amount;

  // Calculate payout with fraud safeguards
  let verifiedPayout = claimed_amount;

  // Check 1: Payout should not exceed coverage
  if (claimed_amount > coverageAmount) {
    verifiedPayout = coverageAmount;
  }

  // Check 2: Payout should not exceed reasonable income loss
  const maxReasonableLoss = average_monthly_income * 1.5; // Max 1.5 months income
  if (claimed_amount > maxReasonableLoss) {
    verifiedPayout = maxReasonableLoss;
  }

  // Check 3: Apply claim type multipliers
  const payoutMultipliers = {
    'weather': 1.0,
    'disruption': 1.0,
    'manual': 0.85,         // 15% haircut for manual claims
    'medical': 0.9,
    'accident': 0.75        // 25% haircut for accidents
  };

  const multiplier = payoutMultipliers[claim_type] || 0.95;
  verifiedPayout = Math.round(verifiedPayout * multiplier);

  return {
    claimed_amount,
    verified_payout: verifiedPayout,
    coverage_limit: coverageAmount,
    claim_type,
    multiplier,
    haircut_amount: claimed_amount - verifiedPayout,
    reason: verifiedPayout < claimed_amount 
      ? `Payout adjusted based on coverage limit and income verification`
      : 'Full payout approved'
  };
};

// Zero-touch claim processing pipeline
const processClaimZeroTouch = async (claim = {}, workerData = {}, claimHistory = [], policies = []) => {
  try {
    const claimId = claim.id || uuidv4();

    // Step 1: Evaluate Approval Eligibility
    const eligibility = evaluateClaimApprovalEligibility(claim, workerData, claimHistory);

    // Step 2: Run fraud detection
    const fraudChecks = performEnhancedFraudDetection(claim, workerData, claimHistory);

    // Step 3: Calculate verified payout
    const payoutCalc = calculateSmartPayout(claim, workerData, policies);

    // Step 4: Determine final status
    let finalStatus = 'pending_manual_review';
    let autoApproved = false;

    if (eligibility.auto_approve_eligible && !fraudChecks.fraud_detected) {
      finalStatus = 'approved';
      autoApproved = true;
    } else if (fraudChecks.fraud_detected) {
      finalStatus = 'rejected';
    }

    // Step 5: Generate processing result
    const result = {
      claim_id: claimId,
      claim_amount: claim.claimed_amount,
      verified_payout: payoutCalc.verified_payout,
      status: finalStatus,
      auto_approved: autoApproved,
      auto_approval_confidence: eligibility.approval_confidence,
      approval_score: eligibility.approval_score,
      fraud_risk_score: fraudChecks.risk_score,
      fraud_detected: fraudChecks.fraud_detected,
      fraud_warnings: fraudChecks.warnings,
      processing_time_seconds: 0, // Would be <1 second
      zero_touch: autoApproved,
      next_step: autoApproved 
        ? 'Payout processing initiated'
        : (fraudChecks.fraud_detected 
          ? 'Claim forwarded to investigation team'
          : 'Claim queued for manual review'),
      timestamp: new Date().toISOString()
    };

    return result;
  } catch (error) {
    console.error('Claim processing error:', error);
    return {
      claim_id: claim.id || 'unknown',
      status: 'error',
      error: error.message
    };
  }
};

// Enhanced fraud detection with multiple checks
const performEnhancedFraudDetection = (claim = {}, workerData = {}, claimHistory = []) => {
  const warnings = [];
  let riskScore = 0; // 0-100

  // Check 1: Multiple claims in short timeframe
  const recentClaims = claimHistory.filter(c => {
    const daysDiff = (new Date() - new Date(c.created_at)) / (1000 * 60 * 60 * 24);
    return daysDiff < 30;
  });

  if (recentClaims.length > 2) {
    warnings.push('Multiple claims in past 30 days');
    riskScore += 25;
  }

  // Check 2: Duplicate claim detection
  const hasDuplicate = claimHistory.some(c => 
    Math.abs(c.claimed_amount - claim.claimed_amount) < 10 &&
    (new Date() - new Date(c.created_at)) / (1000 * 60 * 60) < 24
  );

  if (hasDuplicate) {
    warnings.push('Similar claim filed within 24 hours');
    riskScore += 35;
  }

  // Check 3: Claim amount vs historical average
  const avgClaimAmount = claimHistory.length > 0 
    ? claimHistory.reduce((sum, c) => sum + c.claimed_amount, 0) / claimHistory.length
    : 0;

  if (avgClaimAmount > 0 && claim.claimed_amount > avgClaimAmount * 2) {
    warnings.push('Claim amount significantly exceeds historical average');
    riskScore += 15;
  }

  // Check 4: Incomplete worker profile
  if ((workerData.profile_completeness || 0) < 0.5) {
    warnings.push('Incomplete worker profile');
    riskScore += 10;
  }

  const fraudDetected = riskScore > 50;

  return {
    fraud_detected: fraudDetected,
    risk_score: riskScore,
    warnings,
    reasoning: fraudDetected 
      ? `High fraud risk detected. Score: ${riskScore}/100`
      : `Low fraud risk. Score: ${riskScore}/100`
  };
};

module.exports = {
  processClaimZeroTouch,
  evaluateClaimApprovalEligibility,
  calculateSmartPayout,
  performEnhancedFraudDetection,
  autoFileClaimFromDisruption
};
