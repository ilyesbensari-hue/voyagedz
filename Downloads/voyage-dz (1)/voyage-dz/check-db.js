const Database = require('better-sqlite3');
const db = new Database('./backend/data/database.sqlite', { verbose: console.log });

console.log('--- USERS ---');
const users = db.prepare('SELECT id, name, email FROM users').all();
console.table(users);

console.log('--- LISTINGS (Top 5) ---');
const listings = db.prepare('SELECT id, title, host_id FROM listings LIMIT 5').all();
console.table(listings);

console.log('--- BOOKINGS ---');
const bookings = db.prepare('SELECT id, user_id, listing_id, status, created_at FROM bookings').all();
console.table(bookings);

// Check for orphans
console.log('--- JOIN CHECK ---');
const joined = db.prepare(`
    SELECT b.id as booking_id, b.user_id, b.listing_id, l.id as found_listing_id, l.title
    FROM bookings b
    LEFT JOIN listings l ON b.listing_id = l.id
`).all();
console.table(joined);
