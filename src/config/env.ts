import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

export const config = {
  port: parseInt(process.env.PORT || '3005', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  databasePath: process.env.DATABASE_PATH || path.resolve(process.cwd(), 'contratos.db'),
  supabaseUrl: process.env.SUPABASE_URL || 'https://mJsfqr2ma-lR1TjLOBWDZw.supabase.co',
  supabaseKey: process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_mJsfqr2ma-lR1TjLOBWDZw_FrxE4vMT',
  isVercel: !!process.env.VERCEL,
  isTest: process.env.NODE_ENV === 'test',
};
