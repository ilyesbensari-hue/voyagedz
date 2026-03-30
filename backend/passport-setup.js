const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const { getOne, query } = require('./db');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await getOne('SELECT id, name, email, role, is_host FROM users WHERE id = $1', [id]);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_ID',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_SECRET',
    callbackURL: "/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists
      let user = await getOne('SELECT * FROM users WHERE google_id = $1', [profile.id]);
      
      if (!user) {
        // Check by email
        user = await getOne('SELECT * FROM users WHERE email = $1', [profile.emails[0].value]);
        
        if (user) {
          // Link account
          await query('UPDATE users SET google_id = $1 WHERE id = $2', [profile.id, user.id]);
          user.google_id = profile.id;
        } else {
          // Create new user
          const res = await query(
            'INSERT INTO users (name, email, google_id, role) VALUES ($1, $2, $3, $4) RETURNING *',
            [profile.displayName, profile.emails[0].value, profile.id, 'user']
          );
          user = res.rows[0];
        }
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

// Facebook Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID || 'YOUR_FB_ID',
    clientSecret: process.env.FACEBOOK_APP_SECRET || 'YOUR_FB_SECRET',
    callbackURL: "/api/auth/facebook/callback",
    profileFields: ['id', 'displayName', 'emails']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists
      let user = await getOne('SELECT * FROM users WHERE facebook_id = $1', [profile.id]);
      
      if (!user) {
        // Check by email
        user = await getOne('SELECT * FROM users WHERE email = $1', [profile.emails[0].value]);
        
        if (user) {
          // Link account
          await query('UPDATE users SET facebook_id = $1 WHERE id = $2', [profile.id, user.id]);
          user.facebook_id = profile.id;
        } else {
          // Create new user
          const res = await query(
            'INSERT INTO users (name, email, facebook_id, role) VALUES ($1, $2, $3, $4) RETURNING *',
            [profile.displayName, profile.emails[0].value, profile.id, 'user']
          );
          user = res.rows[0];
        }
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));
