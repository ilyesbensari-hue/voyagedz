// ==========================================
// VOYAGE DZ - Backend Server v3.0
// ==========================================
// Stack: Node.js + Express + PostgreSQL (Neon)
// Auth: JWT
// DB: PostgreSQL via pg pool (db.js)
// ==========================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');
const passport = require('./passport-setup');
const { pool, query, getOne, getAll } = require('./db');

// ==========================================
// Configuration
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'voyage-dz-secret-key-2024';

// ==========================================
// Middleware
// ==========================================
app.use(cors({
    origin: function(origin, callback) {
        // Allow: localhost (dev), Vercel domains, custom domains
        const allowed = [
            /localhost/,
            /127\.0\.0\.1/,
            /\.vercel\.app$/,
            /voyagedz/
        ];
        if (!origin || allowed.some(r => r.test(origin))) {
            callback(null, true);
        } else {
            callback(null, true); // permissive for now
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(session({
    secret: 'voyage-dz-session-secret',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Serve uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Serve frontend
app.use(express.static(path.join(__dirname, '../')));

// ==========================================
// Multer Upload
// ==========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        cb(null, allowed.includes(file.mimetype));
    }
});

// ==========================================
// Auth Middlewares
// ==========================================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token requis' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token invalide' });
        req.user = user;
        next();
    });
};

const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (!err) req.user = user;
        });
    }
    next();
};

// ==========================================
// AUTH ROUTES
// ==========================================

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        if (!name || !email || !password)
            return res.status(400).json({ error: 'Nom, email et mot de passe requis' });

        const existing = await getOne('SELECT id FROM users WHERE email = $1', [email]);
        if (existing) return res.status(400).json({ error: 'Cet email est déjà utilisé' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await getOne(
            `INSERT INTO users (name, email, password, phone, role, created_at)
             VALUES ($1, $2, $3, $4, 'user', NOW()) RETURNING id, name, email, role`,
            [name, email, hashedPassword, phone || null]
        );

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
        const user = await getOne('SELECT * FROM users WHERE email = $1', [email]);
        if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

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

// Social Auth — Google
app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        const token = jwt.sign(
            { id: req.user.id, email: req.user.email, role: req.user.role },
            JWT_SECRET, { expiresIn: '7d' }
        );
        res.redirect(`/?token=${token}`);
    }
);

