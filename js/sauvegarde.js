/**
 * sauvegarde.js — Garde en ligne tout ce que Karniella a gagné.
 *
 * Quatre clés localStorage partent dans la table `sauvegarde` du projet
 * Supabase « karniella » (supabase/sauvegarde.sql) :
 *   karniella-xp           XP, cadeaux, achats et récompenses actives
 *   karniella-progression  scores, records, erreurs, jours, leçons lues
 *   karniella-badges       badges obtenus
 *   karniella-interros     interros faites
 * Les réglages de l'appareil (thème clair ou sombre, son, taille du texte,
 * historique du chat, recherches) restent sur l'appareil.
 *
 * Il faut le CODE DE SAUVEGARDE, choisi par tonton sur suivi.html : on relie
 * l'appareil en ouvrant une fois sauvegarde.html#code=…. Sans code, ce script
 * ne fait rien.
 *
 * Synchroniser = lire l'état en ligne, le FUSIONNER avec celui de l'appareil,
 * réécrire l'appareil, puis envoyer le résultat. La fusion ne perd jamais
 * rien (règles plus bas) : deux appareils peuvent travailler hors ligne, tout
 * se rejoint à la connexion suivante. Si un autre appareil a écrit entre la
 * lecture et l'envoi, la base refuse et renvoie son état : on refusionne.
 *
 * Chargé par chat-assistant.js, comme js/suivi.js. Événement émis après
 * chaque synchronisation : `karniella:sauvegarde` { ok, raison }.
 */
