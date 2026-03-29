// ==========================================
// VOYAGE DZ - Backend Server
// ==========================================
// API REST pour l'application de réservation touristique en Algérie
// 
// Stack: Node.js + Express + SQLite
// Authentification: JWT (JSON Web Tokens)
// Base de données: SQLite (better-sqlite3)
// 
// Pour démarrer:
// 1. npm install
// 2. npm run init-db (initialise la BDD)
// 3. npm start
// ==========================================

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');
const passport = require('./passport-setup'); // Import passport config
require('dotenv').config();

// Image processing (optional - install with: npm install sharp)
let sharp;
try {
    sharp = require('sharp');
    console.log('📸 Sharp image processing enabled');
} catch (e) {
    console.log('⚠️ Sharp not installed - images won\'t be optimized. Run: npm install sharp');
}

// ==========================================
// Configuration
// ==========================================

// Initialisation de l'application Express
const app = express();

// Port du serveur (par défaut 3000)
const PORT = process.env.PORT || 3000;

// Clé secrète pour signer les tokens JWT (à changer en production !)
const JWT_SECRET = process.env.JWT_SECRET || 'voyage-dz-secret-key-2024';

// Connexion à la base de données SQLite
// Le fichier database.sqlite doit être créé avec init-db.js
// In Docker, the database is stored in ./data/database.sqlite (persistent volume)
const fs = require('fs');
console.log('📂 Server Process CWD:', process.cwd());
const dbPath = path.resolve('./data/database.sqlite');
console.log('💾 Database Path:', dbPath);

const dbDir = './data';
if (!fs.existsSync(dbDir)) {
    console.log('⚠️ Data directory missing, creating:', dbDir);
    fs.mkdirSync(dbDir, { recursive: true });
}
const db = new Database(dbPath, { verbose: console.log });

// DEBUG: Check DB content on startup
try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const bookingCount = db.prepare('SELECT COUNT(*) as count FROM bookings').get();
    console.log('📊 DB STATUS ON STARTUP:');
    console.log(`   - Users: ${userCount.count}`);
    console.log(`   - Bookings: ${bookingCount.count}`);
} catch (err) {
    console.error('❌ Error checking DB stats:', err);
}

// ==========================================
// Middleware
// ==========================================

// CORS: Permet les requêtes cross-origin depuis le frontend
app.use(cors());

// Parser JSON: Permet de lire les body JSON des requêtes
app.use(express.json());

// Session pour Passport
app.use(session({
    secret: 'voyage-dz-session-secret',
    resave: false,
    saveUninitialized: false
}));

// Init Passport
app.use(passport.initialize());
app.use(passport.session());

// Servir les fichiers statiques du dossier "uploads" (images uploadées)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Servir le Frontend (dossier parent)
app.use(express.static(path.join(__dirname, '../')));

// ==========================================
// Configuration Upload de Fichiers (Multer)
// ==========================================

// Configuration du stockage des fichiers uploadés
const storage = multer.diskStorage({
    // Dossier de destination des images
    destination: (req, file, cb) => cb(null, 'uploads/'),

    // Génération d'un nom de fichier unique avec UUID
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    }
});

// Configuration de Multer avec limites et filtres
const upload = multer({
    storage,

    // Limite de taille: 5 MB par fichier
    limits: { fileSize: 5 * 1024 * 1024 },

    // Filtre: uniquement images JPEG, PNG et WebP
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        cb(null, allowed.includes(file.mimetype));
    }
});

// ==========================================
// Middlewares d'Authentification
// ==========================================

/**
 * Middleware: Authentification requise
 * 
 * Vérifie qu'un token JWT valide est présent dans l'en-tête Authorization.
 * Si valide, ajoute les infos utilisateur dans req.user
 * Sinon, renvoie une erreur 401 ou 403
 * 
 * Utilisation: app.get('/route-protegee', authenticateToken, (req, res) => {...})
 */
const authenticateToken = (req, res, next) => {
    // Récupérer le token de l'en-tête Authorization (format: "Bearer <token>")
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token requis' });
    }

    // Vérifier et décoder le token
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token invalide' });

        // Ajouter les infos utilisateur à la requête
        req.user = user;
        next();
    });
};

