/**
 * saisie.js — Le formulaire de saisie.html : tonton tape une leçon du cahier.
 *
 * Les leçons vont dans la table `lecon_saisie` (Supabase « karniella ») par
 * les fonctions de supabase/lecons-saisies.sql, qui demandent le mot de passe
 * du suivi. Une leçon visible apparaît tout de suite dans le sommaire de sa
 * matière (js/lecons-saisies.js).
 *
 * Le mot de passe reste dans sessionStorage le temps de l'onglet (même clé
 * que suivi.html). Le texte en cours est gardé dans localStorage : fermer la
 * page par erreur ne fait rien perdre.
 */
(function () {
    'use strict';

    var URL_SUPABASE = 'https://bpxhzpzybvldbyvbzslb.supabase.co';
    var CLE_PUBLIQUE = 'sb_publishable_llOCHVMS5NQBudZW4E4RXw_Y1NJhWAI';
    var CLE_MDP = 'karniella-suivi-mdp';
    var BROUILLON = 'karniella-saisie-brouillon';

    var lecons = [];
    var enEdition = null;     // id de la leçon modifiée, null pour une nouvelle

    function $(id) { return document.getElementById(id); }

    function lire(type, cle) {
        try { return window[type].getItem(cle); } catch (err) { return null; }
    }

    function ecrire(type, cle, valeur) {
        try {
            if (valeur === null) { window[type].removeItem(cle); } else { window[type].setItem(cle, valeur); }
        } catch (err) { /* stockage refusé : rien de grave */ }
    }

    function el(balise, classe, texte) {
        var e = document.createElement(balise);
        if (classe) { e.className = classe; }
        if (texte != null) { e.textContent = texte; }
        return e;
    }

    /* ============================================================
       Matières du programme
       ============================================================ */

    var MATIERES = {};
    ((window.KarniellaProgramme || {}).matieres || []).forEach(function (m) {
        MATIERES[m.id] = m;
        $('matiere').appendChild(new Option(m.icone + ' ' + m.nom, m.id));
    });

    function nomMatiere(id) {
        return MATIERES[id] ? MATIERES[id].icone + ' ' + MATIERES[id].nom : id;
    }

    /* ============================================================
       Appels à la base
       ============================================================ */

    function appeler(fonction, parametres) {
        return window.fetch(URL_SUPABASE + '/rest/v1/rpc/' + fonction, {
            method: 'POST',
            headers: { 'apikey': CLE_PUBLIQUE, 'Content-Type': 'application/json' },
            body: JSON.stringify(parametres)
        }).catch(function () {
            throw new Error('reseau');
        }).then(function (r) {
            if (r.status === 401 || r.status === 403) { throw new Error('mdp'); }
            if (r.status === 404) { throw new Error('base'); }
            if (r.status === 400) { throw new Error('refus'); }
            if (!r.ok) { throw new Error('reseau'); }
            return r.text().then(function (t) { return t ? JSON.parse(t) : null; });
        });
    }

    function texteErreur(err) {
        if (err.message === 'mdp') { return 'Mot de passe incorrect.'; }
        if (err.message === 'base') {
            return 'La base n\'est pas prête : lance supabase/lecons-saisies.sql dans l\'éditeur SQL de Supabase.';
        }
        if (err.message === 'refus') {
            return 'La base a refusé la leçon : texte trop long, ou leçon supprimée entre-temps.';
        }
        return 'Impossible de joindre la base. Vérifie la connexion internet.';
    }

    function motDePasse() { return lire('sessionStorage', CLE_MDP); }

    /* ============================================================
       Connexion
       ============================================================ */

    function connecter(mdp) {
        $('erreur-connexion').hidden = true;
        return appeler('lecons_de_tonton', { mdp: mdp }).then(function (liste) {
            ecrire('sessionStorage', CLE_MDP, mdp);
            lecons = liste || [];
            $('ecran-connexion').hidden = true;
            $('espace').hidden = false;
            rendreListe();
        }).catch(function (err) {
            ecrire('sessionStorage', CLE_MDP, null);
            $('ecran-connexion').hidden = false;
            $('espace').hidden = true;
            $('erreur-connexion').textContent = texteErreur(err);
            $('erreur-connexion').hidden = false;
        });
    }

    function recharger() {
        return appeler('lecons_de_tonton', { mdp: motDePasse() }).then(function (liste) {
            lecons = liste || [];
            rendreListe();
        });
    }

    /* ============================================================
       Formulaire
       ============================================================ */

    function valeurs() {
        return {
            matiere: $('matiere').value,
            titre: $('titre').value.trim(),
            contenu: $('contenu').value,
            visible: $('visible').checked
        };
    }

    function remplir(v) {
        $('matiere').value = v.matiere || '';
        $('titre').value = v.titre || '';
        $('contenu').value = v.contenu || '';
        $('visible').checked = v.visible !== false;
        majApercu();
    }

    function message(texte, classe, lien) {
        var m = $('message');
        m.textContent = texte;
        m.className = classe;
        if (lien) {
            m.appendChild(document.createTextNode(' '));
            var a = m.appendChild(el('a', '', 'Voir la leçon'));
            a.href = lien;
        }
        m.hidden = false;
    }

    function majApercu() {
        var v = valeurs();
        var apercu = $('apercu');
        apercu.setAttribute('data-matiere', v.matiere);
        if (!v.titre && !v.contenu.trim()) {
            apercu.textContent = '';
            apercu.appendChild(el('p', 'aide', 'Le texte s\'affichera ici, comme sur le site.'));
            return;
        }
        window.KarniellaLeconsSaisies.rendre(v.contenu, apercu);
        if (v.titre) { apercu.insertBefore(el('h2', '', v.titre), apercu.firstChild); }
    }

    function garderBrouillon() {
        $('message').hidden = true;
        // Une modification en cours n'écrase pas le brouillon d'une nouvelle leçon.
        if (enEdition === null) { ecrire('localStorage', BROUILLON, JSON.stringify(valeurs())); }
        majApercu();
    }

    function nouvelle() {
        enEdition = null;
        $('titre-formulaire').textContent = 'Nouvelle leçon';
        $('annuler').hidden = true;
        $('enregistrer').textContent = 'Enregistrer';
        var brouillon = null;
        try { brouillon = JSON.parse(lire('localStorage', BROUILLON)); } catch (err) { brouillon = null; }
        remplir(brouillon || {});
    }

    function modifier(lecon) {
        enEdition = lecon.id;
        $('titre-formulaire').textContent = 'Modifier la leçon';
        $('annuler').hidden = false;
        $('enregistrer').textContent = 'Enregistrer les changements';
        $('message').hidden = true;
        remplir(lecon);
        $('titre-formulaire').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function enregistrer(e) {
        e.preventDefault();
        var v = valeurs();
        if (!v.matiere) { message('Choisis la matière.', 'erreur'); $('matiere').focus(); return; }
        if (!v.titre) { message('Écris le titre de la leçon.', 'erreur'); $('titre').focus(); return; }
        if (!v.contenu.trim()) { message('Le texte de la leçon est vide.', 'erreur'); $('contenu').focus(); return; }

        $('enregistrer').disabled = true;
        appeler('enregistrer_lecon', {
            mdp: motDePasse(), p_id: enEdition,
            p_matiere: v.matiere, p_titre: v.titre, p_contenu: v.contenu, p_visible: v.visible
        }).then(function (lecon) {
            var etait = enEdition;
            ecrire('localStorage', BROUILLON, null);
            nouvelle();
            message(etait === null ? '✅ Leçon enregistrée.' : '✅ Changements enregistrés.', 'reussi',
                lecon && lecon.visible ? '5e/lecon.html?id=' + encodeURIComponent(lecon.id) : null);
            return recharger();
        }).catch(function (err) {
            message(texteErreur(err), 'erreur');
        }).then(function () {
            $('enregistrer').disabled = false;
        });
    }

    function supprimer(lecon) {
        if (!window.confirm('Supprimer « ' + lecon.titre + ' » ? Karniella ne la verra plus.')) { return; }
        appeler('supprimer_lecon', { mdp: motDePasse(), p_id: lecon.id }).then(function () {
            if (enEdition === lecon.id) { nouvelle(); }
            return recharger();
        }).catch(function (err) {
            window.alert(texteErreur(err));
        });
    }

    /* ============================================================
       Liste des leçons saisies
       ============================================================ */

    function rendreListe() {
        var liste = $('liste');
        liste.textContent = '';
        if (!lecons.length) {
            liste.appendChild(el('li', 'muet', 'Aucune leçon pour l\'instant.'));
            return;
        }
        lecons.forEach(function (l) {
            var li = liste.appendChild(el('li'));
            var quoi = li.appendChild(el('div', 'quoi'));
            quoi.appendChild(el('strong', '', l.titre));
            var date = new Date(l.modifie_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
            quoi.appendChild(el('span', 'muet', nomMatiere(l.matiere) + ' · ' + date + ' '));
            var complete = window.KarniellaLeconsSaisies.leconComplete(l.id);
            if (!l.visible) { quoi.appendChild(el('span', 'pastille', 'Cachée')); }
            if (complete) { quoi.appendChild(el('span', 'pastille', '✅ Leçon complète')); }

            if (l.visible || complete) {
                var voir = li.appendChild(el('a', 'bouton discret', 'Voir'));
                voir.href = complete ? '5e/' + complete + '.html' : '5e/lecon.html?id=' + encodeURIComponent(l.id);
            }
            li.appendChild(el('button', 'discret', 'Modifier')).addEventListener('click', function () { modifier(l); });
            li.appendChild(el('button', 'danger', 'Supprimer')).addEventListener('click', function () { supprimer(l); });
        });
    }

    /* ============================================================
       Branchements
       ============================================================ */

    $('form-connexion').addEventListener('submit', function (e) {
        e.preventDefault();
        connecter($('mdp').value);
    });
    $('deconnexion').addEventListener('click', function () {
        ecrire('sessionStorage', CLE_MDP, null);
        window.location.reload();
    });
    $('form-lecon').addEventListener('submit', enregistrer);
    $('form-lecon').addEventListener('input', garderBrouillon);
    $('form-lecon').addEventListener('change', garderBrouillon);
    $('annuler').addEventListener('click', function () { $('message').hidden = true; nouvelle(); });

    nouvelle();
    var memo = motDePasse();
    if (memo) { connecter(memo); }
})();
