import express from 'express';
import { store } from './server/data-store.ts';
import { GoogleGenAI, Type, GenerateVideosOperation } from '@google/genai';
import type { Booking, Review, Salon, Service, User } from './src/types.ts';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

/**
 * Strips markdown code fences (```json or ```) that models sometimes wrap
 * around JSON payloads. Exported so the regression suite can pin the behaviour.
 */
export function stripJsonFences(text: string): string {
  let cleanText = text.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleanText;
}

function createApp() {
  const app = express();

  // Behind the Vercel proxy, trust the first X-Forwarded-For hop so
  // req.ip (and express-rate-limit) see the real client address.
  if (process.env.VERCEL) {
    app.set('trust proxy', 1);
  }

  // Security headers. CSP is enforced in production only — dev needs Vite's
  // HMR/inline client. Directives allow Google Fonts, Google Maps (loaded by
  // @vis.gl/react-google-maps), Firebase/Google sign-in popups and CDN imagery.
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        formAction: ["'self'"],
        scriptSrc: ["'self'", 'https://maps.googleapis.com', 'https://maps.gstatic.com', 'https://www.gstatic.com'],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://*.googleapis.com', 'https://*.googleusercontent.com', 'https://*.gstatic.com', 'https://*.google.com'],
        frameSrc: ["'self'", 'https://accounts.google.com', 'https://*.googleapis.com'],
        workerSrc: ["'self'", 'blob:'],
        upgradeInsecureRequests: [],
      },
    } : false,
  }));

  // Rate limiting — separate buckets so an AI burst cannot starve login (TR-8).
  // LEISH_DISABLE_RATE_LIMIT=1 skips all buckets; the test suite sets it so the
  // authz matrix can log in repeatedly. See server.ratelimit.test.ts for the
  // bucket behaviour itself.
  const rateLimitOff = process.env.LEISH_DISABLE_RATE_LIMIT === '1';
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 requests per windowMs for auth routes
    skip: () => rateLimitOff,
    message: { error: 'Too many attempts, please try again later.' }
  });
  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    skip: () => rateLimitOff,
    message: { error: 'AI requests are rate-limited right now. Please try again shortly.' }
  });
  const readLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    skip: (req) => rateLimitOff || req.path.startsWith('/auth') || req.path.startsWith('/gemini'),
    message: { error: 'Too many requests, please try again later.' }
  });
  app.use('/api/auth/', authLimiter);
  app.use('/api/gemini/', aiLimiter);
  app.use('/api/', readLimiter);

  // JSON body size limit
  app.use(express.json({ limit: '100kb' }));

  // Helper to strip sensitive data
  const sanitizeUser = (u: any): User => {
    const { password, ...safeUser } = u;
    return safeUser as User;
  };

  // JWT configuration — TR-9: production must never boot on a default secret.
  const JWT_SECRET = (() => {
    const secret = process.env.JWT_SECRET;
    if (secret && secret.trim()) return secret.trim();
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[leish] JWT_SECRET is not set. Refusing to boot in production with a default signing secret (TR-9).'
      );
    }
    return 'leish-dev-secret-change-in-production';
  })();
  const JWT_EXPIRES_IN = '7d';

  // Auth middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const token = authHeader.replace('Bearer ', '').trim();
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const user = store.getUserById(decoded.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found.' });
      }
      req.user = user;
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
  };

  // --- AUTHORIZATION (TR-7) — enforced in middleware, not per-handler ---
  const canUpdateSalon = (user: User, salonId: string): boolean =>
    user.role === 'admin' || (user.role === 'provider' && user.salonId === salonId);

  const canModifyBooking = (user: User, booking: Booking): boolean =>
    user.role === 'admin' ||
    booking.clientEmail.toLowerCase() === user.email.toLowerCase() ||
    (user.role === 'provider' && !!user.salonId && booking.salonId === user.salonId);

  const canReview = (user: User, salonId: string): boolean =>
    store.getBookings().some(b =>
      b.salonId === salonId &&
      b.clientEmail.toLowerCase() === user.email.toLowerCase() &&
      b.status === 'completed'
    );

  /** Requires authenticateToken first. 403 unless the caller manages :id. */
  const requireSalonOwner = (req: any, res: any, next: any) => {
    if (!canUpdateSalon(req.user, req.params.id)) {
      return res.status(403).json({ error: 'You do not have permission to manage this salon.' });
    }
    next();
  };

  /** Requires authenticateToken first. Loads the booking onto req.booking and
   *  403s unless the caller may modify it (provider owns salon / client owns booking). */
  const requireBookingAccess = (req: any, res: any, next: any) => {
    const booking = store.getBooking(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (!canModifyBooking(req.user, booking)) {
      return res.status(403).json({ error: 'You do not have permission to change this booking.' });
    }
    req.booking = booking;
    next();
  };

  // Fields a provider may write on their own salon. rating/reviewCount/id are
  // deliberately excluded so listings cannot self-award ratings (mass-assignment).
  const SALON_EDITABLE_FIELDS = [
    'name', 'tagline', 'description', 'location', 'address', 'category',
    'workingHours', 'services', 'staff', 'image', 'gallery', 'featured',
    'artistTitle', 'yearsExperience', 'kitBrands', 'travelRadius',
    'instagramHandle', 'startingPrice',
  ] as const;

  const pickSalonUpdates = (body: any): Partial<Salon> => {
    const updates: Record<string, unknown> = {};
    for (const key of SALON_EDITABLE_FIELDS) {
      if (body && Object.prototype.hasOwnProperty.call(body, key)) {
        updates[key] = body[key];
      }
    }
    return updates as Partial<Salon>;
  };

  // Validation schemas
  const registerSchema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    password: z.string().min(6).max(100),
    role: z.enum(['client', 'provider']).optional(),
    phone: z.string().optional(),
    salonId: z.string().optional(),
    bio: z.string().max(500).optional(),
  });

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  const bookingSchema = z.object({
    salonId: z.string().min(1),
    serviceId: z.string().min(1),
    staffId: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    time: z.string().min(1),
    clientName: z.string().min(1).max(100),
    clientEmail: z.string().email(),
    clientPhone: z.string().optional(),
    notes: z.string().max(1000).optional(),
    isLocationEvent: z.boolean().optional(),
    eventVenue: z.string().max(200).optional(),
    travelSurcharge: z.number().optional(),
    attachedMoodboard: z.any().optional(),
  });

  const reviewSchema = z.object({
    salonId: z.string().min(1),
    clientName: z.string().min(1).max(100),
    rating: z.number().int().min(1).max(5),
    text: z.string().min(1).max(2000),
  });

  const updateBookingStatusSchema = z.object({
    status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']),
  });

  const updateProfileSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).max(100).optional(),
    phone: z.string().optional(),
    bio: z.string().max(500).optional(),
    avatar: z.string().url().optional(),
    salonId: z.string().optional(),
  });

  // --- AUTHENTICATION API ROUTES ---
  // API Route: Register new user (Sign Up)
  app.post('/api/auth/register', (req, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }

      const { name, email, password, role, phone, salonId, bio } = parsed.data;

      const normalizedEmail = email.trim().toLowerCase();
      const existing = store.getUserByEmail(normalizedEmail);
      if (existing) {
        return res.status(400).json({ error: 'An account with this email already exists. Please sign in instead.' });
      }

      const defaultAvatar = role === 'provider'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
        : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200';
      
      const newUser = store.createUser({
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: name.trim(),
        email: normalizedEmail,
        password,
        role: role === 'provider' ? 'provider' : 'client',
        phone: phone ? phone.trim() : undefined,
        salonId: salonId || undefined,
        bio: bio ? bio.trim() : (role === 'provider' ? 'Boutique beauty specialist at Leish! Aesthetic Marketplace.' : 'Beauty enthusiast exploring curated salon treatments.'),
        avatar: defaultAvatar,
        createdAt: new Date().toISOString()
      });

      const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      res.status(201).json({
        user: sanitizeUser(newUser),
        token,
        message: 'Account successfully registered!'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Registration failed' });
    }
  });

  // API Route: Sign In (Login)
  app.post('/api/auth/login', (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }

      const { email, password } = parsed.data;
      const normalizedEmail = email.trim().toLowerCase();
      const user = store.getUserByEmail(normalizedEmail);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const passwordValid = bcrypt.compareSync(password, user.password);
      if (!passwordValid) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      res.json({
        user: sanitizeUser(user),
        token,
        message: `Welcome back, ${user.name}!`
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Sign in failed' });
    }
  });

  // API Route: Get current user info
  app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    try {
      res.json(sanitizeUser(req.user));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Update user profile
  app.put('/api/auth/profile', authenticateToken, (req: any, res) => {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }

      const { id, name, phone, bio, avatar, salonId } = parsed.data;

      // Users can only update their own profile
      if (req.user.id !== id) {
        return res.status(403).json({ error: 'You can only update your own profile.' });
      }

      const updated = store.updateUser(id, {
        ...(name && { name: name.trim() }),
        ...(phone !== undefined && { phone }),
        ...(bio !== undefined && { bio }),
        ...(avatar && { avatar }),
        ...(salonId !== undefined && { salonId })
      });

      res.json({
        user: sanitizeUser(updated),
        message: 'Profile updated successfully!'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Get all salons
  app.get('/api/salons', (req, res) => {
    try {
      const salons = store.getSalons();
      res.json(salons);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Get single salon
  app.get('/api/salons/:id', (req, res) => {
    try {
      const salon = store.getSalon(req.params.id);
      if (!salon) {
        return res.status(404).json({ error: 'Salon not found' });
      }
      res.json(salon);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Update salon (owner-only, field allowlist)
  app.put('/api/salons/:id', authenticateToken, requireSalonOwner, (req: any, res) => {
    try {
      const updated = store.updateSalon(req.params.id, pickSalonUpdates(req.body));
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Add service to salon (owner-only)
  app.post('/api/salons/:id/services', authenticateToken, requireSalonOwner, (req: any, res) => {
    try {
      const salon = store.getSalon(req.params.id);
      if (!salon) {
        return res.status(404).json({ error: 'Salon not found' });
      }
      const price = Number(req.body.price);
      const duration = Number(req.body.duration);
      if (!req.body.name || !String(req.body.name).trim() ||
          !Number.isFinite(price) || price < 0 ||
          !Number.isFinite(duration) || duration <= 0) {
        return res.status(400).json({ error: 'Service needs a name, a non-negative price and a positive duration.' });
      }
      const newService: Service = {
        id: `serv-${req.params.id}-${Date.now()}`,
        name: String(req.body.name).trim().slice(0, 120),
        price,
        duration,
        description: req.body.description ? String(req.body.description).slice(0, 500) : '',
        category: req.body.category || salon.category
      };
      const updatedServices = [...salon.services, newService];
      const updated = store.updateSalon(req.params.id, { services: updatedServices });
      res.status(201).json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Delete service from salon (owner-only)
  app.delete('/api/salons/:id/services/:serviceId', authenticateToken, requireSalonOwner, (req: any, res) => {
    try {
      const salon = store.getSalon(req.params.id);
      if (!salon) {
        return res.status(404).json({ error: 'Salon not found' });
      }
      if (!salon.services.some(s => s.id === req.params.serviceId)) {
        return res.status(404).json({ error: 'Service not found' });
      }
      const updatedServices = salon.services.filter(s => s.id !== req.params.serviceId);
      const updated = store.updateSalon(req.params.id, { services: updatedServices });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Get bookings — authenticated and scoped by identity (1.2):
  //   client    → only bookings made with their own email
  //   provider  → only bookings for the salon they manage
  //   admin     → may filter freely
  app.get('/api/bookings', authenticateToken, (req: any, res) => {
    try {
      let bookings = store.getBookings();

      if (req.user.role === 'admin') {
        const email = req.query.email as string | undefined;
        const salonId = req.query.salonId as string | undefined;
        if (email) {
          bookings = bookings.filter(b => b.clientEmail.toLowerCase() === email.toLowerCase());
        }
        if (salonId) {
          bookings = bookings.filter(b => b.salonId === salonId);
        }
      } else if (req.user.role === 'provider') {
        if (!req.user.salonId) {
          return res.status(403).json({ error: 'No salon is linked to this account.' });
        }
        bookings = bookings.filter(b => b.salonId === req.user.salonId);
      } else {
        const email = req.user.email.toLowerCase();
        bookings = bookings.filter(b => b.clientEmail.toLowerCase() === email);
      }

      res.json(bookings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Create booking
  app.post('/api/bookings', (req, res) => {
    try {
      const parsed = bookingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }

      const {
        salonId,
        serviceId,
        staffId,
        date,
        time,
        clientName,
        clientEmail,
        clientPhone,
        notes,
        isLocationEvent,
        eventVenue,
        travelSurcharge,
        attachedMoodboard
      } = parsed.data;

      const salon = store.getSalon(salonId);
      if (!salon) {
        return res.status(404).json({ error: 'Salon not found' });
      }

      const service = salon.services.find(s => s.id === serviceId);
      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }

      const staff = salon.staff.find(st => st.id === staffId);
      if (!staff) {
        return res.status(404).json({ error: 'Staff member not found' });
      }

      const booking: Booking = {
        id: `book-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        salonId,
        salonName: salon.name,
        salonAddress: salon.address,
        serviceId,
        serviceName: service.name,
        servicePrice: service.price,
        serviceDuration: service.duration,
        staffId,
        staffName: staff.name,
        date,
        time,
        clientName,
        clientEmail,
        clientPhone,
        notes,
        status: 'pending',
        createdAt: new Date().toISOString(),
        isLocationEvent: Boolean(isLocationEvent),
        eventVenue: eventVenue || undefined,
        travelSurcharge: travelSurcharge ? Number(travelSurcharge) : undefined,
        attachedMoodboard: attachedMoodboard || undefined
      };

      const created = store.createBooking(booking);
      res.status(201).json(created);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Update booking status — TR-7:
  //   provider/admin may move a booking through any status;
  //   the client who owns the booking may only cancel it.
  app.patch('/api/bookings/:id/status', authenticateToken, requireBookingAccess, (req: any, res) => {
    try {
      const parsed = updateBookingStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const isProvider = req.user.role === 'provider' || req.user.role === 'admin';
      if (!isProvider && parsed.data.status !== 'cancelled') {
        return res.status(403).json({ error: 'You can only cancel your own bookings.' });
      }
      const updated = store.updateBookingStatus(req.params.id, parsed.data.status);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Get reviews
  app.get('/api/reviews/:salonId', (req, res) => {
    try {
      const reviews = store.getSalonReviews(req.params.salonId);
      res.json(reviews);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Post review — requires auth AND a completed booking at that
  // salon with the caller's own email (TR-7 canReview). clientName is taken
  // from the account, never from the body, so reviews cannot be spoofed.
  app.post('/api/reviews', authenticateToken, (req: any, res) => {
    try {
      const parsed = reviewSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const { salonId, rating, text } = parsed.data;
      if (!store.getSalon(salonId)) {
        return res.status(404).json({ error: 'Salon not found' });
      }
      if (!canReview(req.user, salonId)) {
        return res.status(403).json({
          error: 'You can review a studio once you have a completed booking there.'
        });
      }
      const review: Review = {
        id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        salonId,
        clientName: req.user.name,
        rating,
        text,
        date: new Date().toISOString().split('T')[0]
      };
      const created = store.createReview(review);
      res.status(201).json(created);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Gemini AI Beauty Advisor Matcher
  app.post('/api/gemini/advice', async (req, res) => {
    try {
      const { goals, skinHairType, occasion, preferredCategory } = req.body;
      const salons = store.getSalons();

      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
        // Mock response if Gemini Key is not set up, so it never fails the user
        return res.json({
          recommendationText: `Based on your goal of "${goals}" and your skin profile "${skinHairType}", our makeup ateliers recommend custom complexion sculpting and long-wear artistry. (AI Note: Connect your Gemini API Key in the Secrets panel to activate full intelligence!)`,
          suggestedServices: [
            {
              serviceName: 'Royal Bridal Glam & Touch-Up Kit',
              category: 'bridal',
              salonName: 'Maison Leish Haute Makeup Atelier',
              salonId: 'salon-1',
              estimatedPrice: 320,
              reason: 'Ideal for an unforgettable, waterproof event complexion tailored to your facial symmetry and skin undertone.'
            },
            {
              serviceName: 'Signature Velvet Soft Glam',
              category: 'soft-glam',
              salonName: 'Velvet Glow Makeup Studio',
              salonId: 'salon-3',
              estimatedPrice: 150,
              reason: 'Flawless skin-like foundation with soft taupe eye sculpting and hydrated ombre nude lips.'
            }
          ]
        });
      }

      // Construct dynamic salons context for Gemini to read
      const salonsContext = salons.map(s => {
        return `- Makeup Studio: ${s.name} (ID: ${s.id}, specialty: ${s.category}, location: ${s.location})
  Tagline: ${s.tagline}
  Services: ${s.services.map(sv => `${sv.name} (${sv.price}, ${sv.duration} mins - ${sv.description})`).join('; ')}`;
      }).join('\n\n');

      const prompt = `You are the Lead Luxury Makeup Stylist & Artistry Consultant for "Leish!", a high-end marketplace for premier makeup studios.
Your goal is to suggest exact makeup services and studios listed on our platform that best match the client's beauty profile.

Client Makeup Profile:
- Skin Type & Undertone: ${skinHairType}
- Desired Makeup Style / Goals: ${goals}
- Occasion: ${occasion}
- Preferred Category (if any): ${preferredCategory || 'Any Makeup Category'}

Here are the makeup studios and services available on Leish!:
${salonsContext}

Please analyze their profile and generate a tailored recommendation response.
Your response MUST be in valid JSON conforming to the schema:
{
  "recommendationText": "A warm, high-end personalized explanation of why these makeup services are selected for their skin tone, desired style, and occasion. Speak with elite makeup artist expertise.",
  "suggestedServices": [
    {
      "serviceName": "The exact name of the service from the list above",
      "category": "The category of the service",
      "salonName": "The exact name of the makeup studio",
      "salonId": "The exact studio id (e.g. salon-1)",
      "estimatedPrice": 99, (number)
      "reason": "Specific reason why this fits their skin profile, facial features, or occasion."
    }
  ]
}

Provide EXACT service names and studio IDs matching the ones provided above. Do not invent non-existent services. Limit your suggestions to 2 or 3 highly relevant services.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendationText: {
                type: Type.STRING,
                description: 'Elegant personal advice styling summary.'
              },
              suggestedServices: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    serviceName: { type: Type.STRING },
                    category: { type: Type.STRING },
                    salonName: { type: Type.STRING },
                    salonId: { type: Type.STRING },
                    estimatedPrice: { type: Type.NUMBER },
                    reason: { type: Type.STRING }
                  },
                  required: ['serviceName', 'category', 'salonName', 'salonId', 'estimatedPrice', 'reason']
                }
              }
            },
            required: ['recommendationText', 'suggestedServices']
          }
        }
      });

      if (response.text) {
        const jsonResult = JSON.parse(response.text.trim());
        res.json(jsonResult);
      } else {
        throw new Error('Empty response from Gemini model');
      }
    } catch (error: any) {
      console.error('[Gemini AI Advisor] Error:', error);
      res.status(500).json({ error: 'AI processing failed. Please try again.' });
    }
  });

  // API Route: Gemini AI Salon Review Summarizer
  app.post('/api/gemini/summarize-reviews', async (req, res) => {
    try {
      const { salonId } = req.body;
      const salon = store.getSalon(salonId);
      if (!salon) {
        return res.status(404).json({ error: 'Salon not found' });
      }

      const reviews = store.getSalonReviews(salonId);
      
      if (reviews.length === 0) {
        return res.json({
          vibe: 'Inviting and fresh. Ready to welcome its first clients with personalized premium care.',
          bestFor: 'First-time visitors seeking dedicated, highly customized care in an exclusive environment.',
          tip: 'Book early to secure slots with their main professionals as they establish their premier schedule.'
        });
      }

      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
        // Fallback mock summary if key not configured
        return res.json({
          vibe: 'Sophisticated and deeply professional. Guests appreciate the exquisite premium aesthetic.',
          bestFor: 'Precision treatments and highly detailed beauty consulting by creative lead stylists.',
          tip: 'Secure weekend bookings well in advance, as premium afternoon slots fill up quickly.'
        });
      }

      const reviewsText = reviews.map(r => `[Rating: ${r.rating}/5, Client: ${r.clientName}] Review: "${r.text}"`).join('\n');

      const prompt = `You are a luxury beauty concierge. Analyze the customer reviews for "${salon.name}" and compile an elegant, concise 3-part summary.
Reviews to analyze:
${reviewsText}

Generate a JSON object conforming exactly to this schema:
{
  "vibe": "Describe the core interior atmosphere/vibe in a single professional, elegant sentence (e.g. 'A sanctuary of Parisian calm with meticulous hospitality')",
  "bestFor": "State what the salon is best known for according to clients in a single highly-focused sentence.",
  "tip": "Provide 1 useful customer tip derived from the reviews (e.g., booking guidelines, therapist choice, or signature services) in a single sentence."
}
Keep each field extremely concise, professional, and sophisticated. No emojis.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              vibe: { type: Type.STRING },
              bestFor: { type: Type.STRING },
              tip: { type: Type.STRING }
            },
            required: ['vibe', 'bestFor', 'tip']
          }
        }
      });

      if (response.text) {
        const jsonResult = JSON.parse(response.text.trim());
        res.json(jsonResult);
      } else {
        throw new Error('Empty response from review summarizer');
      }
    } catch (error: any) {
      console.error('[Gemini Review Summarizer] Error:', error);
      res.status(500).json({ error: 'Failed to summarize reviews. Please try again.' });
    }
  });

  // --- API ROUTE: Venue Distance & On-Location Travel Calculator ---
  app.post('/api/venue/estimate-travel', (req, res) => {
    try {
      const { salonId, venue } = req.body;
      if (!venue || !venue.trim()) {
        return res.status(400).json({ error: 'Venue name or address is required.' });
      }

      const salon = store.getSalon(salonId || 'salon-1');
      const studioAddress = salon ? salon.address : '404 Jalan Bukit Bintang, Kuala Lumpur';

      // Deterministic distance calculation based on venue string length/hash for realistic demonstration
      let hash = 0;
      for (let i = 0; i < venue.length; i++) {
        hash = (hash << 5) - hash + venue.charCodeAt(i);
        hash |= 0;
      }
      const rawDistance = Math.abs(hash % 24) + 4.5; // Between 4.5 and 28.5 miles
      const distanceMiles = Number(rawDistance.toFixed(1));
      const estimatedDriveMinutes = Math.round(distanceMiles * 2.2 + 8);
      
      const baseKitFee = 50; // Mobile sanitation and lighting kit setup
      const mileageFee = Number((distanceMiles * 2.5).toFixed(2));
      const totalTravelFee = Math.round(baseKitFee + mileageFee);

      res.json({
        venueName: venue.trim(),
        studioAddress,
        distanceMiles,
        estimatedDriveMinutes,
        baseKitFee,
        mileageFee,
        totalTravelFee,
        serviceNote: 'Covers on-location pro lighting setup, sanitized mobile artistry trunks, and wedding morning timeline coordination.'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Travel calculation failed' });
    }
  });

  // --- API ROUTE: AI Virtual Lookbook & 2026 Trends Grounding ---
  app.post('/api/gemini/trends-lookbook', async (req, res) => {
    try {
      const { prompt: userPrompt, aesthetic, occasion, skinUndertone, lighting } = req.body;
      const salons = store.getSalons();

      const defaultImages: Record<string, string> = {
        bridal: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=1200',
        editorial: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80&w=1200',
        'soft-glam': 'https://images.unsplash.com/photo-1503236823255-94609f598e71?auto=format&fit=crop&q=80&w=1200',
        airbrush: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=1200',
        masterclass: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1200'
      };

      const selectedAesthetic = aesthetic || 'bridal';
      const heroImage = defaultImages[selectedAesthetic] || defaultImages['bridal'];

      // Fallback curated lookbook spec if Gemini is unavailable
      const fallbackLookbook = {
        id: `look-${Date.now()}`,
        lookName: selectedAesthetic === 'bridal' 
          ? 'Royal Gilded Silk Bridal' 
          : selectedAesthetic === 'editorial' 
          ? 'High-Impact Cinematic Red Carpet' 
          : 'Velvet Nude Petal Soft Glam',
        category: selectedAesthetic,
        vibeDescription: 'Elegantly sculpted complexion featuring radiant light-reflective underpainting, champagne shimmer lids, and a velvety ombre lip designed for 18-hour tearproof wear.',
        colorPalette: [
          { hex: '#E6E5E4', name: 'Champagne Rose' },
          { hex: '#90836D', name: 'Spiced Terracotta' },
          { hex: '#554B3A', name: 'Espresso Velvet' },
          { hex: '#ECEBE9', name: 'Opal Glaze' },
          { hex: '#ABA497', name: 'Golden Apricot' }
        ],
        complexion: {
          finish: 'Velvet Satin Glow',
          coverage: 'Medium Buildable',
          technique: 'Cream Underpainting & Micro-Mist 4K Airbrush'
        },
        eyeArtistry: {
          style: 'Soft Almond Smoke with Champagne Foil Inner Corner',
          lashStyle: 'Whisper-Thin Dimensional Silk Clusters'
        },
        lipFormula: {
          shade: 'Warm Honey Muted Rose',
          finish: 'Hydrated Velvet Matte with Satin Plumping Glaze',
          liner: 'Chestnut Contoured'
        },
        longevityFeatures: [
          '18-Hour Cry-Proof & Sweat-Resistant Seal',
          'Flashback-Free High Definition Silica Barrier',
          'Micro-pore Blur Technology for 4K Video'
        ],
        lightingBestFor: lighting || 'Warm Ballroom Chandelier & Sunset Golden Hour',
        groundedTrendContext: '2026 Fashion Week spotlighted "Glass Velvet" skin: ultra-dewy high points balanced by blurred, shine-controlled T-zones for seamless camera transitions.',
        recommendedSalonId: selectedAesthetic === 'bridal' ? 'salon-1' : (selectedAesthetic === 'airbrush' ? 'salon-2' : 'salon-3'),
        recommendedServiceName: selectedAesthetic === 'bridal' ? 'Haute Couture Bridal Artistry' : 'Signature Velvet Soft Glam',
        heroImage
      };

      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
        return res.json(fallbackLookbook);
      }

      // Query Gemini 3.5 Flash with Google Search Grounding for current 2026 trend synthesis
      const searchPrompt = `You are the Executive Artistry Director for Leish! Luxury Makeup Studio Marketplace.
Search for current 2026 bridal, runway, and red-carpet makeup trends. Then generate a bespoke luxury Makeup Lookbook Specification.

Parameters:
- Desired Style: ${userPrompt || aesthetic || 'High luxury wedding makeup'}
- Aesthetic Category: ${selectedAesthetic}
- Occasion: ${occasion || 'Black Tie Evening'}
- Skin Undertone: ${skinUndertone || 'Neutral Warm'}
- Preferred Lighting: ${lighting || 'Natural Daylight & Flash Photography'}

Available Marketplace Studios:
${salons.map(s => `- ${s.name} (ID: ${s.id}, Category: ${s.category}, Top Service: ${s.services[0]?.name || 'Bridal Artistry'})`).join('\n')}

Synthesize the latest 2026 fashion week / viral beauty trends and output ONLY valid JSON matching this schema:
{
  "lookName": "Creative luxury look title (e.g. 'Gilded Velvet Champagne Bridal')",
  "category": "${selectedAesthetic}",
  "vibeDescription": "Poetic, editorial, and vivid 2-sentence description of the artistry look.",
  "colorPalette": [
    { "hex": "#HEXCODE", "name": "Color Name" },
    { "hex": "#HEXCODE", "name": "Color Name" },
    { "hex": "#HEXCODE", "name": "Color Name" },
    { "hex": "#HEXCODE", "name": "Color Name" },
    { "hex": "#HEXCODE", "name": "Color Name" }
  ],
  "complexion": {
    "finish": "e.g. Cloud Skin / Dewy Velvet / Satin Matte",
    "coverage": "e.g. Sheer Glow / Medium Buildable / 4K Full Coverage",
    "technique": "e.g. Underpainting with micro-airbrush setting veil"
  },
  "eyeArtistry": {
    "style": "e.g. Soft diffused smoked wing with crushed diamond reflect",
    "lashStyle": "e.g. Handcrafted individual mink clusters flared at outer corners"
  },
  "lipFormula": {
    "shade": "e.g. 90s Spiced Rosewood Ombré",
    "finish": "e.g. Blurred Velvet with High-Shine Core Glaze",
    "liner": "e.g. Cool Taupe Chestnut Pencil"
  },
  "longevityFeatures": [
    "Feature 1 (e.g. 18-Hour Humidity & Cry-Proof Barrier)",
    "Feature 2 (e.g. Zero-Flashback HD Micro-Silica)",
    "Feature 3 (e.g. Heat-activated fixing mist)"
  ],
  "lightingBestFor": "${lighting || 'Natural Daylight & Flash Photography'}",
  "groundedTrendContext": "1-2 sentences on how this look aligns with 2026 runway/red-carpet trends observed on Milan/Paris runways or celebrity red carpets.",
  "recommendedSalonId": "salon-1",
  "recommendedServiceName": "Service Name matching the studio"
}
Ensure colorPalette has 5 distinct harmonious hexadecimal values. Return pure JSON without markdown backticks if possible.`;

      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI request timeout')), 7000)
        );
        const aiPromise = ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: searchPrompt,
          config: {
            tools: [{ googleSearch: {} }]
          }
        });

        const response: any = await Promise.race([aiPromise, timeoutPromise]);

        if (response && response.text) {
          const cleanText = stripJsonFences(response.text);
          
          const parsed = JSON.parse(cleanText);
          parsed.id = `look-${Date.now()}`;
          parsed.heroImage = heroImage;
          return res.json(parsed);
        }
      } catch (genErr: any) {
        console.warn('[Gemini Lookbook Generator] GenAI call note:', genErr?.message || genErr);
      }

      return res.json(fallbackLookbook);
    } catch (error: any) {
      console.error('[Gemini Lookbook Generator] Error:', error);
      res.status(500).json({ error: 'Lookbook generation encountered an issue.' });
    }
  });

  // --- API ROUTE: AI Studio Review & Quality Auditor (Hybrid Inspection) ---
  app.post('/api/gemini/quality-audit', async (req, res) => {
    try {
      const { salonId } = req.body;
      const salon = store.getSalon(salonId);
      if (!salon) {
        return res.status(404).json({ error: 'Salon not found' });
      }

      const reviews = store.getSalonReviews(salonId);

      // Default high-grade fallback audit report
      const defaultAudit = {
        salonName: salon.name,
        overallScore: 97,
        sentimentDistribution: {
          positive: 94,
          neutral: 5,
          constructive: 1
        },
        strengths: [
          'Exemplary skin undertone matching and custom foundation blending.',
          'Punctual arrival and serene composure during high-stress wedding mornings.',
          'Longevity confirmed through 14+ hours of tears, dancing, and camera flashes.'
        ],
        improvements: [
          'Clients frequently request take-home touch-up samples of custom lip mixes.',
          'Consider adding high-lumen 5000K daylight-balanced vanity mirrors for early winter morning trials.'
        ],
        actionablePlan: [
          'Introduce complimentary "Bride Emergency Touch-Up Kits" (compact sponge, lip decant, blotting sheet).',
          'Standardize pre-consultation digital skin prep guidelines 48 hours prior to bookings.'
        ]
      };

      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY' || reviews.length === 0) {
        return res.json(defaultAudit);
      }

      const reviewsFormatted = reviews.map(r => `[Rating: ${r.rating}/5, Client: ${r.clientName}]: "${r.text}"`).join('\n');

      const auditPrompt = `You are an elite Luxury Beauty Quality Auditor & Salon Operations Consultant.
Analyze the following customer reviews for "${salon.name}".
Evaluate artistry precision, client hospitality, cleanliness, punctuality, and make-up durability.

Customer Reviews:
${reviewsFormatted}

Generate a structured quality audit conforming to this JSON schema:
{
  "salonName": "${salon.name}",
  "overallScore": 96, (Number from 80 to 100)
  "sentimentDistribution": {
    "positive": 92, (Percentage number)
    "neutral": 6, (Percentage number)
    "constructive": 2 (Percentage number)
  },
  "strengths": [
    "Specific artistry or hospitality strength observed in reviews",
    "Second key strength",
    "Third key strength"
  ],
  "improvements": [
    "Constructive opportunity for refinement",
    "Second operational refinement"
  ],
  "actionablePlan": [
    "High-impact actionable step for the studio director",
    "Second operational enhancement"
  ]
}
Return pure JSON.`;

      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Audit request timeout')), 7000)
        );
        const aiPromise = ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: auditPrompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        const response: any = await Promise.race([aiPromise, timeoutPromise]);

        if (response && response.text) {
          const auditResult = JSON.parse(response.text.trim());
          return res.json(auditResult);
        }
      } catch (aiErr: any) {
        console.warn('[Quality Audit] GenAI note:', aiErr?.message || aiErr);
      }

      return res.json(defaultAudit);
    } catch (error: any) {
      console.error('[Quality Audit] Error:', error);
      res.status(500).json({ error: 'Failed to complete quality audit.' });
    }
  });

  // --- API ROUTE: Multi-Turn Gemini Beauty Chatbot with Search & Maps Grounding ---
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { messages, modelChoice = 'general', grounding = 'none', location } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Conversation messages array is required.' });
      }

      // Model mapping per user brief:
      // 'complex' -> 'gemini-3.1-pro-preview', 'general' -> 'gemini-3.5-flash', 'fast' -> 'gemini-3.1-flash-lite'
      let selectedModel = 'gemini-3.5-flash';
      if (modelChoice === 'complex') selectedModel = 'gemini-3.1-pro-preview';
      else if (modelChoice === 'fast') selectedModel = 'gemini-3.1-flash-lite';

      const salons = store.getSalons();
      const directorySummary = salons.map(s => 
        `• ${s.name} (${s.type === 'mua' ? 'Independent MUA' : 'Atelier Studio'}, Rating: ${s.rating}★, Location: ${s.location}, Category: ${s.category}, Top: ${s.services[0]?.name} RM${s.services[0]?.price})`
      ).join('\n');

      const systemInstruction = `You are the Lead Master Beauty & Makeup Concierge for Leish! Aesthetic Marketplace.
You provide authoritative advice on luxury bridal, red-carpet, soft glam, and HD airbrush makeup artistry.
You can recommend independent MUAs and boutique ateliers listed on our platform.
Here is the current Leish! directory:
${directorySummary}

Tone: Sophisticated, welcoming, expert, couture aesthetic.
Always answer questions directly. When recommending studios or MUAs, cite their exact names and specialties.`;

      // Tools configuration:
      const tools: any[] = [];
      if (grounding === 'search') {
        tools.push({ googleSearch: {} });
      } else if (grounding === 'maps') {
        tools.push({ googleMaps: {} });
      }

      // Check if Gemini API key exists
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
        const lastUserMessage = messages[messages.length - 1]?.parts?.[0]?.text || '';
        return res.json({
          reply: `Welcome to Leish! Regarding "${lastUserMessage.slice(0, 40)}": for high-definition event artistry, we recommend booking our verified Independent MUAs like Jean-Marc Laurent for red carpet underpainting or Maison Leish Atelier for bridal suites. (Note: Running in concierge preview mode).`,
          groundingCitations: []
        });
      }

      const config: any = {
        systemInstruction,
      };

      if (tools.length > 0) {
        config.tools = tools;
      }

      try {
        const response = await ai.models.generateContent({
          model: selectedModel,
          contents: messages,
          config
        });

        const reply = response.text || 'Thank you for your message. How may I assist your beauty journey today?';
        
        // Extract search/maps grounding metadata if available
        const candidate = response.candidates?.[0];
        const searchChunks = candidate?.groundingMetadata?.groundingChunks || [];
        const webSearchQueries = candidate?.groundingMetadata?.webSearchQueries || [];

        return res.json({
          reply,
          groundingCitations: searchChunks.map((c: any) => ({
            title: c.web?.title || 'Web Citation',
            url: c.web?.uri || '',
          })).filter((c: any) => Boolean(c.url)),
          webSearchQueries,
          modelUsed: selectedModel
        });
      } catch (err: any) {
        console.warn('[Gemini Chat] Primary call note:', err?.message);
        // Graceful fallback to gemini-3.5-flash if pro preview quota or paid key was needed
        if (selectedModel !== 'gemini-3.5-flash') {
          const fallbackRes = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: messages,
            config: { systemInstruction }
          });
          return res.json({
            reply: fallbackRes.text || 'I am delighted to assist with your beauty styling questions.',
            groundingCitations: [],
            modelUsed: 'gemini-3.5-flash'
          });
        }
        throw err;
      }
    } catch (error: any) {
      console.error('[Gemini Chat Error]:', error);
      res.status(500).json({ error: error.message || 'Chatbot service error.' });
    }
  });

  // --- API ROUTE: Create & Edit Images using Gemini Flash Image ---
  app.post('/api/gemini/generate-image', async (req, res) => {
    try {
      const { prompt, aspectRatio = '1:1', baseImageBase64, imageMimeType = 'image/jpeg' } = req.body;

      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ error: 'Text prompt is required.' });
      }

      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
        // High quality aesthetic fallback if key is not configured
        return res.json({
          imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=1200',
          prompt,
          mode: 'preview'
        });
      }

      // Model: per prompt, use gemini-3.1-flash-image-preview (or gemini-3.1-flash-image)
      const modelName = 'gemini-3.1-flash-image-preview';

      const parts: any[] = [];
      if (baseImageBase64) {
        parts.push({
          inlineData: {
            data: baseImageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
            mimeType: imageMimeType
          }
        });
      }
      parts.push({ text: `Haute couture luxury beauty editorial photograph: ${prompt}. Professional studio lighting, poreless glass skin finish, bespoke eye design, high fashion magazine quality.` });

      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: { parts },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio as any || '1:1'
            }
          }
        });

        let foundImageUrl: string | null = null;
        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData?.data) {
              foundImageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
              break;
            }
          }
        }

        if (foundImageUrl) {
          return res.json({ imageUrl: foundImageUrl, prompt });
        }
      } catch (imgErr: any) {
        console.warn('[Gemini Flash Image] Error with preview model, trying lite image model:', imgErr?.message);
        // Fallback to gemini-3.1-flash-lite-image
        try {
          const fallbackRes = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite-image',
            contents: { parts },
            config: {
              imageConfig: { aspectRatio: aspectRatio as any || '1:1' }
            }
          });
          if (fallbackRes.candidates?.[0]?.content?.parts) {
            for (const part of fallbackRes.candidates[0].content.parts) {
              if (part.inlineData?.data) {
                return res.json({
                  imageUrl: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`,
                  prompt
                });
              }
            }
          }
        } catch (liteErr) {
          console.warn('[Gemini Lite Image] Also encountered error:', liteErr);
        }
      }

      // Elegant editorial photography fallback on quota exhaustion
      return res.json({
        imageUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80&w=1200',
        prompt,
        notice: 'Rendered with curated aesthetic fallback while image synthesis quota resets.'
      });
    } catch (error: any) {
      console.error('[Image Generation Error]:', error);
      res.status(500).json({ error: error.message || 'Image generation failed.' });
    }
  });

  // --- API ROUTE: Veo 3 Video Generation (Start) ---
  app.post('/api/gemini/generate-video', async (req, res) => {
    try {
      const { prompt, aspectRatio = '16:9' } = req.body;

      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ error: 'Text prompt is required.' });
      }

      const validAspect = (aspectRatio === '9:16') ? '9:16' : '16:9';

      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
        return res.json({
          operationName: 'simulated-video-operation',
          aspectRatio: validAspect,
          done: true,
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
        });
      }

      try {
        const operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: `Cinematic 4K luxury beauty video: ${prompt}. Smooth camera pan, flattering studio rim lighting, immaculate makeup details, runway movement.`,
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: validAspect
          }
        });

        return res.json({
          operationName: operation.name,
          aspectRatio: validAspect,
          done: false
        });
      } catch (veoErr: any) {
        console.warn('[Veo 3 fast model note]:', veoErr?.message);
        // Try fallback to veo-3.1-lite-generate-preview
        const opLite = await ai.models.generateVideos({
          model: 'veo-3.1-lite-generate-preview',
          prompt: `Cinematic beauty runway video: ${prompt}`,
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: validAspect
          }
        });
        return res.json({
          operationName: opLite.name,
          aspectRatio: validAspect,
          done: false
        });
      }
    } catch (error: any) {
      console.error('[Veo Video Generation Error]:', error);
      // Return simulated demo video so UI experience remains seamless
      res.json({
        operationName: 'demo-runway-clip',
        aspectRatio: req.body.aspectRatio || '16:9',
        done: true,
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        notice: error.message
      });
    }
  });

  // --- API ROUTE: Veo 3 Video Status (Poll) ---
  app.post('/api/gemini/video-status', async (req, res) => {
    try {
      const { operationName } = req.body;
      if (!operationName) {
        return res.status(400).json({ error: 'Operation name is required.' });
      }

      if (operationName === 'simulated-video-operation' || operationName === 'demo-runway-clip') {
        return res.json({
          done: true,
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
        });
      }

      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

      res.json({
        done: Boolean(updated.done),
        hasDownloadUri: Boolean(uri)
      });
    } catch (error: any) {
      console.error('[Veo Status Error]:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- API ROUTE: Veo 3 Video Download Stream ---
  app.post('/api/gemini/video-download', async (req, res) => {
    try {
      const { operationName } = req.body;
      if (!operationName) {
        return res.status(400).json({ error: 'Operation name is required.' });
      }

      if (operationName === 'simulated-video-operation' || operationName === 'demo-runway-clip') {
        return res.redirect('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
      }

      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

      if (!uri) {
        return res.status(404).json({ error: 'Video URI not ready yet.' });
      }

      const videoRes = await fetch(uri, {
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY || '' }
      });

      res.setHeader('Content-Type', 'video/mp4');
      if (videoRes.body) {
        const arrayBuf = await videoRes.arrayBuffer();
        res.send(Buffer.from(arrayBuf));
      } else {
        res.status(500).json({ error: 'Empty video stream from upstream.' });
      }
    } catch (error: any) {
      console.error('[Veo Download Error]:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return app;
}

const app = createApp();

// When run directly (local dev/prod via `tsx dev.ts`), the dev bootstrap in
// dev.ts mounts Vite/static middleware and listens. On Vercel, the platform
// serves built assets from outputDirectory and invokes the default export
// (the Express app) for every other request — original paths preserved.
export default app;
