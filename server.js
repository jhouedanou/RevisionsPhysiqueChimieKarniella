const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Clé de signature des cookies de session : variable d'environnement. Sans
// elle, une clé au hasard à chaque démarrage (les sessions admin se perdent
// au redémarrage, rien de plus).
const SESSION_SECRET = process.env.SESSION_SECRET || require('crypto').randomBytes(32).toString('hex');

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Serve static files (HTML, CSS, JS, images)
app.use(express.static(path.join(__dirname)));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// API Routes
const { router: authRouter } = require('./routes/auth');
const apiRouter = require('./routes/api');
const chatRouter = require('./routes/chat');

app.use('/api/auth', authRouter);
// Monté avant le routeur générique /api pour que /api/chat lui parvienne.
app.use('/api/chat', chatRouter);
app.use('/api', apiRouter);

// Default route - serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route non trouvée'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Erreur serveur'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📚 Site public: http://localhost:${PORT}`);
    console.log(`🔐 Admin: http://localhost:${PORT}/admin/login.html`);
    if (!process.env.ADMIN_PASSWORD) {
        console.log(`\n⚠️  ADMIN_PASSWORD non défini : la connexion admin est désactivée.`);
        console.log(`   Lancer avec : ADMIN_PASSWORD=… npm start`);
    }
});
