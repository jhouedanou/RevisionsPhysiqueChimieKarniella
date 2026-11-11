/**
 * prononciation.js — Dire une phrase en anglais au micro, et savoir si c'est bien dit.
 *
 * Chaque bloc `.prononciation` d'une leçon devient une liste de cartes :
 *   🔊 Écouter    la phrase lue par la voix anglaise (js/lecture-vocale.js) ;
 *   🎤 À toi !    Karniella la dit ; la reconnaissance vocale du navigateur
 *                 (Web Speech API, anglais) écrit ce qu'elle a entendu ;
 *   le résultat   chaque mot en vert (bien dit) ou surligné en rouge (pas entendu),
 *                 un score sur 100 et un conseil.
 *
 * Dans la page :
 *
 *   <div class="prononciation" lang="en">
 *     <ol>
 *       <li data-fr="C'est une grande porte.">It's a big door.</li>
 *       <li data-fr="Koffi est le frère d'Aya." data-noms="Koffi Aya">Koffi is Aya's brother.</li>
 *     </ol>
 *   </div>
 *
 * `data-noms` : des prénoms que la reconnaissance anglaise comprend mal. Ils
 * ne comptent pas dans le score (affichés en gris).
 *
 * Une phrase est réussie à 85 sur 100 : +5 XP, une fois par jour et par
 * phrase. Le meilleur score de chaque phrase est gardé dans la clé
 * `karniella-prononciation` (sauvegardée en ligne par js/sauvegarde.js).
 *
 * Sans reconnaissance vocale (Firefox, vieux navigateur, page non sécurisée),
 * le bloc garde les boutons 🔊 et dit pourquoi le micro n'est pas proposé.
 */
