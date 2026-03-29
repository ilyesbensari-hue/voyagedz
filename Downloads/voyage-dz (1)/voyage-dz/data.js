// ==================== 
// DATA - CITIES & LISTINGS
// ====================

// Curated Algerian/Mediterranean themed images (Pinterest/Unsplash Aesthetic)
const ALGERIA_IMAGES = {
    // Cities
    oran_city: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80',
    tlemcen_city: 'https://images.unsplash.com/photo-1585155770913-922c4a7e5e71?w=800&q=80',

    // Oran Esthétique
    oran_hotel_royal: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80', // Classic luxury
    oran_hotel_modern: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80', // Modern glass
    oran_villa: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80', // White villa sea
    oran_activity_fort: 'https://images.unsplash.com/photo-1599940824399-b87987ced7bb?w=800&q=80', // Fort view
    oran_activity_food: 'https://images.unsplash.com/photo-1544025162-d7669d265f29?w=800&q=80', // Mediterranean food

    // Tlemcen Esthétique
    tlemcen_palace: 'https://images.unsplash.com/photo-1590073242678-70ee3fc28f8e?w=800&q=80', // Moorish arch
    tlemcen_nature: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=800&q=80', // Waterfall
    tlemcen_caves: 'https://images.unsplash.com/photo-1499244571938-d61799938c7f?w=800&q=80' // Caves
};

const cities = [
    {
        id: 'oran',
        name: 'Oran',
        count: '85+ expériences',
        image: ALGERIA_IMAGES.oran_city,
        description: 'La perle de la Méditerranée',
        lat: 35.6976,
        lng: -0.6337
    },
    {
        id: 'tlemcen',
        name: 'Tlemcen',
        count: '60+ expériences',
        image: ALGERIA_IMAGES.tlemcen_city,
        description: 'La perle du Maghreb, ville d\'histoire et de culture',
        lat: 34.8780,
        lng: -1.3157
    }
];

// Cities available for Hosts to create listings
const host_cities = [
    { id: 'oran', name: 'Oran' },
    { id: 'tlemcen', name: 'Tlemcen' },
    { id: 'annaba', name: 'Annaba' },
    { id: 'bejaia', name: 'Béjaïa' }
];

