// ==========================================
// PRICING ASSISTANT - Smart Pricing Suggestions
// ==========================================

const PricingAssistant = {
    /**
     * Suggest price based on market analysis
     * @param {Object} listingData - The listing data
     * @returns {Object} Pricing suggestion with insights
     */
    suggestPrice(listingData) {
        const { city, bedrooms, amenities, type, guests } = listingData;

        // Get similar listings for comparison
        const similarListings = this.getSimilarListings(city, type, bedrooms);

        if (similarListings.length === 0) {
            console.log('No similar listings found, using base price');
            return this.getBasePricing(city, type);
        }

        // Calculate average price
        const avgPrice = this.calculateAverage(similarListings);

        // Apply premium multipliers
        const premiumMultiplier = this.calculatePremiumMultiplier(amenities);

        // Calculate suggested price
        const suggested = Math.round((avgPrice * premiumMultiplier) / 1000) * 1000;

        // Calculate range
        const min = Math.round(suggested * 0.8 / 1000) * 1000;
        const max = Math.round(suggested * 1.2 / 1000) * 1000;

        // Generate insights
        const insights = this.generateInsights(city, similarListings.length, avgPrice, premiumMultiplier);

        return {
            suggested,
            min,
            max,
            average: Math.round(avgPrice),
            insights,
            competitorCount: similarListings.length
        };
    },

    /**
     * Get similar listings for comparison
     */
    getSimilarListings(city, type, bedrooms) {
        if (typeof appData === 'undefined' || !appData.listings) {
            return [];
        }

        return appData.listings.filter(listing => {
            // Match city
            if (listing.city !== city) return false;

            // Match type (lodging and hotel are similar)
            if (type === 'activities') {
                return listing.type === 'activities';
            } else {
                return listing.type === 'lodging' || listing.type === 'hotel';
            }

            // Similar bedroom count (±1)
            if (listing.bedrooms) {
                const diff = Math.abs(listing.bedrooms - bedrooms);
                return diff <= 1;
            }

            return true;
        });
    },

    /**
     * Calculate average price from listings
     */
    calculateAverage(listings) {
        if (listings.length === 0) return 0;

        const prices = listings.map(listing => {
            const priceStr = listing.price || listing.pricePerNight || '';
            return parseInt(priceStr.toString().replace(/[^0-9]/g, '')) || 0;
        }).filter(price => price > 0);

        if (prices.length === 0) return 8000; // Default fallback

        const sum = prices.reduce((a, b) => a + b, 0);
        return sum / prices.length;
    },

    /**
     * Calculate premium multiplier based on amenities
     */
    calculatePremiumMultiplier(amenities) {
        if (!amenities || amenities.length === 0) return 1.0;

        let multiplier = 1.0;

        // Premium amenities add value
        const premiumAmenities = {
            'Piscine': 0.20,
            'Jacuzzi': 0.15,
            'Vue mer': 0.15,
            'Parking': 0.05,
            'WiFi': 0.03,
            'Climatisation': 0.08,
            'Cuisine': 0.05,
            'Jardin': 0.10,
            'Terrasse': 0.08
        };

        amenities.forEach(amenity => {
            if (premiumAmenities[amenity]) {
                multiplier += premiumAmenities[amenity];
            }
        });

        // Cap at 1.5x
        return Math.min(multiplier, 1.5);
    },

    /**
     * Get base pricing when no similar listings found
     */
    getBasePricing(city, type) {
        const basePrices = {
            alger: { lodging: 10000, hotel: 12000, activities: 5000 },
            oran: { lodging: 8000, hotel: 10000, activities: 4000 },
            tlemcen: { lodging: 6000, hotel: 8000, activities: 3000 },
            constantine: { lodging: 7000, hotel: 9000, activities: 3500 },
            bejaia: { lodging: 7500, hotel: 9500, activities: 4000 }
        };

        const cityPrices = basePrices[city] || basePrices.alger;
        const basePrice = cityPrices[type] || cityPrices.lodging;

        return {
            suggested: basePrice,
            min: Math.round(basePrice * 0.8),
            max: Math.round(basePrice * 1.2),
            average: basePrice,
            insights: [
                `Prix de base pour ${city}: ${basePrice.toLocaleString('fr-DZ')} DA`,
                'Pas assez de données pour comparaison',
                'Vous pouvez ajuster selon votre propriété'
            ],
            competitorCount: 0
        };
    },

    /**
     * Generate market insights
     */
    generateInsights(city, competitorCount, avgPrice, multiplier) {
        const insights = [];

        // City insight
        const cityNames = {
            alger: 'Alger',
            oran: 'Oran',
            tlemcen: 'Tlemcen',
            constantine: 'Constantine',
            bejaia: 'Béjaïa'
        };
        insights.push(`Prix moyen à ${cityNames[city]}: ${Math.round(avgPrice).toLocaleString('fr-DZ')} DA`);

        // Competition insight
        if (competitorCount > 0) {
            insights.push(`${competitorCount} ${competitorCount > 1 ? 'annonces similaires trouvées' : 'annonce similaire trouvée'}`);
        }

        // Premium insight
        if (multiplier > 1.1) {
            insights.push('Votre propriété a des équipements premium (+' + Math.round((multiplier - 1) * 100) + '%)');
        } else if (multiplier > 1.0) {
            insights.push('Votre propriété est légèrement au-dessus de la moyenne');
        } else {
            insights.push('Votre propriété est dans la moyenne du marché');
        }

        // Seasonal insight (could be enhanced with actual seasonal data)
        const month = new Date().getMonth();
        if (month >= 5 && month <= 8) {
            insights.push('🌞 Haute saison touristique - vous pouvez augmenter vos tarifs');
        } else if (month >= 11 || month <= 2) {
            insights.push('❄️ Basse saison - envisagez des tarifs compétitifs');
        }

        return insights;
    },

    /**
     * Get dynamic pricing suggestion for specific dates
     * @param {Object} listingData
     * @param {Date} checkIn
     * @param {Date} checkOut
     */
    getSuggestedPriceForDates(listingData, checkIn, checkOut) {
        const basePricing = this.suggestPrice(listingData);
        const basePrice = basePricing.suggested;

        // Weekend multiplier (Friday, Saturday)
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        let totalMultiplier = 1.0;

        for (let i = 0; i < nights; i++) {
            const date = new Date(checkIn);
            date.setDate(date.getDate() + i);
            const dayOfWeek = date.getDay();

            // Weekend (Friday = 5, Saturday = 6)
            if (dayOfWeek === 5 || dayOfWeek === 6) {
                totalMultiplier += 0.15; // +15% per weekend night
            }

            // Holidays (simplified - could be enhanced with holiday calendar)
            const isHoliday = this.isHoliday(date);
            if (isHoliday) {
                totalMultiplier += 0.25; // +25% for holidays
            }
        }

        const dynamicPrice = Math.round((basePrice * (totalMultiplier / nights)) / 500) * 500;

        return {
            pricePerNight: dynamicPrice,
            totalPrice: dynamicPrice * nights,
            basePrice,
            multiplier: totalMultiplier / nights,
            breakdown: {
                base: basePrice,
                weekendBonus: totalMultiplier > 1.0 ? Math.round((dynamicPrice - basePrice) * nights) : 0,
                nights
            }
        };
    },

    /**
     * Check if date is a holiday (simplified)
     */
    isHoliday(date) {
        const month = date.getMonth() + 1;
        const day = date.getDate();

        // Algerian national holidays (simplified list)
        const holidays = [
            { month: 1, day: 1 },   // New Year
            { month: 5, day: 1 },   // Labour Day
            { month: 7, day: 5 },   // Independence Day
            { month: 11, day: 1 }   // Revolution Day
        ];

        return holidays.some(h => h.month === month && h.day === day);
    },

    /**
     * Get pricing recommendations
     */
    getRecommendations(listingData) {
        const pricing = this.suggestPrice(listingData);

        return {
            competitive: pricing.suggested,
            aggressive: pricing.min,
            premium: pricing.max,
            recommendations: [
                {
                    strategy: 'Compétitif',
                    price: pricing.suggested,
                    description: 'Recommandé pour un taux d\'occupation optimal',
                    icon: '⚖️'
                },
                {
                    strategy: 'Agressif',
                    price: pricing.min,
                    description: 'Pour maximiser les réservations rapidement',
                    icon: '⚡'
                },
                {
                    strategy: 'Premium',
                    price: pricing.max,
                    description: 'Pour une propriété exceptionnelle',
                    icon: '💎'
                }
            ]
        };
    }
};

// Expose globally
window.PricingAssistant = PricingAssistant;

console.log('✅ Pricing Assistant loaded');
