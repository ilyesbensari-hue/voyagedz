// ==========================================
// MOCK API - Frontend-Only Mode (No Backend Required)
// ==========================================
// This module simulates the backend API using localStorage
// Works without Node.js - perfect for static hosting
// ==========================================

const MockAPI = {
    // ==========================================
    // Storage Keys
    // ==========================================
    KEYS: {
        USERS: 'voyagedz_users',
        LISTINGS: 'voyagedz_listings',
        CITIES: 'voyagedz_cities',
        BOOKINGS: 'voyagedz_bookings',
        REVIEWS: 'voyagedz_reviews',
        MESSAGES: 'voyagedz_messages',
        CONVERSATIONS: 'voyagedz_conversations',
        CURRENT_USER: 'voyagedz_user',
        TOKEN: 'token'
    },

    // ==========================================
    // Initialize with Default Data
    // ==========================================
    init() {
        console.log('🔧 MockAPI: Initializing frontend-only mode...');

        // Create default users if not exist
        if (!localStorage.getItem(this.KEYS.USERS)) {
            const defaultUsers = [
                {
                    id: 1,
                    name: 'Administrateur',
                    email: 'admin@voyagedz.com',
                    password: 'admin123',
                    role: 'admin',
                    isHost: true,
                    createdAt: new Date().toISOString()
                },
                {
                    id: 2,
                    name: 'Mohammed Host',
                    email: 'host@voyagedz.com',
                    password: 'password123',
                    role: 'user',
                    isHost: true,
                    createdAt: new Date().toISOString()
                },
                {
                    id: 3,
                    name: 'Voyageur Test',
                    email: 'user@voyagedz.com',
                    password: 'user123',
                    role: 'user',
                    isHost: false,
                    createdAt: new Date().toISOString()
                }
            ];
            localStorage.setItem(this.KEYS.USERS, JSON.stringify(defaultUsers));
            console.log('✅ Default users created');
        }

        // Import cities from data.js if available
        if (!localStorage.getItem(this.KEYS.CITIES) && window.cities) {
            localStorage.setItem(this.KEYS.CITIES, JSON.stringify(window.cities));
            console.log('✅ Cities imported from data.js');
        }

        // Import listings from data.js if available
        if (!localStorage.getItem(this.KEYS.LISTINGS) && window.listings) {
            const listingsWithHost = window.listings.map((l, i) => ({
                ...l,
                id: l.id || i + 1,
                hostId: 2, // Mohammed Host
                status: 'active'
            }));
            localStorage.setItem(this.KEYS.LISTINGS, JSON.stringify(listingsWithHost));
            console.log('✅ Listings imported from data.js');
        }

        // Initialize empty collections
        if (!localStorage.getItem(this.KEYS.BOOKINGS)) {
            localStorage.setItem(this.KEYS.BOOKINGS, '[]');
        }
        if (!localStorage.getItem(this.KEYS.REVIEWS)) {
            localStorage.setItem(this.KEYS.REVIEWS, '[]');
        }
        if (!localStorage.getItem(this.KEYS.MESSAGES)) {
            localStorage.setItem(this.KEYS.MESSAGES, '[]');
        }
        if (!localStorage.getItem(this.KEYS.CONVERSATIONS)) {
            localStorage.setItem(this.KEYS.CONVERSATIONS, '[]');
        }

        console.log('✅ MockAPI initialized - Frontend-only mode active');
        return true;
    },

    // ==========================================
    // Helper Functions
    // ==========================================
    getCollection(key) {
        return JSON.parse(localStorage.getItem(key) || '[]');
    },

    setCollection(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },

    generateId() {
        return Date.now() + Math.floor(Math.random() * 1000);
    },

    generateToken(user) {
        // Simple token (not secure, but works for demo)
        return btoa(JSON.stringify({ id: user.id, email: user.email, role: user.role, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
    },

    verifyToken(token) {
        if (!token) return null;
        try {
            const decoded = JSON.parse(atob(token));
            if (decoded.exp < Date.now()) return null;
            return decoded;
        } catch {
            return null;
        }
    },

    getCurrentUser() {
        const token = localStorage.getItem(this.KEYS.TOKEN);
        const decoded = this.verifyToken(token);
        if (!decoded) return null;

        const users = this.getCollection(this.KEYS.USERS);
        return users.find(u => u.id === decoded.id) || null;
    },

    // ==========================================
    // AUTH API
    // ==========================================
    async login(email, password) {
        await this.delay(300); // Simulate network

        const users = this.getCollection(this.KEYS.USERS);
        const user = users.find(u => u.email === email && u.password === password);

        if (!user) {
            throw new Error('Email ou mot de passe incorrect');
        }

        const token = this.generateToken(user);
        const userWithoutPassword = { ...user };
        delete userWithoutPassword.password;

        localStorage.setItem(this.KEYS.TOKEN, token);
        localStorage.setItem(this.KEYS.CURRENT_USER, JSON.stringify(userWithoutPassword));

        return { user: userWithoutPassword, token };
    },

    async register(name, email, password, phone = null) {
        await this.delay(300);

        const users = this.getCollection(this.KEYS.USERS);

        if (users.find(u => u.email === email)) {
            throw new Error('Cet email est déjà utilisé');
        }

        const newUser = {
            id: this.generateId(),
            name,
            email,
            password,
            phone,
            role: 'user',
            isHost: false,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        this.setCollection(this.KEYS.USERS, users);

        const token = this.generateToken(newUser);
        const userWithoutPassword = { ...newUser };
        delete userWithoutPassword.password;

        localStorage.setItem(this.KEYS.TOKEN, token);
        localStorage.setItem(this.KEYS.CURRENT_USER, JSON.stringify(userWithoutPassword));

        return { user: userWithoutPassword, token };
    },

    logout() {
        localStorage.removeItem(this.KEYS.TOKEN);
        localStorage.removeItem(this.KEYS.CURRENT_USER);
    },

    // ==========================================
    // LISTINGS API
    // ==========================================
    async getListings(filters = {}) {
        await this.delay(200);

        let listings = this.getCollection(this.KEYS.LISTINGS);

        // Apply filters
        if (filters.type && filters.type !== 'all') {
            listings = listings.filter(l => l.type === filters.type);
        }
        if (filters.city) {
            listings = listings.filter(l => l.city === filters.city);
        }
        if (filters.minPrice) {
            listings = listings.filter(l => this.extractPrice(l.price) >= filters.minPrice);
        }
        if (filters.maxPrice) {
            listings = listings.filter(l => this.extractPrice(l.price) <= filters.maxPrice);
        }

        return listings;
    },

    async getListing(id) {
        await this.delay(100);

        const listings = this.getCollection(this.KEYS.LISTINGS);
        const listing = listings.find(l => l.id == id);

        if (!listing) {
            throw new Error('Annonce non trouvée');
        }

        // Add host info
        const users = this.getCollection(this.KEYS.USERS);
        const host = users.find(u => u.id === listing.hostId);
        listing.host = host ? { id: host.id, name: host.name } : null;

        return listing;
    },

    async createListing(listingData) {
        await this.delay(300);

        const user = this.getCurrentUser();
        if (!user) throw new Error('Non authentifié');

        const listings = this.getCollection(this.KEYS.LISTINGS);

        const newListing = {
            id: this.generateId(),
            ...listingData,
            hostId: user.id,
            status: 'active',
            rating: 0,
            reviews: 0,
            createdAt: new Date().toISOString()
        };

        listings.push(newListing);
        this.setCollection(this.KEYS.LISTINGS, listings);

        // Mark user as host
        if (!user.isHost) {
            const users = this.getCollection(this.KEYS.USERS);
            const userIndex = users.findIndex(u => u.id === user.id);
            if (userIndex !== -1) {
                users[userIndex].isHost = true;
                this.setCollection(this.KEYS.USERS, users);
            }
        }

        return newListing;
    },

    // ==========================================
    // BOOKINGS API
    // ==========================================
    async createBooking(bookingData) {
        await this.delay(300);

        const user = this.getCurrentUser();
        if (!user) throw new Error('Non authentifié');

        const bookings = this.getCollection(this.KEYS.BOOKINGS);

        const confirmationCode = 'VDZ-' + Math.random().toString(36).substr(2, 8).toUpperCase();

        const newBooking = {
            id: this.generateId(),
            userId: user.id,
            ...bookingData,
            status: 'confirmed',
            confirmationCode,
            createdAt: new Date().toISOString()
        };

        bookings.push(newBooking);
        this.setCollection(this.KEYS.BOOKINGS, bookings);

        return newBooking;
    },

    async getBookings() {
        await this.delay(200);

        const user = this.getCurrentUser();
        if (!user) throw new Error('Non authentifié');

        const bookings = this.getCollection(this.KEYS.BOOKINGS);
        const listings = this.getCollection(this.KEYS.LISTINGS);

        const userBookings = bookings
            .filter(b => b.userId === user.id)
            .map(b => {
                const listing = listings.find(l => l.id === b.listingId);
                return { ...b, listing };
            });

        return userBookings;
    },

    async cancelBooking(bookingId) {
        await this.delay(200);

        const user = this.getCurrentUser();
        if (!user) throw new Error('Non authentifié');

        const bookings = this.getCollection(this.KEYS.BOOKINGS);
        const index = bookings.findIndex(b => b.id == bookingId && b.userId === user.id);

        if (index === -1) throw new Error('Réservation non trouvée');

        bookings[index].status = 'cancelled';
        this.setCollection(this.KEYS.BOOKINGS, bookings);

        return bookings[index];
    },

    // ==========================================
    // REVIEWS API
    // ==========================================
    async getReviews(listingId) {
        await this.delay(100);

        const reviews = this.getCollection(this.KEYS.REVIEWS);
        const users = this.getCollection(this.KEYS.USERS);

        return reviews
            .filter(r => r.listingId == listingId)
            .map(r => {
                const user = users.find(u => u.id === r.userId);
                return { ...r, userName: user?.name || 'Anonyme' };
            });
    },

    async createReview(listingId, rating, comment) {
        await this.delay(300);

        const user = this.getCurrentUser();
        if (!user) throw new Error('Non authentifié');

        const reviews = this.getCollection(this.KEYS.REVIEWS);

        const newReview = {
            id: this.generateId(),
            listingId: parseInt(listingId),
            userId: user.id,
            rating,
            comment,
            createdAt: new Date().toISOString()
        };

        reviews.push(newReview);
        this.setCollection(this.KEYS.REVIEWS, reviews);

        // Update listing rating
        const listings = this.getCollection(this.KEYS.LISTINGS);
        const listingReviews = reviews.filter(r => r.listingId == listingId);
        const avgRating = listingReviews.reduce((sum, r) => sum + r.rating, 0) / listingReviews.length;

        const listingIndex = listings.findIndex(l => l.id == listingId);
        if (listingIndex !== -1) {
            listings[listingIndex].rating = avgRating;
            listings[listingIndex].reviews = listingReviews.length;
            this.setCollection(this.KEYS.LISTINGS, listings);
        }

        return newReview;
    },

    // ==========================================
    // CITIES API
    // ==========================================
    async getCities() {
        await this.delay(100);
        return this.getCollection(this.KEYS.CITIES);
    },

    // ==========================================
    // UPLOAD API (Base64)
    // ==========================================
    async uploadImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve({ url: e.target.result, success: true });
            };
            reader.readAsDataURL(file);
        });
    },

    // ==========================================
    // Utilities
    // ==========================================
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    extractPrice(priceStr) {
        if (typeof priceStr === 'number') return priceStr;
        return parseInt(String(priceStr).replace(/[^0-9]/g, '')) || 0;
    }
};

