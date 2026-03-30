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
app.use(cors());
app.use(express.json());
app.use(session({
  secret: 'voyage-dz-session-secret',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Serve uploads
const uploadsDir = path.join('/tmp', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (err) {
    console.warn('Could not create uploads directory:', err);
  }
}
app.use('/uploads', express.static(uploadsDir));

// Serve frontend
app.use(express.static(path.join(__dirname, '../')));

// ==========================================
// Multer Upload
// ==========================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalName);
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
  
  if (!token) return res.status(401).json({ message: 'Accès non autorisé' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token invalide ou expiré' });
    req.user = user;
    next();
  });
};

const isHost = (req, res, next) => {
  if (req.user && req.user.is_host) {
    next();
  } else {
    res.status(403).json({ message: 'Accès réservé aux hôtes' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Accès réservé aux administrateurs' });
  }
};

// ==========================================
// Auth Routes
// ==========================================

// Inscription
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Vérifier si l'utilisateur existe déjà
    const userExists = await getOne('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Créer l'utilisateur
    const result = await query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, hashedPassword, 'user']
    );
    
    const newUser = result.rows[0];
    const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role, is_host: newUser.is_host }, JWT_SECRET);
    
    res.status(201).json({ 
      token, 
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, is_host: newUser.is_host } 
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de l\'inscription', error: err.message });
  }
});

// Connexion
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await getOne('SELECT * FROM users WHERE email = $1', [email]);
    if (!user || !user.password) {
      return res.status(400).json({ message: 'Identifiants invalides' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Identifiants invalides' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, is_host: user.is_host }, JWT_SECRET);
    
    res.json({ 
      token, 
      user: { id: user.id, name: user.name, email: user.email, role: user.role, is_host: user.is_host } 
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la connexion', error: err.message });
  }
});

// Profil
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await getOne('SELECT id, name, email, role, is_host FROM users WHERE id = $1', [req.user.id]);
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération du profil' });
  }
});

// ==========================================
// Cities & Regions
// ==========================================
app.get('/api/cities', async (req, res) => {
  try {
    const cities = await getAll('SELECT * FROM cities ORDER BY name ASC');
    res.json(cities);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération des villes' });
  }
});

app.get('/api/regions', async (req, res) => {
  try {
    const regions = await getAll('SELECT * FROM regions ORDER BY name ASC');
    res.json(regions);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération des régions' });
  }
});

// ==========================================
// Listing Routes
// ==========================================

// Liste des annonces (filtrée)
app.get('/api/listings', async (req, res) => {
  try {
    const { city, category, minPrice, maxPrice, q } = req.query;
    let sql = `
      SELECT l.*, c.name as city_name, r.name as region_name, u.name as host_name 
      FROM listings l
      JOIN cities c ON l.city_id = c.id
      JOIN regions r ON c.region_id = r.id
      JOIN users u ON l.user_id = u.id
      WHERE l.status = 'active'
    `;
    const params = [];
    
    if (city) {
      params.push(city);
      sql += ` AND l.city_id = $${params.length}`;
    }
    
    if (category) {
      params.push(category);
      sql += ` AND l.category = $${params.length}`;
    }
    
    if (minPrice) {
      params.push(minPrice);
      sql += ` AND l.price >= $${params.length}`;
    }
    
    if (maxPrice) {
      params.push(maxPrice);
      sql += ` AND l.price <= $${params.length}`;
    }
    
    if (q) {
      params.push(`%$${q}%`);
      sql += ` AND (l.title ILIKE $${params.length} OR l.description ILIKE $${params.length})`;
    }
    
    sql += ' ORDER BY l.created_at DESC';
    
    const listings = await getAll(sql, params);
    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération des annonces', error: err.message });
  }
});

