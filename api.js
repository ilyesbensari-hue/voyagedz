// ====================
// VOYAGE DZ - API CLIENT (Frontend-Only Mode)
// ====================
// Fonctionne 100% sans backend - utilise localStorage
// ====================

// Storage Keys
const STORAGE_KEYS = {
    USERS: 'voyagedz_users',
    LISTINGS: 'voyagedz_listings',
    CITIES: 'voyagedz_cities',
    BOOKINGS: 'voyagedz_bookings',
    REVIEWS: 'voyagedz_reviews',
    FAVORITES: 'voyagedz_favorites',
    CURRENT_USER: 'voyagedz_user',
    TOKEN: 'token'
};

// ==========================================
// LocalDB - Simple localStorage Database
// ==========================================
const LocalDB = {
    get(key) {
        try {
            return JSON.parse(localStorage.getItem(key) || '[]');
        } catch {
            return [];
        }
    },

    set(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },

    getOne(key) {
        try {
            return JSON.parse(localStorage.getItem(key));
        } catch {
            return null;
        }
    },

    setOne(key, data) {
        localStorage.setItem(key, data ? JSON.stringify(data) : '');
    },

    generateId() {
        return Date.now() + Math.floor(Math.random() * 1000);
    }
};

// ==========================================
// Initialize Default Data
// ==========================================
function initializeDefaultData() {
    // Default users
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
        const users = [
            { id: 1, name: 'Administrateur', email: 'admin@voyagedz.com', password: 'admin123', role: 'admin', isHost: true },
            { id: 2, name: 'Mohammed Hôte', email: 'host@voyagedz.com', password: 'password123', role: 'user', isHost: true },
            { id: 3, name: 'Voyageur Test', email: 'user@voyagedz.com', password: 'user123', role: 'user', isHost: false }
        ];
        LocalDB.set(STORAGE_KEYS.USERS, users);
        console.log('✅ Default users created');
    }

    // Import cities from data.js
    if (!localStorage.getItem(STORAGE_KEYS.CITIES) && window.cities) {
        LocalDB.set(STORAGE_KEYS.CITIES, window.cities);
        console.log('✅ Cities imported');
    }

    // Import listings from data.js
    if (!localStorage.getItem(STORAGE_KEYS.LISTINGS) && window.listings) {
        const listingsWithId = window.listings.map((l, i) => ({
            ...l,
            id: l.id || i + 1,
            hostId: 2,
            reviews_count: l.reviews || Math.floor(Math.random() * 50),
            rating: l.rating || (4 + Math.random()).toFixed(1)
        }));
        LocalDB.set(STORAGE_KEYS.LISTINGS, listingsWithId);
        console.log('✅ Listings imported:', listingsWithId.length);
    }

    // Initialize empty collections
    if (!localStorage.getItem(STORAGE_KEYS.BOOKINGS)) LocalDB.set(STORAGE_KEYS.BOOKINGS, []);
    if (!localStorage.getItem(STORAGE_KEYS.REVIEWS)) LocalDB.set(STORAGE_KEYS.REVIEWS, []);
    if (!localStorage.getItem(STORAGE_KEYS.FAVORITES)) LocalDB.set(STORAGE_KEYS.FAVORITES, []);
}

// ==========================================
// Mappers (for compatibility)
// ==========================================
const Mappers = {
    listing: (l) => ({
        id: l.id,
        hostId: l.hostId || l.host_id,
        hostPhone: l.hostPhone || l.host_phone, // [NEW] Added hostPhone
        cityId: l.cityId || l.city_id,
        title: l.title,
        description: l.description,
        type: l.type || 'lodging',
        category: l.category || (l.type === 'activity' ? 'activity' : 'lodging'), // [NEW] Added category
        subtype: l.subtype || l.type || 'lodging', // [NEW] Added subtype
        price: typeof l.price === 'number' ? l.price + ' DA' : l.price,
        priceValue: typeof l.price === 'string' ? parseInt(l.price.replace(/[^0-9]/g, '')) : l.price,
        location: l.location,
        city: l.city,
        rating: parseFloat(l.rating) || 4.5,
        reviews: l.reviews_count || l.reviews || 0,
        image: l.image || l.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
        images: l.images || [l.image],
        amenities: l.amenities || [],
        maxGuests: l.maxGuests || l.max_guests || 4,
        duration: l.duration,
        featured: !!l.featured,
        isFavorite: false,
        lat: l.lat,
        lng: l.lng
    }),

    booking: (b) => ({
        id: b.id,
        listingId: b.listingId || b.listing_id,
        listing: b.listing || { title: 'Réservation', image: '', location: '' },
        dateFrom: b.dateFrom || b.date_from,
        dateTo: b.dateTo || b.date_to,
        guests: b.guests || 1,
        totalPrice: b.totalPrice || b.total_price,
        status: b.status || 'confirmed',
        confirmationCode: b.confirmationCode || b.confirmation_code,
        createdAt: b.createdAt || b.created_at
    }),

    user: (u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role || 'user',
        isHost: !!u.isHost || !!u.is_host,
        phone: u.phone,
        avatar: u.name ? u.name.charAt(0).toUpperCase() : 'U'
    })
};

