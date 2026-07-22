require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://mJsfqr2ma-lR1TjLOBWDZw.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_mJsfqr2ma-lR1TjLOBWDZw_FrxE4vMT';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Cliente de Supabase inicializado.');

module.exports = supabase;
