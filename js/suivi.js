/**
 * suivi.js — Envoie à tonton ce que Karniella fait dans l'app.
 *
 * Chaque leçon ouverte, chaque quiz fini, chaque question au chat et le temps
 * passé sur chaque page deviennent une ligne de la table `activite` du projet
 * Supabase « karniella » (voir supabase/suivi.sql). Tonton les lit sur
 * suivi.html, avec un mot de passe.
 *
 * - Pas de nom, pas de photo : juste un code tiré au hasard pour l'appareil.
 * - Hors ligne, les lignes attendent dans localStorage (clé FILE) et partent
 *   dès que la connexion revient. js/progression.js y dépose ses lignes même
 *   si ce script n'est pas encore chargé.
 * - La clé publique ne permet que d'AJOUTER des lignes : ni lire, ni effacer.
 * - Rien n'est envoyé en local (localhost) ni sur un appareil marqué
 *   « ne pas compter » depuis suivi.html.
 *
 * Chargé par chat-assistant.js, comme les autres modules : aucune page à modifier.
 */
(function () {
    'use strict';

    if (window.KarniellaSuivi) { return; }

    var URL_SUPABASE = 'https://bpxhzpzybvldbyvbzslb.supabase.co';
    var CLE_PUBLIQUE = 'sb_publishable_llOCHVMS5NQBudZW4E4RXw_Y1NJhWAI';

    var FILE = 'karniella-suivi-file';
    var APPAREIL = 'karniella-appareil';
    var ARRET = 'karniella-suivi-off';
    var MAX_FILE = 300;           // hors ligne longtemps : on garde les plus récentes
    var TEMPS_MIN = 10;           // en dessous de 10 s sur une page, on ne compte pas

    function lireStockage(cle) {
        try { return window.localStorage.getItem(cle); } catch (err) { return null; }
    }

    function ecrireStockage(cle, valeur) {
        try { window.localStorage.setItem(cle, valeur); return true; } catch (err) { return false; }
    }

    function actif() {
        var h = window.location.hostname;
        if (h === 'localhost' || h === '127.0.0.1' || h === '' || window.location.protocol === 'file:') { return false; }
        return lireStockage(ARRET) !== '1';
    }

    function appareil() {
        var id = lireStockage(APPAREIL);
        if (!id) {
            id = 'k-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
            ecrireStockage(APPAREIL, id);
        }
        return id;
    }

    function lireFile() {
        try { return JSON.parse(lireStockage(FILE)) || []; } catch (err) { return []; }
    }

    function ecrireFile(file) {
        ecrireStockage(FILE, JSON.stringify(file.slice(-MAX_FILE)));
    }

    /** La page, en mots courts : slug de la leçon, « accueil », « mission-<id> »… */
    function pageCourante() {
        var chemin = window.location.pathname.replace(/\/+$/, '/index.html');
        var nom = chemin.split('/').pop().replace(/\.html$/, '') || 'index';
        if (nom === 'mission') {
            var id = new URLSearchParams(window.location.search).get('id');
            return id ? 'mission-' + id : 'mission';
        }
        if (nom === 'index') { return chemin.indexOf('/5e/') !== -1 ? '5e-accueil' : 'accueil'; }
        return nom;
    }

    function matiereCourante() {
        return (document.body && document.body.getAttribute('data-matiere')) || null;
    }

    /* ============================================================
       Envoi
       ============================================================ */

    var enCours = false;

    function envoyer(sortie) {
        if (!actif() || enCours || typeof window.fetch !== 'function') { return; }
        if (navigator.onLine === false) { return; }
        var file = lireFile();
        if (!file.length) { return; }
        var lot = file.slice(0, 50);
        var id = appareil();
        var lignes = lot.map(function (l) {
            return {
                appareil: id, type: l.type, page: l.page || null, matiere: l.matiere || null,
                score: l.score == null ? null : l.score, total: l.total == null ? null : l.total,
                duree: l.duree == null ? null : l.duree, serie: l.serie || null,
                details: l.details || null,
                date_client: l.date ? new Date(l.date).toISOString() : null
            };
        });
        enCours = true;
        window.fetch(URL_SUPABASE + '/rest/v1/activite', {
            method: 'POST',
            keepalive: !!sortie,
            headers: {
                'apikey': CLE_PUBLIQUE,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(lignes)
        }).then(function (r) {
            enCours = false;
            // 4xx : ligne refusée par la base (trop longue…) — inutile de la renvoyer sans fin.
            if (r.ok || (r.status >= 400 && r.status < 500)) {
                ecrireFile(lireFile().slice(lot.length));
                if (r.ok && lireFile().length) { envoyer(); }
            }
        }).catch(function () { enCours = false; /* hors ligne : on réessaiera */ });
    }

    /** Ajoute une ligne à la file et tente l'envoi. */
    function noter(ligne) {
        if (!actif() || !ligne || !ligne.type) { return; }
        var file = lireFile();
        ligne.date = ligne.date || Date.now();
        if (!ligne.page) { ligne.page = pageCourante(); }
        if (!ligne.matiere) { ligne.matiere = matiereCourante(); }
        file.push(ligne);
        ecrireFile(file);
        envoyer();
    }

    /* ============================================================
       Temps passé : seulement quand la page est visible
       ============================================================ */

    var debut = document.visibilityState === 'hidden' ? null : Date.now();
    var cumul = 0;

    function arreterChrono() {
        if (debut) { cumul += (Date.now() - debut) / 1000; debut = null; }
    }

    function viderTemps() {
        arreterChrono();
        var s = Math.round(cumul);
        cumul = 0;
        if (s >= TEMPS_MIN) { noter({ type: 'temps', duree: Math.min(s, 86400) }); }
    }

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') {
            viderTemps();
            envoyer(true);
        } else if (!debut) {
            debut = Date.now();
        }
    });
    window.addEventListener('pagehide', function () { viderTemps(); envoyer(true); });
    window.addEventListener('online', function () { envoyer(); });

    window.KarniellaSuivi = {
        noter: noter,
        envoyer: envoyer,
        actif: actif,
        FILE: FILE,
        ARRET: ARRET
    };

    // Les lignes laissées par progression.js avant notre arrivée, ou d'une visite hors ligne.
    envoyer();
})();
