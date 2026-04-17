import { disruptionModel } from '../models/Disruption.js';
import axios from 'axios';
// @ts-ignore - Import old JavaScript service for backward compatibility
import { simulateDisruption as simulateDisruptionOld } from './disruptionService.js';

export const disruptionService = {
  async simulateDisruption(payload: Record<string, any>) {
    return simulateDisruptionOld(payload);
  },

  async recordDisruption(disruptionType: string, location: string, severity: number = 1) {
    const disruption = await disruptionModel.create({
      disruption_type: disruptionType,
      location,
      severity_level: severity,
    });

    return disruption;
  },

  async getActiveDisruptions() {
    return disruptionModel.getActiveDisruptions();
  },

  async resolveDisruption(disruptionId: string) {
    return disruptionModel.resolve(disruptionId);
  },

  async checkWeatherDisruptions(location: string, apiKey: string) {
    try {
      // This is a placeholder - integrate with actual weather API
      const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}`);
      const data = response.data;

      const disruptions: any[] = [];

      // Check temperature for extreme heat
      if (data.main.temp > 45) {
        disruptions.push({
          type: 'extreme_heat',
          severity: Math.min(Math.floor((data.main.temp - 45) / 5) + 1, 5),
        });
      }

      // Check rain
      if (data.rain && data.rain['1h'] > 30) {
        disruptions.push({
          type: 'heavy_rain',
          severity: Math.min(Math.floor(data.rain['1h'] / 10), 5),
        });
      }

      return disruptions;
    } catch (error) {
      console.error('Error checking weather:', error);
      return [];
    }
  },

  async checkAQIDisruptions(location: string, apiKey: string) {
    try {
      // This is a placeholder - integrate with actual AQI API
      const response = await axios.get(`https://api.waqi.info/feed/${location}/?token=${apiKey}`);
      const aqi = response.data.data.aqi;

      if (aqi > 300) {
        return {
          type: 'severe_aqi',
          severity: 5,
          aqi,
        };
      } else if (aqi > 200) {
        return {
          type: 'severe_aqi',
          severity: 3,
          aqi,
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking AQI:', error);
      return null;
    }
  },
};