const listings = [
    // ==========================================
    // ORAN - HÉBERGEMENTS (3 Items: Hotel, Villa, Appart)
    // ==========================================
    {
        id: 101,
        type: 'lodging',
        category: 'hotel',
        city: 'oran',
        title: 'Royal Hotel Oran - MGallery',
        location: 'Boulevard de la Soummam, Oran',
        price: '22,000 DA',
        rating: 4.9,
        reviews: 312,
        image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80', // Grand Hotel style
        description: 'Un palais historique restauré au cœur d\'Oran. Luxe, charme et histoire se rencontrent dans cet établissement emblématique.',
        amenities: ['Spa & Bien-être', 'Restaurant Gastronomique', 'WiFi Haut Débit', 'Service Voiturier'],
        maxGuests: 2,
        lat: 35.7005,
        lng: -0.6400
    },
    {
        id: 102,
        type: 'lodging',
        category: 'villa',
        city: 'oran',
        title: 'Villa Blanche - Vue Mer',
        location: 'Canastel, Oran',
        price: '45,000 DA',
        rating: 4.8,
        reviews: 28,
        image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80', // White villa
        description: 'Magnifique villa contemporaine surplombant la baie. Piscine à débordement et terrasse panoramique pour des couchers de soleil inoubliables.',
        amenities: ['Piscine Privée', 'Vue Panoramique', 'Cuisine Équipée', 'Jardin'],
        maxGuests: 8,
        lat: 35.7289,
        lng: -0.6015
    },
    {
        id: 103,
        type: 'lodging',
        category: 'apartment',
        title: 'Appartement Design Front de Mer',
        city: 'oran',
        location: 'Akid Lotfi, Oran',
        price: '12,000 DA',
        rating: 4.7,
        reviews: 156,
        image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80', // Modern apartment
        description: 'Appartement moderne et lumineux à deux pas des commodités et des plages. Idéal pour un séjour urbain et balnéaire.',
        amenities: ['Climatisation', 'WiFi', 'Smart TV', 'Parking Souterrain'],
        maxGuests: 4,
        lat: 35.7198,
        lng: -0.6120
    },

    // ==========================================
    // ORAN - ACTIVITÉS (3 Items)
    // ==========================================
    {
        id: 104,
        type: 'activity',
        category: 'tours',
        city: 'oran',
        title: 'Couchers de soleil au Fort Santa Cruz',
        location: 'Murdjajo, Oran',
        price: '2,500 DA',
        rating: 4.9,
        reviews: 420,
        duration: '3 heures',
        image: 'https://images.unsplash.com/photo-1599940824399-b87987ced7bb?w=800&q=80',
        description: 'Visite guidée privée du Fort Santa Cruz suivie d\'un apéritif traditionnel au coucher du soleil avec vue sur toute la baie.',
        includes: ['Transport Privé', 'Guide', 'Collation Traditionnelle'],
        lat: 35.7099,
        lng: -0.6631
    },
    {
        id: 105,
        type: 'activity',
        category: 'food',
        city: 'oran',
        title: 'Atelier Paella Oranaise',
        location: 'Centre Ville, Oran',
        price: '4,000 DA',
        rating: 4.8,
        reviews: 95,
        duration: '4 heures',
        image: 'https://images.unsplash.com/photo-1515443961218-a551da5a8049?w=800&q=80',
        description: 'Apprenez les secrets de la fameuse Paella d\'Oran, héritage de la période espagnole, avec un chef local.',
        includes: ['Ingrédients', 'Cours de cuisine', 'Dégustation'],
        lat: 35.6969,
        lng: -0.6350
    },
    {
        id: 106,
        type: 'activity',
        category: 'activities',
        city: 'oran',
        title: 'Escapade aux Îles Habibas',
        location: 'Port d\'Oran',
        price: '8,000 DA',
        rating: 5.0,
        reviews: 62,
        duration: 'Journée',
        image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80', // Marine
        description: 'Expédition en bateau vers la réserve naturelle des Îles Habibas. Plongée, pique-nique et nature sauvage.',
        includes: ['Bateau', 'Déjeuner', 'Matériel Snorkeling'],
        lat: 35.72,
        lng: -1.13
    },

    // ==========================================
    // ORAN - HOTELS (Simulated Amadeus)
    // ==========================================
    {
        id: 'amadeus_orn_1',
        type: 'hotel',
        category: 'hotel',
        city: 'oran',
        title: 'Le Méridien Oran Hotel',
        location: 'Les Genêts, Oran',
        price: '28,000 DA',
        rating: 4.8,
        reviews: 412,
        image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80',
        description: 'Hôtel de luxe en bord de mer avec vue imprenable sur la Méditerranée. Spa, piscine et restaurants gastronomiques.',
        amenities: ['Piscine', 'Spa', 'Vue Mer', 'Salle de Conférence'],
        maxGuests: 2,
        lat: 35.7100,
        lng: -0.6200
    },
    {
        id: 'amadeus_orn_2',
        type: 'hotel',
        category: 'hotel',
        city: 'oran',
        title: 'Four Points by Sheraton',
        location: 'Boulevard du 19 Mars, Oran',
        price: '21,000 DA',
        rating: 4.5,
        reviews: 289,
        image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80',
        description: 'Confort moderne et élégance. Idéal pour les voyages d\'affaires et de loisirs.',
        amenities: ['WiFi', 'Salle de Sport', 'Restaurant', 'Parking'],
        maxGuests: 2,
        lat: 35.7050,
        lng: -0.6300
    },
    {
        id: 'amadeus_orn_3',
        type: 'hotel',
        category: 'hotel',
        city: 'oran',
        title: 'Hotel Liberté Oran',
        location: 'Centre Ville, Oran',
        price: '16,500 DA',
        rating: 4.2,
        reviews: 156,
        image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80',
        description: 'Situé au cœur de l\'action, cet hôtel offre un accès facile aux attractions principales d\'Oran.',
        amenities: ['Petit-déjeuner inclus', 'Reception 24h/24', 'Navette Aéroport'],
        maxGuests: 2,
        lat: 35.6980,
        lng: -0.6400
    },

    // ==========================================
    // TLEMCEN - HOTELS (Simulated Amadeus)
    // ==========================================
    {
        id: 'amadeus_tln_1',
        type: 'hotel',
        category: 'hotel',
        city: 'tlemcen',
        title: 'Les Zianides Hotel',
        location: 'Boulevard Khedim Ali, Tlemcen',
        price: '12,000 DA',
        rating: 4.0,
        reviews: 198,
        image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
        description: 'Hôtel historique offrant un cadre authentique et paisible. Jardins luxuriants et architecture locale.',
        amenities: ['Jardin', 'Piscine', 'Restaurant Traditionnel'],
        maxGuests: 2,
        lat: 34.8820,
        lng: -1.3100
    },
    {
        id: 'amadeus_tln_2',
        type: 'hotel',
        category: 'hotel',
        city: 'tlemcen',
        title: 'Grand Hotel Tlemcen',
        location: 'Centre Ville, Tlemcen',
        price: '9,500 DA',
        rating: 3.8,
        reviews: 145,
        image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',
        description: 'Un classique de Tlemcen, simple et confortable, parfait pour explorer la ville à pied.',
        amenities: ['WiFi', 'Cafétéria', 'Climatisation'],
        maxGuests: 2,
        lat: 34.8790,
        lng: -1.3180
    },
    {
        id: 'amadeus_tln_3',
        type: 'hotel',
        category: 'hotel',
        city: 'tlemcen',
        title: 'Hotel Ibis Tlemcen',
        location: 'Route de Lalla Setti, Tlemcen',
        price: '11,000 DA',
        rating: 4.1,
        reviews: 220,
        image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
        description: 'Standard international, moderne et économique. Idéal pour un séjour sans surprise.',
        amenities: ['WiFi Gratuit', 'Bar', 'Parking Sécurisé'],
        maxGuests: 2,
        lat: 34.8880,
        lng: -1.3250
    },

    // ==========================================
    // TLEMCEN - ACTIVITÉS (3 Items)
    // ==========================================
    {
        id: 204,
        type: 'activity',
        category: 'tours',
        city: 'tlemcen',
        title: 'Les Secrets du Palais El Mechouar',
        location: 'Centre Ville, Tlemcen',
        price: '1,500 DA',
        rating: 4.7,
        reviews: 210,
        duration: '2 heures',
        image: 'https://images.unsplash.com/photo-1549448833-289b4f910404?w=800&q=80', // Arch details
        description: 'Visite guidée exclusive de l\'ancien palais royal zianide. Découvrez l\'histoire des sultans et l\'architecture andalouse.',
        includes: ['Guide Conférencier', 'Billet d\'entrée'],
        lat: 34.8790,
        lng: -1.3160
    },
    {
        id: 205,
        type: 'activity',
        category: 'nature',
        city: 'tlemcen',
        title: 'Rando & Grottes de Beni Add',
        location: 'Ain Fezza, Tlemcen',
        price: '2,800 DA',
        rating: 4.8,
        reviews: 134,
        duration: 'Demi-journée',
        image: 'https://images.unsplash.com/photo-1499244571938-d61799938c7f?w=800&q=80', // Caves
        description: 'Exploration des impressionnantes grottes de Beni Add, suivie d\'une randonnée dans les montagnes environnantes.',
        includes: ['Transport', 'Guide', 'Entrée Grottes'],
        lat: 34.8400,
        lng: -1.2500
    },
    {
        id: 206,
        type: 'activity',
        category: 'tours',
        city: 'tlemcen',
        title: 'Coucher de Soleil à Mansourah',
        location: 'Mansourah, Tlemcen',
        price: '1,200 DA',
        rating: 4.9,
        reviews: 180,
        duration: '1.5 heures',
        image: 'https://images.unsplash.com/photo-1598555909893-559d1c9ad24d?w=800&q=80', // Ruin sunset
        description: 'Promenade photographique autour des remparts de Mansourah à l\'heure dorée. Idéal pour les amateurs d\'histoire et de photo.',
        includes: ['Guide Photographe', 'Thé à la menthe'],
        lat: 34.8700,
        lng: -1.3300
    }
];

// Export data
window.appData = {
    cities,
    host_cities,
    listings
};
