// ====================
// HOTEL DATA SIMULATION
// ====================

const hotelListings = [

    {
        id: 102,
        type: 'hotel',
        city: 'oran',
        title: 'Four Points by Sheraton Oran',
        location: 'Boulevard du 19 Mars, Oran',
        price: '18,500 DA',
        rating: 4.7,
        reviews: 215,
        image: 'https://cache.marriott.com/marriottassets/marriott/ORNFP/ornfp-exterior-0045-hor-clsc.jpg?interpolation=progressive-bilinear&downsize=1180px:*',
        description: 'Surplombant la mer, cet hôtel moderne offre tout le confort nécessaire pour un séjour d\'affaires ou de loisirs à Oran.',
        amenities: ['WiFi', 'Piscine', 'Salle de sport', 'Bar', 'Climatisation', 'Vue mer'],
        rooms: [
            {
                id: 'standard',
                name: 'Chambre Standard',
                price: 18500,
                capacity: 2,
                beds: '1 Lit Double',
                size: '28m²',
                image: 'https://cache.marriott.com/marriottassets/marriott/ORNFP/ornfp-guestroom-0023-hor-clsc.jpg?interpolation=progressive-bilinear&downsize=1180px:*'
            },
            {
                id: 'exec',
                name: 'Chambre Exécutive Vue Mer',
                price: 24000,
                capacity: 2,
                beds: '1 Grand Lit',
                size: '35m²',
                image: 'https://cache.marriott.com/marriottassets/marriott/ORNFP/ornfp-guestroom-0027-hor-clsc.jpg?interpolation=progressive-bilinear&downsize=1180px:*'
            }
        ],
        lat: 35.7062,
        lng: -0.6305
    }
];

// Combine with existing listings if creating a new data source
if (typeof listings !== 'undefined') {
    // Add unique IDs to avoid conflicts with existing IDs
    listings.push(...hotelListings);
}
