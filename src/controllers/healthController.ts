import { Request, Response } from 'express';
import db from '../database/sqlite';
import supabase from '../database/supabase';
import { config } from '../config/env';

export async function healthCheck(_req: Request, res: Response): Promise<void> {
  let sqliteStatus = 'disabled';
  let supabaseStatus = 'unknown';

  if (!config.isVercel && db) {
    sqliteStatus = 'connected';
  }

  try {
    const supabaseCheck = Promise.race([
      supabase.from('contratos').select('codigo_nomenclatura').limit(1),
      new Promise<{ error: Error }>((_, reject) =>
        setTimeout(() => reject(new Error('Supabase timeout')), 800)
      ),
    ]);
    const { error } = await supabaseCheck;
    supabaseStatus = error ? 'degraded' : 'connected';
  } catch {
    supabaseStatus = 'disconnected';
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    databases: {
      sqlite: sqliteStatus,
      supabase: supabaseStatus,
    },
  });
}
