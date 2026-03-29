// ==========================================
// VOYAGE DZ - PostgreSQL Schema Init
// Migrated from SQLite → Neon PostgreSQL
// ==========================================

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function init() {
    const client = await pool.connect();
    try {
        console.log('🗄️  Initializing Voyage DZ PostgreSQL Database...\n');

        // ==========================================
        // Drop & Create Tables
        // ==========================================
        await client.query(`
            DROP TABLE IF EXISTS review_photos CASCADE;
            DROP TABLE IF EXISTS reviews CASCADE;
            DROP TABLE IF EXISTS favorites CASCADE;
            DROP TABLE IF EXISTS bookings CASCADE;
            DROP TABLE IF EXISTS activity_slots CASCADE;
            DROP TABLE IF EXISTS itinerary_stops CASCADE;
            DROP TABLE IF EXISTS listing_inclusions CASCADE;
            DROP TABLE IF EXISTS listing_languages CASCADE;
            DROP TABLE IF EXISTS listing_departure_cities CASCADE;
            DROP TABLE IF EXISTS listing_amenities CASCADE;
            DROP TABLE IF EXISTS amenities CASCADE;
            DROP TABLE IF EXISTS listing_images CASCADE;
            DROP TABLE IF EXISTS listings CASCADE;
            DROP TABLE IF EXISTS languages CASCADE;
            DROP TABLE IF EXISTS cities CASCADE;
            DROP TABLE IF EXISTS conversations CASCADE;
            DROP TABLE IF EXISTS messages CASCADE;
            DROP TABLE IF EXISTS users CASCADE;
        `);

        await client.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT,
                google_id TEXT UNIQUE,
                facebook_id TEXT UNIQUE,
                phone TEXT,
                role TEXT DEFAULT 'user',
                is_host INTEGER DEFAULT 0,
                host_description TEXT,
                avatar TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP
            );

            CREATE TABLE cities (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                wilaya_code TEXT,
                description TEXT,
                image TEXT,
                latitude REAL,
                longitude REAL,
                featured INTEGER DEFAULT 0
            );

            CREATE TABLE languages (
                id SERIAL PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                flag TEXT
            );

            CREATE TABLE listings (
                id SERIAL PRIMARY KEY,
                host_id INTEGER NOT NULL REFERENCES users(id),
                city_id INTEGER NOT NULL REFERENCES cities(id),
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                type TEXT NOT NULL,
                category TEXT,
                price REAL NOT NULL,
                original_price REAL,
                location TEXT,
                image TEXT,
                duration TEXT,
                duration_hours REAL,
                duration_type TEXT,
                meeting_point TEXT,
                meeting_point_details TEXT,
                meeting_lat REAL,
                meeting_lng REAL,
                what_to_bring TEXT,
                good_to_know TEXT,
                cancellation_policy TEXT DEFAULT 'free_24h',
                cancellation_hours INTEGER DEFAULT 24,
                min_participants INTEGER DEFAULT 1,
                max_participants INTEGER,
                instant_confirmation INTEGER DEFAULT 1,
                skip_the_line INTEGER DEFAULT 0,
                is_eco_friendly INTEGER DEFAULT 0,
                max_guests INTEGER,
                rating REAL DEFAULT 0,
                reviews_count INTEGER DEFAULT 0,
                featured INTEGER DEFAULT 0,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP
            );

            CREATE TABLE listing_images (
                id SERIAL PRIMARY KEY,
                listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
                url TEXT NOT NULL,
                sort_order INTEGER DEFAULT 0,
                caption TEXT
            );

            CREATE TABLE amenities (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                icon TEXT,
                category TEXT
            );

            CREATE TABLE listing_amenities (
                id SERIAL PRIMARY KEY,
                listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
                amenity_id INTEGER NOT NULL REFERENCES amenities(id)
            );

            CREATE TABLE listing_languages (
                id SERIAL PRIMARY KEY,
                listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
                language_id INTEGER NOT NULL REFERENCES languages(id),
                is_primary INTEGER DEFAULT 0
            );

            CREATE TABLE listing_departure_cities (
                id SERIAL PRIMARY KEY,
                listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
                city_id INTEGER NOT NULL REFERENCES cities(id),
                pickup_point TEXT,
                pickup_time TEXT,
                extra_price REAL DEFAULT 0
            );

            CREATE TABLE activity_slots (
                id SERIAL PRIMARY KEY,
                listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
                date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME,
                capacity INTEGER DEFAULT 10,
                booked_count INTEGER DEFAULT 0,
                price_override REAL,
                demand_level TEXT DEFAULT 'normal',
                status TEXT DEFAULT 'available'
            );

            CREATE TABLE itinerary_stops (
                id SERIAL PRIMARY KEY,
                listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
                stop_order INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                duration_minutes INTEGER,
                latitude REAL,
                longitude REAL
            );

            CREATE TABLE listing_inclusions (
                id SERIAL PRIMARY KEY,
                listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
                item TEXT NOT NULL,
                is_included INTEGER DEFAULT 1,
                icon TEXT
            );

            CREATE TABLE bookings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                listing_id INTEGER NOT NULL REFERENCES listings(id),
                slot_id INTEGER REFERENCES activity_slots(id),
                departure_city_id INTEGER REFERENCES cities(id),
                date_from DATE NOT NULL,
                date_to DATE NOT NULL,
                guests INTEGER DEFAULT 1,
                adults INTEGER DEFAULT 1,
                children INTEGER DEFAULT 0,
                total_price REAL NOT NULL,
                payment_method TEXT,
                confirmation_code TEXT UNIQUE,
                status TEXT DEFAULT 'pending',
                special_requests TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE favorites (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                listing_id INTEGER NOT NULL REFERENCES listings(id),
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, listing_id)
            );

            CREATE TABLE reviews (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                listing_id INTEGER NOT NULL REFERENCES listings(id),
                booking_id INTEGER REFERENCES bookings(id),
                rating INTEGER NOT NULL,
                comment TEXT,
                is_verified INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE review_photos (
                id SERIAL PRIMARY KEY,
                review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
                url TEXT NOT NULL
            );

            CREATE TABLE conversations (
                id SERIAL PRIMARY KEY,
                host_id INTEGER NOT NULL REFERENCES users(id),
                guest_id INTEGER NOT NULL REFERENCES users(id),
                listing_id INTEGER NOT NULL REFERENCES listings(id),
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE messages (
                id SERIAL PRIMARY KEY,
                conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                sender_id INTEGER NOT NULL REFERENCES users(id),
                content TEXT NOT NULL,
                read INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log('✅ Tables created\n');

        // ==========================================
        // Seed Users
        // ==========================================
        const adminPwd = bcrypt.hashSync('admin123', 10);
        const hostPwd = bcrypt.hashSync('host123', 10);
        const userPwd = bcrypt.hashSync('user123', 10);

        await client.query(`
            INSERT INTO users (name, email, password, role, is_host) VALUES ($1,$2,$3,'admin',1)
            ON CONFLICT (email) DO NOTHING
        `, ['Admin', 'admin@voyagedz.com', adminPwd]);

        await client.query(`
            INSERT INTO users (name, email, password, role, is_host, phone, host_description)
            VALUES ($1,$2,$3,'user',1,$4,$5) ON CONFLICT (email) DO NOTHING
        `, ['Mohammed Hôte', 'host@voyagedz.com', hostPwd, '+213 555 123 456',
            "Guide professionnel avec 5 ans d'expérience."]);

        await client.query(`
            INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,'user')
            ON CONFLICT (email) DO NOTHING
        `, ['Ismael Bensari', 'ismael@example.com', userPwd]);

        console.log('✅ Users seeded');

        // ==========================================
        // Seed Languages
        // ==========================================
        const langs = [
            ['fr','Français','🇫🇷'], ['ar','العربية','🇩🇿'],
            ['en','English','🇬🇧'], ['es','Español','🇪🇸'],
            ['de','Deutsch','🇩🇪'], ['it','Italiano','🇮🇹'], ['kab','Taqbaylit','🏔️']
        ];
        for (const [code, name, flag] of langs) {
            await client.query(
                `INSERT INTO languages (code,name,flag) VALUES ($1,$2,$3) ON CONFLICT (code) DO NOTHING`,
                [code, name, flag]
            );
        }
        console.log('✅ Languages seeded');

        // ==========================================
        // Seed Cities
        // ==========================================
        const cities = [
            ['Alger','alger','16','La capitale blanche face à la Méditerranée',
             'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Algiers_coast_panorama.jpg/1280px-Algiers_coast_panorama.jpg',36.7538,3.0588],
            ['Oran','oran','31','La perle de la Méditerranée',
             'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Vue_sur_le_Port_d%27Oran.jpg/1280px-Vue_sur_le_Port_d%27Oran.jpg',35.6969,-0.6331],
            ['Tlemcen','tlemcen','13',"La perle du Maghreb, ville d'histoire et de culture",
             'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Mansourah_tlemcen.jpg/1280px-Mansourah_tlemcen.jpg',34.8828,-1.3167],
            ['Constantine','constantine','25','La ville des ponts suspendus',
             'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Constantine_Algeria.jpg/1280px-Constantine_Algeria.jpg',36.3650,6.6147],
            ['Béjaïa','bejaia','06','Bougie, entre mer et montagnes',
             'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Bejaia_port.jpg/1280px-Bejaia_port.jpg',36.7509,5.0567],
            ['Ghardaïa','ghardaia','47',"La vallée du M'Zab, patrimoine mondial UNESCO",
             'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Ghardaia.jpg/1280px-Ghardaia.jpg',32.4900,3.6700],
        ];
        for (const [name,slug,wilaya,desc,img,lat,lng] of cities) {
            await client.query(
                `INSERT INTO cities (name,slug,wilaya_code,description,image,latitude,longitude)
                 VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (slug) DO NOTHING`,
                [name,slug,wilaya,desc,img,lat,lng]
            );
        }
        console.log('✅ Cities seeded');

        // ==========================================
        // Seed Amenities
        // ==========================================
        const amenities = [
            ['WiFi','📶','lodging'], ['Climatisation','❄️','lodging'],
            ['Cuisine équipée','🍳','lodging'], ['Parking','🅿️','lodging'],
            ['Piscine','🏊','lodging'], ['Jardin','🌳','lodging'],
            ['Balcon','🏠','lodging'], ['TV','📺','lodging'],
            ['Lave-linge','🧺','lodging'], ['Petit-déjeuner','🥐','lodging'],
            ['Vue mer','🌊','lodging'], ['Vue montagne','⛰️','lodging'],
            ['Terrasse','☀️','lodging'], ['Sécurité 24/7','🔒','lodging'],
            ['Ascenseur','🛗','lodging'], ['Animaux acceptés','🐕','lodging'],
            ['Guide professionnel','👨‍🏫','activity'], ['Transport inclus','🚐','activity'],
            ['Repas inclus','🍽️','activity'], ['Entrées incluses','🎫','activity'],
            ['Photos incluses','📸','activity'], ['Équipement fourni','🎒','activity'],
            ['Groupe restreint','👥','activity'], ['Accessible PMR','♿','activity'],
        ];
        for (const [name, icon, category] of amenities) {
            await client.query(
                `INSERT INTO amenities (name,icon,category) VALUES ($1,$2,$3) ON CONFLICT (name) DO NOTHING`,
                [name, icon, category]
            );
        }
        console.log('✅ Amenities seeded');

        // ==========================================
        // Seed Listings (Lodging + Activities)
        // ==========================================
        const host = (await client.query(`SELECT id FROM users WHERE email='host@voyagedz.com'`)).rows[0];
        const getCityId = async (slug) => {
            const r = await client.query(`SELECT id FROM cities WHERE slug=$1`, [slug]);
            return r.rows[0]?.id;
        };
        const getAmenityId = async (name) => {
            const r = await client.query(`SELECT id FROM amenities WHERE name=$1`, [name]);
            return r.rows[0]?.id;
        };
        const getLangId = async (code) => {
            const r = await client.query(`SELECT id FROM languages WHERE code=$1`, [code]);
            return r.rows[0]?.id;
        };

        // Insert a listing and return its id
        const insertListing = async (data) => {
            const r = await client.query(`
                INSERT INTO listings (
                    host_id, city_id, title, description, type, category, price, original_price,
                    location, image, duration, duration_hours, duration_type,
                    meeting_point, meeting_point_details, meeting_lat, meeting_lng,
                    what_to_bring, good_to_know, cancellation_policy,
                    min_participants, max_participants, max_guests,
                    rating, reviews_count, featured, status
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,1,'active')
                RETURNING id
            `, [
                host.id, data.city_id, data.title, data.description, data.type, data.category||null,
                data.price, data.original_price||null, data.location, data.image,
                data.duration||null, data.duration_hours||null, data.duration_type||null,
                data.meeting_point||null, data.meeting_point_details||null,
                data.meeting_lat||null, data.meeting_lng||null,
                data.what_to_bring||null, data.good_to_know||null, 'free_24h',
                1, data.max_participants||null, data.max_guests||null,
                data.rating||0, data.reviews||0
            ]);
            return r.rows[0].id;
        };

        // Lodgings
        const lodgings = [
            { city:'alger', type:'lodging', title:"Appartement Vue Mer - Baie d'Alger",
              location:'Alger Centre, Alger', price:8500, rating:4.9, reviews:127,
              image:'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
              description:"Superbe appartement avec vue panoramique sur la baie d'Alger.",
              amenities:['WiFi','Climatisation','Cuisine équipée','Parking','Balcon','TV'], maxGuests:4 },
            { city:'alger', type:'lodging', title:'Villa Moderne Hydra',
              location:'Hydra, Alger', price:15000, rating:5.0, reviews:89,
              image:'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
              description:"Villa luxueuse dans le quartier résidentiel d'Hydra. Jardin privé et piscine.",
              amenities:['WiFi','Piscine','Jardin','Parking','Sécurité 24/7','Cuisine équipée'], maxGuests:8 },
            { city:'oran', type:'lodging', title:'Appartement Front de Mer',
              location:'Les Andalouses, Oran', price:7000, rating:4.8, reviews:142,
              image:'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
              description:'Réveillez-vous face à la Méditerranée dans cet appartement moderne.',
              amenities:['WiFi','Climatisation','Vue mer','Parking'], maxGuests:6 },
            { city:'tlemcen', type:'lodging', title:"Maison d'Hôtes Andalouse",
              location:'Centre historique, Tlemcen', price:5500, rating:4.9, reviews:112,
              image:'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
              description:'Maison traditionnelle andalouse au cœur de la médina de Tlemcen.',
              amenities:['WiFi','Petit-déjeuner','Terrasse'], maxGuests:5 },
        ];

        for (const l of lodgings) {
            const cityId = await getCityId(l.city);
            const lid = await insertListing({ ...l, city_id: cityId, max_guests: l.maxGuests });
            for (const aName of l.amenities) {
                const aid = await getAmenityId(aName);
                if (aid) await client.query(
                    `INSERT INTO listing_amenities (listing_id,amenity_id) VALUES ($1,$2)`, [lid, aid]
                );
            }
        }
        console.log('✅ Lodgings seeded');

        // Activities
        const activities = [
            {
                city:'alger', type:'activity', category:'tours',
                title:"Visite Guidée de la Casbah d'Alger",
                description:"Découvrez l'histoire fascinante de la Casbah d'Alger, classée au patrimoine mondial de l'UNESCO.",
                location:'Casbah, Alger', price:2500, original_price:3000, rating:4.8, reviews:312,
                duration:'3 heures', duration_hours:3, duration_type:'hours',
                meeting_point:'Place des Martyrs, devant la Mosquée Ketchaoua',
                meeting_point_details:'Cherchez le guide avec le drapeau vert VoyageDZ.',
                meeting_lat:36.7871, meeting_lng:3.0599,
                what_to_bring:JSON.stringify(['Chaussures confortables','Bouteille d\'eau','Appareil photo']),
                good_to_know:'Les ruelles sont étroites et pentues.',
                languages:['fr','ar','en'], max_participants:12,
                amenities:['Guide professionnel','Entrées incluses','Groupe restreint'],
                image:'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Casbah_d%27Alger.jpg/800px-Casbah_d%27Alger.jpg',
                inclusions:[
                    {item:'Guide local expert',included:1,icon:'👨‍🏫'},
                    {item:'Thé à la menthe',included:1,icon:'🍵'},
                    {item:'Entrée Palais des Raïs',included:1,icon:'🎫'},
                    {item:'Transport',included:0,icon:'🚐'},
                ],
                itinerary:[
                    {order:1,name:'Mosquée Ketchaoua',desc:'Point de départ',dur:15},
                    {order:2,name:'Palais des Raïs',desc:'Visite du complexe palatial',dur:45},
                    {order:3,name:'Ruelles de la Casbah',desc:'Promenade dans le dédale',dur:60},
                ],
                departure_cities:['oran','constantine'],
            },
            {
                city:'oran', type:'activity', category:'tours',
                title:'Découverte du Fort Santa Cruz',
                description:"Montez au Murdjajo pour explorer le fort espagnol Santa Cruz.",
                location:'Murdjajo, Oran', price:1800, rating:4.7, reviews:221,
                duration:'2h30', duration_hours:2.5, duration_type:'hours',
                meeting_point:"Parking du téléphérique, Boulevard de l'ALN",
                meeting_point_details:'RDV au pied du téléphérique.',
                meeting_lat:35.7022, meeting_lng:-0.6417,
                what_to_bring:JSON.stringify(['Chaussures de marche','Coupe-vent']),
                good_to_know:'Prévoyez une veste car il peut faire frais en altitude.',
                languages:['fr','ar','es'], max_participants:15,
                amenities:['Guide professionnel','Transport inclus'],
                image:'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Fort_Santa_Cruz_Oran.jpg/1280px-Fort_Santa_Cruz_Oran.jpg',
                inclusions:[
                    {item:'Guide local',included:1,icon:'👨‍🏫'},
                    {item:'Billet téléphérique A/R',included:1,icon:'🚡'},
                    {item:'Repas',included:0,icon:'🍽️'},
                ],
                itinerary:[
                    {order:1,name:'Téléphérique',desc:'Montée panoramique',dur:10},
                    {order:2,name:'Fort Santa Cruz',desc:'Visite du fort espagnol',dur:45},
                    {order:3,name:'Point de vue',desc:'Pause photo avec vue sur Oran',dur:30},
                ],
                departure_cities:['alger','tlemcen'],
            },
        ];

        for (const a of activities) {
            const cityId = await getCityId(a.city);
            const lid = await insertListing({ ...a, city_id: cityId });
            for (const langCode of a.languages) {
                const langId = await getLangId(langCode);
                if (langId) await client.query(
                    `INSERT INTO listing_languages (listing_id,language_id,is_primary) VALUES ($1,$2,$3)`,
                    [lid, langId, a.languages.indexOf(langCode) === 0 ? 1 : 0]
                );
            }
            for (const inc of a.inclusions) {
                await client.query(
                    `INSERT INTO listing_inclusions (listing_id,item,is_included,icon) VALUES ($1,$2,$3,$4)`,
                    [lid, inc.item, inc.included, inc.icon]
                );
            }
            for (const stop of a.itinerary) {
                await client.query(
                    `INSERT INTO itinerary_stops (listing_id,stop_order,name,description,duration_minutes) VALUES ($1,$2,$3,$4,$5)`,
                    [lid, stop.order, stop.name, stop.desc, stop.dur]
                );
            }
            for (const aName of a.amenities) {
                const aid = await getAmenityId(aName);
                if (aid) await client.query(
                    `INSERT INTO listing_amenities (listing_id,amenity_id) VALUES ($1,$2)`, [lid, aid]
                );
            }
            for (const depSlug of a.departure_cities) {
                const depId = await getCityId(depSlug);
                if (depId) await client.query(
                    `INSERT INTO listing_departure_cities (listing_id,city_id,pickup_point,pickup_time) VALUES ($1,$2,$3,$4)`,
                    [lid, depId, `Point de départ ${depSlug}`, '07:00']
                );
            }

            // Créer des slots pour les 30 prochains jours
            const today = new Date();
            for (let i = 1; i <= 30; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() + i);
                const dateStr = d.toISOString().split('T')[0];
                await client.query(
                    `INSERT INTO activity_slots (listing_id,date,start_time,end_time,capacity,demand_level) VALUES ($1,$2,'09:00','12:00',$3,$4)`,
                    [lid, dateStr, a.max_participants || 10, i % 7 === 0 ? 'high' : 'normal']
                );
                await client.query(
                    `INSERT INTO activity_slots (listing_id,date,start_time,end_time,capacity,demand_level) VALUES ($1,$2,'14:00','17:00',$3,'normal')`,
                    [lid, dateStr, a.max_participants || 10]
                );
            }
        }
        console.log('✅ Activities seeded');
        console.log('\n🎉 Database initialized successfully!');
        console.log('📧 Admin: admin@voyagedz.com / admin123');
        console.log('📧 Host:  host@voyagedz.com / host123');
        console.log('📧 User:  ismael@example.com / user123');

    } finally {
        client.release();
        await pool.end();
    }
}

init().catch(err => {
    console.error('❌ Init failed:', err);
    process.exit(1);
});
