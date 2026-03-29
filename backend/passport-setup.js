const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const db = require('better-sqlite3')('./database.sqlite');

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    const user = db.prepare('SELECT id, name, email, role, is_host FROM users WHERE id = ?').get(id);
    done(null, user);
});

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_ID',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_SECRET',
    callbackURL: "/api/auth/google/callback"
},
    (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user exists
            let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(profile.id);

            if (!user) {
                // Check by email
                user = db.prepare('SELECT * FROM users WHERE email = ?').get(profile.emails[0].value);

                if (user) {
                    // Link account
                    db.prepare('UPDATE users SET google_id = ? WHERE id = ?').run(profile.id, user.id);
                } else {
                    // Create new user
                    const result = db.prepare(`
                    INSERT INTO users (name, email, google_id, role, created_at)
                    VALUES (?, ?, ?, 'user', datetime('now'))
                `).run(profile.displayName, profile.emails[0].value, profile.id);
                    user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
                }
            }
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }));

// Facebook Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID || 'YOUR_FB_ID',
    clientSecret: process.env.FACEBOOK_APP_SECRET || 'YOUR_FB_SECRET',
    callbackURL: "/api/auth/facebook/callback",
    profileFields: ['id', 'displayName', 'emails']
},
    (accessToken, refreshToken, profile, done) => {
        try {
            let user = db.prepare('SELECT * FROM users WHERE facebook_id = ?').get(profile.id);

            if (!user) {
                const email = profile.emails ? profile.emails[0].value : `${profile.id}@facebook.com`;
                user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

                if (user) {
                    db.prepare('UPDATE users SET facebook_id = ? WHERE id = ?').run(profile.id, user.id);
                } else {
                    const result = db.prepare(`
                    INSERT INTO users (name, email, facebook_id, role, created_at)
                    VALUES (?, ?, ?, 'user', datetime('now'))
                `).run(profile.displayName, email, profile.id);
                    user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
                }
            }
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }));

module.exports = passport;
