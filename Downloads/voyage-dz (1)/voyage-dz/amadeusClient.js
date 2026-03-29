
console.log('🌍 amadeusClient.js STARTING TO LOAD');
const AMADEUS_CONFIG = {
    clientId: '7ok2IGywKGGhZDjFDAqHSH8AG0sND9YM',
    clientSecret: 'qTEDOko8jfNP2SQA',
    authUrl: 'https://test.api.amadeus.com/v1/security/oauth2/token',
    baseUrl: 'https://test.api.amadeus.com/v1'
};

window.Amadeus = {
    token: null,
    tokenExpiry: null,

    // 1. Get Access Token (OAuth2)
    async getToken() {
        if (this.token && Date.now() < this.tokenExpiry) {
            return this.token;
        }

        const formData = new URLSearchParams();
        formData.append('grant_type', 'client_credentials');
        formData.append('client_id', AMADEUS_CONFIG.clientId);
        formData.append('client_secret', AMADEUS_CONFIG.clientSecret);

        try {
            const response = await fetch(AMADEUS_CONFIG.authUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            });

            if (!response.ok) throw new Error('Auth Failed');

            const data = await response.json();
            this.token = data.access_token;
            this.tokenExpiry = Date.now() + (data.expires_in * 1000);
            console.log('✈️ Amadeus Token Received');
            return this.token;
        } catch (error) {
            console.error('Amadeus Auth Error:', error);
            return null;
        }
    },

    // 2. Search Hotels by City Code (e.g., ALG, ORN)
    async searchHotels(cityCode) {
        const token = await this.getToken();
        if (!token) return [];

        try {
            // Step A: Find Hotels in the City
            const searchUrl = `${AMADEUS_CONFIG.baseUrl}/reference-data/locations/hotels/by-city?cityCode=${cityCode}&radius=20&radiusUnit=KM&hotelSource=ALL`;

            const response = await fetch(searchUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                // Handle rate limits or errors
                if (response.status === 429) console.warn('Amadeus Rate Limit Reached');
                return [];
            }

            const data = await response.json();
            if (!data.data) return [];

            // Step B: Transform to our App Format
            // Note: This endpoint returns "Reference Data" (Name, ID, Location), not Price/Availability.
            // For MVP, we will simulate prices since the "Hotel Offers" API requires complex chains.

            // City-specific hotel images
            const HOTEL_IMAGES = {
                ALG: [
                    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80', // Modern hotel
                    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80', // Pool hotel
                    'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80', // Business hotel
                    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80'  // Luxury hotel
                ],
                ORN: [
                    'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80', // Beach hotel
                    'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80', // Mediterranean hotel
                    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80', // Resort
                    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80'    // Historic hotel
                ]
            };

            const ROOM_IMAGES = [
                'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&q=80', // Standard room
                'https://images.unsplash.com/photo-1590490360182-f33efe80a7b5?w=400&q=80', // Suite
                'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&q=80', // Deluxe room
                'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80'  // Premium room
            ];

            const cityImages = HOTEL_IMAGES[cityCode] || HOTEL_IMAGES.ALG;

            return data.data.slice(0, 8).map((hotel, index) => ({ // Limit to 8 to avoid spamming
                id: hotel.hotelId, // String ID
                title: this.formatHotelName(hotel.name),
                type: 'hotel',
                location: `${this.formatHotelName(hotel.name)}, ${cityCode === 'ALG' ? 'Alger' : cityCode === 'ORN' ? 'Oran' : cityCode}`,
                description: `Hôtel partenaire Amadeus situé à ${cityCode === 'ALG' ? 'Alger' : 'Oran'}. Confort et services professionnels.`,
                price: (Math.floor(Math.random() * (35000 - 12000) + 12000)).toLocaleString('fr-DZ') + ' DA/nuit',
                image: cityImages[index % cityImages.length], // Rotate through city-specific images
                rating: 4.0 + (Math.random() * 0.9),
                reviews: Math.floor(Math.random() * 200) + 10,

                // GPS COORDINATES (required for map display)
                lat: cityCode === 'ALG' ? 36.7538 + (Math.random() * 0.05 - 0.025) : 35.6976 + (Math.random() * 0.05 - 0.025),
                lng: cityCode === 'ALG' ? 3.0588 + (Math.random() * 0.05 - 0.025) : -0.6337 + (Math.random() * 0.05 - 0.025),
                city: cityCode === 'ALG' ? 'alger' : 'oran',

                amenities: ['Wifi', 'Climatisation', 'Réception 24h/24', 'Navette Aéroport', 'Petit-déjeuner inclus'],
                // Enhanced details for "Real Info" feel
                rooms: [
                    {
                        id: 'room_std_' + Math.random().toString(36).substr(2, 5),
                        name: 'Chambre Standard',
                        description: 'Lit double confortable, Salle de bain privée, Vue sur la ville, 25m²',
                        price: (Math.floor(Math.random() * (15000 - 12000) + 12000)),
                        capacity: 2,
                        beds: '1 Lit Double',
                        size: '25m²',
                        image: ROOM_IMAGES[0]
                    },
                    {
                        id: 'room_lux_' + Math.random().toString(36).substr(2, 5),
                        name: 'Suite Junior',
                        description: 'Lit King Size, Espace salon, Vue mer panoramique, 40m²',
                        price: (Math.floor(Math.random() * (25000 - 18000) + 18000)),
                        capacity: 3,
                        beds: '1 King Size + Canapé',
                        size: '40m²',
                        image: ROOM_IMAGES[1]
                    }
                ]
            }));

        } catch (error) {
            console.error('Amadeus Search Error:', error);
            return [];
        }
    },

    formatHotelName(name) {
        if (!name) return 'Hôtel sans nom';
        return name.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()); // Title Case
    }
};

console.log('✅ amadeusClient.js loaded, window.Amadeus =', window.Amadeus);
