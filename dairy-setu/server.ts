import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { Prisma, PrismaClient, type Profile } from '@prisma/client';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cert, getApps, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getAuth as getFirebaseAdminAuth } from 'firebase-admin/auth';
import {
  PushTokenRegistrationError,
  createPushNotificationService,
  registerPushToken,
} from './services/pushNotifications.ts';
import cron from 'node-cron';

const prisma = new PrismaClient();
const pushNotifications = createPushNotificationService(prisma);
const app = express();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '*13579*admin';
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || ADMIN_PASSWORD;
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

type AppRole = 'distributor' | 'shopkeeper';
type DistributorType = 'dairy' | 'icecream' | 'dual';
type BusinessLine = 'dairy' | 'icecream';
type RequestedLineItem = {
  productId: string;
  quantity: number;
};

interface AuthenticatedRequest extends Request {
  authEmail?: string;
  authUid?: string;
}

function isRole(value: unknown): value is AppRole {
  return value === 'distributor' || value === 'shopkeeper';
}

function isDistributorType(value: unknown): value is DistributorType {
  return value === 'dairy' || value === 'icecream' || value === 'dual';
}

function normalizeDistributorType(value: unknown): DistributorType {
  if (value === 'icecream') return 'icecream';
  if (value === 'dual') return 'dual';
  return 'dairy';
}

function isBusinessLine(value: unknown): value is BusinessLine {
  return value === 'dairy' || value === 'icecream';
}

function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getFirebaseAdminAuth();
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    initializeAdminApp({ credential: cert(serviceAccount) });
    return getFirebaseAdminAuth();
  }

  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (serviceAccountBase64) {
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf8'));
    initializeAdminApp({ credential: cert(serviceAccount) });
    return getFirebaseAdminAuth();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    initializeAdminApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    return getFirebaseAdminAuth();
  }

  // In development mode, return null to skip Firebase auth requirement
  if (process.env.NODE_ENV !== 'production') {
    console.warn('⚠️  Firebase credentials not configured. Running in development mode without Firebase auth.');
    return null;
  }

  throw new Error(
    'Firebase Admin credentials are required in production. Set FIREBASE_SERVICE_ACCOUNT_KEY, FIREBASE_SERVICE_ACCOUNT_BASE64, or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY in Render environment variables.'
  );
}
const adminAuth = initializeFirebaseAdmin();

app.use(cors());
app.use(express.json());

app.get('/api/ping', (_req, res) => {
  res.status(200).send('pong');
});

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    res.status(200).json({ status: 'ok', database: 'connected', provider: 'mongodb-atlas' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: error?.message || 'Database error' });
  }
});

