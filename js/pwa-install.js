/**
 * PWA Installation Prompt Manager
 * Gère l'invité d'installation de la PWA
 */

let deferredPrompt;
const installButton = document.getElementById('pwa-install-button');

// Écouter l'événement beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
    // Empêcher l'affichage automatique
    e.preventDefault();

    // Stocker l'événement pour l'utiliser plus tard
    deferredPrompt = e;

    // Afficher le bouton d'installation personnalisé
    if (installButton) {
        installButton.style.display = 'block';
    }

    console.log('💡 PWA peut être installée');
});

// Gérer le clic sur le bouton d'installation
if (installButton) {
    installButton.addEventListener('click', async () => {
        if (!deferredPrompt) {
            return;
        }

        // Afficher l'invite d'installation
        deferredPrompt.prompt();

        // Attendre la réponse de l'utilisateur
        const { outcome } = await deferredPrompt.userChoice;

        console.log(`Installation: ${outcome}`);

        // Réinitialiser la variable
        deferredPrompt = null;

        // Cacher le bouton
        installButton.style.display = 'none';
    });
}

// Détecter si l'app est déjà installée
window.addEventListener('appinstalled', () => {
    console.log('✅ PWA installée avec succès!');

    if (installButton) {
        installButton.style.display = 'none';
    }

    // Événement analytics optionnel
    // gtag('event', 'pwa_installed');
});

// Vérifier si l'app tourne en mode standalone (installée)
function isRunningStandalone() {
    return (window.matchMedia('(display-mode: standalone)').matches) ||
        (window.navigator.standalone) ||
        document.referrer.includes('android-app://');
}

// Afficher un message si déjà installée
if (isRunningStandalone()) {
    console.log('🎉 Application en mode standalone');
}

// Vérifier les mises à jour du service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(registration => {
        // Vérifier les mises à jour toutes les heures
        setInterval(() => {
            registration.update();
        }, 60 * 60 * 1000); // 1 heure
    });
}
