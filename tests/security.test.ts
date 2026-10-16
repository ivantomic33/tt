import './setup';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

import { TokenService } from '../src/server/auth/tokenService';
import { PasswordService } from '../src/server/auth/passwordService';
import { requireSecret } from '../src/server/security/secrets';
import {
  sanitizePlainText,
  sanitizeRichHtml,
  ResetPasswordSchema,
  RegisterSchema,
} from '../src/server/validation/schemas';

/* ------------------------------------------------------------------ */
/* 1. Tajne (secrets) — fail-fast u produkciji                         */
/* ------------------------------------------------------------------ */

test('requireSecret: odbija prekratku tajnu', () => {
  process.env.TEST_SHORT_SECRET = 'too-short';
  assert.throws(() => requireSecret('TEST_SHORT_SECRET'), /too short/i);
  delete process.env.TEST_SHORT_SECRET;
});

test('requireSecret: u produkciji baca grešku kada tajna nedostaje', () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  delete process.env.DEFINITELY_MISSING_SECRET_XYZ;
  assert.throws(() => requireSecret('DEFINITELY_MISSING_SECRET_XYZ'), /Missing required secret/i);
  process.env.NODE_ENV = prev;
});

test('requireSecret: u razvoju vraća stabilnu efemernu tajnu', () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.DEV_EPHEMERAL_SECRET;
  const a = requireSecret('DEV_EPHEMERAL_SECRET');
  const b = requireSecret('DEV_EPHEMERAL_SECRET');
  assert.ok(a.length >= 32);
  assert.equal(a, b, 'efemerna tajna mora biti keširana unutar procesa');
  process.env.NODE_ENV = prev;
});

/* ------------------------------------------------------------------ */
/* 2. Sanitizacija (XSS)                                               */
/* ------------------------------------------------------------------ */

test('sanitizePlainText uklanja script blok i tagove', () => {
  const out = sanitizePlainText('<script>alert(1)</script>Zdravo<b>svet</b>');
  assert.equal(out, 'Zdravosvet');
  assert.ok(!out.includes('<'));
  assert.ok(!out.toLowerCase().includes('script'));
});

test('sanitizeRichHtml uklanja event handlere i javascript:', () => {
  const out = sanitizeRichHtml('<img src=x onerror=alert(1)>tekst<a href="javascript:alert(1)">x</a>');
  assert.ok(!out.toLowerCase().includes('onerror'));
  assert.ok(!out.toLowerCase().includes('javascript:'));
});

/* ------------------------------------------------------------------ */
/* 3. Validacija (Zod) — politika lozinke                              */
/* ------------------------------------------------------------------ */

test('ResetPasswordSchema: prihvata jaku lozinku i token', () => {
  const res = ResetPasswordSchema.safeParse({ token: 'x'.repeat(20), newPassword: 'Abcdefg1' });
  assert.equal(res.success, true);
});

test('ResetPasswordSchema: odbija slabu lozinku', () => {
  const res = ResetPasswordSchema.safeParse({ token: 'x'.repeat(20), newPassword: 'abcdefgh' });
  assert.equal(res.success, false);
});

test('ResetPasswordSchema: odbija prekratak token', () => {
  const res = ResetPasswordSchema.safeParse({ token: 'kratko', newPassword: 'Abcdefg1' });
  assert.equal(res.success, false);
});

test('ResetPasswordSchema: .strict() odbija dodatna polja', () => {
  const res = ResetPasswordSchema.safeParse({ token: 'x'.repeat(20), newPassword: 'Abcdefg1', evil: 1 });
  assert.equal(res.success, false);
});

test('RegisterSchema: zahteva prihvatanje uslova i jaku lozinku', () => {
  const ok = RegisterSchema.safeParse({
    email: 'Test@Example.com',
    password: 'Abcdefg1!',
    termsAccepted: true,
  });
  assert.equal(ok.success, true);

  const noTerms = RegisterSchema.safeParse({
    email: 'a@b.com',
    password: 'Abcdefg1!',
    termsAccepted: false,
  });
  assert.equal(noTerms.success, false);
});

/* ------------------------------------------------------------------ */
/* 4. JWT tokeni                                                       */
/* ------------------------------------------------------------------ */

const payload = { userId: 'user-123', email: 'gamer@nexus.gg', role: 'admin', name: 'Gamer' };

test('access token: roundtrip čuva podatke', () => {
  const token = TokenService.generateAccessToken(payload);
  const decoded = TokenService.verifyAccessToken(token);
  assert.ok(decoded);
  assert.equal(decoded!.sub, 'user-123');
  assert.equal(decoded!.email, 'gamer@nexus.gg');
  assert.equal(decoded!.role, 'admin');
});

test('access token: izmenjen potpis se odbija', () => {
  const token = TokenService.generateAccessToken(payload);
  const tampered = token.slice(0, -2) + (token.endsWith('a') ? 'bb' : 'aa');
  assert.equal(TokenService.verifyAccessToken(tampered), null);
});

test('token tipovi se ne mešaju (refresh != access)', () => {
  const access = TokenService.generateAccessToken(payload);
  assert.equal(TokenService.verifyRefreshToken(access), null);
});

/* ------------------------------------------------------------------ */
/* 5. Reset token — verifikacija i single-use                          */
/* ------------------------------------------------------------------ */

function craftResetToken(overrides: Record<string, unknown> = {}, opts: jwt.SignOptions = { expiresIn: '15m' }) {
  return jwt.sign(
    { email: 'reset@nexus.gg', jti: 'jti-' + Math.random().toString(36).slice(2), type: 'password_reset', ...overrides },
    process.env.JWT_RESET_SECRET as string,
    opts
  );
}

test('verifyPasswordResetToken: prihvata validan reset token', () => {
  const token = craftResetToken();
  const res = TokenService.verifyPasswordResetToken(token);
  assert.ok(res);
  assert.equal(res!.email, 'reset@nexus.gg');
});

test('verifyPasswordResetToken: odbija pogrešan tip i pogrešan potpis', () => {
  const wrongType = craftResetToken({ type: 'access' });
  assert.equal(TokenService.verifyPasswordResetToken(wrongType), null);

  const wrongSecret = jwt.sign(
    { email: 'x@y.com', jti: 'z', type: 'password_reset' },
    'nesto-pogresno-tajno-1234567890-abcdefghij',
    { expiresIn: '15m' }
  );
  assert.equal(TokenService.verifyPasswordResetToken(wrongSecret), null);
});

test('verifyPasswordResetToken: odbija istekao token', () => {
  const expired = craftResetToken({}, { expiresIn: '-1s' });
  assert.equal(TokenService.verifyPasswordResetToken(expired), null);
});

test('consumePasswordResetToken: token je single-use', { timeout: 20000 }, async () => {
  const token = craftResetToken();
  const first = await TokenService.consumePasswordResetToken(token);
  assert.ok(first, 'prva upotreba mora uspeti');
  assert.equal(first!.email, 'reset@nexus.gg');

  const second = await TokenService.consumePasswordResetToken(token);
  assert.equal(second, null, 'druga upotreba istog tokena mora biti odbijena');
});

/* ------------------------------------------------------------------ */
/* 6. Heširanje lozinki                                                */
/* ------------------------------------------------------------------ */

test('PasswordService: hešira i verifikuje lozinku', async () => {
  const hash = await PasswordService.hashPassword('Abcdefg1!');
  assert.ok(hash.startsWith('$2'));
  assert.equal(await PasswordService.verifyPassword('Abcdefg1!', hash), true);
  assert.equal(await PasswordService.verifyPassword('PogresnaLozinka1', hash), false);
});
