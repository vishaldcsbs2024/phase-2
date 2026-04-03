import { query } from '../db/index.js';

export interface Disruption {
  id: string;
  disruption_type: string;
  location: string;
  latitude?: number;
  longitude?: number;
  severity_level: number;
  detected_at: Date;
  resolved_at?: Date;
  created_at: Date;
}

export const disruptionModel = {
  async create(data: Omit<Disruption, 'id' | 'detected_at' | 'created_at'>) {
    const result = await query(
      `INSERT INTO disruptions (disruption_type, location, latitude, longitude, severity_level)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.disruption_type, data.location, data.latitude, data.longitude, data.severity_level]
    );
    return result.rows[0];
  },

  async findActiveByLocation(location: string) {
    const result = await query(
      `SELECT * FROM disruptions WHERE location = $1 AND resolved_at IS NULL ORDER BY detected_at DESC`,
      [location]
    );
    return result.rows;
  },

  async findByType(disruption_type: string) {
    const result = await query(
      `SELECT * FROM disruptions WHERE disruption_type = $1 AND resolved_at IS NULL ORDER BY detected_at DESC`,
      [disruption_type]
    );
    return result.rows;
  },

  async resolve(id: string) {
    const result = await query(
      `UPDATE disruptions SET resolved_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  async getActiveDisruptions() {
    const result = await query(
      `SELECT * FROM disruptions WHERE resolved_at IS NULL ORDER BY detected_at DESC`
    );
    return result.rows;
  },
};
