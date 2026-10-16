/**
 * Test okruženje (učitava se PRE ostalih modula).
 *
 * Postavlja deterministične tajne i sprečava prave mrežne pozive ka Supabase-u,
 * tako da su testovi hermeticni i brzi (instant "connection refused").
 */

process.env.NODE_ENV = 'test';

process.env.JWT_ACCESS_SECRET = 'test_access_secret_'.padEnd(48, 'a');
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_'.padEnd(48, 'b');
process.env.JWT_RESET_SECRET = 'test_reset_secret_'.padEnd(48, 'c');
process.env.STORAGE_HMAC_SECRET = 'test_storage_hmac_'.padEnd(48, 'd');
process.env.STORAGE_UPLOAD_SECRET = 'test_storage_upload_'.padEnd(48, 'e');

// Nevalidan lokalni endpoint -> mrežni pozivi padaju odmah (bez odlaska na internet).
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:9';
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.APP_URL = 'http://localhost:3000';
