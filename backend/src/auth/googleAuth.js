import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import { db } from '../database/connection.js';

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3001/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    const googleId = profile.id;
    
    // Check if coach already exists
    let coach = await db.query(
      'SELECT * FROM coaches WHERE email = $1 OR google_id = $2',
      [email, googleId]
    );

    if (coach.rows.length > 0) {
      // Update existing coach with Google ID if missing
      coach = coach.rows[0];
      if (!coach.google_id) {
        await db.query(
          'UPDATE coaches SET google_id = $1, last_login_at = NOW(), login_count = login_count + 1 WHERE id = $2',
          [googleId, coach.id]
        );
      } else {
        // Just update login info
        await db.query(
          'UPDATE coaches SET last_login_at = NOW(), login_count = login_count + 1 WHERE id = $1',
          [coach.id]
        );
      }
    } else {
      // Create new coach account
      const newCoach = await db.query(`
        INSERT INTO coaches (
          email, google_id, first_name, last_name, 
          email_verified, account_status, last_login_at, login_count
        ) VALUES ($1, $2, $3, $4, true, 'active', NOW(), 1)
        RETURNING *
      `, [
        email,
        googleId,
        profile.name.givenName,
        profile.name.familyName
      ]);
      
      coach = newCoach.rows[0];
    }

    return done(null, coach);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, null);
  }
}));

// Serialize/Deserialize for session management
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await db.query('SELECT * FROM coaches WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (error) {
    done(error, null);
  }
});

// Generate JWT token for authenticated coach
export const generateJWT = (coach) => {
  return jwt.sign(
    { 
      coachId: coach.id, 
      email: coach.email,
      subscriptionTier: coach.subscription_tier 
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Middleware to verify JWT token
export const verifyJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.coach = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware for subscription tier checking
export const requireSubscription = (minTier = 'basic') => {
  const tierLevels = { basic: 1, pro: 2, enterprise: 3 };
  
  return (req, res, next) => {
    const userTier = req.coach.subscriptionTier;
    
    if (tierLevels[userTier] >= tierLevels[minTier]) {
      next();
    } else {
      res.status(403).json({ 
        error: 'Subscription upgrade required',
        required: minTier,
        current: userTier
      });
    }
  };
};

export default passport;