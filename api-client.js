// ==========================================
// VOYAGE DZ - API Client
// Connexion au backend Node.js
// ==========================================

// Auto-detect environment:
// - localhost / 127.0.0.1  → backend running on port 3000 locally
// - production (Vercel, custom domain) → use relative /api (proxied by vercel.json)
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = isLocal ? 'http://localhost:3000/api' : '/api';

console.log('🌐 API Client initialized:', API_URL, isLocal ? '(local)' : '(production)');

// Token management
const getToken = () => localStorage.getItem('auth_token');
const setToken = (token) => localStorage.setItem('auth_token', token);
const removeToken = () => localStorage.removeItem('auth_token');

// Fetch wrapper with auth
async function fetchAPI(endpoint, options = {}) {
    const token = getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Une erreur est survenue');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ==========================================
// API Client Object
// ==========================================

const ApiClient = {
    // Auth
    auth: {
        async register(name, email, password, phone = null) {
            const data = await fetchAPI('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ name, email, password, phone })
            });
            if (data.token) setToken(data.token);
            return data;
        },

        async login(email, password) {
            const data = await fetchAPI('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            if (data.token) setToken(data.token);
            return data;
        },

        async me() {
            return fetchAPI('/auth/me');
        },

        logout() {
            removeToken();
            localStorage.removeItem('current_user');
        },

        isAuthenticated() {
            return !!getToken();
        },

        getCurrentUser() {
            const user = localStorage.getItem('current_user');
            return user ? JSON.parse(user) : null;
        },

        setCurrentUser(user) {
            localStorage.setItem('current_user', JSON.stringify(user));
        }
    },

    // Cities
    cities: {
        async getAll() {
            return fetchAPI('/cities');
        },

        async getById(id) {
            return fetchAPI(`/cities/${id}`);
        }
    },

    // Listings
    listings: {
        async getAll(filters = {}) {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });
            const query = params.toString();
            return fetchAPI(`/listings${query ? '?' + query : ''}`);
        },

        async getById(id) {
            return fetchAPI(`/listings/${id}`);
        },

        async getFeatured() {
            return fetchAPI('/listings?featured=true');
        },

        async create(formData) {
            const token = getToken();
            const response = await fetch(`${API_URL}/listings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData // FormData for file upload
            });
            return response.json();
        },

        async update(id, data) {
            return fetchAPI(`/listings/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        },

        async delete(id) {
            return fetchAPI(`/listings/${id}`, {
                method: 'DELETE'
            });
        }
    },

    // Bookings
    bookings: {
        async getAll() {
            return fetchAPI('/bookings');
        },

        async create(data) {
            return fetchAPI('/bookings', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        async cancel(id) {
            return fetchAPI(`/bookings/${id}/cancel`, {
                method: 'PATCH'
            });
        }
    },

    // Favorites
    favorites: {
        async getAll() {
            return fetchAPI('/favorites');
        },

        async toggle(listingId) {
            return fetchAPI(`/favorites/${listingId}`, {
                method: 'POST'
            });
        }
    },

    // Host
    host: {
        async becomeHost(data) {
            return fetchAPI('/become-host', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        async getListings() {
            return fetchAPI('/host/listings');
        },

        async getBookings() {
            return fetchAPI('/host/bookings');
        },

        async getStats() {
            return fetchAPI('/host/stats');
        }
    },

    // Reviews
    reviews: {
        async getForListing(listingId) {
            return fetchAPI(`/listings/${listingId}/reviews`);
        },

        async create(listingId, rating, comment) {
            return fetchAPI(`/listings/${listingId}/reviews`, {
                method: 'POST',
                body: JSON.stringify({ rating, comment })
            });
        }
    },

    // Stats
    stats: {
        async getUserStats() {
            return fetchAPI('/stats');
        },

        async getHostStats() {
            return fetchAPI('/host/stats');
        }
    },

    // Amenities
    amenities: {
        async getAll() {
            return fetchAPI('/amenities');
        }
    }
};

// Make it available globally
window.ApiClient = ApiClient;
