const express = require('express');
const router = express.Router();

// Credentials (hardcoded for simplicity)
const ADMIN_USERNAME = 'karniella';
const ADMIN_PASSWORD = 'houedanou';

// Login endpoint
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
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