// ==========================================
// API Object - 100% Frontend
// ==========================================
const API = {
    // ====================
    // AUTHENTIFICATION
    // ====================
    auth: {
        async login(email, password) {
            console.log('🔐 Login attempt:', email);

            const users = LocalDB.get(STORAGE_KEYS.USERS);
            const user = users.find(u => u.email === email && u.password === password);

            if (!user) {
                throw new Error('Email ou mot de passe incorrect');
            }

            // Create simple token
            const token = btoa(JSON.stringify({ id: user.id, email: user.email, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
            localStorage.setItem(STORAGE_KEYS.TOKEN, token);

            const mappedUser = Mappers.user(user);
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(mappedUser));

            console.log('✅ Login successful:', mappedUser.name);
            return mappedUser;
        },

        async register(userData) {
            console.log('📝 Register attempt:', userData.email);

            const users = LocalDB.get(STORAGE_KEYS.USERS);

            if (users.find(u => u.email === userData.email)) {
                throw new Error('Cet email est déjà utilisé');
            }

            const newUser = {
                id: LocalDB.generateId(),
                name: userData.name,
                email: userData.email,
                password: userData.password,
                phone: userData.phone || null,
                role: 'client', // Changed from 'user' to 'client'
                isHost: false
            };

            users.push(newUser);
            LocalDB.set(STORAGE_KEYS.USERS, users);

            // Auto-login
            const token = btoa(JSON.stringify({ id: newUser.id, email: newUser.email, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
            localStorage.setItem(STORAGE_KEYS.TOKEN, token);

            const mappedUser = Mappers.user(newUser);
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(mappedUser));

            console.log('✅ Registration successful:', mappedUser.name);
            return mappedUser;
        },

        async getProfile() {
            const user = this.getUser();
            if (!user) throw new Error('Non authentifié');
            return user;
        },

        logout() {
            localStorage.removeItem(STORAGE_KEYS.TOKEN);
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
            console.log('👋 Logged out');
            window.location.reload();
        },

        isAuthenticated() {
            return !!localStorage.getItem(STORAGE_KEYS.TOKEN);
        },

        getUser() {
            return LocalDB.getOne(STORAGE_KEYS.CURRENT_USER);
        }
    },

    // ====================
    // LISTINGS
    // ====================
    listings: {
        async getAll(filters = {}) {
            console.log('📋 Getting listings, filters:', filters);

            // Get Local Listings (User created)
            let localListings = LocalDB.get(STORAGE_KEYS.LISTINGS) || [];

            // Get Static Listings (From data.js)
            let staticListings = window.appData?.listings || window.listings || [];

            // Merge: Local overrides Static if ID matches
            // We want ALL listings.

            // Map by ID to deduplicate
            const listingsMap = new Map();

            // Add static first
            staticListings.forEach(l => listingsMap.set(String(l.id), l));

            // Add local (overwriting static if same ID)
            localListings.forEach(l => listingsMap.set(String(l.id), l));

            let listings = Array.from(listingsMap.values());

            // Filter out deleted listings (Soft Delete)
            listings = listings.filter(l => l.status !== 'deleted');

            // Apply filters
            if (filters.city) {
                listings = listings.filter(l => l.city === filters.city || l.location?.includes(filters.city));
            }
            if (filters.type && filters.type !== 'all') {
                listings = listings.filter(l => l.type === filters.type);
            }
            if (filters.minPrice) {
                listings = listings.filter(l => {
                    const price = typeof l.price === 'string' ? parseInt(l.price.replace(/[^0-9]/g, '')) : l.price;
                    return price >= filters.minPrice;
                });
            }
            if (filters.maxPrice) {
                listings = listings.filter(l => {
                    const price = typeof l.price === 'string' ? parseInt(l.price.replace(/[^0-9]/g, '')) : l.price;
                    return price <= filters.maxPrice;
                });
            }

            console.log('✅ Found', listings.length, 'listings');
            return listings.map(Mappers.listing);
        },

        async getById(id) {
            console.log('🔍 Getting listing:', id);

            let listings = LocalDB.get(STORAGE_KEYS.LISTINGS);
            if (listings.length === 0 && window.listings) {
                listings = window.listings;
            }

            const listing = listings.find(l => l.id == id);
            if (!listing) {
                throw new Error('Annonce non trouvée');
            }

            return Mappers.listing(listing);
        },

        async getFeatured() {
            const all = await this.getAll();
            return all.filter(l => l.featured).slice(0, 6);
        },

        async create(listingData) {
            const user = API.auth.getUser();
            if (!user) throw new Error('Non authentifié');

            const listings = LocalDB.get(STORAGE_KEYS.LISTINGS);
            const newListing = {
                id: LocalDB.generateId(),
                ...listingData,
                hostId: user.id,
                rating: 0,
                reviews_count: 0,
                createdAt: new Date().toISOString()
            };

            listings.push(newListing);
            LocalDB.set(STORAGE_KEYS.LISTINGS, listings);

            return Mappers.listing(newListing);
        }
    },

    // ====================
    // CITIES
    // ====================
    cities: {
        async getAll() {
            let cities = LocalDB.get(STORAGE_KEYS.CITIES);
            if (cities.length === 0 && window.cities) {
                cities = window.cities;
            }
            return cities;
        },

        async getById(id) {
            const cities = await this.getAll();
            return cities.find(c => c.id == id);
        }
    },

    // ====================
    // BOOKINGS
    // ====================
    bookings: {
        async create(bookingData) {
            console.log('📅 Creating booking:', bookingData);

            const user = API.auth.getUser();
            if (!user) throw new Error('Non authentifié');

            const bookings = LocalDB.get(STORAGE_KEYS.BOOKINGS);

            const confirmationCode = 'VDZ-' + Math.random().toString(36).substr(2, 8).toUpperCase();

            const newBooking = {
                id: LocalDB.generateId(),
                userId: user.id,
                listingId: bookingData.listingId,
                listing: {
                    title: bookingData.listing?.title || 'Réservation',
                    image: bookingData.listing?.image || '',
                    location: bookingData.listing?.location || '',
                    price: bookingData.listing?.price || '0 DA',
                    type: bookingData.listing?.type || 'lodging',
                    hostPhone: bookingData.listing?.hostPhone || '' // [NEW] Snapshot phone
                },
                dateFrom: bookingData.dateFrom,
                dateTo: bookingData.dateTo,
                guests: bookingData.guests || 1,
                totalPrice: bookingData.totalPrice || parseInt(String(bookingData.listing?.price || 0).replace(/[^0-9]/g, '')),
                status: 'confirmed',
                confirmationCode,
                createdAt: new Date().toISOString()
            };

            bookings.push(newBooking);
            LocalDB.set(STORAGE_KEYS.BOOKINGS, bookings);

            console.log('✅ Booking created:', confirmationCode);
            return Mappers.booking(newBooking);
        },

        async getAll() {
            const user = API.auth.getUser();
            if (!user) return [];

            const bookings = LocalDB.get(STORAGE_KEYS.BOOKINGS);
            return bookings
                .filter(b => b.userId === user.id)
                .map(Mappers.booking);
        },

        async cancel(id) {
            console.log('❌ Cancelling booking:', id);

            let bookings = LocalDB.get(STORAGE_KEYS.BOOKINGS);
            const index = bookings.findIndex(b => b.id == id);

            if (index !== -1) {
                bookings[index].status = 'cancelled';
                LocalDB.set(STORAGE_KEYS.BOOKINGS, bookings);
            }

            return { message: 'Réservation annulée' };
        },

        deleteLocal(id) {
            let bookings = LocalDB.get(STORAGE_KEYS.BOOKINGS);
            bookings = bookings.filter(b => b.id != id);
            LocalDB.set(STORAGE_KEYS.BOOKINGS, bookings);
        },

        // [NEW] Get bookings for a specific host (or ALL for Admin)
        async getHostBookings(hostId) {
            console.log('📋 Getting bookings for host:', hostId);
            const user = API.auth.getUser();
            if (!user) throw new Error('Non authentifié');

            const allBookings = LocalDB.get(STORAGE_KEYS.BOOKINGS);

            // ADMIN ACCESS: Return ALL bookings
            if (user.role === 'admin') {
                return allBookings.map(b => {
                    const users = LocalDB.get(STORAGE_KEYS.USERS);
                    const booker = users.find(u => u.id === b.userId);
                    return {
                        ...Mappers.booking(b),
                        bookerName: booker ? booker.name : 'Utilisateur inconnu',
                        bookerPhone: booker ? booker.phone : ''
                    };
                });
            }

            // HOST ACCESS: Return only their listings' bookings
            const allListings = await API.listings.getAll();

            return allBookings.filter(b => {
                const listing = allListings.find(l => String(l.id) === String(b.listingId));
                return listing && String(listing.hostId) === String(hostId);
            }).map(b => {
                const users = LocalDB.get(STORAGE_KEYS.USERS);
                const booker = users.find(u => u.id === b.userId);
                return {
                    ...Mappers.booking(b),
                    bookerName: booker ? booker.name : 'Utilisateur inconnu',
                    bookerPhone: booker ? booker.phone : ''
                };
            });
        }
    },

    // ====================
    // FAVORITES
    // ====================
    favorites: {
        async toggle(listingId) {
            const user = API.auth.getUser();
            if (!user) throw new Error('Non authentifié');

            let favorites = LocalDB.get(STORAGE_KEYS.FAVORITES);
            const key = `${user.id}_${listingId}`;

            const index = favorites.indexOf(key);
            if (index === -1) {
                favorites.push(key);
            } else {
                favorites.splice(index, 1);
            }

            LocalDB.set(STORAGE_KEYS.FAVORITES, favorites);
            return index === -1; // Returns true if now favorite
        },

        async getAll() {
            const user = API.auth.getUser();
            if (!user) return [];

            const favorites = LocalDB.get(STORAGE_KEYS.FAVORITES);

            // Get listings from multiple sources
            let allListings = LocalDB.get(STORAGE_KEYS.LISTINGS) || [];

            // Add window.listings if available
            if (window.listings && window.listings.length > 0) {
                const existingIds = new Set(allListings.map(l => String(l.id)));
                window.listings.forEach(l => {
                    if (!existingIds.has(String(l.id))) {
                        allListings.push(l);
                    }
                });
            }

            // Add appData.listings if available (includes Amadeus hotels)
            if (window.appData && window.appData.listings) {
                const existingIds = new Set(allListings.map(l => String(l.id)));
                window.appData.listings.forEach(l => {
                    if (!existingIds.has(String(l.id))) {
                        allListings.push(l);
                    }
                });
            }

            // Filter to only favorited listings
            const favorited = allListings.filter(l =>
                favorites.includes(`${user.id}_${l.id}`)
            );

            return favorited.map(Mappers.listing);
        },

        isFavorite(listingId) {
            const user = API.auth.getUser();
            if (!user) return false;

            const favorites = LocalDB.get(STORAGE_KEYS.FAVORITES);
            return favorites.includes(`${user.id}_${listingId}`);
        }
    },

    // ====================
    // REVIEWS
    // ====================
    reviews: {
        async getByListing(listingId) {
            const reviews = LocalDB.get(STORAGE_KEYS.REVIEWS);
            const users = LocalDB.get(STORAGE_KEYS.USERS);

            return reviews
                .filter(r => r.listingId == listingId)
                .map(r => {
                    const user = users.find(u => u.id === r.userId);
                    return { ...r, userName: user?.name || 'Anonyme' };
                });
        },

        async create(listingId, rating, comment) {
            const user = API.auth.getUser();
            if (!user) throw new Error('Non authentifié');

            const reviews = LocalDB.get(STORAGE_KEYS.REVIEWS);

            const newReview = {
                id: LocalDB.generateId(),
                listingId: parseInt(listingId),
                userId: user.id,
                rating,
                comment,
                createdAt: new Date().toISOString()
            };

            reviews.push(newReview);
            LocalDB.set(STORAGE_KEYS.REVIEWS, reviews);

            return newReview;
        }
    },

    // Legacy aliases
    user: {
        get: () => API.auth.getUser(),
        logout: () => API.auth.logout()
    },

    // Utilities
    utils: {
        formatDate(date, options = {}) {
            if (!date) return '';
            return new Date(date).toLocaleDateString('fr-FR', options);
        },
        formatPrice(price) {
            const num = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.]/g, '')) : price;
            return (num || 0).toLocaleString('fr-DZ') + ' DA';
        },
        calculateNights(date1, date2) {
            const d1 = new Date(date1);
            const d2 = new Date(date2);
            return Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
        }
    }
};

// ==========================================
// Initialize
// ==========================================
initializeDefaultData();

// Expose globally
window.API = API;
window.LocalDB = LocalDB;

console.log('✅ API Client (Frontend-Only) loaded - No backend required!');
console.log('📦 Data in localStorage:');
console.log('   - Users:', LocalDB.get(STORAGE_KEYS.USERS).length);
console.log('   - Listings:', LocalDB.get(STORAGE_KEYS.LISTINGS).length);
console.log('   - Bookings:', LocalDB.get(STORAGE_KEYS.BOOKINGS).length);