// ==========================================
// Override fetch for API calls
// ==========================================
const originalFetch = window.fetch;

window.fetch = async function (url, options = {}) {
    // Only intercept /api/ calls
    if (typeof url === 'string' && url.startsWith('/api/')) {
        console.log('🔄 MockAPI intercepting:', url);

        try {
            const method = (options.method || 'GET').toUpperCase();
            const body = options.body ? JSON.parse(options.body) : {};

            // Route mapping
            if (url === '/api/auth/login' && method === 'POST') {
                const result = await MockAPI.login(body.email, body.password);
                return mockResponse(result);
            }

            if (url === '/api/auth/register' && method === 'POST') {
                const result = await MockAPI.register(body.name, body.email, body.password, body.phone);
                return mockResponse(result);
            }

            if (url === '/api/auth/me' && method === 'GET') {
                const user = MockAPI.getCurrentUser();
                if (!user) return mockResponse({ error: 'Non authentifié' }, 401);
                return mockResponse(user);
            }

            if (url === '/api/listings' && method === 'GET') {
                const listings = await MockAPI.getListings();
                return mockResponse(listings);
            }

            if (url.match(/^\/api\/listings\/\d+$/) && method === 'GET') {
                const id = url.split('/').pop();
                const listing = await MockAPI.getListing(id);
                return mockResponse(listing);
            }

            if (url === '/api/listings' && method === 'POST') {
                const result = await MockAPI.createListing(body);
                return mockResponse(result, 201);
            }

            if (url === '/api/bookings' && method === 'GET') {
                const bookings = await MockAPI.getBookings();
                return mockResponse(bookings);
            }

            if (url === '/api/bookings' && method === 'POST') {
                const result = await MockAPI.createBooking(body);
                return mockResponse(result, 201);
            }

            if (url.match(/^\/api\/bookings\/\d+$/) && method === 'DELETE') {
                const id = url.split('/').pop();
                const result = await MockAPI.cancelBooking(id);
                return mockResponse(result);
            }

            if (url.match(/^\/api\/listings\/\d+\/reviews$/) && method === 'GET') {
                const id = url.split('/')[3];
                const reviews = await MockAPI.getReviews(id);
                return mockResponse(reviews);
            }

            if (url === '/api/cities' && method === 'GET') {
                const cities = await MockAPI.getCities();
                return mockResponse(cities);
            }

            // Default: return empty success
            console.log('⚠️ MockAPI: Unhandled route', url);
            return mockResponse({ success: true });

        } catch (error) {
            console.error('❌ MockAPI error:', error);
            return mockResponse({ error: error.message }, 400);
        }
    }

    // Pass through to real fetch for non-API calls
    return originalFetch.apply(this, arguments);
};

function mockResponse(data, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => data,
        text: async () => JSON.stringify(data)
    };
}

// ==========================================
// Initialize on Load
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    MockAPI.init();
});

// Also initialize immediately if DOM already loaded
if (document.readyState !== 'loading') {
    MockAPI.init();
}

// Expose globally
window.MockAPI = MockAPI;

console.log('✅ MockAPI loaded - Frontend-only mode enabled');
