import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [rawKey, ...rawValue] = trimmed.split('=');
    const key = rawKey.trim();
    const value = rawValue.join('=').trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

const normalizeSupabaseUrl = (url = '') => url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL ?? '');
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
const jwtSecret = (process.env.JWT_SECRET ?? '').trim();
const port = Number(process.env.PORT || 4000);

if (!supabaseUrl || !supabaseServiceKey || !jwtSecret) {
  throw new Error('Faltan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o JWT_SECRET en backend/.env');
}

if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === undefined) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export { supabase, jwtSecret, port, supabaseUrl };
