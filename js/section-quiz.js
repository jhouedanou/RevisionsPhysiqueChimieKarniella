/**
 * Section Quiz Component
 * Interactive mini-quiz system for learning sections
 * Designed for Révisions Karniella
 */

/**
 * ` lang="en"` si la question en déclare une, rien sinon.
 *
 * Le quiz d'une leçon d'anglais est bilingue : des questions anglaises
 * (« Where do students go to grow vegetables? ») voisinent avec des questions
 * françaises sur la grammaire, qui ont parfois des propositions anglaises.
 * Sans ces attributs, la lecture vocale prononce les unes avec la voix des
 * autres — c'est la langue de l'onglet qui décidait pour tout le monde.
 *
 * La valeur vient d'un fichier de données interpolé dans une template string :
 * on la valide plutôt que de lui faire confiance.
 */
function attributLangue(code) {
    if (typeof code !== 'string' || !/^[a-z]{2}(-[A-Za-z]{2,8})?$/.test(code)) { return ''; }
    return ` lang="${code}"`;
}

/** Le slug de la page, pour la progression et les XP. */
function slugDePage() {
    return window.location.pathname.split('/').pop().replace(/\.html$/, '');
}

function echapperHTML(texte) {
    return String(texte === undefined || texte === null ? '' : texte)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ============================================================
   Les types de question
   ============================================================
   Sans `type`, une question est un QCM : `options` et `correctAnswer`.
   Les interros (js/interro.js) ajoutent trois types :
     vrai-faux : un QCM à deux options, « Vrai » et « Faux » (touches V et F) ;
     saisie    : Karniella tape une réponse courte, corrigée toute seule
                 (`reponse`, `accepte`, `exact`) ;
     cours     : elle écrit sa réponse, voit celle du cours (`reponse`),
                 puis dit elle-même si elle l'avait.
   Pour les deux derniers, `choix[i]` est le texte tapé, pas un indice. */

function typeQuestion(q) {
    return q && (q.type === 'saisie' || q.type === 'cours' || q.type === 'vrai-faux') ? q.type : 'qcm';
}

function avecOptions(q) {
    const type = typeQuestion(q);
    return type === 'qcm' || type === 'vrai-faux';
}

/** Les lettres des options : V et F pour un vrai ou faux, A à F sinon. */
function lettresDe(q) {
    return typeQuestion(q) === 'vrai-faux' ? 'VF' : QUIZ_LETTRES;
}

/** La réponse donnée, prête à afficher. Ce qui a été tapé est échappé. */
function texteReponse(q, choix) {
    if (avecOptions(q)) { return q.options[choix]; }
    const tape = String(choix || '').trim();
    if (typeQuestion(q) === 'cours' && !tape) { return undefined; }
    return echapperHTML(tape);
}

function texteBonne(q) {
    return avecOptions(q) ? q.options[q.correctAnswer] : q.reponse;
}

/** La même réponse en texte brut, pour le suivi (js/suivi.js). */
function texteBrut(html) {
    return html === undefined ? null : String(html).replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

/**
 * Une réponse tapée, réduite à l'essentiel : sans majuscules, accents,
 * ponctuation, espaces ni article du début. « La somme. » et « somme »
 * deviennent pareils, comme « 1,5 V » et « 1.5v ».
 */
function normaliserReponse(texte) {
    let t = String(texte || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    t = t.replace(/[’‘`´]/g, "'").replace(/[−–—]/g, '-').replace(/œ/g, 'oe').replace(/æ/g, 'ae');
    t = t.replace(/(\d)\s*[,.]\s*(\d)/g, '$1#$2');          // virgule décimale = point
    t = t.replace(/[«»"“”!?;:,.()[\]…/]/g, ' ').replace(/#/g, '.');
    t = t.replace(/([a-z])-(?=[a-z])/g, '$1');               // grand-mère = grand mère
    t = t.replace(/\s+/g, ' ').trim();
    t = t.replace(/^(l'|le |la |les |un |une |des |du |de la |de l'|the |a |an )/, '');
    return t.replace(/[\s']/g, '');
}

/**
 * Nombre de fautes pour passer d'un mot à l'autre : une lettre en trop, en
 * moins, changée, ou deux lettres inversées (« additoin »).
 */
function distanceMots(a, b) {
    if (Math.abs(a.length - b.length) > 1) { return 2; }
    let avantAvant = null;
    let avant = Array.from({ length: b.length + 1 }, (v, j) => j);
    for (let i = 1; i <= a.length; i++) {
        const ligne = [i];
        for (let j = 1; j <= b.length; j++) {
            ligne[j] = Math.min(avant[j] + 1, ligne[j - 1] + 1, avant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
            if (avantAvant && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
                ligne[j] = Math.min(ligne[j], avantAvant[j - 2] + 1);
            }
        }
        avantAvant = avant;
        avant = ligne;
    }
    return avant[b.length];
}

/**
 * Corrige une réponse tapée. `reponse` et chaque `accepte` sont justes ;
 * une faute de frappe passe (`tolere`) si la réponse attendue fait au moins
 * 6 lettres sans chiffre, sauf `exact` : là, l'orthographe est évaluée.
 */
function corrigerSaisie(q, texte) {
    const donnee = normaliserReponse(texte);
    const attendues = [q.reponse].concat(q.accepte || []).map(normaliserReponse).filter(Boolean);
    if (!donnee) { return { juste: false, tolere: false }; }
    if (attendues.indexOf(donnee) !== -1) { return { juste: true, tolere: false }; }
    const proche = !q.exact && attendues.some((a) => a.length >= 6 && !/\d/.test(a) && distanceMots(donnee, a) <= 1);
    return { juste: proche, tolere: proche };
}

/**
 * Le récapitulatif de fin de quiz : chaque question avec la réponse donnée.
 * Pour une erreur, il redonne la bonne réponse et l'explication : Karniella
 * revoit ce qu'elle a raté sans refaire tout le quiz.
 *
 * `choix[i]` est l'indice de l'option choisie à la question i (le texte tapé
 * pour une saisie ou une question de cours). `reglages.reponses[i]` dit si
 * elle était juste ; sans lui, on compare `choix[i]` à `correctAnswer`. Les
 * énoncés et les options sont insérés tels quels, comme dans le reste du
 * quiz : ils viennent de nos fichiers de données et peuvent contenir du HTML.
 */
function recapitulatifHTML(questions, choix, reglages) {
    const avecTitre = !(reglages && reglages.titre === false);
    const notes = reglages && reglages.reponses;
    const estJuste = (q, i) => (notes ? Boolean(notes[i]) : choix[i] === q.correctAnswer);
    const erreurs = questions.filter((q, i) => !estJuste(q, i)).length;
    const bilan = erreurs === 0
        ? 'Aucune erreur : tout est juste !'
        : `${erreurs} erreur${erreurs > 1 ? 's' : ''} à revoir : ${erreurs > 1 ? 'elles sont marquées' : 'elle est marquée'} ✗.`;

    const lignes = questions.map((q, i) => {
        const juste = estJuste(q, i);
        const langEnonce = attributLangue(q.langue);
        const langOptions = attributLangue(q.optionsLangue || q.langue);
        const donnee = texteReponse(q, choix[i]);
        const cours = typeQuestion(q) === 'cours';
        const correction = juste && !cours ? '' : `
                    <p>${cours ? 'Réponse du cours' : 'Bonne réponse'} : <strong${langOptions}>${texteBonne(q)}</strong></p>
                    ${q.explanation && !juste ? `<p class="quiz-recap-explication">${q.explanation}</p>` : ''}`;
        return `
            <li class="quiz-recap-ligne ${juste ? 'juste' : 'faux'}">
                <span class="quiz-recap-marque" role="img" aria-label="${juste ? 'Juste' : 'Faux'}">${quizIcone(juste ? 'coche' : 'croix', 16) || (juste ? '✓' : '✗')}</span>
                <div>
                    <p class="quiz-recap-question"${langEnonce}><strong>${i + 1}.</strong> ${q.question}</p>
                    <p>Ta réponse : ${donnee === undefined || donnee === '' ? `<em>${cours ? 'dans ta tête' : 'pas de réponse'}</em>` : `<strong${langOptions}>${donnee}</strong>`}${cours ? ` <em>(${juste ? 'tu l’avais' : 'pas encore'})</em>` : ''}</p>${correction}
                </div>
            </li>`;
    }).join('');

    return `
        <div class="quiz-recap">
            ${avecTitre ? '<h5 class="quiz-recap-titre">Récapitulatif du quiz</h5>' : ''}
            <p class="quiz-recap-bilan">${bilan}</p>
            <ol class="quiz-recap-liste" role="list">${lignes}</ol>
        </div>`;
}

class SectionQuiz {
    /**
     * @param {string} containerId
     * @param {Array} questions
     * @param {Object} [options]
     *   etapes  : true pour le quiz « une question à la fois » (Valider, chrono, XP, fantôme, révision)
     *   slug    : identifiant pour la progression (par défaut, la page)
     *   titre   : titre affiché en haut
     *   finir   : fonction appelée avec { correct, total, temps, xp } à la fin
     */
    constructor(containerId, questions, options) {
        this.container = document.getElementById(containerId);
        this.questions = questions;
        this.options = options || {};
        this.slug = this.options.slug || slugDePage();
        this.currentAnswers = {};
        if (this.options.etapes) { this.rendreEtapes(); } else { this.render(); }
    }

    render() {
        if (!this.container) {
            console.error('Container not found for section quiz');
            return;
        }

        const quizHTML = `
            <div class="section-quiz-wrapper">
                <div class="section-quiz-header">
                    <h4>🎯 Vérifie ta compréhension</h4>
                    <p>Réponds à ces questions pour consolider tes connaissances</p>
                </div>
                <div class="section-quiz-questions">
                    ${this.questions.map((q, index) => this.renderQuestion(q, index)).join('')}
                </div>
                <button class="section-quiz-check-all" onclick="sectionQuizInstances['${this.container.id}'].checkAllAnswers()">
                    ✓ Vérifier mes réponses
                </button>
                <div class="section-quiz-score" id="${this.container.id}-score" style="display: none;">
                    <p></p>
                </div>
                <div id="${this.container.id}-recap"></div>
            </div>
        `;

        this.container.innerHTML = quizHTML;

        // Les questions viennent d'être créées : la lecture vocale doit pouvoir
        // y accrocher ses boutons. Le module est facultatif.
        if (window.LectureVocale) {
            window.LectureVocale.equiper(this.container);
        }
    }

    renderQuestion(question, index) {
        const qId = `${this.container.id}-q${index}`;
        // La langue est portée par l'énoncé et par les propositions, pas par
        // l'onglet : `optionsLangue` existe parce qu'une question française
        // peut proposer des phrases anglaises à départager.
        const langEnonce = attributLangue(question.langue);
        const langOptions = attributLangue(question.optionsLangue || question.langue);
        return `
            <div class="section-quiz-question" id="${qId}">
                <p class="question-text"${langEnonce}><strong data-lire-ignore>${index + 1}.</strong> ${question.question}</p>
                <div class="question-options">
                    ${question.options.map((option, optIndex) => `
                        <label class="option-label">
                            <input
                                type="radio"
                                name="${qId}"
                                value="${optIndex}"
                                onchange="sectionQuizInstances['${this.container.id}'].clearFeedback('${qId}')"
                            >
                            <span${langOptions}>${option}</span>
                        </label>
                    `).join('')}
                </div>
                <div class="question-feedback" id="${qId}-feedback"></div>
            </div>
        `;
    }

    clearFeedback(questionId) {
        const feedback = document.getElementById(`${questionId}-feedback`);
        if (feedback) {
            feedback.innerHTML = '';
            feedback.className = 'question-feedback';
        }
    }

    checkAllAnswers() {
        let correct = 0;
        let total = this.questions.length;
        let allAnswered = true;
        const details = [];   // pour le suivi de tonton (js/suivi.js)
        const choix = [];     // pour le récapitulatif

        this.questions.forEach((question, index) => {
            const qId = `${this.container.id}-q${index}`;
            const selected = document.querySelector(`input[name="${qId}"]:checked`);
            const feedback = document.getElementById(`${qId}-feedback`);

            if (!selected) {
                allAnswered = false;
                feedback.className = 'question-feedback feedback-warning';
                feedback.innerHTML = '⚠️ Sélectionne une réponse';
                return;
            }

            const selectedValue = parseInt(selected.value);
            const isCorrect = selectedValue === question.correctAnswer;
            choix[index] = selectedValue;
            details.push({ q: question.question, r: question.options[selectedValue], b: question.options[question.correctAnswer], ok: isCorrect });

            if (isCorrect) {
                correct++;
                feedback.className = 'question-feedback feedback-correct';
                feedback.innerHTML = `✓ <strong>Correct !</strong> ${question.explanation || ''}`;
            } else {
                feedback.className = 'question-feedback feedback-incorrect';
                const correctOption = question.options[question.correctAnswer];
                feedback.innerHTML = `✗ <strong>Incorrect.</strong> La bonne réponse est : <strong>${correctOption}</strong><br>${question.explanation || ''}`;
            }
        });

        if (!allAnswered) {
            return;
        }

        // Show score
        const scoreDiv = document.getElementById(`${this.container.id}-score`);
        const percentage = Math.round((correct / total) * 100);
        let emoji = '👏';
        let message = 'Très bien !';

        if (percentage === 100) {
            emoji = '🎉';
            message = 'Parfait !';
        } else if (percentage >= 66) {
            emoji = '👍';
            message = 'Bien joué !';
        } else if (percentage >= 33) {
            emoji = '💪';
            message = 'Continue tes efforts !';
        } else {
            emoji = '📚';
            message = 'Relis la leçon !';
        }

        scoreDiv.style.display = 'block';
        scoreDiv.innerHTML = `
            <p>${emoji} <strong>${message}</strong> - Score : ${correct}/${total} (${percentage}%)</p>
        `;
        document.getElementById(`${this.container.id}-recap`).innerHTML = recapitulatifHTML(this.questions, choix);

        // 🎉 à partir de 80 % (js/badges.js, chargé par le chat).
        if (percentage >= 80 && window.KarniellaFete) { window.KarniellaFete(); }

        // Alimente le suivi des progrès, partagé avec le chat. Le module est
        // chargé par chat-assistant.js : on ne suppose pas sa présence.
        if (window.KarniellaProgression) {
            window.KarniellaProgression.enregistrerQuiz(this.slug, correct, total, null, { details: details });
        }
        if (window.KarniellaXP) { window.KarniellaXP.gagnerQuiz(correct, total, this.slug); }
    }

    /* ============================================================
       Mode étapes : une question à la fois, comme expertenergie
       ============================================================
       Choisir une réponse (clic, ou touches A à D), puis « Valider » (ou
       Entrée). Aya réagit, les pastilles suivent l'avancement, et la fin
       donne un niveau, des étoiles et les XP gagnés. Les erreurs sont
       gardées pour « Réviser mes erreurs ». Un quiz commencé reprend où il
       s'était arrêté si la page est rechargée.

       `this.questions` reste la liste complète : la fiche à imprimer
       (js/lecon-5e.js) la lit. Les questions jouées sont dans `this.serie`
       (leurs numéros), qui n'en garde que les erreurs pendant une révision. */

    rendreEtapes() {
        if (!this.container) { console.error('Container not found for section quiz'); return; }
        const P = window.KarniellaProgression;
        this.record = P ? P.record(this.slug) : null;
        window.clearInterval(this.tic);
        if (this.guetteur) { this.guetteur.disconnect(); }
        this.debut = null;
        this.fantomeActif = false;
        this.revision = false;
        this.serie = this.questions.map((q, i) => i);
        this.remettreAZero();

        this.container.innerHTML = `
            <div class="section-quiz-wrapper quiz-etapes">
                <div class="quiz-etapes-haut">
                    <h4>${quizIcone('cible', 22)}<span>${echapperHTML(this.options.titre || 'Le quiz')}</span></h4>
                    <div class="quiz-outils">
                        <span class="chip quiz-chrono" title="Temps écoulé">${quizIcone('horloge', 16)}<span class="quiz-chrono-n">0:00</span></span>
                    </div>
                </div>
                <div class="pastilles quiz-points" role="progressbar" aria-valuemin="0" aria-label="Avancement du quiz"></div>
                <div class="quiz-fantome" hidden></div>
                <div class="quiz-scene"></div>
            </div>`;
        this.elPoints = this.container.querySelector('.quiz-points');
        this.elChrono = this.container.querySelector('.quiz-chrono-n');
        this.elFantome = this.container.querySelector('.quiz-fantome');
        this.elScene = this.container.querySelector('.quiz-scene');
        this.elOutils = this.container.querySelector('.quiz-outils');
        this.boutonSon = null;
        this.poserBoutonSon();
        this.poserPastilles();

        if (!this.clavierBranche) {
            this.clavierBranche = true;
            document.addEventListener('keydown', (e) => this.clavier(e));
        }

        // `reprise: false` : pas de reprise après un rechargement (une interro est
        // tirée au hasard, les mêmes numéros ne seraient plus les mêmes questions).
        // `accueil: false` : on part tout de suite, sans l'écran de départ.
        const enCours = this.options.reprise === false ? null : lireEnCours(this.slug, this.questions.length);
        if (this.options.accueil !== false && (enCours || this.record || this.revisables().length)) {
            this.rendreAccueil(enCours);
        } else {
            this.lancer({});
        }
    }

    remettreAZero() {
        this.index = 0;
        this.correct = 0;
        this.suite = 0;
        this.meilleureSuite = 0;
        this.reponses = [];
        this.choix = [];
        this.details = [];
        this.selection = null;
        this.valide = false;
        this.dejaPasse = 0;
    }

    /** Le bouton « son » (js/jeu.js arrive parfois après le quiz). */
    poserBoutonSon() {
        const J = window.KarniellaJeu;
        if (this.boutonSon || !J || !this.elOutils) { return; }
        this.boutonSon = J.sons.bouton('btn btn-ghost btn-icone btn-petit quiz-son');
        this.elOutils.appendChild(this.boutonSon);
    }

    poserPastilles() {
        this.elPoints.hidden = false;
        this.elPoints.textContent = '';
        this.serie.forEach(() => this.elPoints.appendChild(document.createElement('i')));
        this.elPoints.setAttribute('aria-valuemax', String(this.serie.length));
        this.majPastilles();
    }

    majPastilles() {
        this.elPoints.setAttribute('aria-valuenow', String(this.index + (this.valide ? 1 : 0)));
        Array.prototype.forEach.call(this.elPoints.children, (i, k) => {
            const fait = k < this.index || (k === this.index && this.valide);
            i.className = fait ? (this.reponses[k] ? 'juste' : 'faux') : (k === this.index ? 'actif' : '');
        });
    }

    /** Les numéros des questions ratées au dernier quiz (js/progression.js). */
    revisables() {
        const P = window.KarniellaProgression;
        if (!P || !P.erreurs) { return []; }
        const ratees = P.erreurs(this.slug);
        if (!ratees.length) { return []; }
        const liste = [];
        this.questions.forEach((q, i) => {
            if (ratees.indexOf(String(q.question).slice(0, 300)) !== -1) { liste.push(i); }
        });
        return liste;
    }

    /** Avant le départ : reprendre, battre son fantôme, ou réviser ses erreurs. */
    rendreAccueil(enCours) {
        const J = window.KarniellaJeu;
        const r = this.record;
        const n = this.questions.length;
        const erreurs = this.revisables();

        let boutons = '';
        if (enCours) {
            boutons += `<button type="button" class="btn" data-depart="reprendre">${quizIcone('suivant', 20)}Reprendre à la question ${enCours.index + 1}</button>
                <button type="button" class="btn btn-ghost" data-depart="normal">${quizIcone('rejouer', 20)}Recommencer</button>`;
        } else if (r && typeof r.temps === 'number') {
            boutons += `<button type="button" class="btn" data-depart="fantome">${quizIcone('fantome', 20)}Battre mon fantôme</button>
                <button type="button" class="btn btn-ghost" data-depart="normal">Refaire tranquillement</button>`;
        } else {
            boutons += `<button type="button" class="btn" data-depart="normal">Commencer</button>`;
        }
        if (erreurs.length) {
            boutons += `<button type="button" class="btn btn-energie" data-depart="revision">${quizIcone('rejouer', 20)}Réviser mes ${erreurs.length} erreur${erreurs.length > 1 ? 's' : ''}</button>`;
        }

        this.elScene.innerHTML = `
            <div class="quiz-depart">
                <div class="quiz-depart-guide"></div>
                ${r ? `<p class="quiz-depart-record">Ton record : <strong>${r.correct}/${r.total}</strong>${typeof r.temps === 'number' ? ` en <strong>${formaterTemps(r.temps)}</strong>` : ''}</p>
                <div class="quiz-depart-niveau"></div>` : ''}
                <div class="quiz-depart-boutons">${boutons}</div>
            </div>`;

        const texte = enCours
            ? `Tu t'étais arrêtée à la question ${enCours.index + 1} sur ${enCours.serie.length}.`
            : (this.options.consigne || `${n} questions. Choisis une réponse, puis valide.`);
        const zoneGuide = this.elScene.querySelector('.quiz-depart-guide');
        if (J) {
            zoneGuide.appendChild(J.guide({ pose: 'wave', taille: 92, titre: enCours ? 'On reprend ?' : 'Prête pour le quiz ?', texte: texte }).el);
        } else {
            zoneGuide.innerHTML = `<p><strong>${enCours ? 'On reprend ?' : 'Prête pour le quiz ?'}</strong> ${texte}</p>`;
        }
        const zoneNiveau = this.elScene.querySelector('.quiz-depart-niveau');
        if (zoneNiveau && J && r) {
            const niv = J.niveau(r.correct, r.total);
            zoneNiveau.appendChild(J.pastilleNiveau(niv));
            zoneNiveau.appendChild(J.etoiles(niv.etoiles));
        }

        this.elScene.querySelectorAll('[data-depart]').forEach((b) => {
            b.addEventListener('click', () => {
                const quoi = b.getAttribute('data-depart');
                if (quoi === 'reprendre') { this.lancer({ reprise: enCours }); }
                else if (quoi === 'revision') { this.lancer({ revision: erreurs }); }
                else {
                    effacerEnCours(this.slug);
                    this.lancer({ fantome: quoi === 'fantome' });
                }
            });
        });
    }

    /**
     * Lance le quiz. mode.fantome : course contre le record ; mode.revision :
     * les numéros des questions à revoir ; mode.reprise : le quiz sauvegardé.
     */
    lancer(mode) {
        this.remettreAZero();
        this.revision = Boolean(mode.revision || (mode.reprise && mode.reprise.revision));
        this.fantomeActif = Boolean(mode.fantome && this.record && typeof this.record.temps === 'number');
        this.serie = this.questions.map((q, i) => i);
        if (mode.revision) { this.serie = mode.revision.slice(); }

        const s = mode.reprise;
        if (s) {
            this.serie = s.serie.slice();
            this.index = s.index;
            this.reponses = s.reponses.slice();
            this.choix = s.choix.slice();
            this.dejaPasse = s.temps || 0;
            this.reponses.forEach((juste, k) => {
                const q = this.questions[this.serie[k]];
                if (juste) { this.correct++; }
                this.suite = juste ? this.suite + 1 : 0;
                this.meilleureSuite = Math.max(this.meilleureSuite, this.suite);
                this.details[k] = this.detail(q, this.choix[k], juste);
            });
        }

        this.elFantome.hidden = !this.fantomeActif;
        this.elFantome.textContent = '';
        if (this.fantomeActif) {
            this.elFantome.innerHTML = `
                <div class="quiz-fantome-ligne"><span>${quizIcone('fantome', 18)} Fantôme : ${this.record.correct}/${this.record.total} en ${formaterTemps(this.record.temps)}</span><span class="quiz-fantome-toi">Toi : 0/${this.serie.length}</span></div>
                <div class="quiz-piste"><i class="quiz-piste-lui"></i><i class="quiz-piste-toi"></i><span class="quiz-piste-marque" aria-hidden="true">${quizIcone('fantome', 18)}</span></div>`;
        }
        this.poserPastilles();
        this.rendreQuestion();
        if (mode.fantome || mode.revision || mode.reprise) { this.remonter(); }

        // Le quiz est construit au chargement de la page, souvent dans un onglet
        // encore caché : le chrono ne part que quand il arrive à l'écran. Sinon
        // tout le temps de lecture de la leçon comptait dans le premier record
        // du fantôme et dans la durée envoyée au suivi.
        this.debut = null;
        window.clearInterval(this.tic);
        const partir = () => {
            if (this.debut) { return; }
            this.debut = Date.now();
            this.tic = window.setInterval(() => this.majChrono(), 250);
            this.majChrono();
        };
        this.majChrono();
        if (!this.container || !('IntersectionObserver' in window)) { partir(); return; }
        if (this.guetteur) { this.guetteur.disconnect(); }
        this.guetteur = new window.IntersectionObserver((entrees) => {
            if (entrees.some((e) => e.isIntersecting)) {
                this.guetteur.disconnect();
                partir();
            }
        });
        this.guetteur.observe(this.container);
    }

    secondes() {
        return this.dejaPasse + (this.debut ? (Date.now() - this.debut) / 1000 : 0);
    }

    majChrono() {
        const s = this.secondes();
        if (this.elChrono) { this.elChrono.textContent = formaterTemps(s); }
        if (this.fantomeActif && this.record) {
            const lui = this.elFantome.querySelector('.quiz-piste-lui');
            const marque = this.elFantome.querySelector('.quiz-piste-marque');
            const part = Math.min(1, s / Math.max(1, this.record.temps));
            if (lui) { lui.style.width = (part * 100) + '%'; }
            if (marque) { marque.style.left = (part * 100) + '%'; }
        }
    }

    majPiste() {
        const toi = this.elFantome && this.elFantome.querySelector('.quiz-piste-toi');
        const texte = this.elFantome && this.elFantome.querySelector('.quiz-fantome-toi');
        if (toi) { toi.style.width = (this.index / this.serie.length * 100) + '%'; }
        if (texte) { texte.textContent = 'Toi : ' + this.index + '/' + this.serie.length; }
    }

    questionCourante() {
        return this.questions[this.serie[this.index]];
    }

    rendreQuestion() {
        const q = this.questionCourante();
        const type = typeQuestion(q);
        const n = this.index + 1;
        const total = this.serie.length;
        const langEnonce = attributLangue(q.langue);
        const langOptions = attributLangue(q.optionsLangue || q.langue);
        const id = `${this.container.id}-e${this.index}`;
        const etiquette = { 'vrai-faux': 'Vrai ou faux ?', saisie: 'Question de cours', cours: 'Question de cours' }[type];
        this.selection = null;
        this.valide = false;
        this.revele = false;
        this.poserBoutonSon();
        this.majPastilles();

        let reponse;
        let bouton = '<button type="button" class="btn quiz-valider" disabled>Valider</button>';
        let aide;
        if (type === 'saisie') {
            reponse = `
                <label class="quiz-champ-etiquette" for="${id}-champ">Ta réponse</label>
                <input type="text" class="quiz-champ" id="${id}-champ" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done"${attributLangue(q.reponseLangue)}>`;
            aide = 'Écris ta réponse, puis Entrée pour valider.';
        } else if (type === 'cours') {
            reponse = `
                <label class="quiz-champ-etiquette" for="${id}-champ">Écris ta réponse (ou dis-la dans ta tête), puis regarde celle du cours.</label>
                <textarea class="quiz-champ" id="${id}-champ" rows="3" spellcheck="false"${attributLangue(q.reponseLangue)}></textarea>`;
            bouton = '<button type="button" class="btn quiz-valider">Voir la réponse</button>';
            aide = 'Sois honnête : c’est toi qui dis si tu l’avais.';
        } else {
            const lettres = lettresDe(q);
            reponse = `
                <div class="quiz-options" role="radiogroup" aria-labelledby="${id}-enonce">
                    ${q.options.map((o, i) => `
                        <label class="quiz-option" data-index="${i}">
                            <input type="radio" class="quiz-radio" name="${id}" value="${i}">
                            <b class="quiz-lettre" data-lire-ignore aria-hidden="true">${lettres[i] || i + 1}</b><span${langOptions}>${o}</span>
                        </label>`).join('')}
                </div>`;
            aide = type === 'vrai-faux'
                ? 'Touche V ou F pour choisir, Entrée pour valider.'
                : `Touches A à ${lettres[q.options.length - 1] || 'D'} pour choisir, Entrée pour valider.`;
        }

        this.elScene.innerHTML = `
            <div class="quiz-question quiz-type-${type}">
                <span class="quiz-compte">${this.revision ? 'Révision · ' : ''}Question ${n} sur ${total}${etiquette ? ` · ${etiquette}` : ''}</span>
                <p class="question-text" id="${id}-enonce"${langEnonce}>${q.question}</p>
                ${reponse}
                <div class="quiz-actions">
                    ${bouton}
                    <p class="quiz-aide-clavier">${aide}</p>
                </div>
                <div class="quiz-retour-zone" aria-live="polite"></div>
            </div>`;

        this.elScene.querySelectorAll('.quiz-radio').forEach((r) => {
            r.addEventListener('change', () => this.choisir(parseInt(r.value, 10), false));
        });
        const champ = this.elScene.querySelector('.quiz-champ');
        if (champ) {
            champ.addEventListener('input', () => {
                this.selection = champ.value.trim() || null;
                if (type === 'saisie') { this.elScene.querySelector('.quiz-valider').disabled = !this.selection; }
            });
        }
        this.elScene.querySelector('.quiz-valider').addEventListener('click', () => this.action());

        if (window.LectureVocale) { window.LectureVocale.equiper(this.elScene); }
        const premier = this.elScene.querySelector('.quiz-radio, .quiz-champ');
        if (premier && this.index > 0) { premier.focus({ preventScroll: true }); }
    }

    /** Une réponse choisie, pas encore validée. */
    choisir(i, auClavier) {
        if (this.valide || !avecOptions(this.questionCourante())) { return; }
        const radios = this.elScene.querySelectorAll('.quiz-radio');
        if (!radios[i]) { return; }
        if (this.selection !== i && window.KarniellaJeu) { window.KarniellaJeu.sons.jouer('choix'); }
        this.selection = i;
        radios[i].checked = true;
        if (auClavier) { radios[i].focus({ preventScroll: true }); }
        this.elScene.querySelectorAll('.quiz-option').forEach((l, k) => l.classList.toggle('choisie', k === i));
        this.elScene.querySelector('.quiz-valider').disabled = false;
    }

    /**
     * Le bouton du bas : « Valider », puis « Question suivante ». Pour une
     * question de cours : « Voir la réponse », puis Karniella se note.
     */
    action() {
        if (this.valide) { this.suivant(); return; }
        if (typeQuestion(this.questionCourante()) === 'cours') { this.reveler(); return; }
        this.valider();
    }

    /** Question de cours : montre la réponse du cours et les deux boutons pour se noter. */
    reveler() {
        if (this.revele || this.valide) { return; }
        const q = this.questionCourante();
        this.revele = true;
        const champ = this.elScene.querySelector('.quiz-champ');
        if (champ) { champ.readOnly = true; }
        this.elScene.querySelector('.quiz-actions').hidden = true;
        const zone = this.elScene.querySelector('.quiz-retour-zone');
        zone.innerHTML = `
            <div class="quiz-cours">
                <p class="quiz-cours-titre">Réponse du cours</p>
                <p class="quiz-cours-texte"${attributLangue(q.reponseLangue)}>${q.reponse}</p>
                <p class="quiz-cours-question">Tu l’avais ?</p>
                <div class="quiz-cours-boutons">
                    <button type="button" class="btn quiz-avais" data-note="1">${quizIcone('coche', 20)}Oui, je l’avais</button>
                    <button type="button" class="btn btn-ghost quiz-avais" data-note="0">${quizIcone('croix', 20)}Pas encore</button>
                </div>
            </div>`;
        zone.querySelectorAll('.quiz-avais').forEach((b) => {
            b.addEventListener('click', () => this.valider(b.getAttribute('data-note') === '1'));
        });
        const oui = zone.querySelector('.quiz-avais');
        if (oui) { oui.focus({ preventScroll: true }); }
        this.montrerBas(zone);
    }

    /**
     * Touches A à D (ou 1 à 4) pour choisir, V ou F pour un vrai ou faux,
     * Entrée pour valider puis passer à la suite. Seulement quand le quiz est
     * à l'écran et que Karniella n'écrit pas ailleurs (le chat, la recherche).
     */
    clavier(e) {
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) { return; }
        if (!this.elScene || !this.elScene.isConnected || !this.elScene.offsetParent) { return; }
        if (!this.elScene.querySelector('.quiz-question')) { return; }
        const cible = e.target;
        if (cible !== document.body && !this.container.contains(cible)) { return; }
        if (cible.tagName === 'TEXTAREA') { return; }   // Entrée y va à la ligne
        const q = this.questionCourante();
        if (e.key === 'Enter') {
            // Sur un bouton, le navigateur fait déjà le clic.
            if (cible.closest && cible.closest('button, a, summary')) { return; }
            if (!this.valide && this.selection === null) { return; }
            e.preventDefault();
            this.action();
            return;
        }
        if (this.valide || !avecOptions(q) || !e.key || e.key.length !== 1) { return; }
        let i = lettresDe(q).indexOf(e.key.toUpperCase());
        if (i === -1 && /^[1-6]$/.test(e.key)) { i = parseInt(e.key, 10) - 1; }
        if (i < 0 || i >= q.options.length) { return; }
        e.preventDefault();
        this.choisir(i, true);
    }

    /** Une ligne pour le suivi de tonton (js/suivi.js). */
    detail(q, choix, juste) {
        return { q: q.question, r: texteBrut(texteReponse(q, choix)), b: texteBrut(texteBonne(q)), ok: juste };
    }

    /**
     * Valide la réponse. `note` : pour une question de cours, ce que
     * Karniella a dit (true : « je l'avais »).
     */
    valider(note) {
        if (this.valide) { return; }
        const J = window.KarniellaJeu;
        const q = this.questionCourante();
        const type = typeQuestion(q);
        let choix = this.selection;
        let juste;
        let tolere = false;
        if (type === 'saisie') {
            if (!choix) { return; }
            const c = corrigerSaisie(q, choix);
            juste = c.juste;
            tolere = c.tolere;
        } else if (type === 'cours') {
            if (typeof note !== 'boolean') { return; }
            choix = choix || '';
            juste = note;
        } else {
            if (choix === null) { return; }
            juste = choix === q.correctAnswer;
        }
        this.valide = true;

        const lettres = lettresDe(q);
        if (avecOptions(q)) {
            this.elScene.querySelectorAll('.quiz-option').forEach((l, i) => {
                l.querySelector('.quiz-radio').disabled = true;
                const lettre = l.querySelector('.quiz-lettre');
                if (i === q.correctAnswer) { l.classList.add('juste'); lettre.innerHTML = quizIcone('coche', 20) || '✓'; }
                else if (i === choix) { l.classList.add('faux'); lettre.innerHTML = quizIcone('croix', 20) || '✗'; }
                else { l.classList.add('grisee'); }
            });
        } else {
            const champ = this.elScene.querySelector('.quiz-champ');
            if (champ) {
                champ.readOnly = true;
                if (type === 'saisie') { champ.classList.add(juste ? 'juste' : 'faux'); }
            }
        }

        if (juste) { this.correct++; }
        this.suite = juste ? this.suite + 1 : 0;
        this.meilleureSuite = Math.max(this.meilleureSuite, this.suite);
        this.reponses[this.index] = juste;
        this.choix[this.index] = choix;
        this.details[this.index] = this.detail(q, choix, juste);
        if (J) { J.sons.jouer(juste ? 'juste' : 'faux'); }
        this.majPastilles();
        if (this.options.reprise !== false) {
            ecrireEnCours(this.slug, {
                n: this.questions.length,
                serie: this.serie,
                index: this.index + 1,
                reponses: this.reponses,
                choix: this.choix,
                revision: this.revision,
                temps: Math.round(this.secondes())
            });
        }

        // La réaction d'Aya, la bonne réponse et l'explication.
        const langOptions = attributLangue(q.optionsLangue || q.langue);
        const langReponse = attributLangue(q.reponseLangue);
        const titre = juste
            ? (this.suite >= 3 ? `${this.suite} bonnes réponses de suite !` : quizAuHasard(QUIZ_REACTIONS_JUSTE))
            : quizAuHasard(type === 'cours' ? QUIZ_REACTIONS_COURS : QUIZ_REACTIONS_FAUX);
        let correction = '';
        if (avecOptions(q)) {
            if (!juste) { correction = `<p>Bonne réponse : <b>${lettres[q.correctAnswer]}.</b> <span${langOptions}>${q.options[q.correctAnswer]}</span></p>`; }
        } else if (type === 'saisie') {
            if (!juste) { correction = `<p>Réponse attendue : <b${langReponse}>${q.reponse}</b></p>`; }
            else if (tolere) { correction = `<p>Attention à l’orthographe : <b${langReponse}>${q.reponse}</b></p>`; }
        } else {
            correction = `<p>Réponse du cours : <span${langReponse}>${q.reponse}</span></p>`;
        }
        const zone = this.elScene.querySelector('.quiz-retour-zone');
        zone.innerHTML = `
            <div class="quiz-retour ${juste ? 'juste' : 'faux'}">
                ${J ? `<div class="quiz-retour-aya" aria-hidden="true">${J.dessin(juste ? 'cheer' : 'think', 64)}</div>` : ''}
                <div class="quiz-retour-texte">
                    <strong class="quiz-retour-titre">${titre}</strong>
                    ${correction}
                    ${q.explanation ? `<p class="quiz-explication">${q.explanation}</p>` : ''}
                </div>
            </div>`;

        const actions = this.elScene.querySelector('.quiz-actions');
        actions.hidden = false;
        const bouton = this.elScene.querySelector('.quiz-valider');
        const dernier = this.index + 1 >= this.serie.length;
        bouton.disabled = false;
        bouton.innerHTML = (dernier ? 'Voir mon résultat' : 'Question suivante') + quizIcone('suivant', 20);
        bouton.focus({ preventScroll: true });
        const aide = this.elScene.querySelector('.quiz-aide-clavier');
        if (aide) { aide.textContent = 'Entrée pour continuer.'; }
        this.montrerBas(zone);
    }

    /** Sur téléphone, l'explication peut pousser le bouton sous l'écran : on le montre. */
    montrerBas(element) {
        const bas = element.getBoundingClientRect().bottom;
        if (bas > window.innerHeight) {
            const doux = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            window.scrollBy({ top: bas - window.innerHeight + 16, behavior: doux ? 'smooth' : 'auto' });
        }
    }

    suivant() {
        this.index++;
        this.valide = false;
        this.majPiste();
        if (this.index < this.serie.length) { this.rendreQuestion(); } else { this.terminer(); }
        this.remonter();
    }

    /**
     * Après « Question suivante », la nouvelle question pouvait rester cachée
     * au-dessus de l'écran (sous la barre du haut) : on remonte jusqu'au quiz.
     */
    remonter() {
        const barre = document.querySelector('.coquille-barre');
        let haut = barre ? Math.max(0, barre.getBoundingClientRect().bottom) : 0;
        const onglets = document.querySelector('.tabs');
        if (onglets && window.getComputedStyle(onglets).position === 'sticky' &&
                onglets.getBoundingClientRect().width > window.innerWidth * 0.6) {
            haut += onglets.offsetHeight;
        }
        const cible = this.container.querySelector('.quiz-etapes') || this.container;
        const top = cible.getBoundingClientRect().top;
        if (top >= haut && top < window.innerHeight * 0.4) { return; }   // déjà bien placé
        const doux = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: Math.max(0, top + window.pageYOffset - haut - 12), behavior: doux ? 'smooth' : 'auto' });
    }

    terminer() {
        window.clearInterval(this.tic);
        if (this.options.reprise !== false) { effacerEnCours(this.slug); }
        const J = window.KarniellaJeu;
        const XP = window.KarniellaXP;
        const P = window.KarniellaProgression;
        const temps = this.secondes();
        const total = this.serie.length;
        const correct = this.correct;
        const pct = Math.round(correct / total * 100);
        const jouees = this.serie.map((i) => this.questions[i]);
        const ratees = jouees.filter((q, k) => !this.reponses[k]).map((q) => q.question);

        // Le fantôme : battu ou pas ? (comparé AVANT d'enregistrer le nouveau record)
        let fantome = '';
        if (this.fantomeActif && this.record) {
            const r = this.record;
            const battu = correct > r.correct || (correct === r.correct && temps < r.temps);
            fantome = battu
                ? `Tu as battu ton fantôme${correct === r.correct ? ' de ' + formaterTemps(r.temps - temps) : ' avec un meilleur score'} !`
                : 'Le fantôme gagne cette fois. Rejoue, tu vas le rattraper !';
        }

        // XP (js/xp.js) et progression (js/progression.js), chargés par le chat.
        // Une révision ne compte pas pour le record : elle ne rapporte que ses bonnes réponses.
        let xp = null;
        if (XP) { xp = XP.gagnerQuiz(correct, total, this.slug, { temps: temps, suite: this.meilleureSuite, revision: this.revision }); }
        if (P) {
            if (this.revision) {
                if (P.enregistrerRevision) { P.enregistrerRevision(this.slug, correct, total); }
            } else {
                P.enregistrerQuiz(this.slug, correct, total, null, { temps: temps, fantome: this.fantomeActif, details: this.details, suite: this.meilleureSuite });
            }
            if (P.noterErreurs) { P.noterErreurs(this.slug, ratees); }
        }
        if (pct >= 80 && window.KarniellaFete) { window.KarniellaFete(); }

        const niv = J ? J.niveau(correct, total) : null;
        if (J) { J.sons.jouer(niv && niv.id === 'expert' && !this.revision ? 'fanfare' : 'fini'); }
        const eclair = !this.revision && XP && XP.estEclair && XP.estEclair(correct, total, temps);

        let titre;
        let message;
        if (this.revision) {
            titre = correct === total ? 'Toutes tes erreurs sont corrigées !' : 'Révision terminée';
            message = ratees.length
                ? `Il reste ${ratees.length} question${ratees.length > 1 ? 's' : ''} à revoir.`
                : 'La révision ne change pas ton record.';
        } else {
            titre = pct === 100 ? 'Sans faute, bravo !' : niv && niv.id === 'expert' ? 'Excellent !' : niv && niv.id === 'acquis' ? 'Bien joué !' : 'Courage !';
            message = niv ? niv.message : '';
        }

        const gains = [];
        if (xp) {
            gains.push(`+${xp.base} XP · ${correct} bonne${correct > 1 ? 's' : ''} réponse${correct > 1 ? 's' : ''}`);
            if (xp.bonus) { gains.push(`+${xp.bonus} XP · sans faute`); }
            if (xp.eclair) { gains.push(`+${xp.eclair} XP · éclair`); }
            if (xp.serie) { gains.push(`+${xp.serie} XP · série de ${this.meilleureSuite}`); }
        }
        const boutique = window.KarniellaCoquille ? window.KarniellaCoquille.racine + 'boutique.html' : null;
        const nbRatees = ratees.length;
        const peutReviser = nbRatees > 0 && P && P.erreurs;

        // Les pastilles du haut reviennent dans le résultat.
        this.elFantome.hidden = true;
        this.elPoints.hidden = true;
        this.elScene.innerHTML = `
            <div class="quiz-fin${this.revision ? ' quiz-fin-revision' : ''}">
                <div class="quiz-fin-guide"></div>
                <p class="quiz-fin-score"><span class="lecteur-seul">Score : </span><strong class="quiz-fin-nombre">${correct}</strong><span class="quiz-fin-sur">/${total}</span></p>
                <div class="quiz-fin-niveau"></div>
                <div class="pastilles quiz-fin-pastilles" aria-hidden="true">${this.reponses.map((j) => `<i class="${j ? 'juste' : 'faux'}"></i>`).join('')}</div>
                <div class="quiz-fin-chips">
                    <span class="chip">${quizIcone('horloge', 16)}${formaterTemps(temps)}</span>
                    ${eclair ? `<span class="chip chip-ok">${quizIcone('eclair', 16)}Éclair</span>` : ''}
                    ${this.meilleureSuite >= 3 ? `<span class="chip">${quizIcone('cible', 16)}Série de ${this.meilleureSuite}</span>` : ''}
                </div>
                ${fantome ? `<p class="quiz-fin-fantome">${quizIcone('fantome', 20)} ${fantome}</p>` : ''}
                ${gains.length ? `<ul class="quiz-gains" role="list">${gains.map((g) => `<li class="quiz-gain">${g}</li>`).join('')}</ul>` : ''}
                <div class="quiz-depart-boutons">
                    ${peutReviser ? `<button type="button" class="btn btn-energie quiz-reviser">${quizIcone('rejouer', 20)}Réviser ${nbRatees > 1 ? `mes ${nbRatees} erreurs` : 'mon erreur'}</button>` : ''}
                    <button type="button" class="btn${peutReviser ? ' btn-ghost' : ''} quiz-rejouer">${quizIcone('rejouer', 20)}${this.revision ? 'Refaire tout le quiz' : 'Rejouer'}</button>
                    ${boutique && xp ? `<a class="btn btn-ghost" href="${boutique}">${quizIcone('trophee', 20)}Boutique</a>` : ''}
                </div>
            </div>
            <details class="quiz-correction"${nbRatees ? ' open' : ''}>
                <summary>Voir la correction</summary>
                ${recapitulatifHTML(jouees, this.choix, { titre: false, reponses: this.reponses })}
            </details>`;

        const zoneGuide = this.elScene.querySelector('.quiz-fin-guide');
        if (J) {
            const reussi = this.revision ? !nbRatees : niv.id !== 'a-reprendre';
            const g = J.guide({ pose: reussi ? 'cheer' : 'think', taille: 96, titre: titre, texte: message });
            zoneGuide.appendChild(g.el);
        } else {
            zoneGuide.innerHTML = `<p><strong>${titre}</strong> ${message}</p>`;
        }
        const zoneNiveau = this.elScene.querySelector('.quiz-fin-niveau');
        if (J && niv && !this.revision) {
            zoneNiveau.appendChild(J.pastilleNiveau(niv, true));
            zoneNiveau.appendChild(J.etoiles(niv.etoiles, true));
        }

        const reviser = this.elScene.querySelector('.quiz-reviser');
        if (reviser) {
            reviser.addEventListener('click', () => {
                const liste = this.revisables();
                if (liste.length) { this.lancer({ revision: liste }); this.remonter(); }
            });
        }
        this.elScene.querySelector('.quiz-rejouer').addEventListener('click', () => {
            this.rendreEtapes();
            this.remonter();
        });
        const titreFin = this.elScene.querySelector('.guide-titre, .quiz-fin-guide strong');
        if (titreFin) {
            titreFin.setAttribute('tabindex', '-1');
            titreFin.focus({ preventScroll: true });
        }

        if (typeof this.options.finir === 'function') {
            this.options.finir({ correct: correct, total: total, temps: temps, xp: xp, revision: this.revision });
        }
    }
}

const QUIZ_LETTRES = 'ABCDEF';
const QUIZ_REACTIONS_JUSTE = ['Exactement.', 'Bien vu !', 'C’est ça.', 'Juste !', 'Parfait.'];
const QUIZ_REACTIONS_FAUX = ['Pas tout à fait.', 'Presque.', 'Ce n’est pas celle-là.'];
const QUIZ_REACTIONS_COURS = ['Relis-la bien.', 'Elle reviendra : tu l’auras.', 'Pas grave, tu progresses.'];

function quizAuHasard(liste) {
    return liste[Math.floor(Math.random() * liste.length)];
}

/** Un pictogramme au trait de js/coquille.js, ou rien. */
function quizIcone(nom, taille) {
    return window.KarniellaIcones ? window.KarniellaIcones.svg(nom, taille) : '';
}

/* Le quiz en cours, pour reprendre après un rechargement : une entrée par
   page, oubliée au bout de 7 jours ou si le nombre de questions a changé. */
const QUIZ_CLE_EN_COURS = 'karniella-quiz-en-cours';
const QUIZ_EN_COURS_DUREE = 7 * 24 * 3600 * 1000;

function lireTousEnCours() {
    try {
        const d = JSON.parse(window.localStorage.getItem(QUIZ_CLE_EN_COURS) || '{}');
        return d && typeof d === 'object' ? d : {};
    } catch (err) { return {}; }
}

function lireEnCours(slug, n) {
    const e = lireTousEnCours()[slug];
    if (!e || e.n !== n || !Array.isArray(e.serie) || !Array.isArray(e.reponses)) { return null; }
    if (Date.now() - (e.date || 0) > QUIZ_EN_COURS_DUREE) { return null; }
    if (e.index < 1 || e.index >= e.serie.length) { return null; }
    if (e.serie.some((i) => typeof i !== 'number' || i < 0 || i >= n)) { return null; }
    return e;
}

function ecrireEnCours(slug, etat) {
    const tous = lireTousEnCours();
    etat.date = Date.now();
    tous[slug] = etat;
    // Pas plus de 10 quiz en attente : on oublie les plus anciens.
    const cles = Object.keys(tous).sort((a, b) => (tous[b].date || 0) - (tous[a].date || 0));
    cles.slice(10).forEach((c) => { delete tous[c]; });
    try { window.localStorage.setItem(QUIZ_CLE_EN_COURS, JSON.stringify(tous)); } catch (err) { /* sans conséquence */ }
}

function effacerEnCours(slug) {
    const tous = lireTousEnCours();
    if (!tous[slug]) { return; }
    delete tous[slug];
    try { window.localStorage.setItem(QUIZ_CLE_EN_COURS, JSON.stringify(tous)); } catch (err) { /* sans conséquence */ }
}

/** 42 → « 0:42 », 75.4 → « 1:15 ». */
function formaterTemps(secondes) {
    const s = Math.max(0, Math.round(secondes));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
}

// Global registry for quiz instances
window.sectionQuizInstances = window.sectionQuizInstances || {};

/**
 * Initialize a section quiz
 * @param {string} containerId - ID of the container element
 * @param {Array} questions - Array of question objects
 */
function initSectionQuiz(containerId, questions, options) {
    const quiz = new SectionQuiz(containerId, questions, options);
    window.sectionQuizInstances[containerId] = quiz;
    return quiz;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SectionQuiz, initSectionQuiz };
}