(function () {
    'use strict';

    if (window.KarniellaSauvegarde) { return; }

    var URL_SUPABASE = 'https://bpxhzpzybvldbyvbzslb.supabase.co';
    var CLE_PUBLIQUE = 'sb_publishable_llOCHVMS5NQBudZW4E4RXw_Y1NJhWAI';

    var REGLAGE = 'karniella-sauvegarde';   // { code, version, empreinte, dernier, refuse }
    var CLES = {
        xp: 'karniella-xp',
        progression: 'karniella-progression',
        badges: 'karniella-badges',
        interros: 'karniella-interros'
    };
    var DELAI_ENVOI = 3000;         // après un changement, on attend un peu
    var RELIRE_APRES = 45000;       // relire si la dernière lecture est plus vieille
    var MAX_QUIZ_GARDES = 10;       // comme js/progression.js
    var MAX_JOURS_GARDES = 60;

    /* ============================================================
       Stockage local
       ============================================================ */

    function lireJSON(cle) {
        try { return JSON.parse(window.localStorage.getItem(cle)); } catch (err) { return null; }
    }

    function ecrireJSON(cle, valeur) {
        try { window.localStorage.setItem(cle, JSON.stringify(valeur)); return true; } catch (err) { return false; }
    }

    function reglage() { return lireJSON(REGLAGE) || {}; }

    function majReglage(changements) {
        var r = reglage();
        Object.keys(changements).forEach(function (k) { r[k] = changements[k]; });
        ecrireJSON(REGLAGE, r);
        return r;
    }

    function appareil() {
        var id = null;
        try { id = window.localStorage.getItem('karniella-appareil'); } catch (err) { /* rien */ }
        if (!id) {
            id = 'k-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
            try { window.localStorage.setItem('karniella-appareil', id); } catch (err) { /* rien */ }
        }
        return id;
    }

    /** En local (localhost), rien ne part : on ne mélange pas les essais et ses vraies données. */
    function surLeSite() {
        var h = window.location.hostname;
        if (h === 'localhost' || h === '127.0.0.1' || h === '' || window.location.protocol === 'file:') {
            try { return window.localStorage.getItem('karniella-sauvegarde-test') === '1'; } catch (err) { return false; }
        }
        return true;
    }

    function relie() {
        var r = reglage();
        return !!r.code && !r.refuse;
    }

    function etatLocal() {
        var e = {};
        Object.keys(CLES).forEach(function (k) {
            var v = lireJSON(CLES[k]);
            if (v && typeof v === 'object') { e[k] = v; }
        });
        return e;
    }

    /** Une empreinte courte de l'état, pour savoir s'il a changé. */
    function empreinte(etat) {
        var t = JSON.stringify(etat || {});
        var h = 5381;
        for (var i = 0; i < t.length; i++) { h = ((h << 5) + h + t.charCodeAt(i)) | 0; }
        return t.length + ':' + (h >>> 0).toString(36);
    }

    /** Réécrit l'appareil avec l'état fusionné, et prévient les modules qui affichent. */
    function appliquerLocal(etat) {
        Object.keys(CLES).forEach(function (k) {
            if (!etat[k]) { return; }
            var avant = null;
            try { avant = window.localStorage.getItem(CLES[k]); } catch (err) { /* rien */ }
            var apres = JSON.stringify(etat[k]);
            if (avant === apres) { return; }
            try { window.localStorage.setItem(CLES[k], apres); } catch (err) { return; }
            try {
                if (k === 'xp') { window.dispatchEvent(new CustomEvent('karniella:xp', { detail: etat.xp })); }
                if (k === 'progression') { window.dispatchEvent(new CustomEvent('karniella:progression')); }
            } catch (err) { /* rien */ }
        });
    }

    /* ============================================================
       La fusion : deux états → un état qui garde tout
       ============================================================
       Chaque règle est « commutative » : fusionner A avec B ou B avec A donne
       la même chose, et refusionner ne change rien. */

    function cles(a, b) {
        var vu = {};
        Object.keys(a || {}).concat(Object.keys(b || {})).forEach(function (k) { vu[k] = true; });
        return Object.keys(vu);
    }

    function max(a, b) {
        if (a == null) { return b; }
        if (b == null) { return a; }
        return a > b ? a : b;
    }

    function minVrai(a, b) {
        if (!a) { return b || a; }
        if (!b) { return a; }
        return a < b ? a : b;
    }

    function union(a, b) {
        var r = (a || []).slice();
        (b || []).forEach(function (x) { if (r.indexOf(x) === -1) { r.push(x); } });
        return r.sort();
    }

    /** Pour chaque clé, la plus grande valeur (compteurs par appareil, cadeaux). */
    function maxParCle(a, b) {
        var r = {};
        cles(a, b).forEach(function (k) { r[k] = max((a || {})[k], (b || {})[k]); });
        return r;
    }

    /** L'objet daté le plus récent (champ `date`). */
    function plusRecent(a, b, champ) {
        champ = champ || 'date';
        if (!a) { return b || null; }
        if (!b) { return a; }
        return (b[champ] || 0) > (a[champ] || 0) ? b : a;
    }

    // XP : gagnés par appareil (on garde le plus grand compteur de chaque
    // appareil), cadeaux par id, achats réunis, récompenses actives du côté
    // qui les a changées en dernier. total et dépenses : recalculés par js/xp.js.
    function fusionXP(a, b) {
        if (!a || !a.gagnes) { return b && b.gagnes ? b : a; }
        if (!b || !b.gagnes) { return a; }
        var actifsB = (b.actifsDate || 0) > (a.actifsDate || 0);
        var r = {
            version: max(a.version, b.version),
            gagnes: maxParCle(a.gagnes, b.gagnes),
            cadeaux: maxParCle(a.cadeaux, b.cadeaux),
            achats: union(a.achats, b.achats),
            actifs: actifsB ? (b.actifs || {}) : (a.actifs || {}),
            actifsDate: max(a.actifsDate, b.actifsDate) || undefined,
            dernierGain: plusRecent(a.dernierGain, b.dernierGain) || undefined
        };
        var somme = function (o) { return Object.keys(o).reduce(function (n, k) { return n + (Number(o[k]) || 0); }, 0); };
        r.total = somme(r.gagnes) + somme(r.cadeaux);
        r.depenses = Math.max(a.depenses || 0, b.depenses || 0);
        // Les dépenses exactes viennent des prix du catalogue (js/xp.js).
        if (window.KarniellaXP && window.KarniellaXP.normaliser) { r = window.KarniellaXP.normaliser(r); }
        return r;
    }

    // Une tentative de quiz : la même si même série (quiz du chat, mis à jour
    // au fil des réponses) ou même date ; on garde alors la plus récente.
    function cleTentative(t) { return t.serie ? 's:' + t.serie : 'd:' + t.date; }

    function fusionQuiz(a, b) {
        var parCle = {};
        (a || []).concat(b || []).forEach(function (t) {
            if (!t) { return; }
            var k = cleTentative(t);
            if (!parCle[k] || (t.date || 0) > (parCle[k].date || 0) ||
                    ((t.date || 0) === (parCle[k].date || 0) && (t.total || 0) > (parCle[k].total || 0))) {
                parCle[k] = t;
            }
        });
        return Object.keys(parCle).map(function (k) { return parCle[k]; })
            .sort(function (x, y) { return (x.date || 0) - (y.date || 0); })
            .slice(-MAX_QUIZ_GARDES);
    }

    function meilleurRecord(a, b) {
        if (!a) { return b || undefined; }
        if (!b) { return a; }
        if (b.correct > a.correct || (b.correct === a.correct && b.temps < a.temps)) { return b; }
        return a;
    }

    function dernierQuiz(p) {
        var q = (p && p.quiz) || [];
        return q.length ? (q[q.length - 1].date || 0) : 0;
    }

    function fusionPage(a, b) {
        if (!a) { return b; }
        if (!b) { return a; }
        // Les erreurs à revoir : celles du quiz le plus récent (vides s'il était parfait).
        var source = dernierQuiz(b) > dernierQuiz(a) ? b : a;
        var r = {
            visites: max(a.visites, b.visites) || 0,
            matiere: a.matiere || b.matiere || null,
            quiz: fusionQuiz(a.quiz, b.quiz),
            questions: max(a.questions, b.questions) || 0
        };
        var derniere = max(a.derniereVisite, b.derniereVisite);
        if (derniere) { r.derniereVisite = derniere; }
        var record = meilleurRecord(a.record, b.record);
        if (record) { r.record = record; }
        if (source.erreurs && source.erreurs.length) { r.erreurs = source.erreurs.slice(); }
        var revisions = max(a.revisions, b.revisions);
        if (revisions) { r.revisions = revisions; }
        if (a.etapesLues || b.etapesLues) { r.etapesLues = union(a.etapesLues, b.etapesLues); }
        var lue = minVrai(a.lue, b.lue);
        if (lue) { r.lue = lue; }
        return r;
    }

    function fusionProgression(a, b) {
        if (!a) { return b; }
        if (!b) { return a; }
        var pages = {};
        cles(a.pages, b.pages).forEach(function (slug) {
            pages[slug] = fusionPage((a.pages || {})[slug], (b.pages || {})[slug]);
        });
        var jours = {};
        cles(a.jours, b.jours).sort().slice(-MAX_JOURS_GARDES).forEach(function (j) {
            var x = (a.jours || {})[j] || {};
            var y = (b.jours || {})[j] || {};
            jours[j] = { lecons: max(x.lecons, y.lecons) || 0, quiz: max(x.quiz, y.quiz) || 0 };
        });
        var r = { version: max(a.version, b.version), pages: pages, jours: jours };
        var record = max(a.record, b.record);
        if (record) { r.record = record; }
        return r;
    }

    function fusionBadges(a, b) {
        if (!a) { return b; }
        if (!b) { return a; }
        var obtenus = {};
        cles(a.obtenus, b.obtenus).forEach(function (id) {
            obtenus[id] = minVrai((a.obtenus || {})[id], (b.obtenus || {})[id]);
        });
        return { obtenus: obtenus, serieAnnoncee: max(a.serieAnnoncee, b.serieAnnoncee) || null };
    }

    function fusionInterros(a, b) {
        if (!a) { return b; }
        if (!b) { return a; }
        var matieres = {};
        cles(a.matieres, b.matieres).forEach(function (id) {
            matieres[id] = plusRecent((a.matieres || {})[id], (b.matieres || {})[id]);
        });
        var r = { matieres: matieres };
        var reporte = max(a.reporte, b.reporte);
        if (reporte) { r.reporte = reporte; }
        return r;
    }

    var FUSIONS = { xp: fusionXP, progression: fusionProgression, badges: fusionBadges, interros: fusionInterros };

    function fusionner(local, distant) {
        var r = {};
        Object.keys(FUSIONS).forEach(function (k) {
            var v = FUSIONS[k]((local || {})[k] || null, (distant || {})[k] || null);
            if (v) { r[k] = v; }
        });
        return r;
    }

    /* ============================================================
       Supabase
       ============================================================ */

    var indisponible = false;   // fonction absente (SQL pas encore lancé) : on se tait

    function appeler(fonction, corps, keepalive) {
        return window.fetch(URL_SUPABASE + '/rest/v1/rpc/' + fonction, {
            method: 'POST',
            headers: { 'apikey': CLE_PUBLIQUE, 'Content-Type': 'application/json' },
            body: JSON.stringify(corps),
            keepalive: !!keepalive
        }).then(function (r) {
            if (r.status === 404) { indisponible = true; }
            if (!r.ok) { throw new Error('http ' + r.status); }
            return r.json();
        });
    }

    function annoncer(ok, raison) {
        try { window.dispatchEvent(new CustomEvent('karniella:sauvegarde', { detail: { ok: ok, raison: raison || '' } })); } catch (err) { /* rien */ }
    }

    var enCours = null;
    var derniereLecture = 0;

    function codeRefuse() {
        majReglage({ refuse: true });
        annoncer(false, 'code');
    }

    /**
     * Envoie `etat` en disant quelle version on a lue. Conflit : fusionne avec
     * l'état renvoyé, réécrit l'appareil et réessaie (3 fois au plus).
     */
    function pousser(etat, version, essai, keepalive) {
        var r = reglage();
        return appeler('sauvegarde_ecrire', {
            code_saisi: r.code, etat_envoye: etat, version_lue: version, appareil_envoyeur: appareil()
        }, keepalive).then(function (rep) {
            if (rep && rep.ok) {
                majReglage({ version: rep.version, empreinte: empreinte(etat), dernier: Date.now(), refuse: false });
                return { ok: true };
            }
            if (rep && rep.conflit && (essai || 0) < 3) {
                var fusion = fusionner(etatLocal(), rep.etat || {});
                appliquerLocal(fusion);
                return pousser(etatLocal(), rep.version, (essai || 0) + 1);
            }
            if (rep && rep.ok === false && !rep.conflit && !rep.erreur) { codeRefuse(); return { ok: false, raison: 'code' }; }
            return { ok: false, raison: 'base' };
        });
    }

    /** Lire, fusionner, réécrire l'appareil, envoyer si besoin. */
    function synchroniser() {
        if (!relie() || !surLeSite() || indisponible || typeof window.fetch !== 'function') {
            return Promise.resolve({ ok: false, raison: relie() ? 'hors-site' : 'pas-relie' });
        }
        if (enCours) { return enCours; }
        enCours = attendreXP().then(function () {
            return appeler('sauvegarde_lire', { code_saisi: reglage().code });
        }).then(function (rep) {
            if (!rep || !rep.ok) { codeRefuse(); return { ok: false, raison: 'code' }; }
            derniereLecture = Date.now();
            var fusion = fusionner(etatLocal(), rep.etat || {});
            appliquerLocal(fusion);
            var local = etatLocal();
            if (empreinte(local) === empreinte(rep.etat || {})) {
                majReglage({ version: rep.version, empreinte: empreinte(local), dernier: Date.now(), refuse: false });
                return { ok: true };
            }
            return pousser(local, rep.version, 0);
        }).catch(function () {
            return { ok: false, raison: indisponible ? 'base' : 'reseau' };
        }).then(function (res) {
            enCours = null;
            annoncer(res.ok, res.raison);
            return res;
        });
        return enCours;
    }

    /** Envoie seulement si l'appareil a changé depuis le dernier envoi. */
    function envoyer(keepalive) {
        if (!relie() || !surLeSite() || indisponible || enCours) { return; }
        var r = reglage();
        if (typeof r.version !== 'number') { synchroniser(); return; }
        var local = etatLocal();
        if (empreinte(local) === r.empreinte) { return; }
        // Une page qui se ferme ne peut envoyer que 64 Ko en « keepalive ».
        if (keepalive && JSON.stringify(local).length > 60000) { keepalive = false; }
        enCours = pousser(local, r.version, 0, keepalive)
            .catch(function () { return { ok: false, raison: 'reseau' }; })
            .then(function (res) { enCours = null; annoncer(res.ok, res.raison); return res; });
    }

    /** js/xp.js met ses données au format du jour en arrivant : on l'attend (10 s au plus). */
    function attendreXP() {
        return new Promise(function (ok) {
            var debut = Date.now();
            (function verifier() {
                if (window.KarniellaXP || Date.now() - debut > 10000) { ok(); return; }
                window.setTimeout(verifier, 200);
            })();
        });
    }

    /* ============================================================
       Relier et délier l'appareil
       ============================================================ */

    function relier(code) {
        code = String(code || '').trim();
        if (code.length < 8) { return Promise.resolve({ ok: false, raison: 'code' }); }
        ecrireJSON(REGLAGE, { code: code });
        indisponible = false;
        return synchroniser().then(function (res) {
            if (!res.ok && res.raison === 'code') { ecrireJSON(REGLAGE, {}); }
            return res;
        });
    }

    function delier() {
        try { window.localStorage.removeItem(REGLAGE); } catch (err) { /* rien */ }
        annoncer(false, 'pas-relie');
    }

    /* ============================================================
       Quand synchroniser
       ============================================================ */

    var minuteur = null;
    function plusTard() {
        window.clearTimeout(minuteur);
        minuteur = window.setTimeout(function () { envoyer(false); }, DELAI_ENVOI);
    }

    window.addEventListener('karniella:xp', plusTard);
    window.addEventListener('karniella:progression', plusTard);
    // Toutes les 30 s : relire si la page est à l'écran (un autre appareil a
    // peut-être gagné des XP), sinon envoyer ce qui a changé ici (badges et
    // interros n'ont pas d'événement).
    window.setInterval(function () {
        if (document.visibilityState === 'visible' && Date.now() - derniereLecture > RELIRE_APRES) { synchroniser(); return; }
        envoyer(false);
    }, 30000);
    window.addEventListener('online', function () { synchroniser(); });
    window.addEventListener('pagehide', function () { envoyer(true); });
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') { envoyer(true); return; }
        if (Date.now() - derniereLecture > RELIRE_APRES) { synchroniser(); }
    });

    window.KarniellaSauvegarde = {
        relier: relier,
        delier: delier,
        synchroniser: synchroniser,
        envoyer: envoyer,
        fusionner: fusionner,
        etat: function () {
            var r = reglage();
            return { relie: !!r.code && !r.refuse, refuse: !!r.refuse, dernier: r.dernier || null, surLeSite: surLeSite(), indisponible: indisponible };
        }
    };

    synchroniser();
})();
