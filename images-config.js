/**
 * =============================================
 * CONFIGURATION DES IMAGES - VOYAGE DZ
 * =============================================
 * 
 * Ce fichier contient toutes les URLs des images utilisées dans l'application.
 * Pour modifier une image, remplacez simplement l'URL correspondante.
 * 
 * INSTRUCTIONS:
 * 1. Trouvez l'annonce que vous voulez modifier (par son ID ou nom)
 * 2. Remplacez l'URL par la nouvelle URL de l'image
 * 3. Sauvegardez le fichier et rafraîchissez la page
 * 
 * SOURCES D'IMAGES RECOMMANDÉES:
 * - Unsplash: https://unsplash.com (gratuit, haute qualité)
 * - Pexels: https://pexels.com (gratuit)
 * - Vos propres images hébergées
 */

const IMAGES_CONFIG = {

    // ==========================================
    // VILLES
    // ==========================================
    cities: {
        oran: '/images/cities/oran.jpg',
        tlemcen: '/images/cities/tlemcen.jpg',
        // Ajoutez d'autres villes ici...
    },

    // LOGEMENTS (LODGING)
    // ==========================================
    lodgings: {
        // ID 7: Appartement Front de Mer - Oran
        7: 'https://images.unsplash.com/photo-1512918760532-3ed64bc80514?w=800&q=80',

        // ID 8: Riad Traditionnel Centre-Ville - Oran
        8: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80&w=800&h=600&fit=crop',

        // ID 12: Maison d'Hôtes Andalouse - Tlemcen
        12: 'https://images.unsplash.com/photo-1571055107559-3e67626fa8be?w=800&q=80&w=800&h=600&fit=crop',

        // ID 13: Hôtel Renaissance Lalla Setti - Tlemcen
        13: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    },

    // ==========================================
    // ACTIVITÉS
    // ==========================================
    activities: {
        // ID 9: Découverte du Fort Santa Cruz - Oran
        9: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&q=80',

        // ID 10: Plongée aux Îles Habibas - Oran
        10: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80&w=800&h=600&fit=crop',

        // ID 11: Cours de Cuisine Oranaise - Oran
        11: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80&w=800&h=600&fit=crop',

        // ID 14: Circuit des Mosquées Historiques - Tlemcen
        14: 'https://images.unsplash.com/photo-1585155770913-922c4a7e5e71?w=800&q=80',

        // ID 15: Randonnée aux Cascades d'El Ourit - Tlemcen
        15: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=800&q=80',
    },

    // ==========================================
    // HÔTELS
    // ==========================================
    hotels: {
        // Ajoutez les hôtels ici avec leur ID
        // exemple: 101: 'https://url-de-image.com/hotel.jpg',
    },

    // ==========================================
    // IMAGES PAR DÉFAUT (FALLBACK)
    // ==========================================
    defaults: {
        lodging: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80&w=800&h=600&fit=crop',
        activity: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80&w=800&h=600&fit=crop',
        hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80&w=800&h=600&fit=crop',
        city: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80&w=800&h=600&fit=crop',
    }
};

/**
 * Récupère l'image pour un listing donné
 * @param {number} id - ID du listing
 * @param {string} [fallbackUrl] - URL originale de l'annonce (prioritaire sur le défaut, mais écrasée par la config ID)
 * @returns {string} URL de l'image
 */
function getListingImage(id, type, fallbackUrl) {
    const typeMap = {
        'lodging': IMAGES_CONFIG.lodgings,
        'activity': IMAGES_CONFIG.activities,
        'hotel': IMAGES_CONFIG.hotels
    };

    const images = typeMap[type] || {};
    // Priorité: 1. Config par ID, 2. URL originale (fournie par host/data), 3. Défaut par type
    return images[id] || fallbackUrl || IMAGES_CONFIG.defaults[type] || IMAGES_CONFIG.defaults.lodging;
}

/**
 * Récupère l'image pour une ville
 * @param {string} cityId - ID de la ville (ex: 'oran', 'tlemcen')
 * @param {string} [fallbackUrl] - URL originale de la ville
 * @returns {string} URL de l'image
 */
function getCityImage(cityId, fallbackUrl) {
    return IMAGES_CONFIG.cities[cityId] || fallbackUrl || IMAGES_CONFIG.defaults.city;
}

// Export pour utilisation dans d'autres fichiers
window.IMAGES_CONFIG = IMAGES_CONFIG;
window.getListingImage = getListingImage;
window.getCityImage = getCityImage;

console.log('📸 Images Config chargé - Modifiez images-config.js pour changer les photos');
