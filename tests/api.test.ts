import './setup';
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import type { Express } from 'express';

import { createApp } from '../src/server/app';
import { TokenService } from '../src/server/auth/tokenService';

let app: Express;

before(async () => {
  app = await createApp();
});

function bearer(role: 'admin' | 'user'): string {
  const token = TokenService.generateAccessToken({
    userId: role === 'admin' ? 'admin-1' : 'user-1',
    email: `${role}@nexus.gg`,
    role,
    name: role,
  });
  return `Bearer ${token}`;
}

/* ------------------------------------------------------------------ */
/* CMS API — admin gate (RBAC)                                         */
/* ------------------------------------------------------------------ */

test('CMS: POST /posts bez tokena -> 401', async () => {
  const res = await request(app).post('/api/cms/posts').send({ title: 'X', slug: 'x' });
  assert.equal(res.status, 401);
});

test('CMS: POST /posts kao običan korisnik -> 403', async () => {
  const res = await request(app)
    .post('/api/cms/posts')
    .set('Authorization', bearer('user'))
    .send({ title: 'X', slug: 'x' });
  assert.equal(res.status, 403);
});

test('CMS: GET /posts bez tokena -> 401', async () => {
  const res = await request(app).get('/api/cms/posts');
  assert.equal(res.status, 401);
});

test('CMS: GET /posts kao običan korisnik -> 403', async () => {
  const res = await request(app).get('/api/cms/posts').set('Authorization', bearer('user'));
  assert.equal(res.status, 403);
});

test('CMS: POST /posts kao admin prolazi auth gate (nije 401/403)', async () => {
  const res = await request(app)
    .post('/api/cms/posts')
    .set('Authorization', bearer('admin'))
    .send({ title: 'X', slug: 'x' });
  assert.notEqual(res.status, 401);
  assert.notEqual(res.status, 403);
});

/* ------------------------------------------------------------------ */
/* Auth — validacija i anti-enumeracija                                */
/* ------------------------------------------------------------------ */

test('AUTH: reset-password sa slabom lozinkom -> 400', async () => {
  const res = await request(app)
    .post('/api/auth/reset-password')
    .send({ token: 'x'.repeat(20), newPassword: 'slaba' });
  assert.equal(res.status, 400);
});

test('AUTH: reset-password sa prekratkim tokenom -> 400', async () => {
  const res = await request(app)
    .post('/api/auth/reset-password')
    .send({ token: 'kratko', newPassword: 'Abcdefg1' });
  assert.equal(res.status, 400);
});

test('AUTH: forgot-password vraća konstantan odgovor (bez enumeracije)', async () => {
  const res = await request(app)
    .post('/api/auth/forgot-password')
    .send({ email: 'nepostoji@nexus.gg' });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.match(String(res.body.message), /Ukoliko nalog/);
});

test('AUTH: security-audit bez sesije -> 401', async () => {
  const res = await request(app).get('/api/auth/security-audit');
  assert.equal(res.status, 401);
});

/* ------------------------------------------------------------------ */
/* CORS whitelist                                                      */
/* ------------------------------------------------------------------ */

test('CORS: nedozvoljeni origin ne dobija Access-Control-Allow-Origin', async () => {
  const res = await request(app).get('/api/auth/me').set('Origin', 'https://evil.example');
  assert.notEqual(res.headers['access-control-allow-origin'], 'https://evil.example');
});

test('CORS: dozvoljeni origin dobija Access-Control-Allow-Origin', async () => {
  const res = await request(app).get('/api/auth/me').set('Origin', 'http://localhost:3000');
  assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:3000');
});

/* ------------------------------------------------------------------ */
/* Newsletter API (validacija)                                         */
/* ------------------------------------------------------------------ */

test('NEWSLETTER: neispravan email -> 400', async () => {
  const res = await request(app).post('/api/newsletter').send({ email: 'nije-email' });
  assert.equal(res.status, 400);
});

test('NEWSLETTER: prazan email -> 400', async () => {
  const res = await request(app).post('/api/newsletter').send({});
  assert.equal(res.status, 400);
});
