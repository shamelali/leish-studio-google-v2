/**
 * Phase 0 regression suite — booking funnel & auth'd writes.
 *
 * Guards against the four shipped defects:
 *   0.1 booking date regex corruption  (server.ts bookingSchema)
 *   0.3 markdown-fence stripping        (stripJsonFences)
 *   0.4 malformed ID template literals  (book-/user-/rev- ids)
 *   auth  401s on authenticated mutations (PATCH status)
 *
 * Runs against an isolated temp store (LEISH_DB_PATH) so real dev data
 * in db_store.json is never touched.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';

const TEST_DB = '/tmp/opencode/leish-test-db.json';

// Must be set before server.ts (and its DataStore singleton) is imported.
process.env.LEISH_DB_PATH = TEST_DB;
fs.rmSync(TEST_DB, { force: true });

let app: any;
let stripJsonFences: (text: string) => string;
let providerToken = '';
let bookingId = '';

beforeAll(async () => {
  const mod = await import('./server.ts');
  app = mod.default;
  stripJsonFences = mod.stripJsonFences;

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'director@atelierleish.com', password: 'password123' });
  expect(login.status).toBe(200);
  providerToken = login.body.token;
  expect(providerToken).toBeTruthy();
});

afterAll(() => {
  fs.rmSync(TEST_DB, { force: true });
});

const validBooking = () => ({
  salonId: 'salon-1',
  serviceId: 'serv-1-1',
  staffId: 'staff-1-1',
  date: '2026-10-20',
  time: '10:30 AM',
  clientName: 'Regression Test',
  clientEmail: 'regression@leish.test',
  clientPhone: '+60123456789',
  notes: 'Phase 0 regression test',
});

describe('GET /api/salons', () => {
  it('returns the seeded catalog', async () => {
    const res = await request(app).get('/api/salons');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((s: any) => s.id === 'salon-1')).toBe(true);
  });
});

describe('POST /api/bookings (defect 0.1)', () => {
  it('creates a booking with a YYYY-MM-DD date', async () => {
    const res = await request(app).post('/api/bookings').send(validBooking());

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
    expect(res.body.date).toBe('2026-10-20');
    expect(res.body.salonName).toBeTruthy();
    bookingId = res.body.id;
  });

  it('generates a well-formed id (defect 0.4)', async () => {
    expect(bookingId).toMatch(/^book-\d+-[a-z0-9]{6}$/);
    // The corrupted literal appended this literal text to every id:
    expect(bookingId).not.toContain('toString(36)');
    expect(bookingId).not.toContain('slice(2, 8)}');
  });

  it('rejects a malformed date with a 400', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ ...validBooking(), date: 'not-a-date' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/YYYY-MM-DD/);
  });

  it('rejects a non-date suffix (the exact 0.1 regression)', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ ...validBooking(), date: '2026-10-20RM' });

    expect(res.status).toBe(400);
  });

  it('404s for an unknown salon', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ ...validBooking(), salonId: 'salon-does-not-exist' });

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/bookings/:id/status (auth)', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app)
      .patch(`/api/bookings/${bookingId}/status`)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(401);
  });

  it('rejects a malformed status with 400', async () => {
    const res = await request(app)
      .patch(`/api/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ status: 'not-a-status' });

    expect(res.status).toBe(400);
  });

  it('lets a signed-in provider confirm a booking', async () => {
    const res = await request(app)
      .patch(`/api/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
  });

  it('persists the transition for later reads', async () => {
    const res = await request(app).get(
      `/api/bookings?salonId=salon-1`
    );
    expect(res.status).toBe(200);
    const found = res.body.find((b: any) => b.id === bookingId);
    expect(found).toBeTruthy();
    expect(found.status).toBe('confirmed');
  });
});

describe('stripJsonFences (defect 0.3)', () => {
  const look = '{"lookName":"Noir Ember"}';

  it('unwraps a ```json fence', () => {
    expect(stripJsonFences('```json\n' + look + '\n```')).toBe(look);
  });

  it('unwraps a bare ``` fence', () => {
    expect(stripJsonFences('```\n' + look + '\n```')).toBe(look);
  });

  it('leaves unfenced JSON untouched', () => {
    expect(stripJsonFences(look)).toBe(look);
  });

  it('parses after stripping (the original failure mode)', () => {
    const parsed = JSON.parse(stripJsonFences('```json' + look + '```'));
    expect(parsed.lookName).toBe('Noir Ember');
  });
});

describe('auth round-trip', () => {
  it('registers a user and resolves the session token', async () => {
    const email = `phase0-${Date.now()}@leish.test`;

    const reg = await request(app).post('/api/auth/register').send({
      name: 'Phase Zero',
      email,
      password: 'Sup3rSecret!',
      role: 'client',
    });
    expect(reg.status).toBe(201);
    expect(reg.body.token).toBeTruthy();
    // defect 0.4: user ids must not carry literal template text
    expect(reg.body.user.id).toMatch(/^user-\d+-[a-z0-9]{6}$/);

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${reg.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(email);
    expect(me.body.password).toBeUndefined();
  });

  it('rejects a bad password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'director@atelierleish.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
  });
});
