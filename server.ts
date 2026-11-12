import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  ensureAdminAccount,
  ensureStaffAccount,
  findUserByEmail,
  findUserById,
  createUser,
  getAllUsersList,
  getAllOrdersFromDb,
  getUserOrdersFromDb,
  createOrderInDb,
  approveOrderInDb,
  rejectOrderInDb,
  getAllWithdrawalsFromDb,
  getUserWithdrawalsFromDb,
  createWithdrawalInDb,
  markWithdrawalPaidInDb,
  rejectWithdrawalInDb,
  getUserCollectionsFromDb,
  recordEggCollectionInDb,
  getGlobalStatsFromDb,
  updateGlobalStatsInDb,
  getAllTicketsFromDb,
  getUserTicketsFromDb,
  createTicketInDb,
  replyToTicketInDb,
} from './server/db';
import fs from 'fs';
import { isAdminEmail, generateReferralCode, OFFICIAL_INFO } from './src/utils/farmRules';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // 1. Increase file upload limit to 50MB for media and gallery uploads (photos & videos)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Static uploads directory serving
  const UPLOAD_DIR = path.resolve(__dirname, 'public', 'uploads');
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  app.use('/uploads', express.static(UPLOAD_DIR));

  // ---------------- MEDIA & GALLERY UPLOADS API (50MB Limit) ----------------
  const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB limit

  const handleMediaUpload = async (req: express.Request, res: express.Response) => {
    try {
      const { file, fileName, fileType, folder } = req.body;
      if (!file) {
        return res.status(400).json({ error: 'No file data provided' });
      }

      let base64Data = file;
      let detectedType = fileType || '';

      if (typeof file === 'string' && file.startsWith('data:')) {
        const matches = file.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          detectedType = detectedType || matches[1];
          base64Data = matches[2];
        } else {
          const commaIdx = file.indexOf(',');
          if (commaIdx !== -1) {
            base64Data = file.substring(commaIdx + 1);
          }
        }
      }

      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length > MAX_UPLOAD_SIZE) {
        return res.status(413).json({
          error: 'Video or photo size is too large. Please upload media under 50MB.',
        });
      }

      // Determine file extension
      let ext = '';
      if (fileName && path.extname(fileName)) {
        ext = path.extname(fileName).toLowerCase();
      } else if (detectedType.includes('mp4')) {
        ext = '.mp4';
      } else if (detectedType.includes('webm')) {
        ext = '.webm';
      } else if (detectedType.includes('quicktime') || detectedType.includes('mov')) {
        ext = '.mov';
      } else if (detectedType.includes('png')) {
        ext = '.png';
      } else if (detectedType.includes('jpeg') || detectedType.includes('jpg')) {
        ext = '.jpg';
      } else if (detectedType.includes('webp')) {
        ext = '.webp';
      } else {
        ext = '.bin';
      }

      const safeBaseName = (fileName ? path.basename(fileName, ext) : 'media')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 30);
      const uniqueName = `${safeBaseName}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;

      const targetDir = folder ? path.join(UPLOAD_DIR, folder) : UPLOAD_DIR;
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const filePath = path.join(targetDir, uniqueName);
      await fs.promises.writeFile(filePath, buffer);

      const relativeUrl = folder ? `/uploads/${folder}/${uniqueName}` : `/uploads/${uniqueName}`;

      return res.status(200).json({
        success: true,
        url: relativeUrl,
        fileName: uniqueName,
        size: buffer.length,
        type: detectedType,
        message: 'File uploaded successfully within 50MB limit',
      });
    } catch (err: any) {
      console.error('Error handling media upload:', err);
      return res.status(500).json({ error: err.message || 'Failed to upload media file' });
    }
  };

  app.post('/api/upload', handleMediaUpload);
  app.post('/api/gallery/upload', handleMediaUpload);

  // ---------------- AUTH API ----------------

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    // Admin login check
    if (isAdminEmail(cleanEmail) && cleanPass === 'admin123') {
      const admin = ensureAdminAccount(cleanEmail);
      return res.json({ user: admin });
    }

    // Staff login check
    if (cleanEmail === OFFICIAL_INFO.staffEmail && cleanPass === 'staff123') {
      const staff = ensureStaffAccount(cleanEmail);
      return res.json({ user: staff });
    }

    // Regular user
    const user = findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email' });
    }
    if (user.password !== cleanPass) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    return res.json({ user });
  });

  app.post('/api/auth/register', (req, res) => {
    const { email, password, fullName, phone, easypaisaTitle, easypaisaNumber, referralCode } = req.body;
    if (!email || !password || !fullName || !phone || !easypaisaTitle || !easypaisaNumber) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = findUserByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'Account with this email already exists' });
    }

    const newUser = createUser({
      id: 'USR-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900),
      email: cleanEmail,
      password: password.trim(),
      fullName: fullName.trim(),
      phone: phone.trim(),
      easypaisaTitle: easypaisaTitle.trim(),
      easypaisaNumber: easypaisaNumber.trim(),
      role: 'user',
      walletBalance: 0,
      activeHens: 0,
      referralCode: generateReferralCode(cleanEmail),
      referredBy: referralCode ? referralCode.trim() : undefined,
      createdAt: new Date().toISOString(),
      packages: [],
    });

    return res.status(201).json({ user: newUser });
  });

  // ---------------- USER DIRECTORY (ADMIN DRILL-DOWN) ----------------

  app.get('/api/users', (req, res) => {
    const requesterId = req.headers['x-user-id'] as string;
    const requesterRole = req.headers['x-user-role'] as string;

    if (requesterRole !== 'admin' && requesterRole !== 'staff') {
      return res.status(403).json({ error: 'Unauthorized. Admin access required.' });
    }

    const users = getAllUsersList();
    return res.json({ users });
  });

  app.get('/api/user/sync', (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    const user = findUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({ user });
  });

  // ---------------- ORDERS API ----------------

  app.get('/api/orders', (req, res) => {
    const requesterId = req.headers['x-user-id'] as string;
    const requesterRole = req.headers['x-user-role'] as string;

    // Admin has global access to all orders!
    if (requesterRole === 'admin') {
      const allOrders = getAllOrdersFromDb();
      return res.json({ orders: allOrders });
    }

    // User only sees their own orders
    const userOrders = getUserOrdersFromDb(requesterId);
    return res.json({ orders: userOrders });
  });

  app.post('/api/orders', (req, res) => {
    const { userId, packageId, hensCount, amount, senderEasypaisaNumber, senderEasypaisaTitle, tid } = req.body;
    if (!userId || !packageId || !hensCount || !amount || !tid) {
      return res.status(400).json({ error: 'Missing required order fields' });
    }

    const user = findUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Prevent duplicate TID
    const all = getAllOrdersFromDb();
    if (all.some((o) => o.tid.toLowerCase() === tid.trim().toLowerCase())) {
      return res.status(409).json({ error: 'This Transaction ID (TID) has already been submitted.' });
    }

    const order = createOrderInDb({
      userId,
      userEmail: user.email,
      userName: user.fullName,
      userPhone: user.phone,
      packageId,
      hensCount,
      amount,
      senderEasypaisaNumber,
      senderEasypaisaTitle,
      tid: tid.trim(),
    });

    return res.status(201).json({ order });
  });

  app.post('/api/orders/:id/approve', (req, res) => {
    const requesterRole = req.headers['x-user-role'] as string;
    if (requesterRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { adminNote } = req.body;
    const ok = approveOrderInDb(req.params.id, adminNote);
    if (!ok) return res.status(400).json({ error: 'Could not approve order' });

    return res.json({ success: true });
  });

  app.post('/api/orders/:id/reject', (req, res) => {
    const requesterRole = req.headers['x-user-role'] as string;
    if (requesterRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { adminNote } = req.body;
    const ok = rejectOrderInDb(req.params.id, adminNote);
    if (!ok) return res.status(400).json({ error: 'Could not reject order' });

    return res.json({ success: true });
  });

  // ---------------- WITHDRAWALS API ----------------

  app.get('/api/withdrawals', (req, res) => {
    const requesterId = req.headers['x-user-id'] as string;
    const requesterRole = req.headers['x-user-role'] as string;

    // Admin sees all withdrawals globally
    if (requesterRole === 'admin') {
      const all = getAllWithdrawalsFromDb();
      return res.json({ withdrawals: all });
    }

    // User only sees their own
    const userW = getUserWithdrawalsFromDb(requesterId);
    return res.json({ withdrawals: userW });
  });

  app.post('/api/withdrawals', (req, res) => {
    const { userId, amount, easypaisaNumber, easypaisaTitle } = req.body;
    if (!userId || !amount || !easypaisaNumber || !easypaisaTitle) {
      return res.status(400).json({ error: 'Missing withdrawal details' });
    }

    const result = createWithdrawalInDb(userId, parseFloat(amount), easypaisaNumber, easypaisaTitle);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(201).json({ withdrawal: result.withdrawal });
  });

  app.post('/api/withdrawals/:id/pay', (req, res) => {
    const requesterRole = req.headers['x-user-role'] as string;
    if (requesterRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { adminNote } = req.body;
    const ok = markWithdrawalPaidInDb(req.params.id, adminNote);
    if (!ok) return res.status(400).json({ error: 'Could not mark withdrawal as paid' });

    return res.json({ success: true });
  });

  app.post('/api/withdrawals/:id/reject', (req, res) => {
    const requesterRole = req.headers['x-user-role'] as string;
    if (requesterRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { reason } = req.body;
    const ok = rejectWithdrawalInDb(req.params.id, reason || 'Rejected by Admin');
    if (!ok) return res.status(400).json({ error: 'Could not reject withdrawal' });

    return res.json({ success: true });
  });

  // ---------------- EGG COLLECTION API ----------------

  app.get('/api/collections', (req, res) => {
    const requesterId = req.headers['x-user-id'] as string;
    if (!requesterId) return res.status(400).json({ error: 'User ID required' });

    const collections = getUserCollectionsFromDb(requesterId);
    return res.json({ collections });
  });

  app.post('/api/collections', (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    const result = recordEggCollectionInDb(userId);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ record: result.record, user: result.updatedUser });
  });

  // ---------------- GLOBAL STATS API ----------------

  app.get('/api/stats', (_req, res) => {
    const stats = getGlobalStatsFromDb();
    return res.json({ stats });
  });

  app.post('/api/stats', (req, res) => {
    const requesterRole = req.headers['x-user-role'] as string;
    if (requesterRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { totalCollected, cracked, netFresh } = req.body;
    const updated = updateGlobalStatsInDb({
      totalCollected: parseInt(totalCollected, 10) || 0,
      cracked: parseInt(cracked, 10) || 0,
      netFresh: parseInt(netFresh, 10) || 0,
    });

    return res.json({ stats: updated });
  });

  // ---------------- SUPPORT TICKETS API ----------------

  app.get('/api/tickets', (req, res) => {
    const requesterId = req.headers['x-user-id'] as string;
    const requesterRole = req.headers['x-user-role'] as string;

    if (requesterRole === 'admin' || requesterRole === 'staff') {
      return res.json({ tickets: getAllTicketsFromDb() });
    }

    return res.json({ tickets: getUserTicketsFromDb(requesterId) });
  });

  app.post('/api/tickets', (req, res) => {
    const { userId, subject, message } = req.body;
    if (!userId || !subject || !message) {
      return res.status(400).json({ error: 'Missing ticket details' });
    }

    const user = findUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const ticket = createTicketInDb({
      userId,
      userEmail: user.email,
      userName: user.fullName,
      userPhone: user.phone,
      subject,
      message,
    });

    return res.status(201).json({ ticket });
  });

  app.post('/api/tickets/:id/reply', (req, res) => {
    const requesterRole = req.headers['x-user-role'] as string;
    if (requesterRole !== 'admin' && requesterRole !== 'staff') {
      return res.status(403).json({ error: 'Staff access required' });
    }

    const { reply } = req.body;
    const ok = replyToTicketInDb(req.params.id, reply);
    if (!ok) return res.status(400).json({ error: 'Could not reply to ticket' });

    return res.json({ success: true });
  });

  // ---------------- VITE / FRONTEND SERVING ----------------
  // Explicitly prevent stale caching of HTML/entry document so users never load old builds
  app.use((req, res, next) => {
    if (req.path === '/' || req.path.endsWith('.html') || !req.path.includes('.')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }
    next();
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(
      express.static(path.resolve(__dirname, 'dist'), {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          }
        },
      })
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pak Hen Farm Fullstack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
