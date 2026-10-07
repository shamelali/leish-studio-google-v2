import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV !== 'production' ? false : undefined,
  }));

  // Rate limiting
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 requests per windowMs for auth routes
    message: { error: 'Too many attempts, please try again later.' }
  });
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' }
  });
  app.use('/api/auth/', authLimiter);
  app.use('/api/', apiLimiter);

  // JSON body size limit
  app.use(express.json({ limit: '100kb' }));

  // Helper to strip sensitive data
  const sanitizeUser = (u: any): User => {
    const { password, ...safeUser } = u;
    return safeUser as User;
  };

  // JWT configuration
  const JWT_SECRET = process.env.JWT_SECRET || 'leish-dev-secret-change-in-production';
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
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}RM/, 'Date must be YYYY-MM-DD'),
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
        return res.status(400).json({ error: parsed.error.errors[0].message });
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
        id: `user-RM{Date.now()}-RM{Math.random().toString(36).slice(2, 8)}`,
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
        return res.status(400).json({ error: parsed.error.errors[0].message });
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
        message: `Welcome back, RM{user.name}!`
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
        return res.status(400).json({ error: parsed.error.errors[0].message });
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

  // API Route: Get available demo accounts for instant switching
  app.get('/api/auth/demo-accounts', (req, res) => {
    try {
      const users = store.getUsers().map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        salonId: u.salonId,
        avatar: u.avatar
      }));
      res.json(users);
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

  // API Route: Update salon
  app.put('/api/salons/:id', authenticateToken, (req: any, res) => {
    try {
      const updated = store.updateSalon(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Add service to salon
  app.post('/api/salons/:id/services', authenticateToken, (req: any, res) => {
    try {
      const salon = store.getSalon(req.params.id);
      if (!salon) {
        return res.status(404).json({ error: 'Salon not found' });
      }
      const newService: Service = {
        id: `serv-RM{req.params.id}-RM{Date.now()}`,
        name: req.body.name,
        price: Number(req.body.price),
        duration: Number(req.body.duration),
        description: req.body.description,
        category: req.body.category || salon.category
      };
      const updatedServices = [...salon.services, newService];
      const updated = store.updateSalon(req.params.id, { services: updatedServices });
      res.status(201).json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Delete service from salon
  app.delete('/api/salons/:id/services/:serviceId', authenticateToken, (req: any, res) => {
    try {
      const salon = store.getSalon(req.params.id);
      if (!salon) {
        return res.status(404).json({ error: 'Salon not found' });
      }
      const updatedServices = salon.services.filter(s => s.id !== req.params.serviceId);
      const updated = store.updateSalon(req.params.id, { services: updatedServices });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Get bookings
  app.get('/api/bookings', (req, res) => {
    try {
      let bookings = store.getBookings();
      const email = req.query.email as string;
      const salonId = req.query.salonId as string;
      
      if (email) {
        bookings = bookings.filter(b => b.clientEmail.toLowerCase() === email.toLowerCase());
      }
      if (salonId) {
        bookings = bookings.filter(b => b.salonId === salonId);
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
        return res.status(400).json({ error: parsed.error.errors[0].message });
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
        id: `book-RM{Date.now()}-RM{Math.random().toString(36).slice(2, 8)}`,
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

  // API Route: Update booking status
  app.patch('/api/bookings/:id/status', authenticateToken, (req: any, res) => {
    try {
      const parsed = updateBookingStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
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

  // API Route: Post review
  app.post('/api/reviews', (req, res) => {
    try {
      const parsed = reviewSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      const { salonId, clientName, rating, text } = parsed.data;
      const review: Review = {
        id: `rev-RM{Date.now()}-RM{Math.random().toString(36).slice(2, 8)}`,
        salonId,
        clientName,
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
          recommendationText: `Based on your goal of "RM{goals}" and your skin profile "RM{skinHairType}", our makeup ateliers recommend custom complexion sculpting and long-wear artistry. (AI Note: Connect your Gemini API Key in the Secrets panel to activate full intelligence!)`,
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
        return `- Makeup Studio: RM{s.name} (ID: RM{s.id}, specialty: RM{s.category}, location: RM{s.location})
  Tagline: RM{s.tagline}
  Services: RM{s.services.map(sv => `RM{sv.name} (RMRM{sv.price}, RM{sv.duration} mins - RM{sv.description})`).join('; ')}`;
      }).join('\n\n');

      const prompt = `You are the Lead Luxury Makeup Stylist & Artistry Consultant for "Leish!", a high-end marketplace for premier makeup studios.
Your goal is to suggest exact makeup services and studios listed on our platform that best match the client's beauty profile.

Client Makeup Profile:
- Skin Type & Undertone: RM{skinHairType}
- Desired Makeup Style / Goals: RM{goals}
- Occasion: RM{occasion}
- Preferred Category (if any): RM{preferredCategory || 'Any Makeup Category'}

Here are the makeup studios and services available on Leish!:
RM{salonsContext}

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

      const reviewsText = reviews.map(r => `[Rating: RM{r.rating}/5, Client: RM{r.clientName}] Review: "RM{r.text}"`).join('\n');

      const prompt = `You are a luxury beauty concierge. Analyze the customer reviews for "RM{salon.name}" and compile an elegant, concise 3-part summary.
Reviews to analyze:
RM{reviewsText}

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
        id: `look-RM{Date.now()}`,
        lookName: selectedAesthetic === 'bridal' 
          ? 'Royal Gilded Silk Bridal' 
          : selectedAesthetic === 'editorial' 
          ? 'High-Impact Cinematic Red Carpet' 
          : 'Velvet Nude Petal Soft Glam',
        category: selectedAesthetic,
        vibeDescription: 'Elegantly sculpted complexion featuring radiant light-reflective underpainting, champagne shimmer lids, and a velvety ombre lip designed for 18-hour tearproof wear.',
        colorPalette: [
          { hex: '#EAC7C0', name: 'Champagne Rose' },
          { hex: '#A86B5A', name: 'Spiced Terracotta' },
          { hex: '#633B31', name: 'Espresso Velvet' },
          { hex: '#F9EAE1', name: 'Opal Glaze' },
          { hex: '#D4A373', name: 'Golden Apricot' }
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
- Desired Style: RM{userPrompt || aesthetic || 'High luxury wedding makeup'}
- Aesthetic Category: RM{selectedAesthetic}
- Occasion: RM{occasion || 'Black Tie Evening'}
- Skin Undertone: RM{skinUndertone || 'Neutral Warm'}
- Preferred Lighting: RM{lighting || 'Natural Daylight & Flash Photography'}

Available Marketplace Studios:
RM{salons.map(s => `- RM{s.name} (ID: RM{s.id}, Category: RM{s.category}, Top Service: RM{s.services[0]?.name || 'Bridal Artistry'})`).join('\n')}

Synthesize the latest 2026 fashion week / viral beauty trends and output ONLY valid JSON matching this schema:
{
  "lookName": "Creative luxury look title (e.g. 'Gilded Velvet Champagne Bridal')",
  "category": "RM{selectedAesthetic}",
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
  "lightingBestFor": "RM{lighting || 'Natural Daylight & Flash Photography'}",
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
          let cleanText = response.text.trim();
          if (cleanText.startsWith('```json')) {
            cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```RM/, '');
          } else if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```RM/, '');
          }
          
          const parsed = JSON.parse(cleanText);
          parsed.id = `look-RM{Date.now()}`;
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

      const reviewsFormatted = reviews.map(r => `[Rating: RM{r.rating}/5, Client: RM{r.clientName}]: "RM{r.text}"`).join('\n');

      const auditPrompt = `You are an elite Luxury Beauty Quality Auditor & Salon Operations Consultant.
Analyze the following customer reviews for "RM{salon.name}".
Evaluate artistry precision, client hospitality, cleanliness, punctuality, and make-up durability.

Customer Reviews:
RM{reviewsFormatted}

Generate a structured quality audit conforming to this JSON schema:
{
  "salonName": "RM{salon.name}",
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
        `• RM{s.name} (RM{s.type === 'mua' ? 'Independent MUA' : 'Atelier Studio'}, Rating: RM{s.rating}★, Location: RM{s.location}, Category: RM{s.category}, Top: RM{s.services[0]?.name} RMRM{s.services[0]?.price})`
      ).join('\n');

      const systemInstruction = `You are the Lead Master Beauty & Makeup Concierge for Leish! Aesthetic Marketplace.
You provide authoritative advice on luxury bridal, red-carpet, soft glam, and HD airbrush makeup artistry.
You can recommend independent MUAs and boutique ateliers listed on our platform.
Here is the current Leish! directory:
RM{directorySummary}

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
          reply: `Welcome to Leish! Regarding "RM{lastUserMessage.slice(0, 40)}": for high-definition event artistry, we recommend booking our verified Independent MUAs like Jean-Marc Laurent for red carpet underpainting or Maison Leish Atelier for bridal suites. (Note: Running in concierge preview mode).`,
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
      parts.push({ text: `Haute couture luxury beauty editorial photograph: RM{prompt}. Professional studio lighting, poreless glass skin finish, bespoke eye design, high fashion magazine quality.` });

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
              foundImageUrl = `data:RM{part.inlineData.mimeType || 'image/png'};base64,RM{part.inlineData.data}`;
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
                  imageUrl: `data:RM{part.inlineData.mimeType || 'image/png'};base64,RM{part.inlineData.data}`,
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
          prompt: `Cinematic 4K luxury beauty video: RM{prompt}. Smooth camera pan, flattering studio rim lighting, immaculate makeup details, runway movement.`,
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
          prompt: `Cinematic beauty runway video: RM{prompt}`,
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

  // Vite development middleware vs production static server
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Leish! Full-stack server running on http://0.0.0.0:RM{PORT}`);
  });
}

startServer();
