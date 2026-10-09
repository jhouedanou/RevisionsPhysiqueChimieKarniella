const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// Identifiants : dans les variables d'environnement, JAMAIS dans le dépôt (il
// est public). Sur Vercel : Settings → Environment Variables. En local :
// `ADMIN_PASSWORD=… npm start` (voir .env.example).
// Sans ADMIN_PASSWORD, la connexion admin est refusée : pas de mot de passe
// par défaut que tout le monde pourrait lire sur GitHub.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'karniella';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

/** Comparaison à temps constant : la durée ne trahit pas les bons caractères. */
function egal(a, b) {
    const x = crypto.createHash('sha256').update(String(a || '')).digest();
    const y = crypto.createHash('sha256').update(String(b || '')).digest();
    return crypto.timingSafeEqual(x, y);
}

// Login endpoint
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!ADMIN_PASSWORD) {
        return res.status(503).json({
            success: false,
            message: 'Connexion admin désactivée : la variable ADMIN_PASSWORD n\'est pas définie sur le serveur.'
        });
    }

    if (egal(username, ADMIN_USERNAME) && egal(password, ADMIN_PASSWORD)) {
        req.session.isAuthenticated = true;
        req.session.username = username;
        return res.json({
            success: true,
            message: 'Connexion réussie',
            username: username
        });
    }

    return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects'
    });
});

// Logout endpoint
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la déconnexion'
            });
        }
        res.json({
            success: true,
            message: 'Déconnexion réussie'
        });
    });
});

// Check authentication status
router.get('/status', (req, res) => {
    if (req.session.isAuthenticated) {
        return res.json({
            authenticated: true,
            username: req.session.username
        });
    }
    res.json({ authenticated: false });
});

// Middleware to check authentication
function requireAuth(req, res, next) {
    if (req.session.isAuthenticated) {
        return next();
    }
    res.status(401).json({
        success: false,
        message: 'Non authentifié'
    });
}

module.exports = { router, requireAuth };