// Social Auth — Facebook
app.get('/api/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));
app.get('/api/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    (req, res) => {
        const token = jwt.sign(
            { id: req.user.id, email: req.user.email, role: req.user.role },
            JWT_SECRET, { expiresIn: '7d' }
        );
        res.redirect(`/?token=${token}`);
    }
);

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await getOne(
            'SELECT id, name, email, role, is_host, phone, avatar, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update profile
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
    try {
        const { name, phone } = req.body;
        const user = await getOne(
            `UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone), updated_at = NOW()
             WHERE id = $3 RETURNING id, name, email, role, is_host, phone`,
            [name, phone, req.user.id]
        );
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// UPLOAD ROUTES
// ==========================================

app.post('/api/upload', authenticateToken, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Aucune image fournie' });
    const url = `/uploads/${req.file.filename}`;
    res.json({ success: true, url, filename: req.file.filename, size: req.file.size });
});

app.post('/api/upload/multiple', authenticateToken, upload.array('images', 10), (req, res) => {
    if (!req.files || req.files.length === 0)
        return res.status(400).json({ error: 'Aucune image fournie' });
    const uploaded = req.files.map(file => ({
        url: `/uploads/${file.filename}`,
        filename: file.filename,
        size: file.size
    }));
    res.json({ success: true, images: uploaded });
});

// ==========================================
// CITIES ROUTES
// ==========================================

app.get('/api/cities', async (req, res) => {
    try {
        const cities = await getAll(`
            SELECT c.*,
                   COUNT(l.id) FILTER (WHERE l.status = 'active') as listings_count
            FROM cities c
            LEFT JOIN listings l ON l.city_id = c.id
            GROUP BY c.id
            ORDER BY c.name
        `);
        res.json(cities);
    } catch (error) {
        console.error('Cities error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/cities/:id', async (req, res) => {
    try {
        const city = await getOne('SELECT * FROM cities WHERE id = $1', [req.params.id]);
        if (!city) return res.status(404).json({ error: 'Ville non trouvée' });
        res.json(city);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// LISTINGS ROUTES
// ==========================================

// Get all listings (with filters + pagination)
app.get('/api/listings', optionalAuth, async (req, res) => {
    try {
        const { city, type, category, minPrice, maxPrice, minRating, search, featured, page = 1, limit = 50 } = req.query;
        const params = [];
        let whereClause = "WHERE l.status = 'active'";

        if (city) {
            params.push(city);
            whereClause += ` AND c.slug = $${params.length}`;
        }
        if (type) {
            params.push(type);
            whereClause += ` AND l.type = $${params.length}`;
        }
        if (category) {
            params.push(category);
            whereClause += ` AND l.category = $${params.length}`;
        }
        if (minPrice) {
            params.push(parseFloat(minPrice));
            whereClause += ` AND l.price >= $${params.length}`;
        }
        if (maxPrice) {
            params.push(parseFloat(maxPrice));
            whereClause += ` AND l.price <= $${params.length}`;
        }
        if (minRating) {
            params.push(parseFloat(minRating));
            whereClause += ` AND l.rating >= $${params.length}`;
        }
        if (search) {
            params.push(`%${search}%`);
            whereClause += ` AND (l.title ILIKE $${params.length} OR l.description ILIKE $${params.length})`;
        }
        if (featured === 'true') {
            whereClause += ' AND l.featured = 1';
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit));
        params.push(offset);

        const listings = await getAll(`
            SELECT l.*, c.name as city_name, c.slug as city_slug, u.name as host_name
            FROM listings l
            JOIN cities c ON l.city_id = c.id
            JOIN users u ON l.host_id = u.id
            ${whereClause}
            ORDER BY l.rating DESC, l.reviews_count DESC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `, params);

        res.json(listings);
    } catch (error) {
        console.error('Listings error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get single listing (full details)
app.get('/api/listings/:id', optionalAuth, async (req, res) => {
    try {
        const listing = await getOne(`
            SELECT l.*, c.name as city_name, c.slug as city_slug,
                   u.name as host_name, u.id as host_id, u.avatar as host_avatar,
                   u.host_description, u.phone as host_phone
            FROM listings l
            JOIN cities c ON l.city_id = c.id
            JOIN users u ON l.host_id = u.id
            WHERE l.id = $1
        `, [req.params.id]);

        if (!listing) return res.status(404).json({ error: 'Annonce non trouvée' });

        // Get amenities
        listing.amenities = (await getAll(`
            SELECT a.name, a.icon FROM listing_amenities la
            JOIN amenities a ON la.amenity_id = a.id
            WHERE la.listing_id = $1
        `, [listing.id])).map(a => a.name);

        // Get images
        listing.images = (await getAll(
            'SELECT url FROM listing_images WHERE listing_id = $1 ORDER BY sort_order',
            [listing.id]
        )).map(i => i.url);

        // Activity-specific data
        if (listing.type === 'activity') {
            listing.inclusions = await getAll(
                'SELECT * FROM listing_inclusions WHERE listing_id = $1 ORDER BY is_included DESC',
                [listing.id]
            );
            listing.itinerary = await getAll(
                'SELECT * FROM itinerary_stops WHERE listing_id = $1 ORDER BY stop_order',
                [listing.id]
            );
            listing.languages = await getAll(`
                SELECT l.*, ll.is_primary FROM listing_languages ll
                JOIN languages l ON ll.language_id = l.id
                WHERE ll.listing_id = $1 ORDER BY ll.is_primary DESC
            `, [listing.id]);
            listing.departure_cities = await getAll(`
                SELECT ldc.*, c.name as city_name, c.slug as city_slug
                FROM listing_departure_cities ldc
                JOIN cities c ON ldc.city_id = c.id
                WHERE ldc.listing_id = $1
            `, [listing.id]);
            listing.next_slots = await getAll(`
                SELECT * FROM activity_slots
                WHERE listing_id = $1 AND date >= CURRENT_DATE AND status = 'available' AND booked_count < capacity
                ORDER BY date, start_time LIMIT 10
            `, [listing.id]);
        }

        // Check favorite
        if (req.user) {
            const fav = await getOne(
                'SELECT id FROM favorites WHERE user_id = $1 AND listing_id = $2',
                [req.user.id, listing.id]
            );
            listing.isFavorite = !!fav;
        }

        // Parse JSON fields
        if (listing.what_to_bring && typeof listing.what_to_bring === 'string') {
            try { listing.what_to_bring = JSON.parse(listing.what_to_bring); } catch (e) {}
        }

        res.json(listing);
    } catch (error) {
        console.error('Get listing error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create listing (Host only)
app.post('/api/listings', authenticateToken, upload.array('images', 5), async (req, res) => {
    try {
        const user = await getOne('SELECT is_host FROM users WHERE id = $1', [req.user.id]);
        if (!user.is_host) return res.status(403).json({ error: 'Vous devez être hôte pour créer une annonce' });

        const { title, description, type, category, city_id, price, location, duration, max_guests, amenities } = req.body;
        if (!title || !description || !type || !city_id || !price)
            return res.status(400).json({ error: 'Champs obligatoires manquants' });

        const listing = await getOne(`
            INSERT INTO listings (host_id, city_id, title, description, type, category,
                price, location, duration, max_guests, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', NOW()) RETURNING *
        `, [req.user.id, city_id, title, description, type, category || null,
            parseFloat(price), location || null, duration || null, max_guests || null]);

        // Add images
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                await query(
                    'INSERT INTO listing_images (listing_id, url, sort_order) VALUES ($1, $2, $3)',
                    [listing.id, `/uploads/${file.filename}`, 0]
                );
            }
            // Set primary image
            await query('UPDATE listings SET image = $1 WHERE id = $2',
                [`/uploads/${req.files[0].filename}`, listing.id]);
        }

        // Add amenities
        if (amenities) {
            const amenityList = JSON.parse(amenities);
            for (const name of amenityList) {
                const amenity = await getOne('SELECT id FROM amenities WHERE name = $1', [name]);
                if (amenity) await query(
                    'INSERT INTO listing_amenities (listing_id, amenity_id) VALUES ($1, $2)',
                    [listing.id, amenity.id]
                );
            }
        }

        res.status(201).json(listing);
    } catch (error) {
        console.error('Create listing error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update listing
app.put('/api/listings/:id', authenticateToken, async (req, res) => {
    try {
        const listing = await getOne('SELECT * FROM listings WHERE id = $1', [req.params.id]);
        if (!listing) return res.status(404).json({ error: 'Annonce non trouvée' });
        if (listing.host_id !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ error: 'Non autorisé' });

        const { title, description, price, location, duration, max_guests, status } = req.body;
        const updated = await getOne(`
            UPDATE listings SET
                title = COALESCE($1, title),
                description = COALESCE($2, description),
                price = COALESCE($3, price),
                location = COALESCE($4, location),
                duration = COALESCE($5, duration),
                max_guests = COALESCE($6, max_guests),
                status = COALESCE($7, status),
                updated_at = NOW()
            WHERE id = $8 RETURNING *
        `, [title, description, price, location, duration, max_guests, status, req.params.id]);

        res.json(updated);
    } catch (error) {
        console.error('Update listing error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete listing
app.delete('/api/listings/:id', authenticateToken, async (req, res) => {
    try {
        const listing = await getOne('SELECT * FROM listings WHERE id = $1', [req.params.id]);
        if (!listing) return res.status(404).json({ error: 'Annonce non trouvée' });
        if (listing.host_id !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ error: 'Non autorisé' });
        await query('DELETE FROM listings WHERE id = $1', [req.params.id]);
        res.json({ message: 'Annonce supprimée' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update listing status (admin only)
app.patch('/api/listings/:id/status', authenticateToken, async (req, res) => {
    try {
        const user = await getOne('SELECT role FROM users WHERE id = $1', [req.user.id]);
        if (!user || user.role !== 'admin')
            return res.status(403).json({ error: 'Accès admin requis' });

        const { status } = req.body;
        if (!['active', 'pending', 'inactive'].includes(status))
            return res.status(400).json({ error: 'Statut invalide' });

        const updated = await getOne(
            'UPDATE listings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, title, status',
            [status, req.params.id]
        );
        if (!updated) return res.status(404).json({ error: 'Annonce non trouvée' });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get host's listings
app.get('/api/host/listings', authenticateToken, async (req, res) => {
    try {
        const listings = await getAll(`
            SELECT l.*, c.name as city_name FROM listings l
            JOIN cities c ON l.city_id = c.id
            WHERE l.host_id = $1 ORDER BY l.created_at DESC
        `, [req.user.id]);
        res.json(listings);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// BOOKING ROUTES
// ==========================================

// Get user's bookings
app.get('/api/bookings', authenticateToken, async (req, res) => {
    try {
        const bookings = await getAll(`
            SELECT b.*,
                   COALESCE(l.title, 'Hébergement indisponible') as listing_title,
                   COALESCE(l.image, '') as listing_image,
                   COALESCE(l.location, 'Inconnu') as listing_location,
                   COALESCE(l.price, b.total_price) as listing_price
            FROM bookings b
            LEFT JOIN listings l ON b.listing_id = l.id
            WHERE b.user_id = $1
            ORDER BY b.created_at DESC
        `, [req.user.id]);
        res.json(bookings);
    } catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get host's received bookings
app.get('/api/host/bookings', authenticateToken, async (req, res) => {
    try {
        const bookings = await getAll(`
            SELECT b.*, l.title as listing_title, u.name as guest_name, u.email as guest_email
            FROM bookings b
            JOIN listings l ON b.listing_id = l.id
            JOIN users u ON b.user_id = u.id
            WHERE l.host_id = $1
            ORDER BY b.created_at DESC
        `, [req.user.id]);
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create booking
app.post('/api/bookings', authenticateToken, async (req, res) => {
    try {
        const { listing_id, date_from, date_to, guests, payment_method, listing_details } = req.body;
        if (!listing_id || !date_from || !date_to)
            return res.status(400).json({ error: 'Champs obligatoires manquants' });

        let listing = await getOne('SELECT * FROM listings WHERE id = $1', [listing_id]);

        // Auto-create listing if external (Amadeus/mock)
        if (!listing && listing_details) {
            const { title, image, location, price, type } = listing_details;
            const numericPrice = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.]/g, '')) : price;
            listing = await getOne(`
                INSERT INTO listings (host_id, city_id, title, image, description, type, category,
                    price, location, status, created_at)
                VALUES (1, 1, $1, $2, 'Offre externe', $3, 'hotel', $4, $5, 'active', NOW())
                RETURNING *
            `, [title || 'Logement', image || null, type || 'lodging', numericPrice || 0, location || 'Algérie']);
        }

        if (!listing) return res.status(404).json({ error: 'Annonce non trouvée' });

        // Check availability
        const conflict = await getOne(`
            SELECT id FROM bookings
            WHERE listing_id = $1 AND status IN ('confirmed', 'pending')
            AND (date_from <= $2 AND date_to >= $2 OR date_from <= $3 AND date_to >= $3)
        `, [listing.id, date_from, date_to]);

        if (conflict) return res.status(400).json({ error: 'Ces dates ne sont pas disponibles' });

        // Calculate price
        const nights = Math.ceil((new Date(date_to) - new Date(date_from)) / (1000 * 60 * 60 * 24));
        const totalPrice = listing.price * (nights || 1);
        const confirmationCode = 'VDZ-' + Math.random().toString(36).substring(2, 8).toUpperCase();

        const newBooking = await getOne(`
            INSERT INTO bookings (user_id, listing_id, date_from, date_to, guests,
                total_price, payment_method, confirmation_code, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed', NOW()) RETURNING *
        `, [req.user.id, listing.id, date_from, date_to, guests || 1,
            totalPrice, payment_method || 'card', confirmationCode]);

        // Enrich with listing info
        newBooking.listing_title = listing.title;
        newBooking.listing_image = listing.image;
        newBooking.listing_location = listing.location;

        res.status(201).json(newBooking);
    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Cancel booking
app.patch('/api/bookings/:id/cancel', authenticateToken, async (req, res) => {
    try {
        const booking = await getOne('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
        if (!booking) return res.status(404).json({ error: 'Réservation non trouvée' });
        if (booking.user_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });
        if (booking.status === 'cancelled') return res.status(400).json({ error: 'Déjà annulée' });

        await query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [req.params.id]);
        res.json({ message: 'Réservation annulée' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// FAVORITES ROUTES
// ==========================================

app.get('/api/favorites', authenticateToken, async (req, res) => {
    try {
        const favorites = await getAll(`
            SELECT l.*, c.name as city_name, c.slug as city_slug
            FROM favorites f
            JOIN listings l ON f.listing_id = l.id
            JOIN cities c ON l.city_id = c.id
            WHERE f.user_id = $1
            ORDER BY f.created_at DESC
        `, [req.user.id]);
        res.json(favorites);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/favorites/:listingId', authenticateToken, async (req, res) => {
    try {
        const listingId = parseInt(req.params.listingId);
        const existing = await getOne(
            'SELECT id FROM favorites WHERE user_id = $1 AND listing_id = $2',
            [req.user.id, listingId]
        );
        if (existing) {
            await query('DELETE FROM favorites WHERE id = $1', [existing.id]);
            res.json({ isFavorite: false });
        } else {
            await query(
                'INSERT INTO favorites (user_id, listing_id, created_at) VALUES ($1, $2, NOW())',
                [req.user.id, listingId]
            );
            res.json({ isFavorite: true });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// REVIEWS ROUTES
// ==========================================

app.get('/api/listings/:id/reviews', async (req, res) => {
    try {
        const reviews = await getAll(`
            SELECT r.*, u.name as user_name, u.avatar as user_avatar
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.listing_id = $1
            ORDER BY r.created_at DESC
        `, [req.params.id]);

        // Get photos for each review
        for (const review of reviews) {
            const photos = await getAll('SELECT url FROM review_photos WHERE review_id = $1', [review.id]);
            review.photos = photos.map(p => p.url);
        }
        res.json(reviews);
    } catch (error) {
        res.json([]);
    }
});

app.post('/api/listings/:id/reviews', authenticateToken, upload.array('photos', 5), async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const listingId = parseInt(req.params.id);

        if (!rating || rating < 1 || rating > 5)
            return res.status(400).json({ error: 'Note entre 1 et 5 requise' });

        // Check if user has booked this listing
        const booking = await getOne(`
            SELECT id FROM bookings
            WHERE user_id = $1 AND listing_id = $2 AND status = 'confirmed'
        `, [req.user.id, listingId]);

        if (!booking)
            return res.status(403).json({ error: 'Vous devez avoir réservé pour laisser un avis' });

        // Check existing review
        const existing = await getOne(
            'SELECT id FROM reviews WHERE user_id = $1 AND listing_id = $2',
            [req.user.id, listingId]
        );
        if (existing) return res.status(400).json({ error: 'Vous avez déjà laissé un avis' });

        const review = await getOne(`
            INSERT INTO reviews (user_id, listing_id, booking_id, rating, comment, is_verified, created_at)
            VALUES ($1, $2, $3, $4, $5, 1, NOW()) RETURNING id
        `, [req.user.id, listingId, booking.id, rating, comment || '']);

        // Save review photos
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                await query('INSERT INTO review_photos (review_id, url) VALUES ($1, $2)',
                    [review.id, `/uploads/${file.filename}`]);
            }
        }

        // Update listing average rating
        const stats = await getOne(
            'SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE listing_id = $1',
            [listingId]
        );
        await query('UPDATE listings SET rating = $1, reviews_count = $2 WHERE id = $3',
            [Math.round(parseFloat(stats.avg_rating) * 10) / 10, parseInt(stats.count), listingId]);

        res.status(201).json({ success: true, reviewId: review.id });
    } catch (error) {
        console.error('Review error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// MESSAGING ROUTES
// ==========================================

// Get user's conversations
app.get('/api/messages', authenticateToken, async (req, res) => {
    try {
        const conversations = await getAll(`
            SELECT c.*,
                   l.title as listing_title, l.image as listing_image,
                   CASE WHEN c.host_id = $1 THEN g.name ELSE h.name END as other_user_name,
                   CASE WHEN c.host_id = $1 THEN g.id ELSE h.id END as other_user_id,
                   (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.read = 0 AND m.sender_id != $1) as unread_count,
                   (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
                   (SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_at
            FROM conversations c
            JOIN listings l ON c.listing_id = l.id
            JOIN users h ON c.host_id = h.id
            JOIN users g ON c.guest_id = g.id
            WHERE c.host_id = $1 OR c.guest_id = $1
            ORDER BY last_message_at DESC NULLS LAST
        `, [req.user.id]);
        res.json(conversations);
    } catch (error) {
        res.json([]);
    }
});

// Get messages in a conversation
app.get('/api/messages/:conversationId', authenticateToken, async (req, res) => {
    try {
        const conv = await getOne(
            'SELECT * FROM conversations WHERE id = $1 AND (host_id = $2 OR guest_id = $2)',
            [req.params.conversationId, req.user.id]
        );
        if (!conv) return res.status(403).json({ error: 'Accès non autorisé' });

        const messages = await getAll(`
            SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = $1
            ORDER BY m.created_at ASC
        `, [req.params.conversationId]);

        // Mark as read
        await query(
            'UPDATE messages SET read = 1 WHERE conversation_id = $1 AND sender_id != $2',
            [req.params.conversationId, req.user.id]
        );
        res.json(messages);
    } catch (error) {
        res.json([]);
    }
});

// Send a message
app.post('/api/messages', authenticateToken, async (req, res) => {
    try {
        const { conversationId, listingId, recipientId, content } = req.body;
        if (!content || content.trim() === '')
            return res.status(400).json({ error: 'Message requis' });

        let convId = conversationId;

        if (!convId && listingId && recipientId) {
            const existing = await getOne(`
                SELECT id FROM conversations
                WHERE listing_id = $1
                AND ((host_id = $2 AND guest_id = $3) OR (host_id = $3 AND guest_id = $2))
            `, [listingId, req.user.id, recipientId]);

            if (existing) {
                convId = existing.id;
            } else {
                const listing = await getOne('SELECT host_id FROM listings WHERE id = $1', [listingId]);
                const hostId = listing ? listing.host_id : recipientId;
                const guestId = hostId === req.user.id ? recipientId : req.user.id;
                const conv = await getOne(
                    'INSERT INTO conversations (host_id, guest_id, listing_id, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
                    [hostId, guestId, listingId]
                );
                convId = conv.id;
            }
        }

        if (!convId) return res.status(400).json({ error: 'Conversation invalide' });

        const msg = await getOne(
            'INSERT INTO messages (conversation_id, sender_id, content, read, created_at) VALUES ($1, $2, $3, 0, NOW()) RETURNING id',
            [convId, req.user.id, content.trim()]
        );
        res.status(201).json({ success: true, messageId: msg.id, conversationId: convId });
    } catch (error) {
        console.error('Message error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get unread message count
app.get('/api/messages/unread/count', authenticateToken, async (req, res) => {
    try {
        const result = await getOne(`
            SELECT COUNT(*) as count FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE (c.host_id = $1 OR c.guest_id = $1)
            AND m.sender_id != $1 AND m.read = 0
        `, [req.user.id]);
        res.json({ unread: parseInt(result?.count || 0) });
    } catch (error) {
        res.json({ unread: 0 });
    }
});

// ==========================================
// HOST REGISTRATION
// ==========================================

app.post('/api/become-host', authenticateToken, async (req, res) => {
    try {
        const { phone, description } = req.body;
        const user = await getOne('SELECT * FROM users WHERE id = $1', [req.user.id]);
        if (user.is_host) return res.status(400).json({ error: 'Vous êtes déjà hôte' });

        const updated = await getOne(`
            UPDATE users SET is_host = 1, phone = COALESCE($1, phone),
                host_description = $2, updated_at = NOW()
            WHERE id = $3 RETURNING id, name, email, role, is_host, phone
        `, [phone || null, description || null, req.user.id]);

        const token = jwt.sign(
            { id: updated.id, email: updated.email, role: updated.role, isHost: true },
            JWT_SECRET, { expiresIn: '7d' }
        );
        res.json({ user: updated, token, message: 'Félicitations ! Vous êtes maintenant hôte.' });
    } catch (error) {
        console.error('Become host error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// AMENITIES & LANGUAGES
// ==========================================

app.get('/api/amenities', async (req, res) => {
    try {
        const { category } = req.query;
        const amenities = category
            ? await getAll('SELECT * FROM amenities WHERE category = $1 ORDER BY name', [category])
            : await getAll('SELECT * FROM amenities ORDER BY name');
        res.json(amenities);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/languages', async (req, res) => {
    try {
        const langs = await getAll('SELECT * FROM languages ORDER BY name');
        res.json(langs);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// ACTIVITY SLOTS
// ==========================================

app.get('/api/listings/:id/slots', async (req, res) => {
    try {
        const { date } = req.query;
        let slots;
        if (date) {
            slots = await getAll(`
                SELECT *, (capacity - booked_count) as available_spots
                FROM activity_slots
                WHERE listing_id = $1 AND date = $2 AND status != 'cancelled'
                ORDER BY start_time
            `, [req.params.id, date]);
        } else {
            slots = await getAll(`
                SELECT *, (capacity - booked_count) as available_spots
                FROM activity_slots
                WHERE listing_id = $1 AND status != 'cancelled'
                AND date >= CURRENT_DATE AND date <= CURRENT_DATE + INTERVAL '60 days'
                ORDER BY date, start_time
            `, [req.params.id]);
        }
        res.json(slots);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// ITINERARY & INCLUSIONS
// ==========================================

app.get('/api/listings/:id/itinerary', async (req, res) => {
    try {
        const stops = await getAll(
            'SELECT * FROM itinerary_stops WHERE listing_id = $1 ORDER BY stop_order',
            [req.params.id]
        );
        res.json(stops);
    } catch (error) {
        res.json([]);
    }
});

app.get('/api/listings/:id/inclusions', async (req, res) => {
    try {
        const inclusions = await getAll(
            'SELECT * FROM listing_inclusions WHERE listing_id = $1 ORDER BY is_included DESC',
            [req.params.id]
        );
        res.json(inclusions);
    } catch (error) {
        res.json([]);
    }
});

app.get('/api/listings/:id/departure-cities', async (req, res) => {
    try {
        const departures = await getAll(`
            SELECT ldc.*, c.name as city_name, c.slug as city_slug
            FROM listing_departure_cities ldc
            JOIN cities c ON ldc.city_id = c.id
            WHERE ldc.listing_id = $1 ORDER BY c.name
        `, [req.params.id]);
        res.json(departures);
    } catch (error) {
        res.json([]);
    }
});

// ==========================================
// LISTING IMAGES
// ==========================================

app.get('/api/listings/:id/images', async (req, res) => {
    try {
        const images = await getAll(
            'SELECT * FROM listing_images WHERE listing_id = $1 ORDER BY sort_order, id',
            [req.params.id]
        );
        res.json(images);
    } catch (error) {
        res.json([]);
    }
});

app.post('/api/listings/:id/images', authenticateToken, upload.array('images', 10), async (req, res) => {
    try {
        const listingId = parseInt(req.params.id);
        const listing = await getOne('SELECT host_id FROM listings WHERE id = $1', [listingId]);
        if (!listing || (listing.host_id !== req.user.id && req.user.role !== 'admin'))
            return res.status(403).json({ error: 'Non autorisé' });

        if (!req.files || req.files.length === 0)
            return res.status(400).json({ error: 'Aucune image fournie' });

        const maxOrder = await getOne(
            'SELECT MAX(sort_order) as max FROM listing_images WHERE listing_id = $1', [listingId]
        );
        let sortOrder = (maxOrder?.max || 0) + 1;
        const newImages = [];

        for (const file of req.files) {
            const img = await getOne(
                'INSERT INTO listing_images (listing_id, url, sort_order) VALUES ($1, $2, $3) RETURNING *',
                [listingId, `/uploads/${file.filename}`, sortOrder++]
            );
            newImages.push(img);
        }

        if (maxOrder?.max === null && newImages.length > 0) {
            await query('UPDATE listings SET image = $1 WHERE id = $2', [newImages[0].url, listingId]);
        }
        res.status(201).json(newImages);
    } catch (error) {
        console.error('Add images error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.delete('/api/listings/:id/images/:imageId', authenticateToken, async (req, res) => {
    try {
        const listingId = parseInt(req.params.id);
        const imageId = parseInt(req.params.imageId);

        const listing = await getOne('SELECT host_id, image FROM listings WHERE id = $1', [listingId]);
        if (!listing || (listing.host_id !== req.user.id && req.user.role !== 'admin'))
            return res.status(403).json({ error: 'Non autorisé' });

        const image = await getOne(
            'SELECT url FROM listing_images WHERE id = $1 AND listing_id = $2', [imageId, listingId]
        );
        if (!image) return res.status(404).json({ error: 'Image non trouvée' });

        await query('DELETE FROM listing_images WHERE id = $1', [imageId]);

        // Delete physical file
        const filePath = path.join(uploadsDir, path.basename(image.url));
        if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (e) { console.warn('Could not delete file:', filePath); }
        }

        // Update main listing image
        if (listing.image === image.url) {
            const nextImage = await getOne(
                'SELECT url FROM listing_images WHERE listing_id = $1 ORDER BY sort_order LIMIT 1', [listingId]
            );
            await query('UPDATE listings SET image = $1 WHERE id = $2', [nextImage?.url || null, listingId]);
        }
        res.json({ message: 'Image supprimée' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// STATS
// ==========================================

app.get('/api/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const bookingsCount = await getOne('SELECT COUNT(*) as count FROM bookings WHERE user_id = $1', [userId]);
        const favoritesCount = await getOne('SELECT COUNT(*) as count FROM favorites WHERE user_id = $1', [userId]);
        const totalSpent = await getOne(
            "SELECT COALESCE(SUM(total_price), 0) as total FROM bookings WHERE user_id = $1 AND status = 'confirmed'",
            [userId]
        );
        res.json({
            bookings: parseInt(bookingsCount?.count || 0),
            favorites: parseInt(favoritesCount?.count || 0),
            totalSpent: parseFloat(totalSpent?.total || 0)
        });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// USER STATS ROUTE
// ==========================================
app.get('/api/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [bookingsRow, favRow, spentRow] = await Promise.all([
            getOne('SELECT COUNT(*) as count FROM bookings WHERE user_id = $1', [userId]),
            getOne('SELECT COUNT(*) as count FROM favorites WHERE user_id = $1', [userId]),
            getOne(`SELECT COALESCE(SUM(total_price), 0) as total
                    FROM bookings WHERE user_id = $1 AND status IN ('confirmed','completed')`, [userId])
        ]);
        res.json({
            bookings: parseInt(bookingsRow?.count || 0),
            favorites: parseInt(favRow?.count || 0),
            totalSpent: parseFloat(spentRow?.total || 0)
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/host/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const listingsCount = await getOne('SELECT COUNT(*) as count FROM listings WHERE host_id = $1', [userId]);
        const bookingsReceived = await getOne(`
            SELECT COUNT(*) as count FROM bookings b
            JOIN listings l ON b.listing_id = l.id WHERE l.host_id = $1
        `, [userId]);
        const totalEarned = await getOne(`
            SELECT COALESCE(SUM(b.total_price), 0) as total FROM bookings b
            JOIN listings l ON b.listing_id = l.id
            WHERE l.host_id = $1 AND b.status = 'confirmed'
        `, [userId]);
        const avgRating = await getOne(`
            SELECT COALESCE(AVG(l.rating), 5.0) as avg FROM listings l WHERE l.host_id = $1
        `, [userId]);

        res.json({
            listings: parseInt(listingsCount?.count || 0),
            bookings: parseInt(bookingsReceived?.count || 0),
            totalEarned: parseFloat(totalEarned?.total || 0),
            avgRating: parseFloat(parseFloat(avgRating?.avg || 5).toFixed(1))
        });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// ADMIN ROUTES
// ==========================================

// Get all listings (admin - includes pending)
app.get('/api/admin/listings', authenticateToken, async (req, res) => {
    try {
        const user = await getOne('SELECT role FROM users WHERE id = $1', [req.user.id]);
        if (!user || user.role !== 'admin')
            return res.status(403).json({ error: 'Accès admin requis' });

        const { status } = req.query;
        let listings;
        if (status) {
            listings = await getAll(`
                SELECT l.*, c.name as city_name, u.name as host_name
                FROM listings l
                JOIN cities c ON l.city_id = c.id
                JOIN users u ON l.host_id = u.id
                WHERE l.status = $1 ORDER BY l.created_at DESC
            `, [status]);
        } else {
            listings = await getAll(`
                SELECT l.*, c.name as city_name, u.name as host_name
                FROM listings l
                JOIN cities c ON l.city_id = c.id
                JOIN users u ON l.host_id = u.id
                ORDER BY l.created_at DESC
            `);
        }
        res.json(listings);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get admin dashboard stats
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
    try {
        const user = await getOne('SELECT role FROM users WHERE id = $1', [req.user.id]);
        if (!user || user.role !== 'admin')
            return res.status(403).json({ error: 'Accès admin requis' });

        const [totalUsers, totalListings, totalBookings, pendingListings, revenue] = await Promise.all([
            getOne('SELECT COUNT(*) as count FROM users'),
            getOne('SELECT COUNT(*) as count FROM listings'),
            getOne('SELECT COUNT(*) as count FROM bookings'),
            getOne("SELECT COUNT(*) as count FROM listings WHERE status = 'pending'"),
            getOne("SELECT COALESCE(SUM(total_price), 0) as total FROM bookings WHERE status = 'confirmed'")
        ]);

        res.json({
            totalUsers: parseInt(totalUsers?.count || 0),
            totalListings: parseInt(totalListings?.count || 0),
            totalBookings: parseInt(totalBookings?.count || 0),
            pendingListings: parseInt(pendingListings?.count || 0),
            totalRevenue: parseFloat(revenue?.total || 0)
        });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// API INFO
// ==========================================

app.get('/api', (req, res) => {
    res.json({
        name: 'Voyage DZ API',
        version: '3.0.0',
        database: 'PostgreSQL (Neon)',
        endpoints: {
            auth: '/api/auth/*',
            cities: '/api/cities',
            listings: '/api/listings',
            bookings: '/api/bookings',
            favorites: '/api/favorites',
            messages: '/api/messages',
            amenities: '/api/amenities',
            languages: '/api/languages',
            admin: '/api/admin/*'
        }
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
║                   VOYAGE DZ - API v3.0 (PostgreSQL)               ║
║                                                                    ║
║   🚀 Server: http://localhost:${PORT}                               ║
║   🗄️  Database: Neon PostgreSQL                                    ║
║   📋 Docs: http://localhost:${PORT}/api                             ║
╚══════════════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