/**
 * Middleware: Authentification optionnelle
 * 
 * Vérifie si un token est présent, et si oui, l'ajoute à req.user
 * Mais ne bloque pas la requête si le token est absent ou invalide
 * 
 * Utile pour les routes publiques qui changent de comportement selon l'authentification
 * (ex: afficher si une annonce est favorite)
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            // Ajouter l'utilisateur seulement si le token est valide
            if (!err) req.user = user;
        });
    }

    // Toujours continuer (même sans token valide)
    next();
};

// ==========================================
// AUTH ROUTES
// ==========================================

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Nom, email et mot de passe requis' });
        }

        // Check if user exists
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const result = db.prepare(`
            INSERT INTO users (name, email, password, phone, role, created_at)
            VALUES (?, ?, ?, ?, 'user', datetime('now'))
        `).run(name, email, hashedPassword, phone || null);

        const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(result.lastInsertRowid);

        // Generate token
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ user, token });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            user: { id: user.id, name: user.name, email: user.email, role: user.role, isHost: user.is_host },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// SOCIAL AUTH ROUTES
// ==========================================

// Google Auth
app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // Successful authentication
        const token = jwt.sign(
            { id: req.user.id, email: req.user.email, role: req.user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        // Redirect to frontend with token
        res.redirect(`/?token=${token}`);
    }
);

// Facebook Auth
app.get('/api/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));

app.get('/api/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    (req, res) => {
        const token = jwt.sign(
            { id: req.user.id, email: req.user.email, role: req.user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.redirect(`/?token=${token}`);
    }
);

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
    const user = db.prepare('SELECT id, name, email, role, is_host, phone, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    res.json(user);
});

// ==========================================
// CITIES ROUTES
// ==========================================

// ==========================================
// UPLOAD ROUTES
// ==========================================

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Created uploads directory');
}

// Image optimization settings
const IMAGE_SIZES = {
    thumbnail: { width: 300, height: 200, quality: 70 },
    medium: { width: 800, height: 600, quality: 80 },
    large: { width: 1200, height: 900, quality: 85 },
    original: { width: 1920, height: 1440, quality: 90 }
};

// Process and optimize uploaded image
async function optimizeImage(inputPath, outputBaseName, options = {}) {
    if (!sharp) {
        console.log('⚠️ Sharp not available, skipping optimization');
        return null;
    }

    const {
        sizes = ['medium', 'large'],
        format = 'webp',  // 'webp', 'jpeg', 'png', or 'original'
        quality = 80
    } = options;

    const results = {};

    try {
        for (const sizeName of sizes) {
            const size = IMAGE_SIZES[sizeName] || IMAGE_SIZES.medium;
            const outputFileName = `${outputBaseName}_${sizeName}.${format === 'original' ? 'jpg' : format}`;
            const outputPath = path.join(uploadsDir, outputFileName);

            let sharpInstance = sharp(inputPath)
                .resize(size.width, size.height, {
                    fit: 'cover',
                    position: 'center'
                });

            // Apply format conversion
            if (format === 'webp') {
                sharpInstance = sharpInstance.webp({ quality: size.quality || quality });
            } else if (format === 'jpeg' || format === 'jpg') {
                sharpInstance = sharpInstance.jpeg({ quality: size.quality || quality });
            } else if (format === 'png') {
                sharpInstance = sharpInstance.png({ quality: size.quality || quality });
            }

            await sharpInstance.toFile(outputPath);

            results[sizeName] = `/uploads/${outputFileName}`;
            console.log(`📸 Created ${sizeName}: ${outputFileName}`);
        }

        // Delete original uploaded file after processing
        fs.unlinkSync(inputPath);

        return results;
    } catch (error) {
        console.error('Image optimization error:', error);
        return null;
    }
}

// Optimized upload endpoint (with automatic resize)
app.post('/api/upload/optimized', authenticateToken, upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Aucune image fournie' });
    }

    const baseName = uuidv4();
    const inputPath = req.file.path;

    // Get options from request
    const sizes = req.body.sizes ? req.body.sizes.split(',') : ['medium', 'large'];
    const format = req.body.format || 'webp';

    const optimized = await optimizeImage(inputPath, baseName, { sizes, format });

    if (optimized) {
        res.json({
            success: true,
            optimized: true,
            images: optimized,
            primary: optimized.large || optimized.medium || Object.values(optimized)[0]
        });
    } else {
        // Fallback: return original file if optimization failed
        const url = `/uploads/${req.file.filename}`;
        res.json({
            success: true,
            optimized: false,
            url,
            filename: req.file.filename
        });
    }
});

// General image upload (single file)
app.post('/api/upload', authenticateToken, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Aucune image fournie' });
    }

    const url = `/uploads/${req.file.filename}`;
    res.json({
        success: true,
        url,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
    });
});

// Multiple images upload
app.post('/api/upload/multiple', authenticateToken, upload.array('images', 10), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'Aucune image fournie' });
    }

    const uploaded = req.files.map(file => ({
        url: `/uploads/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size
    }));

    res.json({ success: true, images: uploaded });
});

// Admin: Upload image for specific entity (listing, city, etc.)
app.post('/api/admin/upload/:type/:id', authenticateToken, upload.single('image'), (req, res) => {
    // Check admin role
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Accès admin requis' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'Aucune image fournie' });
    }

    const { type, id } = req.params;
    const url = `/uploads/${req.file.filename}`;

    // Update the entity with new image
    try {
        if (type === 'listing') {
            db.prepare('UPDATE listings SET image = ? WHERE id = ?').run(url, id);
        } else if (type === 'city') {
            db.prepare('UPDATE cities SET image = ? WHERE id = ?').run(url, id);
        }

        res.json({ success: true, url, type, id });
    } catch (error) {
        res.status(500).json({ error: 'Erreur de mise à jour' });
    }
});

// ==========================================
// REVIEWS ROUTES
// ==========================================

// Get reviews for a listing
app.get('/api/listings/:id/reviews', (req, res) => {
    try {
        const reviews = db.prepare(`
            SELECT r.*, u.name as user_name, u.avatar as user_avatar
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.listing_id = ?
            ORDER BY r.created_at DESC
        `).all(req.params.id);

        // Get photos for each review
        const reviewsWithPhotos = reviews.map(review => {
            const photos = db.prepare('SELECT url FROM review_photos WHERE review_id = ?').all(review.id);
            return { ...review, photos: photos.map(p => p.url) };
        });

        res.json(reviewsWithPhotos);
    } catch (error) {
        // If reviews table doesn't exist yet
        res.json([]);
    }
});

// Post a review
app.post('/api/listings/:id/reviews', authenticateToken, upload.array('photos', 5), async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const listingId = req.params.id;
        const userId = req.user.id;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Note entre 1 et 5 requise' });
        }

        // Check if user has a completed booking for this listing
        const booking = db.prepare(`
            SELECT id FROM bookings 
            WHERE user_id = ? AND listing_id = ? AND status = 'confirmed'
            AND date_to < date('now')
        `).get(userId, listingId);

        if (!booking) {
            return res.status(403).json({ error: 'Vous devez avoir séjourné pour laisser un avis' });
        }

        // Check if already reviewed this booking
        const existingReview = db.prepare(`
            SELECT id FROM reviews WHERE booking_id = ?
        `).get(booking.id);

        if (existingReview) {
            return res.status(400).json({ error: 'Vous avez déjà laissé un avis pour ce séjour' });
        }

        // Create review
        const result = db.prepare(`
            INSERT INTO reviews (booking_id, user_id, listing_id, rating, comment, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        `).run(booking.id, userId, listingId, rating, comment || '');

        const reviewId = result.lastInsertRowid;

        // Save photos
        if (req.files && req.files.length > 0) {
            const insertPhoto = db.prepare('INSERT INTO review_photos (review_id, url) VALUES (?, ?)');
            req.files.forEach(file => {
                insertPhoto.run(reviewId, `/uploads/${file.filename}`);
            });
        }

        // Update listing average rating
        const stats = db.prepare(`
            SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE listing_id = ?
        `).get(listingId);

        db.prepare(`
            UPDATE listings SET rating = ?, reviews_count = ? WHERE id = ?
        `).run(stats.avg_rating || 0, stats.count || 0, listingId);

        res.status(201).json({ success: true, reviewId });
    } catch (error) {
        console.error('Review error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// MESSAGING ROUTES
// ==========================================

// Get user's conversations
app.get('/api/messages', authenticateToken, (req, res) => {
    try {
        const conversations = db.prepare(`
            SELECT c.*, 
                   l.title as listing_title, l.image as listing_image,
                   CASE WHEN c.host_id = ? THEN g.name ELSE h.name END as other_user_name,
                   CASE WHEN c.host_id = ? THEN g.id ELSE h.id END as other_user_id,
                   (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.read = 0 AND m.sender_id != ?) as unread_count,
                   (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
                   (SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_at
            FROM conversations c
            JOIN listings l ON c.listing_id = l.id
            JOIN users h ON c.host_id = h.id
            JOIN users g ON c.guest_id = g.id
            WHERE c.host_id = ? OR c.guest_id = ?
            ORDER BY last_message_at DESC
        `).all(req.user.id, req.user.id, req.user.id, req.user.id, req.user.id);

        res.json(conversations);
    } catch (error) {
        res.json([]); // Return empty if tables don't exist yet
    }
});

// Get messages in a conversation
app.get('/api/messages/:conversationId', authenticateToken, (req, res) => {
    try {
        // Check if user is part of conversation
        const conv = db.prepare(`
            SELECT * FROM conversations WHERE id = ? AND (host_id = ? OR guest_id = ?)
        `).get(req.params.conversationId, req.user.id, req.user.id);

        if (!conv) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        const messages = db.prepare(`
            SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = ?
            ORDER BY m.created_at ASC
        `).all(req.params.conversationId);

        // Mark as read
        db.prepare(`
            UPDATE messages SET read = 1 
            WHERE conversation_id = ? AND sender_id != ?
        `).run(req.params.conversationId, req.user.id);

        res.json(messages);
    } catch (error) {
        res.json([]);
    }
});

// Send a message
app.post('/api/messages', authenticateToken, (req, res) => {
    try {
        const { conversationId, listingId, recipientId, content } = req.body;

        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Message requis' });
        }

        let convId = conversationId;

        // Create conversation if needed
        if (!convId && listingId && recipientId) {
            // Check if conversation exists
            const existing = db.prepare(`
                SELECT id FROM conversations 
                WHERE listing_id = ? AND ((host_id = ? AND guest_id = ?) OR (host_id = ? AND guest_id = ?))
            `).get(listingId, req.user.id, recipientId, recipientId, req.user.id);

            if (existing) {
                convId = existing.id;
            } else {
                // Determine who is host
                const listing = db.prepare('SELECT host_id FROM listings WHERE id = ?').get(listingId);
                const hostId = listing ? listing.host_id : recipientId;
                const guestId = hostId === req.user.id ? recipientId : req.user.id;

                const result = db.prepare(`
                    INSERT INTO conversations (host_id, guest_id, listing_id, created_at)
                    VALUES (?, ?, ?, datetime('now'))
                `).run(hostId, guestId, listingId);

                convId = result.lastInsertRowid;
            }
        }

        if (!convId) {
            return res.status(400).json({ error: 'Conversation invalide' });
        }

        // Insert message
        const result = db.prepare(`
            INSERT INTO messages (conversation_id, sender_id, content, read, created_at)
            VALUES (?, ?, ?, 0, datetime('now'))
        `).run(convId, req.user.id, content.trim());

        res.status(201).json({
            success: true,
            messageId: result.lastInsertRowid,
            conversationId: convId
        });
    } catch (error) {
        console.error('Message error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get unread message count
app.get('/api/messages/unread/count', authenticateToken, (req, res) => {
    try {
        const result = db.prepare(`
            SELECT COUNT(*) as count FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE (c.host_id = ? OR c.guest_id = ?)
            AND m.sender_id != ? AND m.read = 0
        `).get(req.user.id, req.user.id, req.user.id);

        res.json({ unread: result ? result.count : 0 });
    } catch (error) {
        res.json({ unread: 0 });
    }
});

// ==========================================
// CITIES ROUTES (continuation)
// ==========================================

app.get('/api/cities', (req, res) => {
    const cities = db.prepare(`
        SELECT c.*, 
               (SELECT COUNT(*) FROM listings WHERE city_id = c.id AND status = 'active') as listings_count
        FROM cities c
        ORDER BY c.name
    `).all();
    res.json(cities);
});

app.get('/api/cities/:id', (req, res) => {
    const city = db.prepare('SELECT * FROM cities WHERE id = ?').get(req.params.id);
    if (!city) {
        return res.status(404).json({ error: 'Ville non trouvée' });
    }
    res.json(city);
});

// ==========================================
// LISTINGS ROUTES
// ==========================================

// Get all listings (with filters)
app.get('/api/listings', optionalAuth, (req, res) => {
    const { city, type, category, minPrice, maxPrice, minRating, search, featured } = req.query;

    let query = `
        SELECT l.*, c.name as city_name, u.name as host_name
        FROM listings l
        JOIN cities c ON l.city_id = c.id
        JOIN users u ON l.host_id = u.id
        WHERE l.status = 'active'
    `;
    const params = [];

    if (city) {
        query += ' AND c.slug = ?';
        params.push(city);
    }
    if (type) {
        query += ' AND l.type = ?';
        params.push(type);
    }
    if (category) {
        query += ' AND l.category = ?';
        params.push(category);
    }
    if (minPrice) {
        query += ' AND l.price >= ?';
        params.push(parseFloat(minPrice));
    }
    if (maxPrice) {
        query += ' AND l.price <= ?';
        params.push(parseFloat(maxPrice));
    }
    if (minRating) {
        query += ' AND l.rating >= ?';
        params.push(parseFloat(minRating));
    }
    if (search) {
        query += ' AND (l.title LIKE ? OR l.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }
    if (featured === 'true') {
        query += ' AND l.featured = 1';
    }

    query += ' ORDER BY l.rating DESC, l.reviews_count DESC';

    const listings = db.prepare(query).all(...params);
    res.json(listings);
});

// Get single listing
app.get('/api/listings/:id', optionalAuth, (req, res) => {
    const listing = db.prepare(`
        SELECT l.*, c.name as city_name, c.slug as city_slug,
               u.name as host_name, u.id as host_id
        FROM listings l
        JOIN cities c ON l.city_id = c.id
        JOIN users u ON l.host_id = u.id
        WHERE l.id = ?
    `).get(req.params.id);

    if (!listing) {
        return res.status(404).json({ error: 'Annonce non trouvée' });
    }

    // Get amenities
    listing.amenities = db.prepare(`
        SELECT a.name FROM listing_amenities la
        JOIN amenities a ON la.amenity_id = a.id
        WHERE la.listing_id = ?
    `).all(listing.id).map(a => a.name);

    // Get images
    listing.images = db.prepare('SELECT url FROM listing_images WHERE listing_id = ?').all(listing.id).map(i => i.url);

    // Check if favorited by current user
    if (req.user) {
        const fav = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND listing_id = ?').get(req.user.id, listing.id);
        listing.isFavorite = !!fav;
    }

    res.json(listing);
});

// Create listing (Host only)
app.post('/api/listings', authenticateToken, upload.array('images', 5), (req, res) => {
    try {
        const user = db.prepare('SELECT is_host FROM users WHERE id = ?').get(req.user.id);
        if (!user.is_host) {
            return res.status(403).json({ error: 'Vous devez être hôte pour créer une annonce' });
        }

        const { title, description, type, category, city_id, price, location, duration, max_guests, amenities } = req.body;

        if (!title || !description || !type || !city_id || !price) {
            return res.status(400).json({ error: 'Champs obligatoires manquants' });
        }

        const result = db.prepare(`
            INSERT INTO listings (
                host_id, city_id, title, description, type, category,
                price, location, duration, max_guests, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
        `).run(
            req.user.id, city_id, title, description, type, category || null,
            parseFloat(price), location || null, duration || null, max_guests || null
        );

        const listingId = result.lastInsertRowid;

        // Add images
        if (req.files && req.files.length > 0) {
            const insertImage = db.prepare('INSERT INTO listing_images (listing_id, url) VALUES (?, ?)');
            req.files.forEach((file, index) => {
                insertImage.run(listingId, `/uploads/${file.filename}`);
            });
        }

        // Add amenities
        if (amenities) {
            const amenityList = JSON.parse(amenities);
            const insertAmenity = db.prepare(`
                INSERT INTO listing_amenities (listing_id, amenity_id)
                SELECT ?, id FROM amenities WHERE name = ?
            `);
            amenityList.forEach(name => insertAmenity.run(listingId, name));
        }

        const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId);
        res.status(201).json(listing);
    } catch (error) {
        console.error('Create listing error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update listing (Host only)
app.put('/api/listings/:id', authenticateToken, (req, res) => {
    const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);

    if (!listing) {
        return res.status(404).json({ error: 'Annonce non trouvée' });
    }

    if (listing.host_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    const { title, description, price, location, duration, max_guests, status } = req.body;

    db.prepare(`
        UPDATE listings SET
            title = COALESCE(?, title),
            description = COALESCE(?, description),
            price = COALESCE(?, price),
            location = COALESCE(?, location),
            duration = COALESCE(?, duration),
            max_guests = COALESCE(?, max_guests),
            status = COALESCE(?, status),
            updated_at = datetime('now')
        WHERE id = ?
    `).run(title, description, price, location, duration, max_guests, status, req.params.id);

    const updated = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
    res.json(updated);
});

// Delete listing (Host only)
app.delete('/api/listings/:id', authenticateToken, (req, res) => {
    const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);

    if (!listing) {
        return res.status(404).json({ error: 'Annonce non trouvée' });
    }

    if (listing.host_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    db.prepare('DELETE FROM listings WHERE id = ?').run(req.params.id);
    res.json({ message: 'Annonce supprimée' });
});

// Get host's listings
app.get('/api/host/listings', authenticateToken, (req, res) => {
    const listings = db.prepare(`
        SELECT l.*, c.name as city_name
        FROM listings l
        JOIN cities c ON l.city_id = c.id
        WHERE l.host_id = ?
        ORDER BY l.created_at DESC
    `).all(req.user.id);
    res.json(listings);
});

// ==========================================
// BOOKINGS ROUTES
// ==========================================

// Get user's bookings
app.get('/api/bookings', authenticateToken, (req, res) => {
    try {
        console.log('🔍 GET /api/bookings Request for User ID:', req.user.id);
        const bookings = db.prepare(`
            SELECT b.*, 
                   COALESCE(l.title, 'Hébergement indesponible') as listing_title, 
                   COALESCE(l.image, 'https://via.placeholder.com/100x100?text=?') as listing_image,
                   COALESCE(l.location, 'Inconnu') as listing_location, 
                   COALESCE(l.price, b.total_price) as listing_price
            FROM bookings b
            LEFT JOIN listings l ON b.listing_id = l.id
            WHERE b.user_id = ?
            ORDER BY b.created_at DESC
        `).all(req.user.id);

        console.log('✅ Found bookings:', bookings.length);
        res.json(bookings);
    } catch (err) {
        console.error('❌ GET /api/bookings Error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get host's received bookings
app.get('/api/host/bookings', authenticateToken, (req, res) => {
    const bookings = db.prepare(`
        SELECT b.*, l.title as listing_title, u.name as guest_name, u.email as guest_email
        FROM bookings b
        JOIN listings l ON b.listing_id = l.id
        JOIN users u ON b.user_id = u.id
        WHERE l.host_id = ?
        ORDER BY b.created_at DESC
    `).all(req.user.id);
    res.json(bookings);
});

// Create booking
app.post('/api/bookings', authenticateToken, (req, res) => {
    try {
        console.log('🚀 POST /api/bookings RECEIVED. Body:', JSON.stringify(req.body));
        const { listing_id, date_from, date_to, guests, payment_method, listing_details } = req.body;

        if (!listing_id || !date_from || !date_to) {
            console.error('❌ Missing fields:', { listing_id, date_from, date_to });
            return res.status(400).json({ error: 'Champs obligatoires manquants' });
        }

        let listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(listing_id);

        // Auto-create listing if missing (e.g. from Amadeus or Mock)
        if (!listing && listing_details) {
            console.log('📝 Auto-creating missing listing for booking:', listing_id);
            const { title, image, location, price, type } = listing_details;

            // Clean price string to number
            const numericPrice = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.]/g, '')) : price;

            // Use Admin (ID 1) as host for external listings
            const hostId = 1;
            const cityId = 1;

            try {
                const result = db.prepare(`
                    INSERT INTO listings (
                        host_id, city_id, title, image, description, type, category,
                        price, location, status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))
                `).run(
                    hostId, cityId, title || 'Logement', image || null,
                    'Offre externe (Amadeus/Mock)', type || 'lodging', 'hotel',
                    numericPrice || 0, location || 'Algérie'
                );

                listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(result.lastInsertRowid);
                console.log('✅ Auto-created Listing ID:', listing.id);
            } catch (err) {
                console.error('❌ Auto-create listing failed:', err);
            }
        }

        if (!listing) {
            console.error('❌ Listing not found (and creation failed) for ID:', listing_id);
            return res.status(404).json({ error: 'Annonce non trouvée (et création auto impossible)' });
        }

        const internalListingId = listing.id;
        console.log('Using Internal Listing ID:', internalListingId);

        // Check availability
        const conflict = db.prepare(`
            SELECT id FROM bookings
            WHERE listing_id = ?
            AND status IN ('confirmed', 'pending')
            AND ((date_from <= ? AND date_to >= ?) OR (date_from <= ? AND date_to >= ?))
        `).get(internalListingId, date_from, date_from, date_to, date_to);

        if (conflict) {
            console.warn('⚠️ Availability Conflict:', conflict);
            return res.status(400).json({ error: 'Ces dates ne sont pas disponibles' });
        }

        // Calculate price
        const nights = Math.ceil((new Date(date_to) - new Date(date_from)) / (1000 * 60 * 60 * 24));
        const totalPrice = listing.price * nights;

        // Generate confirmation code
        const confirmationCode = 'VDZ-' + Math.random().toString(36).substring(2, 8).toUpperCase();

        console.log('💾 Inserting Booking for User:', req.user.id);
        const result = db.prepare(`
            INSERT INTO bookings (
                user_id, listing_id, date_from, date_to, guests,
                total_price, payment_method, confirmation_code, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', datetime('now'))
        `).run(
            req.user.id, internalListingId, date_from, date_to, guests || 1,
            totalPrice, payment_method || 'card', confirmationCode
        );

        console.log('✅ Booking Inserted. RowID:', result.lastInsertRowid);

        const newBooking = db.prepare(`
            SELECT b.*, l.title as listing_title, l.image as listing_image,
                   l.location as listing_location
            FROM bookings b
            JOIN listings l ON b.listing_id = l.id
            WHERE b.id = ?
        `).get(result.lastInsertRowid);

        res.status(201).json(newBooking);
    } catch (err) {
        console.error('❌ POST /api/bookings Error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Cancel booking
app.patch('/api/bookings/:id/cancel', authenticateToken, (req, res) => {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);

    if (!booking) {
        return res.status(404).json({ error: 'Réservation non trouvée' });
    }

    if (booking.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    if (booking.status === 'cancelled') {
        return res.status(400).json({ error: 'Déjà annulée' });
    }

    db.prepare('UPDATE bookings SET status = "cancelled" WHERE id = ?').run(req.params.id);
    res.json({ message: 'Réservation annulée' });
});

// ==========================================
// FAVORITES ROUTES
// ==========================================

app.get('/api/favorites', authenticateToken, (req, res) => {
    const favorites = db.prepare(`
        SELECT l.*, c.name as city_name
        FROM favorites f
        JOIN listings l ON f.listing_id = l.id
        JOIN cities c ON l.city_id = c.id
        WHERE f.user_id = ?
    `).all(req.user.id);
    res.json(favorites);
});

app.post('/api/favorites/:listingId', authenticateToken, (req, res) => {
    const listingId = parseInt(req.params.listingId);

    const existing = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND listing_id = ?').get(req.user.id, listingId);

    if (existing) {
        db.prepare('DELETE FROM favorites WHERE id = ?').run(existing.id);
        res.json({ isFavorite: false });
    } else {
        db.prepare('INSERT INTO favorites (user_id, listing_id, created_at) VALUES (?, ?, datetime("now"))').run(req.user.id, listingId);
        res.json({ isFavorite: true });
    }
});

// ==========================================
// HOST REGISTRATION
// ==========================================

app.post('/api/become-host', authenticateToken, (req, res) => {
    try {
        const { phone, description, id_document } = req.body;

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

        if (user.is_host) {
            return res.status(400).json({ error: 'Vous êtes déjà hôte' });
        }

        // Update user to host
        db.prepare(`
            UPDATE users SET
                is_host = 1,
                phone = COALESCE(?, phone),
                host_description = ?,
                updated_at = datetime('now')
            WHERE id = ?
        `).run(phone || null, description || null, req.user.id);

        const updated = db.prepare('SELECT id, name, email, role, is_host, phone FROM users WHERE id = ?').get(req.user.id);

        // Generate new token with host status
        const token = jwt.sign(
            { id: updated.id, email: updated.email, role: updated.role, isHost: true },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ user: updated, token, message: 'Félicitations ! Vous êtes maintenant hôte.' });
    } catch (error) {
        console.error('Become host error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// REVIEWS ROUTES
// ==========================================

app.get('/api/listings/:id/reviews', (req, res) => {
    const reviews = db.prepare(`
        SELECT r.*, u.name as user_name
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.listing_id = ?
        ORDER BY r.created_at DESC
    `).all(req.params.id);
    res.json(reviews);
});

app.post('/api/listings/:id/reviews', authenticateToken, (req, res) => {
    try {
        const { rating, comment } = req.body;
        const listingId = parseInt(req.params.id);

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Note requise (1-5)' });
        }

        // Check if user has booked this listing
        const hasBooked = db.prepare(`
            SELECT id FROM bookings
            WHERE user_id = ? AND listing_id = ? AND status = 'confirmed'
        `).get(req.user.id, listingId);

        if (!hasBooked) {
            return res.status(403).json({ error: 'Vous devez avoir réservé pour laisser un avis' });
        }

        // Check for existing review
        const existing = db.prepare('SELECT id FROM reviews WHERE user_id = ? AND listing_id = ?').get(req.user.id, listingId);
        if (existing) {
            return res.status(400).json({ error: 'Vous avez déjà laissé un avis' });
        }

        db.prepare(`
            INSERT INTO reviews (user_id, listing_id, rating, comment, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        `).run(req.user.id, listingId, rating, comment || null);

        // Update listing rating
        const stats = db.prepare(`
            SELECT AVG(rating) as avg_rating, COUNT(*) as count
            FROM reviews WHERE listing_id = ?
        `).get(listingId);

        db.prepare('UPDATE listings SET rating = ?, reviews_count = ? WHERE id = ?')
            .run(Math.round(stats.avg_rating * 10) / 10, stats.count, listingId);

        res.status(201).json({ message: 'Avis ajouté' });
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// AMENITIES ROUTES
// ==========================================

app.get('/api/amenities', (req, res) => {
    const { category } = req.query;
    let query = 'SELECT * FROM amenities';
    const params = [];

    if (category) {
        query += ' WHERE category = ?';
        params.push(category);
    }
    query += ' ORDER BY name';

    const amenities = db.prepare(query).all(...params);
    res.json(amenities);
});

// ==========================================
// LANGUAGES ROUTES
// ==========================================

app.get('/api/languages', (req, res) => {
    const languages = db.prepare('SELECT * FROM languages ORDER BY name').all();
    res.json(languages);
});

// Get languages for a specific listing
app.get('/api/listings/:id/languages', (req, res) => {
    const languages = db.prepare(`
        SELECT l.*, ll.is_primary
        FROM listing_languages ll
        JOIN languages l ON ll.language_id = l.id
        WHERE ll.listing_id = ?
        ORDER BY ll.is_primary DESC, l.name
    `).all(req.params.id);
    res.json(languages);
});

// Set languages for a listing (host only)
app.post('/api/listings/:id/languages', authenticateToken, (req, res) => {
    try {
        const listingId = parseInt(req.params.id);
        const { languages, primaryLanguage } = req.body;

        // Verify ownership
        const listing = db.prepare('SELECT host_id FROM listings WHERE id = ?').get(listingId);
        if (!listing || (listing.host_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'Non autorisé' });
        }

        // Delete existing languages
        db.prepare('DELETE FROM listing_languages WHERE listing_id = ?').run(listingId);

        // Insert new languages
        const insertLang = db.prepare('INSERT INTO listing_languages (listing_id, language_id, is_primary) VALUES (?, ?, ?)');
        languages.forEach(langId => {
            insertLang.run(listingId, langId, langId === primaryLanguage ? 1 : 0);
        });

        res.json({ message: 'Langues mises à jour' });
    } catch (error) {
        console.error('Set languages error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// ACTIVITY SLOTS ROUTES
// ==========================================

// Get all slots for an activity
app.get('/api/listings/:id/slots', (req, res) => {
    const { month, year, date } = req.query;
    let query = `
        SELECT s.*, 
               (s.capacity - s.booked_count) as available_spots
        FROM activity_slots s
        WHERE s.listing_id = ? AND s.status != 'cancelled'
    `;
    const params = [req.params.id];

    if (date) {
        query += ' AND s.date = ?';
        params.push(date);
    } else if (month && year) {
        query += " AND strftime('%m', s.date) = ? AND strftime('%Y', s.date) = ?";
        params.push(month.padStart(2, '0'), year);
    } else {
        // Default: next 60 days
        query += " AND s.date >= date('now') AND s.date <= date('now', '+60 days')";
    }

    query += ' ORDER BY s.date, s.start_time';

    const slots = db.prepare(query).all(...params);
    res.json(slots);
});

// Get slots for a specific date
app.get('/api/listings/:id/slots/:date', (req, res) => {
    const slots = db.prepare(`
        SELECT s.*, (s.capacity - s.booked_count) as available_spots
        FROM activity_slots s
        WHERE s.listing_id = ? AND s.date = ? AND s.status = 'available'
        ORDER BY s.start_time
    `).all(req.params.id, req.params.date);
    res.json(slots);
});

// Create a new slot (host only)
app.post('/api/listings/:id/slots', authenticateToken, (req, res) => {
    try {
        const listingId = parseInt(req.params.id);
        const { date, start_time, end_time, capacity, price_override, demand_level } = req.body;

        // Verify ownership
        const listing = db.prepare('SELECT host_id FROM listings WHERE id = ?').get(listingId);
        if (!listing || (listing.host_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'Non autorisé' });
        }

        // Check for existing slot
        const existing = db.prepare(
            'SELECT id FROM activity_slots WHERE listing_id = ? AND date = ? AND start_time = ?'
        ).get(listingId, date, start_time);

        if (existing) {
            return res.status(400).json({ error: 'Ce créneau existe déjà' });
        }

        const result = db.prepare(`
            INSERT INTO activity_slots (listing_id, date, start_time, end_time, capacity, price_override, demand_level)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(listingId, date, start_time, end_time || null, capacity || 10, price_override || null, demand_level || 'normal');

        const slot = db.prepare('SELECT * FROM activity_slots WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(slot);
    } catch (error) {
        console.error('Create slot error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Bulk create slots (for recurring schedules)
app.post('/api/listings/:id/slots/bulk', authenticateToken, (req, res) => {
    try {
        const listingId = parseInt(req.params.id);
        const { slots } = req.body; // Array of { date, start_time, end_time, capacity }

        // Verify ownership
        const listing = db.prepare('SELECT host_id FROM listings WHERE id = ?').get(listingId);
        if (!listing || (listing.host_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'Non autorisé' });
        }

        const insertSlot = db.prepare(`
            INSERT OR IGNORE INTO activity_slots (listing_id, date, start_time, end_time, capacity)
            VALUES (?, ?, ?, ?, ?)
        `);

        let created = 0;
        slots.forEach(slot => {
            const result = insertSlot.run(listingId, slot.date, slot.start_time, slot.end_time || null, slot.capacity || 10);
            if (result.changes > 0) created++;
        });

        res.json({ message: `${created} créneaux créés` });
    } catch (error) {
        console.error('Bulk create slots error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update a slot
app.put('/api/listings/:id/slots/:slotId', authenticateToken, (req, res) => {
    try {
        const slotId = parseInt(req.params.slotId);
        const { capacity, price_override, demand_level, status } = req.body;

        // Verify ownership
        const slot = db.prepare(`
            SELECT s.*, l.host_id FROM activity_slots s
            JOIN listings l ON s.listing_id = l.id
            WHERE s.id = ?
        `).get(slotId);

        if (!slot || (slot.host_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'Non autorisé' });
        }

        db.prepare(`
            UPDATE activity_slots SET
                capacity = COALESCE(?, capacity),
                price_override = COALESCE(?, price_override),
                demand_level = COALESCE(?, demand_level),
                status = COALESCE(?, status)
            WHERE id = ?
        `).run(capacity, price_override, demand_level, status, slotId);

        const updated = db.prepare('SELECT * FROM activity_slots WHERE id = ?').get(slotId);
        res.json(updated);
    } catch (error) {
        console.error('Update slot error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete a slot
app.delete('/api/listings/:id/slots/:slotId', authenticateToken, (req, res) => {
    try {
        const slotId = parseInt(req.params.slotId);

        // Verify ownership
        const slot = db.prepare(`
            SELECT s.*, l.host_id FROM activity_slots s
            JOIN listings l ON s.listing_id = l.id
            WHERE s.id = ?
        `).get(slotId);

        if (!slot || (slot.host_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'Non autorisé' });
        }

        // Check if slot has bookings
        if (slot.booked_count > 0) {
            return res.status(400).json({ error: 'Impossible de supprimer un créneau avec des réservations' });
        }

        db.prepare('DELETE FROM activity_slots WHERE id = ?').run(slotId);
        res.json({ message: 'Créneau supprimé' });
    } catch (error) {
        console.error('Delete slot error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// ITINERARY ROUTES
// ==========================================

// Get itinerary for a listing
app.get('/api/listings/:id/itinerary', (req, res) => {
    const stops = db.prepare(`
        SELECT * FROM itinerary_stops
        WHERE listing_id = ?
        ORDER BY stop_order
    `).all(req.params.id);
    res.json(stops);
});

// Set itinerary (replace all stops)
app.post('/api/listings/:id/itinerary', authenticateToken, (req, res) => {
    try {
        const listingId = parseInt(req.params.id);
        const { stops } = req.body; // Array of { name, description, duration_minutes, latitude, longitude }

        // Verify ownership
        const listing = db.prepare('SELECT host_id FROM listings WHERE id = ?').get(listingId);
        if (!listing || (listing.host_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'Non autorisé' });
        }

        // Delete existing stops
        db.prepare('DELETE FROM itinerary_stops WHERE listing_id = ?').run(listingId);

        // Insert new stops
        const insertStop = db.prepare(`
            INSERT INTO itinerary_stops (listing_id, stop_order, name, description, duration_minutes, latitude, longitude)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        stops.forEach((stop, index) => {
            insertStop.run(
                listingId, index + 1, stop.name, stop.description || null,
                stop.duration_minutes || null, stop.latitude || null, stop.longitude || null
            );
        });

        const newStops = db.prepare('SELECT * FROM itinerary_stops WHERE listing_id = ? ORDER BY stop_order').all(listingId);
        res.json(newStops);
    } catch (error) {
        console.error('Set itinerary error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// INCLUSIONS ROUTES
// ==========================================

// Get inclusions for a listing
app.get('/api/listings/:id/inclusions', (req, res) => {
    const inclusions = db.prepare(`
        SELECT * FROM listing_inclusions
        WHERE listing_id = ?
        ORDER BY is_included DESC, item
    `).all(req.params.id);
    res.json(inclusions);
});

// Set inclusions (replace all)
app.post('/api/listings/:id/inclusions', authenticateToken, (req, res) => {
    try {
        const listingId = parseInt(req.params.id);
        const { inclusions } = req.body; // Array of { item, is_included, icon }

        // Verify ownership
        const listing = db.prepare('SELECT host_id FROM listings WHERE id = ?').get(listingId);
        if (!listing || (listing.host_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'Non autorisé' });
        }

        // Delete existing
        db.prepare('DELETE FROM listing_inclusions WHERE listing_id = ?').run(listingId);

        // Insert new
        const insertInc = db.prepare(`
            INSERT INTO listing_inclusions (listing_id, item, is_included, icon)
            VALUES (?, ?, ?, ?)
        `);

        inclusions.forEach(inc => {
            insertInc.run(listingId, inc.item, inc.is_included ? 1 : 0, inc.icon || null);
        });

        const newInclusions = db.prepare('SELECT * FROM listing_inclusions WHERE listing_id = ?').all(listingId);
        res.json(newInclusions);
    } catch (error) {
        console.error('Set inclusions error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// DEPARTURE CITIES ROUTES
// ==========================================

// Get departure cities for a listing
app.get('/api/listings/:id/departure-cities', (req, res) => {
    const departures = db.prepare(`
        SELECT ldc.*, c.name as city_name, c.slug as city_slug
        FROM listing_departure_cities ldc
        JOIN cities c ON ldc.city_id = c.id
        WHERE ldc.listing_id = ?
        ORDER BY c.name
    `).all(req.params.id);
    res.json(departures);
});

// Set departure cities
app.post('/api/listings/:id/departure-cities', authenticateToken, (req, res) => {
    try {
        const listingId = parseInt(req.params.id);
        const { departures } = req.body; // Array of { city_id, pickup_point, pickup_time, extra_price }

        // Verify ownership
        const listing = db.prepare('SELECT host_id FROM listings WHERE id = ?').get(listingId);
        if (!listing || (listing.host_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'Non autorisé' });
        }

        // Delete existing
        db.prepare('DELETE FROM listing_departure_cities WHERE listing_id = ?').run(listingId);

        // Insert new
        const insertDep = db.prepare(`
            INSERT INTO listing_departure_cities (listing_id, city_id, pickup_point, pickup_time, extra_price)
            VALUES (?, ?, ?, ?, ?)
        `);

        departures.forEach(dep => {
            insertDep.run(listingId, dep.city_id, dep.pickup_point || null, dep.pickup_time || null, dep.extra_price || 0);
        });

        const newDepartures = db.prepare(`
            SELECT ldc.*, c.name as city_name
            FROM listing_departure_cities ldc
            JOIN cities c ON ldc.city_id = c.id
            WHERE ldc.listing_id = ?
        `).all(listingId);
        res.json(newDepartures);
    } catch (error) {
        console.error('Set departure cities error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// ENHANCED IMAGES ROUTES
// ==========================================

// Get images for a listing
app.get('/api/listings/:id/images', (req, res) => {
    const images = db.prepare(`
        SELECT * FROM listing_images
        WHERE listing_id = ?
        ORDER BY sort_order, id
    `).all(req.params.id);
    res.json(images);
});

// Add images to a listing
app.post('/api/listings/:id/images', authenticateToken, upload.array('images', 10), (req, res) => {
    try {
        const listingId = parseInt(req.params.id);

        // Verify ownership
        const listing = db.prepare('SELECT host_id FROM listings WHERE id = ?').get(listingId);
        if (!listing || (listing.host_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'Non autorisé' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Aucune image fournie' });
        }

        // Get current max sort_order
        const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM listing_images WHERE listing_id = ?').get(listingId);
        let sortOrder = (maxOrder.max || 0) + 1;

        const insertImage = db.prepare('INSERT INTO listing_images (listing_id, url, sort_order) VALUES (?, ?, ?)');
        const newImages = [];

        req.files.forEach(file => {
            const result = insertImage.run(listingId, `/uploads/${file.filename}`, sortOrder++);
            newImages.push({
                id: result.lastInsertRowid,
                url: `/uploads/${file.filename}`,
                sort_order: sortOrder - 1
            });
        });

        // Update main listing image if it's the first image
        if (maxOrder.max === null && newImages.length > 0) {
            db.prepare('UPDATE listings SET image = ? WHERE id = ?').run(newImages[0].url, listingId);
        }

        res.status(201).json(newImages);
    } catch (error) {
        console.error('Add images error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Reorder images
app.put('/api/listings/:id/images/reorder', authenticateToken, (req, res) => {
    try {
        const listingId = parseInt(req.params.id);
        const { imageIds } = req.body; // Array of image IDs in new order

        // Verify ownership
        const listing = db.prepare('SELECT host_id FROM listings WHERE id = ?').get(listingId);
        if (!listing || (listing.host_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'Non autorisé' });
        }

        const updateOrder = db.prepare('UPDATE listing_images SET sort_order = ? WHERE id = ? AND listing_id = ?');
        imageIds.forEach((imageId, index) => {
            updateOrder.run(index + 1, imageId, listingId);
        });

        // Update main listing image to first image
        const firstImage = db.prepare('SELECT url FROM listing_images WHERE listing_id = ? ORDER BY sort_order LIMIT 1').get(listingId);
        if (firstImage) {
            db.prepare('UPDATE listings SET image = ? WHERE id = ?').run(firstImage.url, listingId);
        }

        res.json({ message: 'Ordre mis à jour' });
    } catch (error) {
        console.error('Reorder images error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete an image
app.delete('/api/listings/:id/images/:imageId', authenticateToken, (req, res) => {
    try {
        const listingId = parseInt(req.params.id);
        const imageId = parseInt(req.params.imageId);

        // Verify ownership
        const listing = db.prepare('SELECT host_id, image FROM listings WHERE id = ?').get(listingId);
        if (!listing || (listing.host_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'Non autorisé' });
        }

        // Get the image
        const image = db.prepare('SELECT url FROM listing_images WHERE id = ? AND listing_id = ?').get(imageId, listingId);
        if (!image) {
            return res.status(404).json({ error: 'Image non trouvée' });
        }

        // Delete from database
        db.prepare('DELETE FROM listing_images WHERE id = ?').run(imageId);

        // If this was the main image, update to next image
        if (listing.image === image.url) {
            const nextImage = db.prepare('SELECT url FROM listing_images WHERE listing_id = ? ORDER BY sort_order LIMIT 1').get(listingId);
            db.prepare('UPDATE listings SET image = ? WHERE id = ?').run(nextImage ? nextImage.url : null, listingId);
        }

        // TODO: Delete file from uploads folder
        // const filePath = path.join(__dirname, image.url);
        // if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        res.json({ message: 'Image supprimée' });
    } catch (error) {
        console.error('Delete image error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// ENHANCED LISTING DETAIL (with all relations)
// ==========================================

app.get('/api/listings/:id/full', optionalAuth, (req, res) => {
    try {
        const listing = db.prepare(`
            SELECT l.*, c.name as city_name, c.slug as city_slug,
                   u.name as host_name, u.id as host_id, u.avatar as host_avatar,
                   u.host_description, u.phone as host_phone
            FROM listings l
            JOIN cities c ON l.city_id = c.id
            JOIN users u ON l.host_id = u.id
            WHERE l.id = ?
        `).get(req.params.id);

        if (!listing) {
            return res.status(404).json({ error: 'Annonce non trouvée' });
        }

        // Get all related data
        listing.images = db.prepare('SELECT * FROM listing_images WHERE listing_id = ? ORDER BY sort_order').all(listing.id);
        listing.amenities = db.prepare(`
            SELECT a.* FROM listing_amenities la
            JOIN amenities a ON la.amenity_id = a.id
            WHERE la.listing_id = ?
        `).all(listing.id);

        // Activity-specific data
        if (listing.type === 'activity') {
            listing.languages = db.prepare(`
                SELECT l.*, ll.is_primary FROM listing_languages ll
                JOIN languages l ON ll.language_id = l.id
                WHERE ll.listing_id = ?
                ORDER BY ll.is_primary DESC
            `).all(listing.id);

            listing.inclusions = db.prepare('SELECT * FROM listing_inclusions WHERE listing_id = ? ORDER BY is_included DESC').all(listing.id);
            listing.itinerary = db.prepare('SELECT * FROM itinerary_stops WHERE listing_id = ? ORDER BY stop_order').all(listing.id);
            listing.departure_cities = db.prepare(`
                SELECT ldc.*, c.name as city_name, c.slug as city_slug
                FROM listing_departure_cities ldc
                JOIN cities c ON ldc.city_id = c.id
                WHERE ldc.listing_id = ?
            `).all(listing.id);

            // Get next available slots
            listing.next_slots = db.prepare(`
                SELECT * FROM activity_slots
                WHERE listing_id = ? AND date >= date('now') AND status = 'available' AND booked_count < capacity
                ORDER BY date, start_time
                LIMIT 10
            `).all(listing.id);
        }

        // Check if favorited by current user
        if (req.user) {
            const fav = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND listing_id = ?').get(req.user.id, listing.id);
            listing.isFavorite = !!fav;
        }

        // Parse JSON fields
        if (listing.what_to_bring) {
            try { listing.what_to_bring = JSON.parse(listing.what_to_bring); } catch (e) { }
        }
        if (listing.good_to_know) {
            try { listing.good_to_know = JSON.parse(listing.good_to_know); } catch (e) { }
        }

        res.json(listing);
    } catch (error) {
        console.error('Get full listing error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// STATS (for dashboard)
// ==========================================

app.get('/api/stats', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const bookingsCount = db.prepare('SELECT COUNT(*) as count FROM bookings WHERE user_id = ?').get(userId).count;
    const favoritesCount = db.prepare('SELECT COUNT(*) as count FROM favorites WHERE user_id = ?').get(userId).count;
    const totalSpent = db.prepare('SELECT COALESCE(SUM(total_price), 0) as total FROM bookings WHERE user_id = ? AND status = "confirmed"').get(userId).total;

    res.json({
        bookings: bookingsCount,
        favorites: favoritesCount,
        totalSpent
    });
});

// Host stats
app.get('/api/host/stats', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const listingsCount = db.prepare('SELECT COUNT(*) as count FROM listings WHERE host_id = ?').get(userId).count;
    const bookingsReceived = db.prepare(`
        SELECT COUNT(*) as count FROM bookings b
        JOIN listings l ON b.listing_id = l.id
        WHERE l.host_id = ?
    `).get(userId).count;
    const totalEarned = db.prepare(`
        SELECT COALESCE(SUM(b.total_price), 0) as total FROM bookings b
        JOIN listings l ON b.listing_id = l.id
        WHERE l.host_id = ? AND b.status = 'confirmed'
    `).get(userId).total;

    res.json({
        listings: listingsCount,
        bookings: bookingsReceived,
        totalEarned
    });
});

// ==========================================
// API ROOT INFO
// ==========================================

app.get('/api', (req, res) => {
    res.json({
        name: 'Voyage DZ API',
        version: '2.0.0',
        description: 'API de réservation touristique en Algérie',
        endpoints: {
            auth: '/api/auth/*',
            cities: '/api/cities',
            listings: '/api/listings',
            languages: '/api/languages',
            amenities: '/api/amenities',
            bookings: '/api/bookings',
            favorites: '/api/favorites'
        }
    });
});

app.get('/', (req, res) => {
    res.json({
        message: 'Bienvenue sur Voyage DZ API',
        documentation: '/api',
        frontend: 'http://localhost:8080'
    });
});

// ==========================================
// Error Handler
// ==========================================

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Une erreur est survenue' });
});

// ==========================================
// Start Server
// ==========================================

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                     VOYAGE DZ - API v2.0                          ║
║                                                                    ║
║   🚀 Server running on http://localhost:${PORT}                     ║
║   📊 Database: SQLite (./data/database.sqlite)                     ║
║                                                                    ║
║   NEW ENDPOINTS:                                                   ║
║   • /api/languages - Guide languages                               ║
║   • /api/listings/:id/slots - Activity time slots                  ║
║   • /api/listings/:id/itinerary - Tour itinerary                   ║
║   • /api/listings/:id/inclusions - What's included                 ║
║   • /api/listings/:id/departure-cities - Pickup points             ║
║   • /api/listings/:id/images - Image management                    ║
║   • /api/listings/:id/full - Complete listing data                 ║
║                                                                    ║
╚══════════════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;