async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Check authorization header first for manual or firebase tokens
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    // Verify manual token
    const manualUser = verifyManualToken(token);
    if (manualUser) {
      req.authEmail = manualUser.email;
      req.authUid = `manual-${manualUser.email}`;
      return next();
    }
  }

  // In development mode without Firebase, skip auth requirement
  if (!adminAuth) {
    const devEmail = String(req.headers['x-dev-auth-email'] || '').trim().toLowerCase();
    if (!devEmail || !devEmail.includes('@')) {
      return res.status(401).json({ error: 'Development auth email missing. Please sign in with Google again.' });
    }
    req.authEmail = devEmail;
    req.authUid = String(req.headers['x-dev-auth-uid'] || 'dev-uid');
    return next();
  }

  try {
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.slice('Bearer '.length).trim();
    const decodedToken = await adminAuth.verifyIdToken(token);
    if (!decodedToken.email) {
      return res.status(401).json({ error: 'Email claim missing in token' });
    }

    req.authUid = decodedToken.uid;
    req.authEmail = decodedToken.email.toLowerCase();
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

app.use('/api', (req, res, next) => {
  if (req.path === '/ping') {
    return next();
  }
  if (req.path.startsWith('/admin')) {
    return next();
  }
  if (req.path.startsWith('/auth/manual')) {
    return next();
  }
  if (req.path === '/blogs' || req.path.startsWith('/blogs/')) {
    return next();
  }
  return requireAuth(req as AuthenticatedRequest, res, next);
});

app.use('/api/admin', requireAdminSession);

async function getRequesterProfile(req: AuthenticatedRequest): Promise<Profile | null> {
  if (!req.authEmail) return null;
  return prisma.profile.findUnique({ where: { email: req.authEmail } });
}

async function requireRequesterProfile(req: Request, res: Response): Promise<Profile | null> {
  const requester = await getRequesterProfile(req as AuthenticatedRequest);
  if (!requester) {
    res.status(404).json({ error: 'Profile not found' });
    return null;
  }
  return requester;
}

async function getRoleProfiles(userId: string) {
  const [dp, sp] = await Promise.all([
    prisma.distributorProfile.findUnique({ where: { userId } }),
    prisma.shopkeeperProfile.findUnique({ where: { userId } }),
  ]);
  return { dp, sp };
}

function roleConsistencyError(role: AppRole, dp: unknown, sp: unknown): string | null {
  if (dp && sp) return 'Account data conflict: both distributor and shopkeeper profiles exist.';
  if (role === 'distributor' && !dp) return 'Distributor profile missing for this account.';
  if (role === 'shopkeeper' && !sp) return 'Shopkeeper profile missing for this account.';
  return null;
}

function normalizePhone(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

function isSpamPhone(phone: string): boolean {
  if (phone.length !== 10) return true;
  if (!/^[6789]/.test(phone)) return true;
  if (/^(\d)\1{9}$/.test(phone)) return true;
  const asc = '01234567890123456789';
  const desc = '98765432109876543210';
  if (asc.includes(phone) || desc.includes(phone)) return true;
  return false;
}

function parseOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeCategory(value: unknown): string {
  return String(value ?? 'other').trim().toLowerCase().replace(/\s+/g, ' ') || 'other';
}

function inferBusinessLine(category: unknown, provided?: unknown): BusinessLine {
  if (provided === 'icecream') return 'icecream';
  if (provided === 'dairy') return 'dairy';
  const normalized = normalizeCategory(category);
  const iceCreamKeywords = [
    'icecream',
    'ice cream',
    'kulfi',
    'cone',
    'cup',
    'bar',
    'candy',
    'sundae',
    'gelato',
    'scoop',
    'frozen dessert',
  ];
  return iceCreamKeywords.some(keyword => normalized.includes(keyword)) ? 'icecream' : 'dairy';
}

function getAllowedBusinessLines(distributorType: DistributorType): BusinessLine[] {
  if (distributorType === 'dual') return ['dairy', 'icecream'];
  return [distributorType === 'icecream' ? 'icecream' : 'dairy'];
}

function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pin, salt, 32).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPin(pin: string, storedPin: string | null | undefined): boolean {
  if (!storedPin) return false;
  if (!storedPin.startsWith('scrypt$')) {
    return storedPin === pin;
  }

  const parts = storedPin.split('$');
  if (parts.length !== 3) return false;
  const [, salt, expectedHash] = parts;
  const actualHash = scryptSync(pin, salt, 32).toString('hex');

  const expectedBuffer = Buffer.from(expectedHash, 'hex');
  const actualBuffer = Buffer.from(actualHash, 'hex');
  if (expectedBuffer.length !== actualBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function signManualToken(email: string, expiresAt: number) {
  const data = `${email.toLowerCase()}:${expiresAt}`;
  const signature = createHmac('sha256', ADMIN_SESSION_SECRET).update(data).digest('hex');
  return `${Buffer.from(email.toLowerCase()).toString('base64')}.${expiresAt}.${signature}`;
}

function verifyManualToken(token: string): { email: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [emailB64, expiresAtRaw, signature] = parts;
    const email = Buffer.from(emailB64, 'base64').toString('utf8');
    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;

    const data = `${email.toLowerCase()}:${expiresAt}`;
    const expected = createHmac('sha256', ADMIN_SESSION_SECRET).update(data).digest('hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    const actualBuffer = Buffer.from(signature, 'hex');
    if (expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)) {
      return { email: email.toLowerCase() };
    }
  } catch (err) {
    console.error('Error verifying manual token:', err);
  }
  return null;
}

function signAdminSession(expiresAt: number) {
  return createHmac('sha256', ADMIN_SESSION_SECRET).update(String(expiresAt)).digest('hex');
}

function createAdminSessionToken() {
  const expiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
  return `${expiresAt}.${signAdminSession(expiresAt)}`;
}

function verifyAdminSessionToken(token: unknown) {
  if (typeof token !== 'string') return false;
  const [expiresAtRaw, signature] = token.split('.');
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now() || !signature) return false;

  const expected = signAdminSession(expiresAt);
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(signature, 'hex');
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

function requireAdminSession(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/login') return next();
  const token = req.headers['x-admin-token'];
  if (!verifyAdminSessionToken(token)) {
    return res.status(401).json({ error: 'Admin session expired. Please login again.' });
  }
  return next();
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function generateConnectionCode() {
  return `${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

function getOrderStatusNotification(status: string | null | undefined) {
  if (status === 'accepted') return { type: 'order_accepted', title: 'Order accepted' };
  if (status === 'rejected') return { type: 'order_rejected', title: 'Order rejected' };
  if (status === 'fulfilled') return { type: 'order_fulfilled', title: 'Order fulfilled' };
  if (status === 'completed') return { type: 'order_completed', title: 'Order completed' };
  return { type: 'order_updated', title: 'Order updated' };
}

async function createNotificationAndPush({
  userId,
  type,
  title = 'DairyWalla Update',
  message,
  data = {},
}: {
  userId: string | null | undefined;
  type: string;
  title?: string;
  message: string;
  data?: Record<string, unknown>;
}) {
  if (!userId) return null;
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      message,
      read: false,
      createdAt: new Date(),
    },
  });
  void pushNotifications.sendToUser(
    userId,
    {
      title,
      body: message,
      data: { type, notificationId: notification.id, ...data },
    },
    { eventType: type },
  );
  return notification;
}

async function notifyShopkeeperPaymentCompleted(
  order: { id: string; shopkeeperId?: string | null; shopName?: string | null; total?: number | null },
  distributorBusinessName?: string | null,
) {
  if (!order.shopkeeperId) return;

  const shopkeeper = await prisma.shopkeeperProfile.findUnique({ where: { id: order.shopkeeperId } });
  if (!shopkeeper?.userId) return;

  const shopLabel = String(order.shopName || 'Your shop').trim();
  const shortOrderId = order.id.slice(-6).toUpperCase();
  const distributorLabel = String(distributorBusinessName || 'your distributor').trim();
  const amount = Number(order.total ?? 0);
  const amountLine = Number.isFinite(amount) && amount > 0 ? ` Amount: ₹${amount.toLocaleString('en-IN')}.` : '';

  await createNotificationAndPush({
    userId: shopkeeper.userId,
    type: 'payment_completed',
    title: 'Payment marked paid',
    message: `Payment complete! ${distributorLabel} marked order #${shortOrderId} for ${shopLabel} as completed.${amountLine}`,
    data: { orderId: order.id, role: 'shopkeeper' },
  });
}

// Auth: verify current user profile by token email
app.post('/api/auth/me', async (req: AuthenticatedRequest, res) => {
  const { role } = req.body;
  try {
    const email = req.authEmail;
    if (!email) return res.status(401).json({ error: 'Unauthorized' });

    let profile = await prisma.profile.findUnique({ where: { email } });
    
    // If user profile is not found and role is provided, create profile & placeholder role profile immediately
    if (!profile) {
      if (role && isRole(role)) {
        profile = await prisma.profile.create({
          data: {
            email,
            role,
            phone: '',
          }
        });
      } else {
        return res.json({ needsSetup: true });
      }
    }

    if (!isRole(profile.role)) {
      return res.status(409).json({ error: 'Invalid account role stored for this email.' });
    }

    const { dp: existingDp, sp: existingSp } = await getRoleProfiles(profile.id);
    let dp = existingDp;
    let sp = existingSp;

    // Immediately generate placeholder role profiles if they don't exist yet to guarantee a Profile ID exists for updates
    if (profile.role === 'distributor' && !dp) {
      let connectionCode = generateConnectionCode();
      for (let attempts = 0; attempts < 5; attempts++) {
        const codeExists = await prisma.distributorProfile.findUnique({ where: { connectionCode } });
        if (!codeExists) break;
        connectionCode = generateConnectionCode();
      }
      dp = await prisma.distributorProfile.create({
        data: {
          userId: profile.id,
          businessName: '',
          connectionCode,
          profileComplete: false,
        }
      });
    } else if (profile.role === 'shopkeeper' && !sp) {
      sp = await prisma.shopkeeperProfile.create({
        data: {
          userId: profile.id,
          shopName: '',
          profileComplete: false,
        }
      });
    }

    // If profile setup (name, phone) is not complete OR role profiles are incomplete, flag needsSetup
    // Only require PIN if logging in manually (i.e. not Google/Firebase)
    const isManual = req.authUid?.startsWith('manual-');
    const hasRoleProfile = profile.role === 'distributor'
      ? (dp && (dp.profileComplete || (dp.businessName && dp.businessName.trim() !== '')))
      : (sp && (sp.profileComplete || (sp.shopName && sp.shopName.trim() !== '')));

    const needsSetup = !profile.name || !profile.phone || !hasRoleProfile || (isManual && !profile.pin);


    if (role && profile.role !== role) {
      return res.status(409).json({ error: `This email is already registered as a ${profile.role}. Please log in with the correct role.` });
    }

    const conflict = roleConsistencyError(profile.role, dp, sp);
    if (conflict) return res.status(409).json({ error: conflict });

    if (needsSetup) {
      return res.json({
        needsSetup: true,
        email: profile.email,
        role: profile.role,
        profile,
        dp,
        sp
      });
    }

    return res.json({
      needsSetup: false,
      profile,
      dp,
      sp
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Manual Login: email and PIN based verification
app.post('/api/auth/manual-login', async (req, res) => {
  const { email, role } = req.body;
  try {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const profile = await prisma.profile.findUnique({ where: { email: normalizedEmail } });
    if (!profile) {
      return res.status(404).json({ error: 'Account not found. Please sign up first.' });
    }

    if (role && profile.role !== role) {
      return res.status(409).json({ error: `This email is registered as a ${profile.role}. Please log in with the correct role.` });
    }

    const { dp, sp } = await getRoleProfiles(profile.id);
    const needsSetup = !dp && !sp;

    const token = signManualToken(normalizedEmail, Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days session token

    return res.json({ profile, dp, sp, token, needsSetup });
  } catch (err) {
    console.error('Manual Login Error:', err);
    return res.status(500).json({ error: 'Login failed due to server error' });
  }
});

// Manual Registration: email and role initial registration
app.post('/api/auth/manual-register', async (req, res) => {
  const { email, role } = req.body;
  try {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (role !== 'distributor' && role !== 'shopkeeper') {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    const existingProfile = await prisma.profile.findUnique({ where: { email: normalizedEmail } });
    if (existingProfile) {
      if (existingProfile.pin) {
        return res.status(409).json({ error: 'This email is already registered. Please login.' });
      } else {
        // If a placeholder was created previously but PIN setup was not completed, allow resuming
        const { dp: existingDp, sp: existingSp } = await getRoleProfiles(existingProfile.id);
        let dp = existingDp;
        let sp = existingSp;

        if (existingProfile.role === 'distributor' && !dp) {
          let connectionCode = generateConnectionCode();
          for (let attempts = 0; attempts < 5; attempts++) {
            const codeExists = await prisma.distributorProfile.findUnique({ where: { connectionCode } });
            if (!codeExists) break;
            connectionCode = generateConnectionCode();
          }
          dp = await prisma.distributorProfile.create({
            data: {
              userId: existingProfile.id,
              businessName: '',
              connectionCode,
              profileComplete: false,
            }
          });
        } else if (existingProfile.role === 'shopkeeper' && !sp) {
          sp = await prisma.shopkeeperProfile.create({
            data: {
              userId: existingProfile.id,
              shopName: '',
              profileComplete: false,
            }
          });
        }

        const token = signManualToken(normalizedEmail, Date.now() + 30 * 24 * 60 * 60 * 1000);
        return res.json({
          token,
          needsSetup: true,
          profile: existingProfile,
          dp,
          sp
        });
      }
    }

    const profile = await prisma.profile.create({
      data: {
        email: normalizedEmail,
        role,
        phone: '',
      }
    });

    let dp = null;
    let sp = null;

    if (role === 'distributor') {
      let connectionCode = generateConnectionCode();
      for (let attempts = 0; attempts < 5; attempts++) {
        const codeExists = await prisma.distributorProfile.findUnique({ where: { connectionCode } });
        if (!codeExists) break;
        connectionCode = generateConnectionCode();
      }
      dp = await prisma.distributorProfile.create({
        data: {
          userId: profile.id,
          businessName: '',
          connectionCode,
          profileComplete: false,
        }
      });
    } else {
      sp = await prisma.shopkeeperProfile.create({
        data: {
          userId: profile.id,
          shopName: '',
          profileComplete: false,
        }
      });
    }

    const token = signManualToken(normalizedEmail, Date.now() + 30 * 24 * 60 * 60 * 1000);

    return res.json({
      token,
      needsSetup: true,
      profile,
      dp,
      sp
    });
  } catch (err) {
    console.error('Manual Register Error:', err);
    return res.status(500).json({ error: 'Failed to register manual account. Please try again.' });
  }
});

// Setup profile using token email
app.post('/api/auth/setup', async (req: AuthenticatedRequest, res) => {
  const { phone, role, name, businessData, shopData } = req.body;
  try {
    const email = req.authEmail;
    if (!email) return res.status(401).json({ error: 'Unauthorized' });
    if (!isRole(role)) return res.status(400).json({ error: 'Invalid role.' });

    const cleanedPhone = normalizePhone(phone);
    if (isSpamPhone(cleanedPhone)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
    }
    const cleanedName = typeof name === 'string' ? name.trim() : '';
    if (!cleanedName) {
      return res.status(400).json({ error: 'Name is required.' });
    }

    let profile = await prisma.profile.findUnique({ where: { email } });
    if (!profile) {
      const phoneConflict = await prisma.profile.findFirst({ where: { phone: cleanedPhone } });
      if (phoneConflict) {
        return res.status(409).json({ error: `This phone number is already linked to another account (${phoneConflict.email || 'no email'}).` });
      }
      profile = await prisma.profile.create({
        data: {
          email,
          phone: cleanedPhone,
          role,
          name: cleanedName,
        },
      });
    } else {
      if (!isRole(profile.role)) {
        return res.status(409).json({ error: 'Invalid account role stored for this email.' });
      }

      const { dp: existingDp, sp: existingSp } = await getRoleProfiles(profile.id);
      const hasRoleData = Boolean(existingDp || existingSp);
      if (profile.role !== role && hasRoleData) {
        return res.status(409).json({ error: `Cannot change role. This email is already registered as a ${profile.role}.` });
      }

      const phoneConflict = await prisma.profile.findFirst({
        where: {
          phone: cleanedPhone,
          id: { not: profile.id },
        },
      });
      if (phoneConflict) {
        return res.status(409).json({ error: `This phone number is already linked to another account (${phoneConflict.email || 'no email'}).` });
      }

      profile = await prisma.profile.update({
        where: { id: profile.id },
        data: {
          role,
          name: cleanedName,
          phone: cleanedPhone,
        },
      });
    }

    if (role === 'distributor') {
      const distributorType = normalizeDistributorType((businessData as { distributorType?: unknown } | undefined)?.distributorType);
      if (!isDistributorType(distributorType)) {
        return res.status(400).json({ error: 'Invalid distributor type.' });
      }

      const existingShopkeeper = await prisma.shopkeeperProfile.findUnique({ where: { userId: profile.id } });
      if (existingShopkeeper) {
        return res.status(409).json({ error: 'This account already has a shopkeeper profile.' });
      }
      const distributorPayload = {
        businessName: String((businessData as { businessName?: unknown })?.businessName ?? '').trim(),
        distributorType,
        ownerName: String((businessData as { ownerName?: unknown })?.ownerName ?? '').trim() || null,
        company: String((businessData as { company?: unknown })?.company ?? '').trim() || null,
        city: String((businessData as { city?: unknown })?.city ?? '').trim() || null,
        deliveryAreas: String((businessData as { deliveryAreas?: unknown })?.deliveryAreas ?? '').trim() || null,
        orderWindowStart: String((businessData as { orderWindowStart?: unknown })?.orderWindowStart ?? '18:00').trim(),
        orderWindowCutoff: String((businessData as { orderWindowCutoff?: unknown })?.orderWindowCutoff ?? '20:00').trim(),
        gst: (businessData as { gst?: unknown })?.gst ? String((businessData as { gst?: unknown })?.gst).trim().toUpperCase() : null,
        locationName: String((businessData as { locationName?: unknown })?.locationName ?? '').trim() || null,
        latitude: parseOptionalNumber((businessData as { latitude?: unknown })?.latitude),
        longitude: parseOptionalNumber((businessData as { longitude?: unknown })?.longitude),
        profileComplete: true,
      };
      if (!distributorPayload.businessName) {
        return res.status(400).json({ error: 'Business name is required.' });
      }
      const existingDistributor = await prisma.distributorProfile.findUnique({ where: { userId: profile.id } });
      if (existingDistributor) {
        await prisma.distributorProfile.update({
          where: { userId: profile.id },
          data: distributorPayload,
        });
      } else {
        let created = false;
        for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
          try {
            await prisma.distributorProfile.create({
              data: { userId: profile.id, connectionCode: generateConnectionCode(), ...distributorPayload },
            });
            created = true;
          } catch (err) {
            const isConnectionCodeCollision =
              err instanceof Prisma.PrismaClientKnownRequestError &&
              err.code === 'P2002' &&
              Array.isArray(err.meta?.target) &&
              err.meta?.target.includes('connection_code');

            if (!isConnectionCodeCollision) throw err;
          }
        }

        if (!created) {
          return res.status(500).json({ error: 'Unable to generate a unique connection code. Please retry.' });
        }
      }
    } else {
      const existingDistributor = await prisma.distributorProfile.findUnique({ where: { userId: profile.id } });
      if (existingDistributor) {
        return res.status(409).json({ error: 'This account already has a distributor profile.' });
      }
      const shopkeeperPayload = {
        shopName: String((shopData as { shopName?: unknown })?.shopName ?? '').trim(),
        ownerName: String((shopData as { ownerName?: unknown })?.ownerName ?? '').trim() || null,
        city: String((shopData as { city?: unknown })?.city ?? '').trim() || null,
        deliveryTiming: String((shopData as { deliveryTiming?: unknown })?.deliveryTiming ?? '').trim() || null,
        locationName: String((shopData as { locationName?: unknown })?.locationName ?? '').trim() || null,
        latitude: parseOptionalNumber((shopData as { latitude?: unknown })?.latitude),
        longitude: parseOptionalNumber((shopData as { longitude?: unknown })?.longitude),
        profileComplete: true,
      };
      if (!shopkeeperPayload.shopName) {
        return res.status(400).json({ error: 'Shop name is required.' });
      }

      await prisma.shopkeeperProfile.upsert({
        where: { userId: profile.id },
        update: shopkeeperPayload,
        create: { userId: profile.id, ...shopkeeperPayload },
      });
    }

    const { dp, sp } = await getRoleProfiles(profile.id);
    const conflict = roleConsistencyError(role, dp, sp);
    if (conflict) return res.status(409).json({ error: conflict });

    return res.json({ success: true, profile });
  } catch (error) {
    console.error(error);
    if (error instanceof Prisma.PrismaClientValidationError) {
      if (error.message.includes('Unknown argument `distributorType`')) {
        return res.status(500).json({
          error: 'Backend schema/client out of sync. Run: npm run build:api and restart server.',
        });
      }
      if (error.message.includes('Malformed ObjectID')) {
        return res.status(409).json({
          error: 'Account data format issue detected. Please contact support to migrate this profile.',
        });
      }
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({
        error: 'Duplicate data detected while saving profile. Please try with unique phone number or retry.',
      });
    }
    return res.status(500).json({ error: 'Server error during setup' });
  }
});

// Delete profile by token email
app.delete('/api/auth/me', async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getRequesterProfile(req);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // Wipe notifications and push tokens
    await prisma.notification.deleteMany({ where: { userId: profile.id } });
    await prisma.pushToken.deleteMany({ where: { userId: profile.id } });

    // Scramble email to free it up for re-registration, remove PII
    const deletedEmail = `deleted_${Date.now()}_${profile.id}@deleted.local`;
    await prisma.profile.update({
      where: { id: profile.id },
      data: {
        email: deletedEmail,
        name: 'Deleted User',
        phone: '',
        pin: null
      }
    });

    if (profile.role === 'distributor') {
      const dp = await prisma.distributorProfile.findUnique({ where: { userId: profile.id } });
      if (dp) {
        await prisma.product.deleteMany({ where: { distributorId: dp.id } });
        await prisma.connection.updateMany({
          where: { distributorId: dp.id },
          data: { status: 'rejected', businessName: 'Deleted Distributor', distributorPhone: '' }
        });
        await prisma.distributorProfile.updateMany({
          where: { userId: profile.id },
          data: {
            businessName: 'Deleted Distributor',
            ownerName: null,
            address: null,
            city: null,
            gst: null,
            profileComplete: false
          }
        });
      }
    } else if (profile.role === 'shopkeeper') {
      const sp = await prisma.shopkeeperProfile.findUnique({ where: { userId: profile.id } });
      if (sp) {
        await prisma.connection.updateMany({
          where: { shopkeeperId: sp.id },
          data: { status: 'rejected', shopName: 'Deleted Shopkeeper', shopkeeperName: 'Deleted User', shopkeeperPhone: '' }
        });
        await prisma.shopkeeperProfile.updateMany({
          where: { userId: profile.id },
          data: {
            shopName: 'Deleted Shopkeeper',
            ownerName: null,
            address: null,
            city: null,
            profileComplete: false
          }
        });
      }
    }



    return res.json({ success: true });
  } catch (error) {
    console.error('Delete Profile Error:', error);
    return res.status(500).json({ error: 'Server error during delete' });
  }
});

app.patch('/api/auth/user/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const requester = await getRequesterProfile(req);
    if (!requester) return res.status(404).json({ error: 'Profile not found' });
    if (requester.id !== req.params.id) return res.status(403).json({ error: 'Forbidden' });

    const updates: Prisma.ProfileUpdateInput = {};

    if (typeof req.body?.name === 'string') {
      const name = req.body.name.trim();
      if (!name) return res.status(400).json({ error: 'Name is required.' });
      updates.name = name;
    }

    if (req.body?.phone !== undefined) {
      const cleanedPhone = normalizePhone(req.body.phone);
      if (isSpamPhone(cleanedPhone)) {
        return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
      }
      const phoneConflict = await prisma.profile.findFirst({
        where: {
          phone: cleanedPhone,
          id: { not: requester.id },
        },
      });
      if (phoneConflict) {
        return res.status(409).json({ error: 'This phone number is already linked to another account.' });
      }
      updates.phone = cleanedPhone;
    }

    if (req.body?.pin !== undefined) {
      const pin = String(req.body.pin || '');
      if (!/^\d{6}$/.test(pin)) {
        return res.status(400).json({ error: 'PIN must be exactly 6 digits.' });
      }
      updates.pin = hashPin(pin);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid profile fields to update.' });
    }

    const updated = await prisma.profile.update({ where: { id: req.params.id }, data: updates });

    if (typeof updates.phone === 'string' && requester.role === 'shopkeeper') {
      const shopkeeperProfile = await prisma.shopkeeperProfile.findUnique({ where: { userId: requester.id } });
      if (shopkeeperProfile) {
        await prisma.connection.updateMany({
          where: { shopkeeperId: shopkeeperProfile.id },
          data: { shopkeeperPhone: updates.phone },
        });
      }
    }

    return res.json({ success: true, profile: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Profiles
app.get('/api/profiles/distributor/:userId', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    if (requester.id !== req.params.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (requester.role !== 'distributor') {
      return res.status(403).json({ error: 'Only distributor accounts can access this profile.' });
    }

    const dp = await prisma.distributorProfile.findUnique({ where: { userId: req.params.userId }, include: { user: true } });
    if (!dp) return res.status(404).json({ error: 'Not found' });
    return res.json({ ...dp, phone: dp.user.phone, email: dp.user.email });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/profiles/shopkeeper/:userId', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    if (requester.id !== req.params.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (requester.role !== 'shopkeeper') {
      return res.status(403).json({ error: 'Only shopkeeper accounts can access this profile.' });
    }

    const sp = await prisma.shopkeeperProfile.findUnique({ where: { userId: req.params.userId }, include: { user: true } });
    if (!sp) return res.status(404).json({ error: 'Not found' });
    return res.json({ ...sp, phone: sp.user.phone, email: sp.user.email });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/profiles/shopkeeper-by-id/:id', async (req, res) => {
  try {
    const sp = await prisma.shopkeeperProfile.findUnique({ where: { id: req.params.id }, include: { user: true } });
    if (!sp) return res.status(404).json({ error: 'Not found' });
    return res.json({ ...sp, phone: sp.user.phone, email: sp.user.email });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/distributors', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const dps = await prisma.distributorProfile.findMany({ 
      where: { profileComplete: true },
      include: { user: true } 
    });
    let results: any[] = dps.map((dp) => ({ ...dp, phone: dp.user.phone, email: dp.user.email }));

    if (lat !== undefined && lng !== undefined) {
      const userLat = parseFloat(lat as string);
      const userLng = parseFloat(lng as string);
      if (!Number.isNaN(userLat) && !Number.isNaN(userLng)) {
        results = results
          .map((dp) => {
            let distance: number | null = null;
            if (dp.latitude !== null && dp.latitude !== undefined && dp.longitude !== null && dp.longitude !== undefined) {
              distance = getDistanceFromLatLonInKm(userLat, userLng, dp.latitude, dp.longitude);
            }
            return { ...dp, distance };
          })
          .sort((a, b) => {
            if (a.distance === null) return 1;
            if (b.distance === null) return -1;
            return a.distance - b.distance;
          });
      }
    }

    return res.json(results);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/profiles/distributor/:id', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    if (requester.role !== 'distributor') {
      return res.status(403).json({ error: 'Only distributor accounts can update distributor profile.' });
    }

    const ownProfile = await prisma.distributorProfile.findUnique({ where: { userId: requester.id } });
    if (!ownProfile || ownProfile.id !== req.params.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Filter incoming payload to avoid mass-assignment/relation validation issues in Prisma
    const updateData: Prisma.DistributorProfileUpdateInput = {};
    if (req.body.businessName !== undefined) updateData.businessName = String(req.body.businessName).trim();
    if (req.body.distributorType !== undefined) updateData.distributorType = String(req.body.distributorType).trim();
    if (req.body.orderWindowStart !== undefined) updateData.orderWindowStart = String(req.body.orderWindowStart).trim();
    if (req.body.orderWindowCutoff !== undefined) updateData.orderWindowCutoff = String(req.body.orderWindowCutoff).trim();
    if (req.body.ownerName !== undefined) updateData.ownerName = req.body.ownerName ? String(req.body.ownerName).trim() : null;
    if (req.body.company !== undefined) updateData.company = req.body.company ? String(req.body.company).trim() : null;
    if (req.body.address !== undefined) updateData.address = req.body.address ? String(req.body.address).trim() : null;
    if (req.body.city !== undefined) updateData.city = req.body.city ? String(req.body.city).trim() : null;
    if (req.body.deliveryAreas !== undefined) updateData.deliveryAreas = req.body.deliveryAreas ? String(req.body.deliveryAreas).trim() : null;
    if (req.body.gst !== undefined) updateData.gst = req.body.gst ? String(req.body.gst).trim().toUpperCase() : null;
    if (req.body.locationName !== undefined) updateData.locationName = req.body.locationName ? String(req.body.locationName).trim() : null;
    if (req.body.latitude !== undefined) updateData.latitude = parseOptionalNumber(req.body.latitude);
    if (req.body.longitude !== undefined) updateData.longitude = parseOptionalNumber(req.body.longitude);
    if (req.body.paymentQrUrl !== undefined) updateData.paymentQrUrl = req.body.paymentQrUrl ? String(req.body.paymentQrUrl).trim() : null;
    if (req.body.profileComplete !== undefined) updateData.profileComplete = Boolean(req.body.profileComplete);

    const updated = await prisma.distributorProfile.update({ where: { id: req.params.id }, data: updateData });
    return res.json(updated);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/profiles/shopkeeper/:id', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    if (requester.role !== 'shopkeeper') {
      return res.status(403).json({ error: 'Only shopkeeper accounts can update shopkeeper profile.' });
    }

    const ownProfile = await prisma.shopkeeperProfile.findUnique({ where: { userId: requester.id } });
    if (!ownProfile || ownProfile.id !== req.params.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Filter incoming payload to avoid mass-assignment/relation validation issues in Prisma
    const updateData: Prisma.ShopkeeperProfileUpdateInput = {};
    if (req.body.shopName !== undefined) updateData.shopName = String(req.body.shopName).trim();
    if (req.body.ownerName !== undefined) updateData.ownerName = req.body.ownerName ? String(req.body.ownerName).trim() : null;
    if (req.body.address !== undefined) updateData.address = req.body.address ? String(req.body.address).trim() : null;
    if (req.body.city !== undefined) updateData.city = req.body.city ? String(req.body.city).trim() : null;
    if (req.body.deliveryTiming !== undefined) updateData.deliveryTiming = req.body.deliveryTiming ? String(req.body.deliveryTiming).trim() : null;
    if (req.body.locationName !== undefined) updateData.locationName = req.body.locationName ? String(req.body.locationName).trim() : null;
    if (req.body.latitude !== undefined) updateData.latitude = parseOptionalNumber(req.body.latitude);
    if (req.body.longitude !== undefined) updateData.longitude = parseOptionalNumber(req.body.longitude);
    if (req.body.profileComplete !== undefined) updateData.profileComplete = Boolean(req.body.profileComplete);

    const updated = await prisma.shopkeeperProfile.update({ where: { id: req.params.id }, data: updateData });
    return res.json(updated);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Connections
app.get('/api/connections/:role/:userId', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    const { role, userId } = req.params;
    if (requester.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (requester.role !== role) {
      return res.status(403).json({ error: 'Role mismatch.' });
    }

    if (role === 'distributor') {
      const dp = await prisma.distributorProfile.findUnique({ where: { userId } });
      if (!dp) return res.json([]);
      const conns = await prisma.connection.findMany({
        where: { distributorId: dp.id },
        orderBy: { createdAt: 'desc' },
      });
      // Deduplicate by shopkeeperId
      const uniqueMap = new Map<string, typeof conns[0]>();
      for (const c of conns) {
        if (!c.shopkeeperId) continue;
        const existing = uniqueMap.get(c.shopkeeperId);
        if (!existing) {
          uniqueMap.set(c.shopkeeperId, c);
        } else {
          if (existing.status !== 'active' && c.status === 'active') {
            uniqueMap.set(c.shopkeeperId, c);
          }
        }
      }
      return res.json(Array.from(uniqueMap.values()));
    }

    const sp = await prisma.shopkeeperProfile.findUnique({ where: { userId } });
    if (!sp) return res.json([]);
    const conns = await prisma.connection.findMany({
      where: { shopkeeperId: sp.id },
      orderBy: { createdAt: 'desc' },
    });
    // Deduplicate by distributorId
    const uniqueMap = new Map<string, typeof conns[0]>();
    for (const c of conns) {
      if (!c.distributorId) continue;
      const existing = uniqueMap.get(c.distributorId);
      if (!existing) {
        uniqueMap.set(c.distributorId, c);
      } else {
        if (existing.status !== 'active' && c.status === 'active') {
          uniqueMap.set(c.distributorId, c);
        }
      }
    }
    return res.json(Array.from(uniqueMap.values()));
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/connections', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    if (requester.role !== 'shopkeeper') {
      return res.status(403).json({ error: 'Only shopkeepers can request new connections.' });
    }

    const { shopkeeperId, shopkeeperName, shopName, distributorCode, shopkeeperPhone } = req.body;
    const ownShopkeeper = await prisma.shopkeeperProfile.findUnique({ where: { userId: requester.id } });
    if (!ownShopkeeper || ownShopkeeper.id !== shopkeeperId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const dp = await prisma.distributorProfile.findUnique({ where: { connectionCode: distributorCode } });
    if (!dp) return res.status(404).json({ error: 'Invalid code' });

    // Prevent duplicate connections or pending requests
    const existingConn = await prisma.connection.findFirst({
      where: {
        shopkeeperId,
        distributorId: dp.id,
      },
    });

    if (existingConn) {
      if (existingConn.status === 'active') {
        return res.status(400).json({ error: 'You are already connected to this distributor.' });
      }
      if (existingConn.status === 'pending') {
        return res.status(400).json({ error: 'A connection request is already pending.' });
      }
      // If rejected, reuse the record and update it to pending
      const updatedConn = await prisma.connection.update({
        where: { id: existingConn.id },
        data: {
          shopkeeperName,
          shopName,
          shopkeeperPhone,
          status: 'pending',
          createdAt: new Date(),
        },
      });

      // Send notifications for recycled connection request
      try {
        if (dp.userId) {
          await createNotificationAndPush({
            userId: dp.userId,
            type: 'new_connection',
            title: 'New Connection Request',
            message: `${shopName || shopkeeperName || 'Shopkeeper'} wants to connect with you.`,
            data: { connectionId: updatedConn.id, role: 'distributor' },
          });
        }
        const ownSp = await prisma.shopkeeperProfile.findUnique({ where: { id: shopkeeperId } });
        if (ownSp?.userId) {
          await createNotificationAndPush({
            userId: ownSp.userId,
            type: 'connection_requested',
            title: 'Request Sent',
            message: `Your connection request has been sent to ${dp.businessName || 'Distributor'}.`,
            data: { connectionId: updatedConn.id, role: 'shopkeeper' },
          });
        }
      } catch (err) {
        console.error('Error sending recycled connection request notifications:', err);
      }

      return res.json({ connection: updatedConn, distributorUserId: dp.userId });
    }

    const conn = await prisma.connection.create({
      data: {
        shopkeeperId,
        shopkeeperName,
        shopName,
        shopkeeperPhone,
        distributorId: dp.id,
        distributorName: dp.ownerName || '',
        businessName: dp.businessName,
        status: 'pending',
        autoOrderEnabled: false,
      },
    });

    // Send notifications for new connection request
    try {
      if (dp.userId) {
        await createNotificationAndPush({
          userId: dp.userId,
          type: 'new_connection',
          title: 'New Connection Request',
          message: `${shopName || shopkeeperName || 'Shopkeeper'} wants to connect with you.`,
          data: { connectionId: conn.id, role: 'distributor' },
        });
      }
      const ownSp = await prisma.shopkeeperProfile.findUnique({ where: { id: shopkeeperId } });
      if (ownSp?.userId) {
        await createNotificationAndPush({
          userId: ownSp.userId,
          type: 'connection_requested',
          title: 'Request Sent',
          message: `Your connection request has been sent to ${dp.businessName || 'Distributor'}.`,
          data: { connectionId: conn.id, role: 'shopkeeper' },
        });
      }
    } catch (err) {
      console.error('Error sending new connection request notifications:', err);
    }

    return res.json({ connection: conn, distributorUserId: dp.userId });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/connections/:id', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    const conn = await prisma.connection.findUnique({ where: { id: req.params.id } });
    if (!conn) return res.status(404).json({ error: 'Not found' });

    if (requester.role === 'distributor') {
      const ownDp = await prisma.distributorProfile.findUnique({ where: { userId: requester.id } });
      const allowed = (ownDp && conn.distributorId === ownDp.id) || conn.distributorId === requester.id;
      if (!allowed) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else if (requester.role === 'shopkeeper') {
      const ownSp = await prisma.shopkeeperProfile.findUnique({ where: { userId: requester.id } });
      const phoneMatches = conn.shopkeeperPhone && conn.shopkeeperPhone === requester.phone;
      const allowed = (ownSp && conn.shopkeeperId === ownSp.id) || conn.shopkeeperId === requester.id || phoneMatches;
      if (!allowed) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Filter incoming payload properties to only allow updating valid database fields
    const updateData: Prisma.ConnectionUpdateInput = {};
    if (req.body.status !== undefined) updateData.status = String(req.body.status).trim();
    if (req.body.autoOrderEnabled !== undefined) updateData.autoOrderEnabled = Boolean(req.body.autoOrderEnabled);
    if (req.body.autoOrderTime !== undefined) updateData.autoOrderTime = req.body.autoOrderTime ? String(req.body.autoOrderTime).trim() : null;
    if (req.body.deliveryGroupId !== undefined) updateData.deliveryGroupId = req.body.deliveryGroupId ? String(req.body.deliveryGroupId).trim() : null;
    if (req.body.deliveryGroupName !== undefined) updateData.deliveryGroupName = req.body.deliveryGroupName ? String(req.body.deliveryGroupName).trim() : null;
    if (req.body.shopkeeperPhone !== undefined) updateData.shopkeeperPhone = req.body.shopkeeperPhone ? String(req.body.shopkeeperPhone).trim() : null;

        const updated = await prisma.connection.update({ where: { id: req.params.id }, data: updateData });

    // Send notifications if connection status changes to active or rejected
    if (updated.status === 'active' && conn.status !== 'active') {
      try {
        if (updated.shopkeeperId) {
          const sp = await prisma.shopkeeperProfile.findUnique({ where: { id: updated.shopkeeperId } });
          if (sp?.userId) {
            await createNotificationAndPush({
              userId: sp.userId,
              type: 'connection_accepted',
              title: 'Connection Accepted',
              message: `${updated.businessName || 'Distributor'} accepted your connection request. You can now place orders.`,
              data: { connectionId: updated.id, role: 'shopkeeper' },
            });
          }
        }
        if (updated.distributorId) {
          const dp = await prisma.distributorProfile.findUnique({ where: { id: updated.distributorId } });
          if (dp?.userId) {
            await createNotificationAndPush({
              userId: dp.userId,
              type: 'connection_active',
              title: 'Connection Active',
              message: `You are now connected with ${updated.shopName || updated.shopkeeperName || 'Shopkeeper'}.`,
              data: { connectionId: updated.id, role: 'distributor' },
            });
          }
        }
      } catch (err) {
        console.error('Error sending connection active notifications:', err);
      }
    } else if (updated.status === 'rejected' && conn.status !== 'rejected') {
      try {
        if (updated.shopkeeperId) {
          const sp = await prisma.shopkeeperProfile.findUnique({ where: { id: updated.shopkeeperId } });
          if (sp?.userId) {
            await createNotificationAndPush({
              userId: sp.userId,
              type: 'connection_rejected',
              title: 'Connection Rejected',
              message: `${updated.businessName || 'Distributor'} rejected your connection request.`,
              data: { connectionId: updated.id, role: 'shopkeeper' },
            });
          }
        }
        if (updated.distributorId) {
          const dp = await prisma.distributorProfile.findUnique({ where: { id: updated.distributorId } });
          if (dp?.userId) {
            await createNotificationAndPush({
              userId: dp.userId,
              type: 'connection_rejected',
              title: 'Connection Rejected',
              message: `You rejected the connection request from ${updated.shopName || updated.shopkeeperName || 'Shopkeeper'}.`,
              data: { connectionId: updated.id, role: 'distributor' },
            });
          }
        }
      } catch (err) {
        console.error('Error sending connection rejected notifications:', err);
      }
    }

    return res.json(updated);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/connections/:id', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    const conn = await prisma.connection.findUnique({ where: { id: req.params.id } });
    if (!conn) return res.status(404).json({ error: 'Not found' });

    if (requester.role === 'distributor') {
      const ownDp = await prisma.distributorProfile.findUnique({ where: { userId: requester.id } });
      const allowed = (ownDp && conn.distributorId === ownDp.id) || conn.distributorId === requester.id;
      if (!allowed) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else if (requester.role === 'shopkeeper') {
      const ownSp = await prisma.shopkeeperProfile.findUnique({ where: { userId: requester.id } });
      const phoneMatches = conn.shopkeeperPhone && conn.shopkeeperPhone === requester.phone;
      const allowed = (ownSp && conn.shopkeeperId === ownSp.id) || conn.shopkeeperId === requester.id || phoneMatches;
      if (!allowed) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.connection.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Products Suggestions
app.get('/api/products/suggestions', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    if (requester.role !== 'distributor') {
      return res.status(403).json({ error: 'Only distributor accounts can access product suggestions.' });
    }

    const ownDp = await prisma.distributorProfile.findUnique({ where: { userId: requester.id } });
    if (!ownDp) return res.status(403).json({ error: 'Distributor profile not found' });

    const products = await prisma.product.findMany({
      where: {
        available: true,
        distributorId: { not: ownDp.id },
      },
      take: 200,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const seen = new Set<string>();
    const suggestions: any[] = [];
    for (const p of products) {
      const key = `${p.name.trim().toLowerCase()}|${(p.brand || '').trim().toLowerCase()}|${(p.unit || '').trim().toLowerCase()}|${p.category.trim().toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        suggestions.push({
          id: p.id,
          name: p.name,
          brand: p.brand,
          category: normalizeCategory(p.category),
          businessLine: inferBusinessLine(p.category, p.businessLine),
          unit: String(p.unit ?? '').trim(),
          price: p.price,
          imageUrl: p.imageUrl,
          showStock: p.showStock === true,
          stockQuantity: p.stockQuantity !== null && p.stockQuantity !== undefined ? p.stockQuantity : 0,
        });
      }
    }

    if (suggestions.length < 5) {
      const defaultTemplates = [
        { name: "Fresh Milk", brand: "Amul", category: "milk", businessLine: "dairy", unit: "1 Litre", price: 66, imageUrl: null, showStock: false, stockQuantity: 0 },
        { name: "Paneer", brand: "Amul", category: "paneer", businessLine: "dairy", unit: "200g Pack", price: 90, imageUrl: null, showStock: false, stockQuantity: 0 },
        { name: "Fresh Dahi", brand: "Mother Dairy", category: "curd", businessLine: "dairy", unit: "400g Cup", price: 50, imageUrl: null, showStock: false, stockQuantity: 0 },
        { name: "Vanilla Cup", brand: "Amul", category: "cup", businessLine: "icecream", unit: "Pack of 10", price: 200, imageUrl: null, showStock: true, stockQuantity: 20 },
        { name: "Chocolate Cone", brand: "Kwality Walls", category: "cone", businessLine: "icecream", unit: "Pack of 6", price: 240, imageUrl: null, showStock: true, stockQuantity: 15 },
        { name: "Kulfi", brand: "Amul", category: "kulfi", businessLine: "icecream", unit: "Pack of 10", price: 750, imageUrl: null, showStock: true, stockQuantity: 10 },
      ];
      for (const t of defaultTemplates) {
        const key = `${t.name.toLowerCase()}|${t.brand.toLowerCase()}|${t.unit.toLowerCase()}|${t.category.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          suggestions.push({
            id: `temp_${t.name.replace(/\s+/g, '_')}`,
            name: t.name,
            brand: t.brand,
            category: normalizeCategory(t.category),
            businessLine: t.businessLine,
            unit: t.unit,
            price: t.price,
            imageUrl: t.imageUrl,
            showStock: t.showStock,
            stockQuantity: t.stockQuantity,
          });
        }
      }
    }

    return res.json(suggestions);
  } catch (e) {
    console.error('Suggestions endpoint failed:', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Products
app.get('/api/products/:distributorId', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;

    const distributorId = req.params.distributorId;
    const distributorProfile = await prisma.distributorProfile.findUnique({ where: { id: distributorId } });
    if (!distributorProfile) return res.status(404).json({ error: 'Distributor not found' });

    if (requester.role === 'distributor') {
      if (requester.id !== distributorProfile.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else if (requester.role === 'shopkeeper') {
      const ownShopkeeper = await prisma.shopkeeperProfile.findUnique({ where: { userId: requester.id } });
      if (!ownShopkeeper) return res.status(403).json({ error: 'Forbidden' });
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const distributorType = normalizeDistributorType(distributorProfile.distributorType);
    const allowedLines = getAllowedBusinessLines(distributorType);
    const products = await prisma.product.findMany({ where: { distributorId } });
    const safeProducts = products.filter(product => {
      const businessLine = inferBusinessLine(product.category, product.businessLine);
      return allowedLines.includes(businessLine);
    });
    return res.json(
      safeProducts.map(product => ({
        ...product,
        category: normalizeCategory(product.category),
        businessLine: inferBusinessLine(product.category, product.businessLine),
        quantity: String(product.unit ?? '').trim(),
      }))
    );
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});
app.post('/api/products', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    if (requester.role !== 'distributor') {
      return res.status(403).json({ error: 'Only distributor accounts can add products.' });
    }

    const ownDistributor = await prisma.distributorProfile.findUnique({ where: { userId: requester.id } });
    if (!ownDistributor) return res.status(403).json({ error: 'Distributor profile not found' });

    const distributorId = String(req.body?.distributorId ?? '');
    if (distributorId !== ownDistributor.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const name = String(req.body?.name ?? '').trim();
    const brand = String(req.body?.brand ?? '').trim();
    const quantity = String(req.body?.quantity ?? req.body?.unit ?? '').trim();
    const category = normalizeCategory(req.body?.category);
    const price = Number(req.body?.price);
    const available = req.body?.available !== false;
    const businessLine = inferBusinessLine(category, req.body?.businessLine);
    const imageUrl = req.body?.imageUrl ? String(req.body.imageUrl).trim() : null;

    if (!name || !brand || !quantity || !Number.isFinite(price) || price < 0) {
      return res.status(400).json({ error: 'Invalid product payload.' });
    }

    const distributorType = normalizeDistributorType(ownDistributor.distributorType);
    const allowedLines = getAllowedBusinessLines(distributorType);
    if (!allowedLines.includes(businessLine)) {
      return res.status(400).json({ error: `This distributor can only add ${allowedLines.join(' / ')} products.` });
    }

    const created = await prisma.product.create({
      data: {
        distributorId,
        name,
        brand,
        category,
        businessLine,
        unit: quantity,
        price,
        available,
        imageUrl,
        ...(businessLine === 'icecream' ? {
          stockQuantity: req.body?.stockQuantity !== undefined ? Number(req.body.stockQuantity) : 0,
          showStock: req.body?.showStock === true
        } : {})
      },
    });

    return res.json({ ...created, quantity: String(created.unit ?? '').trim() });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});
app.patch('/api/products/:id', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    if (requester.role !== 'distributor') {
      return res.status(403).json({ error: 'Only distributor accounts can update products.' });
    }
    const ownDistributor = await prisma.distributorProfile.findUnique({ where: { userId: requester.id } });
    if (!ownDistributor) return res.status(403).json({ error: 'Distributor profile not found' });

    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.distributorId !== ownDistributor.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const category = req.body?.category !== undefined ? normalizeCategory(req.body.category) : normalizeCategory(existing.category);
    const businessLine = inferBusinessLine(category, req.body?.businessLine ?? existing.businessLine);
    const distributorType = normalizeDistributorType(ownDistributor.distributorType);
    const allowedLines = getAllowedBusinessLines(distributorType);
    if (!allowedLines.includes(businessLine)) {
      return res.status(400).json({ error: `This distributor can only keep ${allowedLines.join(' / ')} products.` });
    }
    if (req.body?.quantity !== undefined || req.body?.unit !== undefined) {
      const normalizedQuantity = String(req.body?.quantity ?? req.body?.unit ?? '').trim();
      if (!normalizedQuantity) {
        return res.status(400).json({ error: 'Quantity is required.' });
      }
    }

    const updatePayload = {
      distributorId: existing.distributorId,
      ...(req.body?.name !== undefined ? { name: String(req.body.name).trim() } : {}),
      ...(req.body?.brand !== undefined ? { brand: String(req.body.brand).trim() } : {}),
      ...((req.body?.quantity !== undefined || req.body?.unit !== undefined)
        ? { unit: String(req.body?.quantity ?? req.body?.unit ?? '').trim() }
        : {}),
      ...(req.body?.price !== undefined ? { price: Number(req.body.price) } : {}),
      ...(req.body?.available !== undefined ? { available: req.body.available !== false } : {}),
      ...(req.body?.category !== undefined ? { category } : {}),
       businessLine,
      ...(req.body?.imageUrl !== undefined ? { imageUrl: req.body.imageUrl ? String(req.body.imageUrl).trim() : null } : {}),
      ...(businessLine === 'icecream' && req.body?.stockQuantity !== undefined ? { stockQuantity: Number(req.body.stockQuantity) } : {}),
      ...(businessLine === 'icecream' && req.body?.showStock !== undefined ? { showStock: req.body.showStock === true } : {})
    };

    const updated = await prisma.product.update({ where: { id: req.params.id }, data: updatePayload });
    return res.json({ ...updated, quantity: String(updated.unit ?? '').trim() });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});
app.delete('/api/products/:id', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    if (requester.role !== 'distributor') {
      return res.status(403).json({ error: 'Only distributor accounts can delete products.' });
    }
    const ownDistributor = await prisma.distributorProfile.findUnique({ where: { userId: requester.id } });
    if (!ownDistributor) return res.status(403).json({ error: 'Distributor profile not found' });
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.distributorId !== ownDistributor.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.product.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Orders
app.get('/api/orders/:role/:userId', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    const { role, userId } = req.params;
    if (requester.id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (requester.role !== role) {
      return res.status(403).json({ error: 'Role mismatch.' });
    }

    const dp = role === 'distributor' ? await prisma.distributorProfile.findUnique({ where: { userId } }) : null;
    const sp = role === 'shopkeeper' ? await prisma.shopkeeperProfile.findUnique({ where: { userId } }) : null;
    const profileId = dp?.id || sp?.id;
    if (!profileId) return res.json([]);

    const field = role === 'distributor' ? 'distributorId' : 'shopkeeperId';
    return res.json(await prisma.order.findMany({ where: { [field]: profileId }, include: { items: true }, orderBy: { placedAt: 'desc' } }));
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/reminders/send', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    if (requester.role !== 'distributor') {
      return res.status(403).json({ error: 'Only distributor accounts can send reminders.' });
    }
    const { shopkeeperId } = req.body;
    const shopkeeper = await prisma.shopkeeperProfile.findUnique({
      where: { id: shopkeeperId },
      include: { user: true }
    });
    if (!shopkeeper || !shopkeeper.userId) {
      return res.status(404).json({ error: 'Shopkeeper not found' });
    }
    const distributor = await prisma.distributorProfile.findUnique({
      where: { userId: requester.id }
    });

    await createNotificationAndPush({
      userId: shopkeeper.userId,
      type: 'order_reminder',
      title: 'Order Reminder 🔔',
      message: `Dear ${shopkeeper.shopName || 'Shopkeeper'}, you haven't placed your order for today with ${distributor?.businessName || 'your distributor'}. Please place it soon!`,
      data: { role: 'shopkeeper' }
    });

    await createNotificationAndPush({
      userId: requester.id,
      type: 'order_reminder',
      title: 'Reminder Sent',
      message: `Order reminder was successfully sent to ${shopkeeper.shopName || shopkeeper.shopkeeperName || 'the shopkeeper'}.`,
      data: { role: 'distributor' }
    });

    return res.json({ success: true });
  } catch (e: any) {
    console.error('Reminder failed:', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    if (requester.role !== 'shopkeeper') {
      return res.status(403).json({ error: 'Only shopkeeper accounts can place orders.' });
    }

    const { shopkeeperId, shopkeeperName, shopName, distributorId, items, isLate } = req.body;
    const ownShopkeeper = await prisma.shopkeeperProfile.findUnique({ where: { userId: requester.id } });
    if (!ownShopkeeper || ownShopkeeper.id !== shopkeeperId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const activeConnection = await prisma.connection.findFirst({
      where: {
        shopkeeperId,
        distributorId,
        status: 'active',
      },
    });
    if (!activeConnection) {
      return res.status(403).json({ error: 'Active connection required before placing order.' });
    }

    const distributorProfile = await prisma.distributorProfile.findUnique({ where: { id: distributorId } });
    if (!distributorProfile) return res.status(404).json({ error: 'Distributor not found' });
    const distributorType = normalizeDistributorType(distributorProfile.distributorType);
    const allowedLines = getAllowedBusinessLines(distributorType);

    const rawItems = Array.isArray(items) ? items : [];
    if (rawItems.length === 0) {
      return res.status(400).json({ error: 'Order must have at least one item.' });
    }

    const requestedItems = rawItems
      .map((item: any) => ({
        productId: String(item?.product?.id ?? ''),
        quantity: Number(item?.quantity ?? 0),
      }))
      .filter(item => item.productId.length > 0 && Number.isFinite(item.quantity) && item.quantity > 0);

    if (requestedItems.length === 0) {
      return res.status(400).json({ error: 'Order has invalid items.' });
    }

    const productIds = Array.from(new Set(requestedItems.map(item => item.productId)));
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        distributorId,
        available: true,
      },
    });
    if (products.length !== productIds.length) {
      return res.status(400).json({ error: 'Some selected products are invalid or unavailable.' });
    }
    const productById = new Map(products.map(product => [product.id, product]));

    const lineSet = new Set<BusinessLine>();
    const orderItemsPayload = requestedItems.map(item => {
      const product = productById.get(item.productId);
      if (!product) throw new Error('INVALID_PRODUCT');
      const businessLine = inferBusinessLine(product.category, product.businessLine);
      lineSet.add(businessLine);
      return {
        productId: product.id,
        productName: product.name,
        brand: product.brand,
        category: product.category,
        businessLine,
        unit: product.unit,
        unitPrice: product.price,
        quantity: item.quantity,
      };
    });

    if (lineSet.size > 1) {
      return res.status(400).json({ error: 'Dual distributor orders must contain only one section at a time (Dairy or Ice Cream).' });
    }

    const orderLine = orderItemsPayload[0]?.businessLine || inferBusinessLine('other');
    if (!allowedLines.includes(orderLine)) {
      return res.status(400).json({ error: `This distributor accepts only ${allowedLines.join(' / ')} orders.` });
    }

    const total = orderItemsPayload.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0), 0);

    if (orderLine === 'icecream' || orderLine === 'dual') {
      for (const item of orderItemsPayload) {
        const prod = productById.get(item.productId);
        if (prod && inferBusinessLine(prod.category, prod.businessLine) === 'icecream' && prod.showStock) {
          if ((prod.stockQuantity || 0) < Number(item.quantity)) {
            return res.status(400).json({ error: `Insufficient stock for ${prod.name}` });
          }
        }
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const order = await prisma.order.create({
      data: {
        shopkeeperId,
        shopkeeperName,
        shopName,
        distributorId,
        businessLine: orderLine,
        type: isLate ? 'late' : 'normal',
        status: 'pending',
        paymentStatus: 'unpaid',
        source: 'web',
        deliveryDate: new Date(today),
        total,
        items: {
          create: orderItemsPayload,
        },
      },
      include: { items: true },
    });

    if (orderLine === 'icecream' || orderLine === 'dual') {
      try {
        for (const item of orderItemsPayload) {
          const prod = productById.get(item.productId);
          if (prod && inferBusinessLine(prod.category, prod.businessLine) === 'icecream' && prod.showStock && prod.stockQuantity !== null) {
            const newStock = Math.max(0, prod.stockQuantity - Number(item.quantity));
            await prisma.product.update({
              where: { id: item.productId },
              data: { stockQuantity: newStock }
            });
            if (newStock === 0) {
               const dpObj = await prisma.distributorProfile.findUnique({ where: { id: distributorId } });
               if (dpObj?.userId) {
                 await createNotificationAndPush({
                   userId: dpObj.userId,
                   type: 'stock_alert',
                   title: 'Stock Unavailable',
                   message: `${prod.name} is out of stock. Please refill immediately.`
                 });
               }
            }
          }
        }
      } catch (stockErr) {
        console.error('Failed to update stock quantity:', stockErr);
      }
    }
    const dp = await prisma.distributorProfile.findUnique({ where: { id: distributorId } });
    const shortOrderId = order.id.slice(-6).toUpperCase();
    const orderMessage = `${shopName} placed ${isLate ? 'a late order' : 'an order'} #${shortOrderId} worth Rs. ${Number(total || 0).toLocaleString('en-IN')}.`;
    try {
      await createNotificationAndPush({
        userId: dp?.userId,
        type: isLate ? 'late_order' : 'order_placed',
        title: isLate ? 'Late order received' : 'New order received',
        message: orderMessage,
        data: { orderId: order.id, role: 'distributor' },
      });
      await createNotificationAndPush({
        userId: requester.id,
        type: 'order_pending',
        title: 'Order placed',
        message: isLate
          ? `Your late order #${shortOrderId} was sent to ${dp?.businessName || 'your distributor'} for approval.`
          : `Your order #${shortOrderId} was sent to ${dp?.businessName || 'your distributor'} for approval.`,
        data: { orderId: order.id, role: 'shopkeeper' },
      });
    } catch (notificationError) {
      console.error('Order notification failed:', notificationError);
    }
    return res.json({ order, distributorUserId: dp?.userId });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/orders/manual-bill', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    if (requester.role !== 'distributor') {
      return res.status(403).json({ error: 'Only distributor accounts can create manual bills.' });
    }

    const ownDp = await prisma.distributorProfile.findUnique({ where: { userId: requester.id } });
    if (!ownDp) return res.status(403).json({ error: 'Distributor profile missing.' });

    const distributorId = String(req.body?.distributorId ?? '').trim();
    if (ownDp.id !== distributorId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const shopName = String(req.body?.shopName ?? '').trim();
    const shopkeeperName = String(req.body?.shopkeeperName ?? '').trim();
    const shopkeeperIdRaw = String(req.body?.shopkeeperId ?? '').trim();
    const shopkeeperId = shopkeeperIdRaw || null;

    if (!shopName || !shopkeeperName) {
      return res.status(400).json({ error: 'Shop name and shopkeeper name are required.' });
    }

    if (shopkeeperId) {
      const connection = await prisma.connection.findFirst({
        where: {
          distributorId,
          shopkeeperId,
          status: 'active',
        },
      });
      if (!connection) {
        return res.status(403).json({ error: 'Selected shopkeeper is not connected with this distributor.' });
      }
    }

    const distributorType = normalizeDistributorType(ownDp.distributorType);
    const allowedLines = getAllowedBusinessLines(distributorType);
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
    const gstEnabled = Boolean(req.body?.gstEnabled);
    const fallbackGstPercent = Number(req.body?.gstPercent ?? 0);
    const cgstPercent = gstEnabled ? Math.max(0, Number(req.body?.cgstPercent ?? fallbackGstPercent / 2)) : 0;
    const sgstPercent = gstEnabled ? Math.max(0, Number(req.body?.sgstPercent ?? fallbackGstPercent / 2)) : 0;
    const gstPercent = cgstPercent + sgstPercent;

    if (
      gstEnabled &&
      (!Number.isFinite(cgstPercent) ||
        !Number.isFinite(sgstPercent) ||
        cgstPercent < 0 ||
        sgstPercent < 0 ||
        gstPercent > 100)
    ) {
      return res.status(400).json({ error: 'CGST and SGST total must be between 0 and 100.' });
    }

    if (rawItems.length === 0) {
      return res.status(400).json({ error: 'Bill must have at least one item.' });
    }

    const requestedItems: RequestedLineItem[] = rawItems
      .map((item: any) => ({
        productId: String(item?.productId ?? item?.product?.id ?? '').trim(),
        quantity: Number(item?.quantity ?? 0),
      }))
      .filter((item: RequestedLineItem) => item.productId.length > 0 && Number.isFinite(item.quantity) && item.quantity > 0);

    if (requestedItems.length === 0) {
      return res.status(400).json({ error: 'Bill has invalid items.' });
    }

    const productIds = Array.from(new Set(requestedItems.map(item => item.productId)));
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        distributorId,
        available: true,
      },
    });
    if (products.length !== productIds.length) {
      return res.status(400).json({ error: 'Some selected products are invalid or unavailable.' });
    }

    const productById = new Map(products.map(product => [product.id, product]));
    const lineSet = new Set<BusinessLine>();
    const orderItemsPayload = requestedItems.map(item => {
      const product = productById.get(item.productId);
      if (!product) throw new Error('INVALID_PRODUCT');
      const businessLine = inferBusinessLine(product.category, product.businessLine);
      lineSet.add(businessLine);
      return {
        productId: product.id,
        productName: product.name,
        brand: product.brand,
        category: product.category,
        businessLine,
        unit: product.unit,
        unitPrice: product.price,
        quantity: item.quantity,
      };
    });

    if (lineSet.size > 1) {
      return res.status(400).json({ error: 'Bill must contain only one section at a time (Dairy or Ice Cream).' });
    }

    const orderLine = orderItemsPayload[0]?.businessLine || inferBusinessLine('other');
    if (!allowedLines.includes(orderLine)) {
      return res.status(400).json({ error: `This distributor accepts only ${allowedLines.join(' / ')} bills.` });
    }

    const subtotal = orderItemsPayload.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0), 0);
    const total = subtotal + (gstPercent > 0 ? subtotal * (gstPercent / 100) : 0);
    const today = new Date().toISOString().split('T')[0];

    if (orderLine === 'icecream' || orderLine === 'dual') {
      const productIds = Array.from(new Set(orderItemsPayload.map(item => item.productId)));
      const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
      const productById = new Map(products.map(p => [p.id, p]));
      for (const item of orderItemsPayload) {
        const prod = productById.get(item.productId);
        if (prod && inferBusinessLine(prod.category, prod.businessLine) === 'icecream' && prod.showStock) {
          if ((prod.stockQuantity || 0) < Number(item.quantity)) {
            return res.status(400).json({ error: `Insufficient stock for ${prod.name}` });
          }
        }
      }
      for (const item of orderItemsPayload) {
        const prod = productById.get(item.productId);
        if (prod && inferBusinessLine(prod.category, prod.businessLine) === 'icecream' && prod.showStock && prod.stockQuantity !== null) {
          const newStock = Math.max(0, prod.stockQuantity - Number(item.quantity));
          await prisma.product.update({
            where: { id: item.productId },
            data: { stockQuantity: newStock }
          });
          if (newStock === 0) {
             const dpObj = await prisma.distributorProfile.findUnique({ where: { id: distributorId } });
             if (dpObj?.userId) {
               await createNotificationAndPush({
                 userId: dpObj.userId,
                 type: 'stock_alert',
                 title: 'Stock Unavailable',
                 message: `${prod.name} is out of stock. Please refill immediately.`
               });
             }
          }
        }
      }
    }

    const order = await prisma.order.create({
      data: {
        shopkeeperId,
        shopkeeperName,
        shopName,
        distributorId,
        businessLine: orderLine,
        type: 'normal',
        status: 'accepted',
        paymentStatus: 'unpaid',
        source: 'web',
        deliveryDate: new Date(today),
        total,
        items: {
          create: orderItemsPayload,
        },
      },
      include: { items: true },
    });

    return res.json({ order });
  } catch (error) {
    console.error('Manual bill create error:', error);
    return res.status(500).json({ error: 'Manual bill create failed' });
  }
});

app.patch('/api/orders/:id', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true }
    });
    if (!order) return res.status(404).json({ error: 'Not found' });

    if (requester.role === 'distributor') {
      const ownDp = await prisma.distributorProfile.findUnique({ where: { userId: requester.id } });
      if (!ownDp || order.distributorId !== ownDp.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else if (requester.role === 'shopkeeper') {
      const ownSp = await prisma.shopkeeperProfile.findUnique({ where: { userId: requester.id } });
      if (!ownSp || order.shopkeeperId !== ownSp.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    // One-way payment lock: once paid, do not allow reverting to unpaid.
    if (order.paymentStatus === 'paid' && req.body?.paymentStatus === 'unpaid') {
      return res.status(409).json({ error: 'Payment already marked as paid. Reverting to unpaid is not allowed.' });
    }

    // Filter incoming payload properties to only allow updating valid database fields
    const updateData: Prisma.OrderUpdateInput = {};
    if (req.body.status !== undefined) updateData.status = String(req.body.status).trim();
    if (req.body.paymentStatus !== undefined) updateData.paymentStatus = String(req.body.paymentStatus).trim();
    if (req.body.deliveryGroupName !== undefined) updateData.deliveryGroupName = req.body.deliveryGroupName ? String(req.body.deliveryGroupName).trim() : null;
    if (req.body.cancelReason !== undefined) updateData.cancelReason = req.body.cancelReason ? String(req.body.cancelReason).trim() : null;

    const updated = await prisma.order.update({ where: { id: req.params.id }, data: updateData });

    const wasTerminated = order.status === 'rejected' || order.status === 'cancelled';
    const isTerminated = updated.status === 'rejected' || updated.status === 'cancelled';

    if (!wasTerminated && isTerminated) {
      try {
        for (const item of order.items) {
          if (item.productId) {
            const prod = await prisma.product.findUnique({ where: { id: item.productId } });
            if (prod && inferBusinessLine(prod.category, prod.businessLine) === 'icecream' && prod.showStock && prod.stockQuantity !== null) {
              const restoredStock = prod.stockQuantity + Number(item.quantity);
              await prisma.product.update({
                where: { id: item.productId },
                data: { stockQuantity: restoredStock },
              });
            }
          }
        }
      } catch (err) {
        console.error('Failed to restore stock on rejection/cancellation:', err);
      }
    }

    if (order.status !== updated.status && updated.shopkeeperId) {
      try {
        const shopkeeper = await prisma.shopkeeperProfile.findUnique({ where: { id: updated.shopkeeperId } });
        const distributor = updated.distributorId
          ? await prisma.distributorProfile.findUnique({ where: { id: updated.distributorId } })
          : null;
        const shortOrderId = updated.id.slice(-6).toUpperCase();
        const statusNotification = getOrderStatusNotification(updated.status);
        if (shopkeeper?.userId) {
          await createNotificationAndPush({
            userId: shopkeeper.userId,
            type: statusNotification.type,
            title: statusNotification.title,
            message: updated.status === 'cancelled' && updated.cancelReason 
              ? `${distributor?.businessName || 'Distributor'} cancelled order #${shortOrderId}. Reason: ${updated.cancelReason}.`
              : `${distributor?.businessName || 'Distributor'} marked order #${shortOrderId} as ${updated.status}.`,
            data: { orderId: updated.id, status: updated.status, role: 'shopkeeper' },
          });
        }
        if (distributor?.userId) {
          await createNotificationAndPush({
            userId: distributor.userId,
            type: statusNotification.type,
            title: statusNotification.title,
            message: updated.status === 'cancelled' && updated.cancelReason
              ? `You cancelled order #${shortOrderId} for ${shopkeeper?.businessName || 'A shop'}. Reason: ${updated.cancelReason}.`
              : `You marked order #${shortOrderId} for ${shopkeeper?.businessName || 'A shop'} as ${updated.status}.`,
            data: { orderId: updated.id, status: updated.status, role: 'distributor' },
          });
        }
      } catch (notificationError) {
        console.error('Order status notification failed:', notificationError);
      }
    }

    if (order.paymentStatus !== 'paid' && updated.paymentStatus === 'paid') {
      const distributor = order.distributorId
        ? await prisma.distributorProfile.findUnique({ where: { id: order.distributorId } })
        : null;
      try {
        await notifyShopkeeperPaymentCompleted(updated, distributor?.businessName);
      } catch (notificationError) {
        console.error('Payment-complete notification failed:', notificationError);
      }
    }

    return res.json(updated);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/orders/:id/payment-status', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    if (requester.role !== 'distributor') {
      return res.status(403).json({ error: 'Only distributor accounts can change payment status.' });
    }

    const ownDp = await prisma.distributorProfile.findUnique({ where: { userId: requester.id } });
    if (!ownDp) return res.status(403).json({ error: 'Forbidden' });

    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order || order.distributorId !== ownDp.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { paymentStatus } = req.body;
    if (paymentStatus !== 'paid' && paymentStatus !== 'unpaid') {
      return res.status(400).json({ error: 'Invalid payment status' });
    }

    if (order.paymentStatus === 'paid' && paymentStatus === 'unpaid') {
      return res.status(409).json({ error: 'Payment already marked as paid. Reverting to unpaid is not allowed.' });
    }

    const updated = await prisma.order.update({ where: { id: req.params.id }, data: { paymentStatus } });

    if (order.paymentStatus !== 'paid' && updated.paymentStatus === 'paid') {
      try {
        await notifyShopkeeperPaymentCompleted(updated, ownDp.businessName);
      } catch (notificationError) {
        console.error('Payment-complete notification failed:', notificationError);
      }
    }
    return res.json(updated);
  } catch (e) {
    console.error('Payment status update error:', e);
    return res.status(500).json({ error: 'Payment update failed' });
  }
});

// Removed duplicate profile patch endpoints since they are already defined around line 980

// Delivery groups
app.get('/api/delivery-groups/:distributorId', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    if (requester.role !== 'distributor') {
      return res.status(403).json({ error: 'Only distributor accounts can access delivery groups.' });
    }
    const ownDp = await prisma.distributorProfile.findUnique({ where: { userId: requester.id } });
    if (!ownDp || ownDp.id !== req.params.distributorId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json(await prisma.deliveryGroup.findMany({ where: { distributorId: req.params.distributorId } }));
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/delivery-groups', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    if (requester.role !== 'distributor') {
      return res.status(403).json({ error: 'Only distributor accounts can create delivery groups.' });
    }
    const ownDp = await prisma.distributorProfile.findUnique({ where: { userId: requester.id } });
    if (!ownDp || ownDp.id !== req.body.distributorId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json(await prisma.deliveryGroup.create({ data: req.body }));
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/delivery-groups/:id', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    if (requester.role !== 'distributor') {
      return res.status(403).json({ error: 'Only distributor accounts can delete delivery groups.' });
    }
    const ownDp = await prisma.distributorProfile.findUnique({ where: { userId: requester.id } });
    if (!ownDp) return res.status(403).json({ error: 'Forbidden' });
    const group = await prisma.deliveryGroup.findUnique({ where: { id: req.params.id } });
    if (!group || group.distributorId !== ownDp.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.deliveryGroup.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Create profiles (fallback support for mobile app flow if placeholder is not found)
app.post('/api/profiles/distributor', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    if (requester.role !== 'distributor') {
      return res.status(403).json({ error: 'Only distributor accounts can create distributor profile.' });
    }

    const { userId } = req.body;
    const targetUserId = userId || requester.id;
    if (targetUserId !== requester.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Clean payload fields
    const distributorPayload = {
      businessName: String(req.body.businessName || '').trim(),
      distributorType: isDistributorType(req.body.distributorType) ? req.body.distributorType : 'dairy',
      ownerName: req.body.ownerName ? String(req.body.ownerName).trim() : null,
      company: req.body.company ? String(req.body.company).trim() : null,
      city: req.body.city ? String(req.body.city).trim() : null,
      deliveryAreas: req.body.deliveryAreas ? String(req.body.deliveryAreas).trim() : null,
      orderWindowStart: req.body.orderWindowStart ? String(req.body.orderWindowStart).trim() : '18:00',
      orderWindowCutoff: req.body.orderWindowCutoff ? String(req.body.orderWindowCutoff).trim() : '20:00',
      gst: req.body.gst ? String(req.body.gst).trim().toUpperCase() : null,
      locationName: req.body.locationName ? String(req.body.locationName).trim() : null,
      latitude: parseOptionalNumber(req.body.latitude),
      longitude: parseOptionalNumber(req.body.longitude),
      paymentQrUrl: req.body.paymentQrUrl ? String(req.body.paymentQrUrl).trim() : null,
      profileComplete: req.body.profileComplete === false ? false : true,
    };

    if (!distributorPayload.businessName) {
      return res.status(400).json({ error: 'Business name is required.' });
    }

    let connectionCode = generateConnectionCode();
    for (let attempts = 0; attempts < 5; attempts++) {
      const codeExists = await prisma.distributorProfile.findUnique({ where: { connectionCode } });
      if (!codeExists) break;
      connectionCode = generateConnectionCode();
    }

    const dp = await prisma.distributorProfile.upsert({
      where: { userId: targetUserId },
      update: distributorPayload,
      create: {
        userId: targetUserId,
        connectionCode,
        ...distributorPayload,
      },
    });

    return res.json(dp);
  } catch (error) {
    console.error('Create Distributor Profile Error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/profiles/shopkeeper', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    if (requester.role !== 'shopkeeper') {
      return res.status(403).json({ error: 'Only shopkeeper accounts can create shopkeeper profile.' });
    }

    const { userId } = req.body;
    const targetUserId = userId || requester.id;
    if (targetUserId !== requester.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Clean payload fields
    const shopkeeperPayload = {
      shopName: String(req.body.shopName || '').trim(),
      ownerName: req.body.ownerName ? String(req.body.ownerName).trim() : null,
      city: req.body.city ? String(req.body.city).trim() : null,
      deliveryTiming: req.body.deliveryTiming ? String(req.body.deliveryTiming).trim() : null,
      locationName: req.body.locationName ? String(req.body.locationName).trim() : null,
      latitude: parseOptionalNumber(req.body.latitude),
      longitude: parseOptionalNumber(req.body.longitude),
      profileComplete: req.body.profileComplete === false ? false : true,
    };

    if (!shopkeeperPayload.shopName) {
      return res.status(400).json({ error: 'Shop name is required.' });
    }

    const sp = await prisma.shopkeeperProfile.upsert({
      where: { userId: targetUserId },
      update: shopkeeperPayload,
      create: {
        userId: targetUserId,
        ...shopkeeperPayload,
      },
    });

    return res.json(sp);
  } catch (error) {
    console.error('Create Shopkeeper Profile Error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Notifications
app.post('/api/auth/push-token', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;

    const { saved, updated } = await registerPushToken(prisma, requester.id, req.body);
    console.log('[push] token registered', {
      userId: requester.id,
      platform: saved.platform,
      channelId: saved.channelId,
      updated,
    });
    return res.json({ success: true, token: saved.token, userId: saved.userId });
  } catch (error) {
    if (error instanceof PushTokenRegistrationError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Push token sync failed:', error);
    return res.status(500).json({ error: 'Push token sync failed' });
  }
});

app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    if (requester.id !== req.params.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json(await prisma.notification.findMany({ where: { userId: req.params.userId }, orderBy: { createdAt: 'desc' } }));
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});
app.post('/api/notifications', async (req, res) => {
  try {
    const notification = await prisma.notification.create({ data: req.body });
    void pushNotifications.sendToUser(
      notification.userId,
      {
        title: 'DairyWalla Update',
        body: notification.message || 'Aapke account me naya update hai.',
        data: { type: notification.type, notificationId: notification.id },
      },
      { eventType: notification.type || 'manual_notification' },
    );
    return res.json(notification);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});
app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notification || notification.userId !== requester.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json(await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } }));
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});
app.patch('/api/notifications/user/:userId/read-all', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    if (requester.id !== req.params.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.notification.updateMany({ where: { userId: req.params.userId }, data: { read: true } });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Auto orders
app.post('/api/auto-orders/:distributorUserId', async (req, res) => {
  try {
    const requester = await requireRequesterProfile(req, res);
    if (!requester) return;
    if (requester.role !== 'distributor' || requester.id !== req.params.distributorUserId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const dp = await prisma.distributorProfile.findUnique({ where: { userId: req.params.distributorUserId } });
    if (!dp) return res.status(404).json({ error: 'Not found' });

    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);
    const activeConns = await prisma.connection.findMany({ where: { distributorId: dp.id, status: 'active', autoOrderEnabled: true } });

    for (const conn of activeConns) {
      const todayOrderCount = await prisma.order.count({ where: { shopkeeperId: conn.shopkeeperId!, distributorId: conn.distributorId!, deliveryDate: today } });
      if (todayOrderCount > 0) continue;

      const lastOrder = await prisma.order.findFirst({
        where: { shopkeeperId: conn.shopkeeperId!, distributorId: conn.distributorId! },
        orderBy: { placedAt: 'desc' },
        include: { items: true },
      });
      if (!lastOrder) continue;

      const rawValidItems = lastOrder.items.filter((i) => (i.quantity || 0) > 0);
      if (rawValidItems.length === 0) continue;

      const orderBusinessLine = isBusinessLine(lastOrder.businessLine)
        ? lastOrder.businessLine
        : inferBusinessLine(rawValidItems[0]?.category ?? 'other', rawValidItems[0]?.businessLine ?? undefined);

      const prodIds = rawValidItems.map(i => i.productId).filter(Boolean) as string[];
      const prods = await prisma.product.findMany({ where: { id: { in: prodIds } } });
      const prodMap = new Map(prods.map(p => [p.id, p]));

      const validItems = [];
      const stockUpdates = [];
      for (const item of rawValidItems) {
        if (!item.productId) continue;
        const prod = prodMap.get(item.productId);
        if (!prod || !prod.available) continue;

        let finalQuantity = item.quantity || 0;
        if ((orderBusinessLine === 'icecream' || orderBusinessLine === 'dual') && inferBusinessLine(prod.category, prod.businessLine) === 'icecream' && prod.showStock) {
          if ((prod.stockQuantity || 0) <= 0) continue;
          finalQuantity = Math.min(finalQuantity, prod.stockQuantity || 0);
          stockUpdates.push({ prod, qty: finalQuantity });
        }
        validItems.push({ ...item, quantity: finalQuantity });
      }

      if (validItems.length === 0) continue;

      const total = validItems.reduce((sum, item) => sum + Number(item.unitPrice || 0) * (item.quantity || 0), 0);
      await prisma.order.create({
        data: {
          shopkeeperId: conn.shopkeeperId,
          shopkeeperName: conn.shopkeeperName,
          shopName: conn.shopName,
          distributorId: conn.distributorId,
          businessLine: orderBusinessLine,
          type: 'normal',
          status: 'pending',
          paymentStatus: 'unpaid',
          source: 'web',
          deliveryDate: today,
          total,
          items: {
            create: validItems.map((i) => ({
              productId: i.productId,
              productName: i.productName,
              brand: i.brand,
              category: i.category,
              businessLine: isBusinessLine(i.businessLine) ? i.businessLine : orderBusinessLine,
              unit: i.unit,
              unitPrice: i.unitPrice,
              quantity: i.quantity,
            })),
          },
        },
      });

      for (const update of stockUpdates) {
        const newStock = Math.max(0, (update.prod.stockQuantity || 0) - update.qty);
        await prisma.product.update({ where: { id: update.prod.id }, data: { stockQuantity: newStock } });
        if (newStock === 0) {
          const dpObj = await prisma.distributorProfile.findUnique({ where: { id: conn.distributorId! } });
          if (dpObj?.userId) {
            await createNotificationAndPush({
              userId: dpObj.userId,
              type: 'stock_alert',
              title: 'Stock Unavailable',
              message: `${update.prod.name} is out of stock. Please refill immediately.`
            });
          }
        }
      }
    }

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

// ==============================
// ADMIN ENDPOINTS
// ==============================

app.post('/api/admin/login', (req, res) => {
  const password = String(req.body?.password ?? '');
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Wrong password. Try again.' });
  }

  return res.json({ token: createAdminSessionToken() });
});

// Admin Stats - Platform Overview
app.get('/api/admin/stats', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string);
    const dateFilter = days && !isNaN(days) ? {
      placedAt: {
        gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      }
    } : {};

    const profiles = await prisma.profile.findMany();
    const distributors = await prisma.distributorProfile.findMany();
    const shopkeepers = await prisma.shopkeeperProfile.findMany();
    const connections = await prisma.connection.findMany();
    const orders = await prisma.order.findMany({ where: dateFilter });
    const products = await prisma.product.findMany();

    // Calculate stats
    const activeDistributors = distributors.filter(d => {
      const hasActiveConn = connections.some(c => c.distributorId === d.id && c.status === 'active');
      return hasActiveConn;
    }).length;

    const activeShopkeepers = shopkeepers.filter(s => {
      const hasActiveConn = connections.some(c => c.shopkeeperId === s.id && c.status === 'active');
      return hasActiveConn;
    }).length;

    const completedOrders = orders.filter(o => o.status === 'fulfilled' || o.status === 'accepted').length;
    const totalRevenue = orders
      .filter(o => o.status === 'fulfilled' || o.status === 'accepted')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    const activeConnections = connections.filter(c => c.status === 'active').length;
    const pendingConnections = connections.filter(c => c.status === 'pending').length;

    return res.json({
      totalUsers: profiles.length,
      totalDistributors: distributors.length,
      totalShopkeepers: shopkeepers.length,
      activeDistributors,
      activeShopkeepers,
      totalConnections: connections.length,
      activeConnections,
      pendingConnections,
      totalOrders: orders.length,
      completedOrders,
      totalRevenue,
      totalProducts: products.length,
      averageOrderValue: completedOrders > 0 ? totalRevenue / completedOrders : 0,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Admin - All Users
app.get('/api/admin/users', async (_req, res) => {
  try {
    const profiles = await prisma.profile.findMany({
      include: {
        distributorProfile: true,
        shopkeeperProfile: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const users = await Promise.all(
      profiles.map(async (p) => {
        const connectionFilters = [
          p.distributorProfile?.id ? { distributorId: p.distributorProfile.id } : null,
          p.shopkeeperProfile?.id ? { shopkeeperId: p.shopkeeperProfile.id } : null,
        ].filter(Boolean) as Array<{ distributorId: string } | { shopkeeperId: string }>;
        const connCount = connectionFilters.length > 0
          ? await prisma.connection.count({ where: { OR: connectionFilters } })
          : 0;

        return {
          id: p.id,
          email: p.email,
          name: p.name || 'No Name',
          phone: p.phone,
          role: p.role,
          businessName: p.distributorProfile?.businessName || p.shopkeeperProfile?.shopName || 'N/A',
          connections: connCount,
          createdAt: p.createdAt,
          verified: !!p.pin,
        };
      })
    );

    return res.json(users);
  } catch (error) {
    console.error('Admin users error:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin - All Distributors with Details
app.get('/api/admin/distributors', async (_req, res) => {
  try {
    const distributors = await prisma.distributorProfile.findMany({
      include: {
        user: true,
        connections: true,
        products: true,
        orders: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = distributors.map((d) => {
      const activeConnections = d.connections.filter(c => c.status === 'active').length;
      const totalOrders = d.orders.length;
      const totalRevenue = d.orders
        .filter(o => o.status === 'fulfilled' || o.status === 'accepted')
        .reduce((sum, o) => sum + Number(o.total || 0), 0);

      return {
        id: d.id,
        userId: d.userId,
        name: d.user.name || 'No Name',
        email: d.user.email,
        businessName: d.businessName,
        distributorType: d.distributorType,
        phone: d.user.phone,
        city: d.city,
        activeConnections,
        totalProducts: d.products.length,
        totalOrders,
        totalRevenue,
        profileComplete: d.profileComplete,
        createdAt: d.createdAt,
      };
    });

    return res.json(data);
  } catch (error) {
    console.error('Admin distributors error:', error);
    return res.status(500).json({ error: 'Failed to fetch distributors' });
  }
});

// Admin - All Shopkeepers with Details
app.get('/api/admin/shopkeepers', async (_req, res) => {
  try {
    const shopkeepers = await prisma.shopkeeperProfile.findMany({
      include: {
        user: true,
        connections: true,
        orders: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = shopkeepers.map((s) => {
      const activeConnections = s.connections.filter(c => c.status === 'active').length;
      const totalOrders = s.orders.length;
      const totalPurchased = s.orders
        .filter(o => o.status === 'fulfilled' || o.status === 'accepted')
        .reduce((sum, o) => sum + Number(o.total || 0), 0);

      return {
        id: s.id,
        userId: s.userId,
        name: s.user.name || 'No Name',
        email: s.user.email,
        shopName: s.shopName,
        phone: s.user.phone,
        city: s.city,
        activeConnections,
        totalOrders,
        totalPurchased,
        profileComplete: s.profileComplete,
        createdAt: s.createdAt,
      };
    });

    return res.json(data);
  } catch (error) {
    console.error('Admin shopkeepers error:', error);
    return res.status(500).json({ error: 'Failed to fetch shopkeepers' });
  }
});

// Admin - All Connections
app.get('/api/admin/connections', async (_req, res) => {
  try {
    const connections = await prisma.connection.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return res.json(connections);
  } catch (error) {
    console.error('Admin connections error:', error);
    return res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

// Admin - Ban/Deactivate User
app.post('/api/admin/ban-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await prisma.profile.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete the user from the database completely. 
    // This will cascade and delete DistributorProfile/ShopkeeperProfile and all their relations.
    await prisma.profile.delete({
      where: { id: userId }
    });

    return res.json({ success: true, message: `User ${user.email} has been deactivated` });
  } catch (error) {
    console.error('Ban user error:', error);
    return res.status(500).json({ error: 'Failed to ban user' });
  }
});

// Admin - Verify Connection
app.post('/api/admin/verify-connection/:connectionId', async (req, res) => {
  try {
    const { connectionId } = req.params;

    const connection = await prisma.connection.update({
      where: { id: connectionId },
      data: { status: 'active' },
    });

    return res.json({ success: true, connection });
  } catch (error) {
    console.error('Verify connection error:', error);
    return res.status(500).json({ error: 'Failed to verify connection' });
  }
});

// Admin - Reject Connection
app.post('/api/admin/reject-connection/:connectionId', async (req, res) => {
  try {
    const { connectionId } = req.params;

    await prisma.connection.delete({ where: { id: connectionId } });

    return res.json({ success: true });
  } catch (error) {
    console.error('Reject connection error:', error);
    return res.status(500).json({ error: 'Failed to reject connection' });
  }
});

// Admin - Platform Activity Log
app.get('/api/admin/activity', async (_req, res) => {
  try {
    const recentOrders = await prisma.order.findMany({
      include: {
        items: true,
        distributor: true,
      },
      orderBy: { placedAt: 'desc' },
      take: 50,
    });

    const recentConnections = await prisma.connection.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const activity = [
      ...recentOrders.map((o) => ({
        type: 'order',
        action: `Order placed`,
        description: `${o.shopName || 'Shop'} ordered from ${o.distributor?.businessName || 'Distributor'}`,
        amount: o.total,
        status: o.status,
        timestamp: o.placedAt,
      })),
      ...recentConnections.map((c) => ({
        type: 'connection',
        action: `Connection ${c.status}`,
        description: `${c.shopName} ↔ ${c.businessName}`,
        status: c.status,
        timestamp: c.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 100);

    return res.json(activity);
  } catch (error) {
    console.error('Activity log error:', error);
    return res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

const PORT = process.env.PORT || 3000;

// Minute Cron Job: Auto Orders & Smart Reminders
cron.schedule('* * * * *', async () => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;
    const currentMins = currentHour * 60 + currentMinutes;

    const distributors = await prisma.distributorProfile.findMany();
    for (const dp of distributors) {
      if (!dp.orderWindowStart || !dp.orderWindowCutoff) continue;
      
      const startMins = parseInt(dp.orderWindowStart.split(':')[0]) * 60 + parseInt(dp.orderWindowStart.split(':')[1]);
      const cutoffMins = parseInt(dp.orderWindowCutoff.split(':')[0]) * 60 + parseInt(dp.orderWindowCutoff.split(':')[1]);

      // 1. AUTO ORDERS
      const autoOrderConns = await prisma.connection.findMany({
        where: { distributorId: dp.id, status: 'active', autoOrderEnabled: true, autoOrderTime: currentTimeStr }
      });
      for (const conn of autoOrderConns) {
        const todayOrderCount = await prisma.order.count({ where: { shopkeeperId: conn.shopkeeperId!, distributorId: dp.id, deliveryDate: today } });
        if (todayOrderCount > 0) continue;

        const lastOrder = await prisma.order.findFirst({
          where: { shopkeeperId: conn.shopkeeperId!, distributorId: dp.id },
          orderBy: { placedAt: 'desc' },
          include: { items: true },
        });
        if (!lastOrder) continue;

        const rawValidItems = lastOrder.items.filter((i) => (i.quantity || 0) > 0);
        if (rawValidItems.length === 0) continue;

        const orderLine = lastOrder.businessLine || 'other';

        const prodIds = rawValidItems.map(i => i.productId).filter(Boolean) as string[];
        const prods = await prisma.product.findMany({ where: { id: { in: prodIds } } });
        const prodMap = new Map(prods.map(p => [p.id, p]));

        const validItems = [];
        const stockUpdates = [];
        for (const item of rawValidItems) {
          if (!item.productId) continue;
          const prod = prodMap.get(item.productId);
          if (!prod || !prod.available) continue;

          let finalQuantity = item.quantity || 0;
          if ((orderLine === 'icecream' || orderLine === 'dual') && inferBusinessLine(prod.category, prod.businessLine) === 'icecream' && prod.showStock) {
            if ((prod.stockQuantity || 0) <= 0) continue;
            finalQuantity = Math.min(finalQuantity, prod.stockQuantity || 0);
            stockUpdates.push({ prod, qty: finalQuantity });
          }
          validItems.push({ ...item, quantity: finalQuantity });
        }

        if (validItems.length === 0) continue;

        const total = validItems.reduce((sum, item) => sum + Number(item.unitPrice || 0) * (item.quantity || 0), 0);

        await prisma.order.create({
          data: {
            shopkeeperId: conn.shopkeeperId,
            shopkeeperName: conn.shopkeeperName,
            shopName: conn.shopName,
            distributorId: dp.id,
            businessLine: orderLine,
            type: 'normal',
            status: 'pending',
            paymentStatus: 'unpaid',
            source: 'auto',
            deliveryDate: today,
            total,
            items: {
              create: validItems.map(item => ({
                productId: item.productId,
                productName: item.productName,
                brand: item.brand,
                category: item.category,
                businessLine: item.businessLine,
                unit: item.unit,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
              }))
            }
          }
        });

        for (const update of stockUpdates) {
          const newStock = Math.max(0, (update.prod.stockQuantity || 0) - update.qty);
          await prisma.product.update({ where: { id: update.prod.id }, data: { stockQuantity: newStock } });
          if (newStock === 0) {
            const dpObj = await prisma.distributorProfile.findUnique({ where: { id: dp.id } });
            if (dpObj?.userId) {
              await createNotificationAndPush({
                userId: dpObj.userId,
                type: 'stock_alert',
                title: 'Stock Unavailable',
                message: `${update.prod.name} is out of stock. Please refill immediately.`
              });
            }
          }
        }
      }

      // 2. SMART REMINDERS
      const isStartReminder = currentMins === startMins - 5;
      const isCutoffReminder = currentMins >= cutoffMins - 60 && currentMins <= cutoffMins && (cutoffMins - currentMins) % 30 === 0 && currentMins < cutoffMins;

      if (isStartReminder || isCutoffReminder) {
        const connections = await prisma.connection.findMany({
          where: { distributorId: dp.id, status: 'active', autoOrderEnabled: false }
        });
        
        for (const conn of connections) {
          if (!conn.shopkeeperId) continue;
          
          const orderCount = await prisma.order.count({
            where: { shopkeeperId: conn.shopkeeperId, distributorId: dp.id, deliveryDate: today }
          });
          if (orderCount > 0) continue;
          
          const sp = await prisma.shopkeeperProfile.findUnique({ where: { id: conn.shopkeeperId } });
          if (!sp?.userId) continue;
          
          const recentMinsAgo = new Date(Date.now() - 25 * 60 * 1000);
          const recentReminderCount = await prisma.notification.count({
            where: { 
              userId: sp.userId,
              type: 'order_reminder',
              createdAt: { gte: recentMinsAgo }
            }
          });
          if (recentReminderCount > 0) continue;
          
          let message = `Reminder: Please place your daily order for ${dp.businessName} before ${dp.orderWindowCutoff}.`;
          if (isStartReminder) message = `Order window for ${dp.businessName} starts in 5 minutes! Don't forget to order.`;
          else if (isCutoffReminder && (cutoffMins - currentMins) > 0) message = `Only ${(cutoffMins - currentMins)} minutes left to place your order for ${dp.businessName}!`;

          const notification = await prisma.notification.create({
            data: {
              userId: sp.userId,
              type: 'order_reminder',
              title: 'Order Reminder',
              message,
              data: { distributorId: dp.id }
            }
          });
          void pushNotifications.sendToUser(sp.userId, {
            title: 'Order Reminder 🔔',
            body: message,
            data: { type: 'order_reminder', notificationId: notification.id }
          }, { eventType: 'order_reminder' });
        }
      }
    }
  } catch (error) {
    console.error('Minute cron error:', error);
  }
});

// ==========================================
// BLOGS API
// ==========================================

app.get('/api/blogs', async (req, res) => {
  try {
    const blogs = await prisma.blog.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(blogs);
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ error: 'Failed to fetch blogs' });
  }
});

app.post('/api/admin/blogs', async (req, res) => {
  try {
    const { title, type, description } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    const blog = await prisma.blog.create({
      data: {
        title: String(title).trim(),
        type: String(type || 'other').trim(),
        description: String(description).trim()
      }
    });
    res.json(blog);
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ error: 'Failed to create blog' });
  }
});

app.delete('/api/admin/blogs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.blog.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ error: 'Failed to delete blog' });
  }
});

app.listen(PORT, async () => {
  console.log(`Backend API Server running on http://localhost:${PORT}`);
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    console.log('✅ Connected successfully to MongoDB Atlas database (dairywalla)!');
  } catch (error: any) {
    console.error('❌ Failed to connect to MongoDB Atlas:', error?.message || error);
  }
});