// Détails d'une annonce
app.get('/api/listings/:id', async (req, res) => {
  try {
    const listing = await getOne(`
      SELECT l.*, c.name as city_name, r.name as region_name, 
             u.name as host_name, u.email as host_email
      FROM listings l
      JOIN cities c ON l.city_id = c.id
      JOIN regions r ON c.region_id = r.id
      JOIN users u ON l.user_id = u.id
      WHERE l.id = $1
    `, [req.params.id]);
    
    if (!listing) return res.status(404).json({ message: 'Annonce non trouvée' });
    
    const images = await getAll('SELECT * FROM listing_images WHERE listing_id = $1', [req.params.id]);
    listing.images = images.map(img => img.image_url);
    
    res.json(listing);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'annonce' });
  }
});

// Ajouter une annonce (Hôte)
app.post('/api/listings', authenticateToken, isHost, upload.array('images', 5), async (req, res) => {
  try {
    const { title, description, price, category, address, city_id, guests, bedrooms, beds, bathrooms } = req.body;
    
    const result = await query(
      `INSERT INTO listings 
       (user_id, title, description, price, category, address, city_id, guests, bedrooms, beds, bathrooms, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active') 
       RETURNING *`,
      [req.user.id, title, description, price, category, address, city_id, guests, bedrooms, beds, bathrooms]
    );
    
    const newListing = result.rows[0];
    
    // Sauvegarder les images
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await query('INSERT INTO listing_images (listing_id, image_url) VALUES ($1, $2)', [newListing.id, file.path]);
      }
    }
    
    res.status(201).json(newListing);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la création de l\'annonce', error: err.message });
  }
});

// ==========================================
// Bookings
// ==========================================

// Mes réservations (Voyageur)
app.get('/api/bookings/my', authenticateToken, async (req, res) => {
  try {
    const bookings = await getAll(`
      SELECT b.*, l.title as listing_title, l.address as listing_address
      FROM bookings b
      JOIN listings l ON b.listing_id = l.id
      WHERE b.user_id = $1
      ORDER BY b.start_date DESC
    `, [req.user.id]);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération de vos réservations' });
  }
});

// Réservations reçues (Hôte)
app.get('/api/bookings/host', authenticateToken, isHost, async (req, res) => {
  try {
    const bookings = await getAll(`
      SELECT b.*, l.title as listing_title, u.name as traveler_name
      FROM bookings b
      JOIN listings l ON b.listing_id = l.id
      JOIN users u ON b.user_id = u.id
      WHERE l.user_id = $1
      ORDER BY b.start_date DESC
    `, [req.user.id]);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération des réservations reçues' });
  }
});

// Créer une réservation
app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const { listing_id, start_date, end_date, total_price, guests } = req.body;
    
    const result = await query(
      `INSERT INTO bookings (listing_id, user_id, start_date, end_date, total_price, guests, status) 
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') 
       RETURNING *`,
      [listing_id, req.user.id, start_date, end_date, total_price, guests]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la réservation' });
  }
});

// Mettre à jour le statut d'une réservation (Hôte)
app.patch('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const bookingId = req.params.id;
    
    // Vérifier si l'utilisateur est l'hôte de l'annonce concernée
    const booking = await getOne(`
      SELECT b.*, l.user_id as host_id 
      FROM bookings b
      JOIN listings l ON b.listing_id = l.id
      WHERE b.id = $1
    `, [bookingId]);
    
    if (!booking) return res.status(404).json({ message: 'Réservation non trouvée' });
    
    if (booking.host_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Action non autorisée' });
    }
    
    await query('UPDATE bookings SET status = $1 WHERE id = $2', [status, bookingId]);
    res.json({ message: 'Statut mis à jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour' });
  }
});

// ==========================================
// Public Routes
// ==========================================
app.get('/api/stats', async (req, res) => {
  try {
    const listingsCount = await getOne('SELECT COUNT(*) FROM listings WHERE status = \'active\'');
    const usersCount = await getOne('SELECT COUNT(*) FROM users');
    const citiesCount = await getOne('SELECT COUNT(*) FROM cities');
    
    res.json({
      listings: parseInt(listingsCount.count),
      users: parseInt(usersCount.count),
      cities: parseInt(citiesCount.count)
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques' });
  }
});

// ==========================================
// Start Server
// ==========================================
// On Vercel, we don't call app.listen() if we're using serverless functions, 
// but for normal Node.js environments:
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
  });
}

module.exports = app;