(function () {
    'use strict';

    if (window.KarniellaPrononciation) { return; }

    var Reconnaissance = window.SpeechRecognition || window.webkitSpeechRecognition;
    var MICRO = !!Reconnaissance && window.isSecureContext !== false;
    var CLE = 'karniella-prononciation';
    var REUSSI = 85;
    var XP_PHRASE = 5;
    var DUREE_MAX = 9000;       // on arrête d'écouter au bout de 9 s

    /* ============================================================
       Comparer ce qui est dit à ce qui est attendu
       ============================================================ */

    var CONTRACTIONS = {
        "i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are',
        "he's": 'he is', "she's": 'she is', "it's": 'it is', "that's": 'that is',
        "what's": 'what is', "where's": 'where is', "there's": 'there is', "who's": 'who is',
        "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not', "weren't": 'were not',
        "don't": 'do not', "doesn't": 'does not', "didn't": 'did not',
        "can't": 'can not', 'cannot': 'can not', "won't": 'will not', "haven't": 'have not',
        "hasn't": 'has not', "i've": 'i have', "i'll": 'i will', "i'd": 'i would', "let's": 'let us'
    };

    var NOMBRES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
        'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
        'nineteen', 'twenty'];

    // Anglais américain → britannique : la reconnaissance écrit l'un ou l'autre.
    var VARIANTES = { mom: 'mum', color: 'colour', favorite: 'favourite', center: 'centre', gray: 'grey', program: 'programme' };

    function normaliserMot(m) {
        m = m.replace(/^'+|'+$/g, '');
        if (/^\d+$/.test(m) && +m <= 20) { return NOMBRES[+m]; }
        m = m.replace(/'/g, '');            // possessifs : aya's → ayas
        return VARIANTES[m] || m;
    }

    /** Une phrase → sa liste de mots comparables (minuscules, sans ponctuation, contractions ouvertes). */
    function mots(texte) {
        var t = String(texte || '').toLowerCase()
            .replace(/[’‘`]/g, "'")
            .replace(/(\d+):(\d+)/g, '$1 $2')
            .replace(/[^a-z0-9'\s-]/g, ' ')
            .replace(/-/g, ' ');
        var sortie = [];
        t.split(/\s+/).forEach(function (m) {
            if (!m) { return; }
            var ouvert = CONTRACTIONS[m];
            (ouvert ? ouvert.split(' ') : [m]).forEach(function (x) {
                var n = normaliserMot(x);
                if (n) { sortie.push(n); }
            });
        });
        return sortie;
    }

    /** Pour chaque mot attendu, a-t-il été entendu, dans l'ordre ? (plus longue sous-suite commune) */
    function aligner(attendus, entendus) {
        var n = attendus.length, m = entendus.length;
        var L = [];
        for (var i = 0; i <= n; i++) { L.push(new Array(m + 1).fill(0)); }
        for (i = n - 1; i >= 0; i--) {
            for (var j = m - 1; j >= 0; j--) {
                L[i][j] = attendus[i] === entendus[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
            }
        }
        var trouve = new Array(n).fill(false);
        i = 0; j = 0;
        while (i < n && j < m) {
            if (attendus[i] === entendus[j]) { trouve[i] = true; i++; j++; }
            else if (L[i + 1][j] >= L[i][j + 1]) { i++; }
            else { j++; }
        }
        return trouve;
    }

    /**
     * Note une phrase. `noms` : mots qui ne comptent pas.
     * Renvoie { score, mots: [{ mot, ok, nom }] } pour la meilleure des transcriptions.
     */
    function noter(phrase, transcriptions, noms) {
        var attendus = mots(phrase);
        var ignores = mots((noms || []).join(' '));
        var estNom = attendus.map(function (m) {
            return ignores.some(function (n) { return m === n || m === n + 's'; });
        });
        var comptes = estNom.filter(function (x) { return !x; }).length || 1;
        var meilleur = null;
        (transcriptions || []).forEach(function (t) {
            var trouve = aligner(attendus, mots(t));
            var bons = 0;
            trouve.forEach(function (ok, k) { if (ok && !estNom[k]) { bons++; } });
            var score = Math.round(100 * bons / comptes);
            if (!meilleur || score > meilleur.score) { meilleur = { score: score, trouve: trouve, entendu: t }; }
        });
        if (!meilleur) { meilleur = { score: 0, trouve: attendus.map(function () { return false; }), entendu: '' }; }
        // Les mots affichés : ceux de la phrase telle qu'écrite, un par mot comparé quand c'est possible.
        return { score: meilleur.score, entendu: meilleur.entendu, trouve: meilleur.trouve, estNom: estNom };
    }

    /* ============================================================
       Ce qui est gardé : meilleur score, XP du jour
       ============================================================ */

    function aujourdhui() {
        var d = new Date();
        return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }

    function lire() {
        try {
            var d = JSON.parse(window.localStorage.getItem(CLE));
            if (d && d.phrases && typeof d.phrases === 'object') { return d; }
        } catch (err) { /* rien */ }
        return { phrases: {} };
    }

    function ecrire(d) {
        try { window.localStorage.setItem(CLE, JSON.stringify(d)); } catch (err) { /* rien */ }
    }

    function slugPage() {
        var nom = (window.location.pathname.split('/').pop() || '').replace(/\.html$/, '');
        return nom || 'page';
    }

    /** Garde le score ; renvoie les XP gagnés (5 la première réussite du jour, sinon 0). */
    function retenir(cle, score) {
        var d = lire();
        var p = d.phrases[cle] || (d.phrases[cle] = { meilleur: 0 });
        p.meilleur = Math.max(p.meilleur || 0, score);
        p.date = Date.now();
        var xp = 0;
        if (score >= REUSSI && p.jourXP !== aujourdhui()) {
            p.jourXP = aujourdhui();
            if (window.KarniellaXP) { xp = window.KarniellaXP.gagner(XP_PHRASE, 'prononciation:' + cle.slice(0, 80)); }
        }
        ecrire(d);
        return xp;
    }

    function meilleur(cle) {
        var p = lire().phrases[cle];
        return p ? (p.meilleur || 0) : 0;
    }

    /* ============================================================
       Écouter Karniella
       ============================================================ */

    var ecoute = null;   // { reco, carte, fin }

    function arreterEcoute() {
        if (ecoute) {
            try { ecoute.reco.stop(); } catch (err) { /* rien */ }
        }
    }

    var MESSAGES_ERREUR = {
        'not-allowed': 'Le micro est bloqué. Autorise le micro pour ce site (le petit cadenas à côté de l\'adresse), puis réessaie.',
        'service-not-allowed': 'Le micro est bloqué. Autorise le micro pour ce site, puis réessaie.',
        'no-speech': 'Je n\'ai rien entendu. Appuie sur 🎤, puis parle tout de suite, assez fort.',
        'audio-capture': 'Je ne trouve pas de micro sur cet appareil.',
        'network': 'Il faut Internet pour que je t\'écoute. Vérifie la connexion.'
    };

    function ecouter(phrase, noms, carte, cle) {
        if (ecoute) { arreterEcoute(); return; }
        if (window.LectureVocale && window.LectureVocale.stop) { window.LectureVocale.stop(); }

        var bouton = carte.querySelector('.pr-micro');
        var resultat = carte.querySelector('.pr-resultat');
        var reco;
        try { reco = new Reconnaissance(); } catch (err) { afficherErreur(resultat, 'Le micro ne marche pas ici.'); return; }
        reco.lang = 'en-GB';
        reco.interimResults = false;
        reco.continuous = false;
        reco.maxAlternatives = 5;

        var transcriptions = [];
        var erreur = null;
        var minuteur = window.setTimeout(function () { try { reco.stop(); } catch (err) { /* rien */ } }, DUREE_MAX);
        ecoute = { reco: reco, carte: carte };
        bouton.classList.add('pr-ecoute');
        bouton.textContent = '🎙️ Je t\'écoute… (appuie pour finir)';
        resultat.hidden = false;
        resultat.className = 'pr-resultat';
        resultat.textContent = 'Parle maintenant, en anglais.';

        reco.onresult = function (ev) {
            for (var i = 0; i < ev.results.length; i++) {
                for (var k = 0; k < ev.results[i].length; k++) { transcriptions.push(ev.results[i][k].transcript); }
            }
        };
        reco.onerror = function (ev) { erreur = ev.error || 'erreur'; };
        reco.onend = function () {
            window.clearTimeout(minuteur);
            ecoute = null;
            bouton.classList.remove('pr-ecoute');
            bouton.textContent = '🎤 À toi !';
            if (!transcriptions.length) {
                afficherErreur(resultat, MESSAGES_ERREUR[erreur] || MESSAGES_ERREUR['no-speech']);
                return;
            }
            var note = noter(phrase, transcriptions, noms);
            var xp = retenir(cle, note.score);
            afficherNote(carte, phrase, note, xp);
            majBilan(carte.closest('.prononciation'));
        };
        try { reco.start(); } catch (err) {
            window.clearTimeout(minuteur);
            ecoute = null;
            bouton.classList.remove('pr-ecoute');
            bouton.textContent = '🎤 À toi !';
            afficherErreur(resultat, 'Le micro ne s\'est pas lancé. Réessaie.');
        }
    }

    /* ============================================================
       Affichage
       ============================================================ */

    function el(balise, classe, texte) {
        var e = document.createElement(balise);
        if (classe) { e.className = classe; }
        if (texte != null) { e.textContent = texte; }
        return e;
    }

    function afficherErreur(zone, message) {
        zone.hidden = false;
        zone.className = 'pr-resultat pr-alerte';
        zone.textContent = message;
    }

    /** Les mots de la phrase écrite, chacun coloré selon ce qui a été entendu. */
    function motsColores(phrase, note) {
        var conteneur = el('p', 'pr-mots');
        conteneur.setAttribute('lang', 'en');
        var k = 0;
        phrase.split(/\s+/).forEach(function (brut, i) {
            if (i) { conteneur.appendChild(document.createTextNode(' ')); }
            var n = mots(brut).length;     // « It's » compte pour deux mots comparés
            var tranche = note.trouve.slice(k, k + n);
            var noms = note.estNom.slice(k, k + n);
            k += n;
            var span = el('span', null, brut);
            if (n && noms.every(Boolean)) { span.className = 'pr-nom'; }
            else if (n && tranche.every(Boolean)) { span.className = 'pr-ok'; }
            else if (n) { span.className = 'pr-ko'; }
            conteneur.appendChild(span);
        });
        return conteneur;
    }

    function afficherNote(carte, phrase, note, xp) {
        var zone = carte.querySelector('.pr-resultat');
        zone.hidden = false;
        zone.innerHTML = '';
        var bon = note.score >= REUSSI;
        zone.className = 'pr-resultat ' + (bon ? 'pr-bravo' : note.score >= 50 ? 'pr-presque' : 'pr-encore');
        var titre = bon ? '🎉 Bravo, c\'est bien dit !' : note.score >= 50 ? '👍 Presque !' : '🔁 Encore un essai';
        zone.appendChild(el('p', 'pr-verdict', titre + ' ' + note.score + ' / 100' + (xp ? ' · +' + xp + ' XP' : '')));
        zone.appendChild(motsColores(phrase, note));
        var entendu = el('p', 'pr-entendu');
        entendu.appendChild(document.createTextNode('J\'ai entendu : '));
        var e = el('q', null, note.entendu);
        e.setAttribute('lang', 'en');
        entendu.appendChild(e);
        zone.appendChild(entendu);
        if (!bon) {
            zone.appendChild(el('p', 'pr-conseil', 'Réécoute 🔊, puis redis surtout les mots surlignés en rouge, lentement.'));
        }
        majEtoile(carte);
        if (bon && window.KarniellaJeu && window.KarniellaJeu.sons) { window.KarniellaJeu.sons.jouer('juste'); }
    }

    function majEtoile(carte) {
        var m = meilleur(carte.getAttribute('data-cle'));
        var etoile = carte.querySelector('.pr-meilleur');
        etoile.textContent = m ? (m >= REUSSI ? '⭐ ' : '') + 'Ton meilleur : ' + m + ' / 100' : '';
    }

    function majBilan(bloc) {
        if (!bloc) { return; }
        var cartes = bloc.querySelectorAll('.pr-carte');
        var reussies = 0;
        Array.prototype.forEach.call(cartes, function (c) { if (meilleur(c.getAttribute('data-cle')) >= REUSSI) { reussies++; } });
        var bilan = bloc.querySelector('.pr-bilan');
        if (bilan) { bilan.textContent = 'Phrases réussies : ' + reussies + ' / ' + cartes.length; }
    }

    /** Le texte de la phrase : les nœuds texte de l'élément, sans les boutons ajoutés par d'autres modules. */
    function texteDe(li) {
        if (li.getAttribute('data-dire')) { return li.getAttribute('data-dire'); }
        var t = '';
        Array.prototype.forEach.call(li.childNodes, function (n) {
            if (n.nodeType === 3) { t += n.textContent; }
            else if (n.nodeType === 1 && n.tagName !== 'BUTTON' && !n.classList.contains('trad-texte') &&
                    !n.hasAttribute('data-lire-ignore') && !/^pr-/.test(n.className)) { t += n.textContent; }
        });
        return t.replace(/\s+/g, ' ').trim();
    }

    /** La phrase modèle, lue en anglais : par js/lecture-vocale.js (sa vitesse, sa voix), sinon directement. */
    function direModele(phrase, bouton) {
        arreterEcoute();
        if (window.LectureVocale && window.LectureVocale.disponible()) { window.LectureVocale.lire(phrase, 'en', bouton); return; }
        var u = new window.SpeechSynthesisUtterance(phrase);
        u.lang = 'en-GB';
        u.rate = 0.9;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
    }

    function equiperBloc(bloc) {
        if (bloc.getAttribute('data-pr-pret')) { return; }
        bloc.setAttribute('data-pr-pret', '1');
        var slug = slugPage();

        var entete = el('div', 'pr-entete');
        if (MICRO) {
            entete.appendChild(el('p', null, '1. Appuie sur 🔊 pour écouter. 2. Appuie sur 🎤 et dis la phrase en anglais. Les mots bien dits passent en vert.'));
        } else {
            entete.appendChild(el('p', 'pr-alerte', 'Ici, le micro ne peut pas t\'écouter. Ouvre le site avec Chrome (Android ou ordinateur) ou Safari (iPhone). Tu peux quand même écouter 🔊 et répéter à voix haute.'));
        }
        entete.appendChild(el('p', 'pr-bilan'));
        bloc.insertBefore(entete, bloc.firstChild);

        Array.prototype.forEach.call(bloc.querySelectorAll('li'), function (li) {
            var phrase = texteDe(li);
            if (!phrase) { return; }
            var noms = (li.getAttribute('data-noms') || '').split(/[\s,]+/).filter(Boolean);
            var cle = slug + '|' + mots(phrase).join(' ');
            li.classList.add('pr-carte');
            li.setAttribute('data-cle', cle);

            var outils = el('div', 'pr-outils');
            outils.setAttribute('lang', 'fr');
            if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
                var ecouterBtn = el('button', 'btn btn-ghost btn-petit pr-modele', '🔊 Écouter');
                ecouterBtn.type = 'button';
                ecouterBtn.addEventListener('click', function () { direModele(phrase, ecouterBtn); });
                outils.appendChild(ecouterBtn);
            }
            if (MICRO) {
                var micro = el('button', 'btn btn-petit pr-micro', '🎤 À toi !');
                micro.type = 'button';
                micro.addEventListener('click', function () { ecouter(phrase, noms, li, cle); });
                outils.appendChild(micro);
            }
            outils.appendChild(el('span', 'pr-meilleur'));
            li.appendChild(outils);
            var resultat = el('div', 'pr-resultat');
            resultat.setAttribute('lang', 'fr');
            resultat.setAttribute('aria-live', 'polite');
            resultat.hidden = true;
            li.appendChild(resultat);
            majEtoile(li);
        });
        majBilan(bloc);
    }

    var CSS = [
        '.prononciation ol{list-style:none;padding:0;margin:0;display:grid;gap:12px}',
        '.pr-entete p{margin:0 0 8px}',
        '.pr-bilan{font-weight:700;color:var(--l5-fort,var(--rose))}',
        '.pr-carte{background:var(--surface);border:1px solid var(--bord);border-radius:var(--rayon-carte,14px);padding:12px 14px;font-size:1.08em;font-weight:600}',
        '.pr-outils{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px;font-size:15px;font-weight:400}',
        '.pr-micro.pr-ecoute{animation:pr-pulse 1s ease-in-out infinite}',
        '@keyframes pr-pulse{50%{transform:scale(1.04);opacity:.85}}',
        '@media (prefers-reduced-motion:reduce){.pr-micro.pr-ecoute{animation:none}}',
        '.pr-meilleur{color:var(--doux);font-size:14px}',
        '.pr-resultat{margin-top:10px;padding:10px 12px;border-radius:10px;font-size:15px;font-weight:400;background:var(--surface-douce,var(--surface))}',
        '.pr-resultat p{margin:4px 0}',
        '.pr-bravo{background:var(--succes-fond);color:var(--succes-texte)}',
        '.pr-presque{background:var(--boite-important);color:var(--boite-important-texte)}',
        '.pr-encore,.pr-alerte{background:var(--erreur-fond);color:var(--erreur-texte)}',
        '.pr-entete .pr-alerte{padding:10px 12px;border-radius:10px}',
        '.pr-verdict{font-weight:700}',
        '.pr-mots{font-size:1.1em;font-weight:600;line-height:1.7}',
        '.pr-mots .pr-ok{color:var(--succes-texte);text-decoration:underline;text-decoration-thickness:2px}',
        '.pr-mots .pr-ko{color:var(--erreur-texte);background:var(--erreur-fond);border-radius:4px;padding:0 2px}',
        '.pr-mots .pr-nom{color:var(--doux)}',
        '.pr-bravo .pr-mots .pr-ko{background:transparent}'
    ].join('');

    function demarrer() {
        var blocs = document.querySelectorAll('.prononciation');
        if (!blocs.length) { return; }
        if (!document.getElementById('pr-style')) {
            var style = el('style');
            style.id = 'pr-style';
            style.textContent = CSS;
            document.head.appendChild(style);
        }
        Array.prototype.forEach.call(blocs, equiperBloc);
    }

    window.KarniellaPrononciation = { mots: mots, noter: noter, micro: function () { return MICRO; } };

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', demarrer); }
    else { demarrer(); }
})();
