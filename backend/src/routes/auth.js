import express from 'express';
import passport from '../auth/googleAuth.js';
import { generateJWT, verifyJWT } from '../auth/googleAuth.js';
import { db } from '../database/connection.js';

const router = express.Router();

// Google OAuth routes
router.get('/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      // Generate JWT token
      const token = generateJWT(req.user);
      
      // Store session info
      await db.query(`
        INSERT INTO coach_sessions (coach_id, session_token, device_info, expires_at)
        VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')
      `, [
        req.user.id,
        token,
        JSON.stringify({
          userAgent: req.headers['user-agent'],
          ip: req.ip
        })
      ]);

      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('Auth callback error:', error);
      res.redirect(`${frontendUrl}/auth/error`);
    }
  }
);

// Get current coach profile
router.get('/profile', verifyJWT, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id, email, first_name, last_name, bio, phone, 
        coaching_license, years_experience, certifications,
        subscription_tier, created_at, last_login_at
      FROM coaches 
      WHERE id = $1 AND account_status = 'active'
    `, [req.coach.coachId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Coach not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update coach profile
router.put('/profile', verifyJWT, async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      bio,
      phone,
      coaching_license,
      years_experience,
      certifications
    } = req.body;

    const result = await db.query(`
      UPDATE coaches SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        bio = COALESCE($3, bio),
        phone = COALESCE($4, phone),
        coaching_license = COALESCE($5, coaching_license),
        years_experience = COALESCE($6, years_experience),
        certifications = COALESCE($7, certifications),
        updated_at = NOW()
      WHERE id = $8
      RETURNING 
        id, email, first_name, last_name, bio, phone, 
        coaching_license, years_experience, certifications,
        subscription_tier, updated_at
    `, [
      first_name, last_name, bio, phone, coaching_license, 
      years_experience, certifications, req.coach.coachId
    ]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Logout - invalidate session
router.post('/logout', verifyJWT, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    // Remove session from database
    await db.query(
      'DELETE FROM coach_sessions WHERE coach_id = $1 AND session_token = $2',
      [req.coach.coachId, token]
    );

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

// Check auth status
router.get('/status', verifyJWT, (req, res) => {
  res.json({ 
    authenticated: true, 
    coachId: req.coach.coachId,
    subscriptionTier: req.coach.subscriptionTier
  });
});

// Get active sessions
router.get('/sessions', verifyJWT, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id, device_info, created_at, expires_at,
        session_token = $2 as is_current
      FROM coach_sessions 
      WHERE coach_id = $1 AND expires_at > NOW()
      ORDER BY created_at DESC
    `, [req.coach.coachId, req.headers.authorization?.split(' ')[1]]);

    res.json(result.rows);
  } catch (error) {
    console.error('Sessions fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Revoke session
router.delete('/sessions/:sessionId', verifyJWT, async (req, res) => {
  try {
    await db.query(`
      DELETE FROM coach_sessions 
      WHERE coach_id = $1 AND id = $2
    `, [req.coach.coachId, req.params.sessionId]);

    res.json({ message: 'Session revoked' });
  } catch (error) {
    console.error('Session revoke error:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

export default router;