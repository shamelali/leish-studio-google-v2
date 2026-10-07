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
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import bcrypt from 'bcrypt';

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

  it('persists the transition for later reads (authenticated, scoped)', async () => {
    const res = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${providerToken}`);
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

describe('legacy plaintext password migration', () => {
  it('re-hashes plaintext rows found in a pre-bcrypt store', async () => {
    const legacyDb = '/tmp/opencode/leish-legacy-db.json';
    fs.rmSync(legacyDb, { force: true });

    // Build a store that mimics the real db_store.json: valid makeup catalog,
    // but users written BEFORE bcrypt was introduced (plaintext passwords).
    const base = JSON.parse(fs.readFileSync(TEST_DB, 'utf-8'));
    base.users = [{
      id: 'user-legacy-1',
      name: 'Legacy User',
      email: 'legacy@leish.test',
      password: 'password123', // plaintext — the actual defect
      role: 'client',
      createdAt: '2026-01-01T00:00:00.000Z',
    }];
    fs.writeFileSync(legacyDb, JSON.stringify(base, null, 2));

    vi.resetModules();
    const prevPath = process.env.LEISH_DB_PATH;
    process.env.LEISH_DB_PATH = legacyDb;
    try {
      const { store } = await import('./server/data-store.ts');
      const user = store.getUserByEmail('legacy@leish.test');

      expect(user).toBeTruthy();
      // must now be a bcrypt hash, and must verify against the original secret
      expect(user!.password).toMatch(/^\$2[aby]\$\d{2}\$/);
      expect(user!.password).not.toBe('password123');
      expect(bcrypt.compareSync('password123', user!.password)).toBe(true);

      // persisted, so the fix survives a restart
      const reloaded = JSON.parse(fs.readFileSync(legacyDb, 'utf-8'));
      expect(reloaded.users[0].password).toMatch(/^\$2[aby]\$\d{2}\$/);
    } finally {
      process.env.LEISH_DB_PATH = prevPath;
      vi.resetModules();
      fs.rmSync(legacyDb, { force: true });
    }
  });
});

/**
 * Phase 1 — TR-7 authorization matrix.
 *
 * canUpdateSalon / canModifyBooking / canReview enforced in middleware:
 *   provider → only their own salon's listings, services and bookings
 *   client   → only bookings made with their own email; cancel-only status
 *   review   → only with a completed booking at that studio; name from account
 * Reads are authenticated: unauthenticated enumeration must 401.
 */
describe('TR-7 authorization matrix (Phase 1)', () => {
  let clientToken = '';         // shamelali@gmail.com — client
  let otherProviderToken = '';  // rosewood@beauty.com  — provider of salon-2
  let nosalonProviderToken = '';
  let clientBookingId = '';     // shamelali @ salon-1 (to cancel)
  let reviewBookingId = '';     // shamelali @ salon-1 (to complete, then review)
  let otherSalonBookingId = ''; // guest  @ salon-2 (cross-tenant probe)
  let addedServiceId = '';

  const login = async (email: string) => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'password123' });
    expect(res.status).toBe(200);
    return res.body.token;
  };

  beforeAll(async () => {
    clientToken = await login('shamelali@gmail.com');
    otherProviderToken = await login('rosewood@beauty.com');

    const book = (overrides: any) =>
      request(app).post('/api/bookings').send({ ...validBooking(), ...overrides });

    const other = await book({
      clientEmail: 'crosstenant@leish.test',
      clientName: 'Cross Tenant',
      salonId: 'salon-2', serviceId: 'serv-2-1', staffId: 'staff-2-1',
    });
    expect(other.status).toBe(201);
    otherSalonBookingId = other.body.id;

    const mine = await book({ clientEmail: 'shamelali@gmail.com', clientName: 'Shamel Ali' });
    expect(mine.status).toBe(201);
    clientBookingId = mine.body.id;

    const review = await book({ clientEmail: 'shamelali@gmail.com', clientName: 'Shamel Ali' });
    expect(review.status).toBe(201);
    reviewBookingId = review.body.id;
  });

  describe('booking reads are authenticated and scoped', () => {
    it('401s unauthenticated enumeration', async () => {
      const res = await request(app).get('/api/bookings');
      expect(res.status).toBe(401);
    });

    it('scopes a client to their own email (query params ignored)', async () => {
      const res = await request(app)
        .get('/api/bookings?email=crosstenant@leish.test')
        .set('Authorization', `Bearer ${clientToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      for (const b of res.body) {
        expect(b.clientEmail.toLowerCase()).toBe('shamelali@gmail.com');
      }
      const ids = res.body.map((b: any) => b.id);
      expect(ids).toContain(clientBookingId);
      expect(ids).not.toContain(otherSalonBookingId);
    });

    it('scopes a provider to their own salon', async () => {
      const res = await request(app)
        .get('/api/bookings?salonId=salon-2')
        .set('Authorization', `Bearer ${providerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      for (const b of res.body) expect(b.salonId).toBe('salon-1');
      const ids = res.body.map((b: any) => b.id);
      expect(ids).not.toContain(otherSalonBookingId);
    });

    it('shows the foreign studio only to its own provider', async () => {
      const res = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${otherProviderToken}`);
      expect(res.status).toBe(200);
      const ids = res.body.map((b: any) => b.id);
      expect(ids).toContain(otherSalonBookingId);
      expect(ids).not.toContain(clientBookingId);
    });

    it('403s a provider account with no linked salon', async () => {
      const reg = await request(app).post('/api/auth/register').send({
        name: 'Unlinked Provider',
        email: `nosalon-${Date.now()}@leish.test`,
        password: 'Sup3rSecret!',
        role: 'provider',
      });
      expect(reg.status).toBe(201);
      nosalonProviderToken = reg.body.token;

      const res = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${nosalonProviderToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('salon writes are owner-only', () => {
    it('401s unauthenticated updates', async () => {
      const res = await request(app)
        .put('/api/salons/salon-1')
        .send({ tagline: 'nope' });
      expect(res.status).toBe(401);
    });

    it('403s a client editing a salon', async () => {
      const res = await request(app)
        .put('/api/salons/salon-1')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ tagline: 'client takeover' });
      expect(res.status).toBe(403);
    });

    it('403s a foreign provider (cross-tenant)', async () => {
      const res = await request(app)
        .put('/api/salons/salon-1')
        .set('Authorization', `Bearer ${otherProviderToken}`)
        .send({ tagline: 'tenant takeover' });
      expect(res.status).toBe(403);
    });

    it('lets the owner update but strips mass-assigned fields', async () => {
      const res = await request(app)
        .put('/api/salons/salon-1')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ tagline: 'Owner updated this', rating: 9.9, reviewCount: 999, id: 'salon-hack' });

      expect(res.status).toBe(200);
      expect(res.body.tagline).toBe('Owner updated this');
      expect(res.body.id).toBe('salon-1');
      expect(res.body.rating).toBeLessThan(6);   // rating is not client-writable
      expect(res.body.reviewCount).toBeLessThan(999);
    });

    it('403s a client adding services', async () => {
      const res = await request(app)
        .post('/api/salons/salon-1/services')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ name: 'Sneaky Service', price: 1, duration: 5 });
      expect(res.status).toBe(403);
    });

    it('400s an invalid service payload from the owner', async () => {
      const res = await request(app)
        .post('/api/salons/salon-1/services')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ name: '', price: 'NaN', duration: 0 });
      expect(res.status).toBe(400);
    });

    it('lets the owner add a service', async () => {
      const res = await request(app)
        .post('/api/salons/salon-1/services')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ name: 'Authz Matrix Blend', price: 145, duration: 60 });

      expect(res.status).toBe(201);
      const svc = res.body.services.find((s: any) => s.name === 'Authz Matrix Blend');
      expect(svc).toBeTruthy();
      expect(svc.price).toBe(145);
      addedServiceId = svc.id;
    });

    it('403s a client deleting services, 404s an unknown service', async () => {
      const forbidden = await request(app)
        .delete(`/api/salons/salon-1/services/${addedServiceId}`)
        .set('Authorization', `Bearer ${clientToken}`);
      expect(forbidden.status).toBe(403);

      const unknown = await request(app)
        .delete('/api/salons/salon-1/services/serv-does-not-exist')
        .set('Authorization', `Bearer ${providerToken}`);
      expect(unknown.status).toBe(404);

      const removed = await request(app)
        .delete(`/api/salons/salon-1/services/${addedServiceId}`)
        .set('Authorization', `Bearer ${providerToken}`);
      expect(removed.status).toBe(200);
      expect(removed.body.services.some((s: any) => s.id === addedServiceId)).toBe(false);
    });
  });

  describe('booking status transitions', () => {
    it('404s an unknown booking id', async () => {
      const res = await request(app)
        .patch('/api/bookings/book-none/status')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'confirmed' });
      expect(res.status).toBe(404);
    });

    it('403s a foreign provider touching another studio\'s booking', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${reviewBookingId}/status`)
        .set('Authorization', `Bearer ${otherProviderToken}`)
        .send({ status: 'confirmed' });
      expect(res.status).toBe(403);
    });

    it('lets the owning client cancel their own booking', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${clientBookingId}/status`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ status: 'cancelled' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');
    });

    it('blocks a client confirming (or otherwise moving) their booking', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${reviewBookingId}/status`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ status: 'confirmed' });
      expect(res.status).toBe(403);
      expect(String(res.body.error)).toMatch(/cancel/i);
    });

    it('lets the owning provider complete a booking (review setup)', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${reviewBookingId}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'completed' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
    });
  });

  describe('review gating (canReview)', () => {
    const reviewBody = (overrides: any = {}) => ({
      salonId: 'salon-1',
      clientName: 'ZZZ Spoofed Name',
      rating: 5,
      text: 'Authz matrix review test.',
      ...overrides,
    });

    it('401s unauthenticated reviews', async () => {
      const res = await request(app).post('/api/reviews').send(reviewBody());
      expect(res.status).toBe(401);
    });

    it('403s a client with no completed booking there', async () => {
      const reg = await request(app).post('/api/auth/register').send({
        name: 'Never Booked',
        email: `nobook-${Date.now()}@leish.test`,
        password: 'Sup3rSecret!',
        role: 'client',
      });
      expect(reg.status).toBe(201);

      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${reg.body.token}`)
        .send(reviewBody());
      expect(res.status).toBe(403);
      expect(String(res.body.error)).toMatch(/completed booking/i);
    });

    it('403s a completed-booking client reviewing a different studio', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(reviewBody({ salonId: 'salon-2' }));
      expect(res.status).toBe(403);
    });

    it('accepts a verified review and takes the name from the account', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(reviewBody());
      expect(res.status).toBe(201);
      expect(res.body.clientName).toBe('Shamel Ali'); // never the spoofed body
      expect(res.body.rating).toBe(5);
    });
  });

  it('removed GET /api/auth/demo-accounts (it listed every user\'s PII)', async () => {
    const res = await request(app).get('/api/auth/demo-accounts');
    expect(res.status).toBe(404);
    expect(Array.isArray(res.body)).toBe(false);
  });
});
