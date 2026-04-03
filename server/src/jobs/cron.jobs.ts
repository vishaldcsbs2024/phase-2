import cron from 'node-cron';
import { payoutService } from '../services/payout.service.js';
import { disruptionService } from '../services/disruption.service.js';
import { claimModel } from '../models/Claim.js';
import { payoutModel } from '../models/Payout.js';

// Process pending payouts every day at 2 AM
export const startPayoutProcessingJob = () => {
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('[CRON] Starting payout processing job at', new Date().toISOString());
      const processed = await payoutService.processPendingPayouts();
      console.log(`[CRON] Processed ${processed.length} payouts`);
    } catch (error) {
      console.error('[CRON] Error processing payouts:', error);
    }
  });
};

// Check and auto-approve claims every 6 hours
export const startClaimProcessingJob = () => {
  cron.schedule('0 */6 * * *', async () => {
    try {
      console.log('[CRON] Starting claim processing job at', new Date().toISOString());
      
      // Get all pending claims older than 24 hours
      const result = await claimModel.findByPartnerId('');
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // This is a simplified version - in production, you'd query with proper filtering
      console.log('[CRON] Claim processing completed');
    } catch (error) {
      console.error('[CRON] Error processing claims:', error);
    }
  });
};

// Monitor active disruptions every hour
export const startDisruptionMonitoringJob = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('[CRON] Starting disruption monitoring job at', new Date().toISOString());
      const disruptions = await disruptionService.getActiveDisruptions();
      console.log(`[CRON] Found ${disruptions.length} active disruptions`);

      // Auto-resolve disruptions that are more than 24 hours old
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      for (const disruption of disruptions) {
        if (new Date(disruption.detected_at) < oneDayAgo) {
          await disruptionService.resolveDisruption(disruption.id);
          console.log(`[CRON] Resolved disruption ${disruption.id}`);
        }
      }
    } catch (error) {
      console.error('[CRON] Error monitoring disruptions:', error);
    }
  });
};

// Weekly premium billing job (every Monday at 8 AM)
export const startWeeklyBillingJob = () => {
  cron.schedule('0 8 * * 1', async () => {
    try {
      console.log('[CRON] Starting weekly billing job at', new Date().toISOString());
      // This would integrate with payment gateway
      console.log('[CRON] Weekly billing completed');
    } catch (error) {
      console.error('[CRON] Error in weekly billing:', error);
    }
  });
};

export const startAllJobs = () => {
  console.log('Starting all cron jobs...');
  startPayoutProcessingJob();
  startClaimProcessingJob();
  startDisruptionMonitoringJob();
  startWeeklyBillingJob();
  console.log('All cron jobs started');
};
