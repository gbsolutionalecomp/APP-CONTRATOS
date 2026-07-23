import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export const supabase: SupabaseClient = createClient(config.supabaseUrl, config.supabaseKey);

logger.info('Cliente de Supabase inicializado correctamente.');

export default supabase;
