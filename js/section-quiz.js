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

class SectionQuiz {
    /**
     * @param {string} containerId
     * @param {Array} questions
     * @param {Object} [options]
     *   etapes  : true pour le quiz « une question à la fois » (chrono, XP, fantôme)
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

        // 🎉 à partir de 80 % (js/badges.js, chargé par le chat).
        if (percentage >= 80 && window.KarniellaFete) { window.KarniellaFete(); }

        // Alimente le suivi des progrès, partagé avec le chat. Le module est
        // chargé par chat-assistant.js : on ne suppose pas sa présence.
        if (window.KarniellaProgression) {
            window.KarniellaProgression.enregistrerQuiz(this.slug, correct, total);
        }
        if (window.KarniellaXP) { window.KarniellaXP.gagnerQuiz(correct, total, this.slug); }
    }

    /* ============================================================
       Mode étapes : une question à la fois, chrono, XP, fantôme 👻
       ============================================================ */

    rendreEtapes() {
        if (!this.container) { console.error('Container not found for section quiz'); return; }
        const P = window.KarniellaProgression;
        this.record = P ? P.record(this.slug) : null;
        this.index = 0;
        this.correct = 0;
        this.reponses = [];
        this.debut = null;
        this.fantomeActif = false;

        this.container.innerHTML = `
            <div class="section-quiz-wrapper quiz-etapes">
                <div class="quiz-etapes-haut">
                    <h4>${echapperHTML(this.options.titre || '🎯 Le quiz')}</h4>
                    <span class="quiz-chrono" aria-live="off" title="Temps écoulé">⏱ <span class="quiz-chrono-n">0:00</span></span>
                </div>
                <div class="quiz-points" role="progressbar" aria-valuemin="0" aria-valuemax="${this.questions.length}" aria-valuenow="0" aria-label="Avancement du quiz"></div>
                <div class="quiz-fantome" hidden></div>
                <div class="quiz-scene"></div>
            </div>`;
        this.elPoints = this.container.querySelector('.quiz-points');
        this.elChrono = this.container.querySelector('.quiz-chrono-n');
        this.elFantome = this.container.querySelector('.quiz-fantome');
        this.elScene = this.container.querySelector('.quiz-scene');

        this.questions.forEach(() => {
            const i = document.createElement('i');
            this.elPoints.appendChild(i);
        });

        if (this.record && typeof this.record.temps === 'number') {
            this.rendreAccueilFantome();
        } else {
            this.demarrer(false);
        }
    }

    /** Avant le départ, si un record existe : courir contre son fantôme, ou pas. */
    rendreAccueilFantome() {
        const r = this.record;
        this.elScene.innerHTML = `
            <div class="quiz-depart">
                <p class="quiz-depart-titre">👻 Ton fantôme t'attend</p>
                <p>Ton record ici : <strong>${r.correct}/${r.total}</strong> en <strong>${formaterTemps(r.temps)}</strong>.
                Fais mieux, ou plus vite !</p>
                <div class="quiz-depart-boutons">
                    <button type="button" class="quiz-btn quiz-btn-plein" data-fantome="1">👻 Battre mon fantôme</button>
                    <button type="button" class="quiz-btn" data-fantome="0">Refaire le quiz tranquillement</button>
                </div>
            </div>`;
        this.elScene.querySelectorAll('[data-fantome]').forEach((b) => {
            b.addEventListener('click', () => this.demarrer(b.getAttribute('data-fantome') === '1'));
        });
    }

    demarrer(fantome) {
        this.fantomeActif = Boolean(fantome);
        this.debut = Date.now();
        if (this.fantomeActif) {
            this.elFantome.hidden = false;
            this.elFantome.innerHTML = `
                <div class="quiz-fantome-ligne"><span>👻 Fantôme : ${this.record.correct}/${this.record.total} en ${formaterTemps(this.record.temps)}</span><span class="quiz-fantome-toi">Toi : 0/${this.questions.length}</span></div>
                <div class="quiz-piste"><i class="quiz-piste-lui"></i><i class="quiz-piste-toi"></i><span class="quiz-piste-marque" aria-hidden="true">👻</span></div>`;
        }
        this.tic = window.setInterval(() => this.majChrono(), 250);
        this.majChrono();
        this.rendreQuestion();
    }

    secondes() {
        return this.debut ? (Date.now() - this.debut) / 1000 : 0;
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
        if (toi) { toi.style.width = (this.index / this.questions.length * 100) + '%'; }
        if (texte) { texte.textContent = 'Toi : ' + this.index + '/' + this.questions.length; }
    }

    rendreQuestion() {
        const q = this.questions[this.index];
        const n = this.index + 1;
        const langEnonce = attributLangue(q.langue);
        const langOptions = attributLangue(q.optionsLangue || q.langue);
        const lettres = ['A', 'B', 'C', 'D', 'E', 'F'];

        this.elPoints.setAttribute('aria-valuenow', String(this.index));
        Array.prototype.forEach.call(this.elPoints.children, (i, k) => {
            i.className = k < this.index ? (this.reponses[k] ? 'juste' : 'faux') : (k === this.index ? 'actif' : '');
        });

        this.elScene.innerHTML = `
            <div class="quiz-question">
                <span class="quiz-compte">Question ${n} sur ${this.questions.length}</span>
                <p class="question-text"${langEnonce}>${q.question}</p>
                <div class="quiz-options">
                    ${q.options.map((o, i) => `
                        <button type="button" class="quiz-option" data-index="${i}">
                            <b data-lire-ignore>${lettres[i] || i + 1}</b><span${langOptions}>${o}</span>
                        </button>`).join('')}
                </div>
                <div class="question-feedback" aria-live="polite"></div>
                <button type="button" class="quiz-btn quiz-btn-plein quiz-suivant" hidden>
                    ${n < this.questions.length ? 'Question suivante →' : 'Voir mon résultat →'}
                </button>
            </div>`;

        this.elScene.querySelectorAll('.quiz-option').forEach((b) => {
            b.addEventListener('click', () => this.repondre(parseInt(b.getAttribute('data-index'), 10)));
        });
        this.elScene.querySelector('.quiz-suivant').addEventListener('click', () => this.suivant());

        if (window.LectureVocale) { window.LectureVocale.equiper(this.elScene); }
        const premier = this.elScene.querySelector('.quiz-option');
        if (premier && this.index > 0) { premier.focus({ preventScroll: true }); }
    }

    repondre(choix) {
        const q = this.questions[this.index];
        const juste = choix === q.correctAnswer;
        const boutons = this.elScene.querySelectorAll('.quiz-option');
        boutons.forEach((b, i) => {
            b.disabled = true;
            if (i === q.correctAnswer) { b.classList.add('juste'); b.querySelector('b').textContent = '✓'; }
            else if (i === choix) { b.classList.add('faux'); b.querySelector('b').textContent = '✗'; }
        });
        if (juste) { this.correct++; }
        this.reponses[this.index] = juste;

        const retour = this.elScene.querySelector('.question-feedback');
        retour.className = 'question-feedback ' + (juste ? 'feedback-correct' : 'feedback-incorrect');
        retour.innerHTML = juste
            ? `✓ <strong>Exact !</strong> ${q.explanation || ''}`
            : `✗ <strong>Pas tout à fait.</strong> La bonne réponse : <strong>${q.options[q.correctAnswer]}</strong><br>${q.explanation || ''}`;

        const suivant = this.elScene.querySelector('.quiz-suivant');
        suivant.hidden = false;
        suivant.focus({ preventScroll: true });
    }

    suivant() {
        this.index++;
        this.majPiste();
        if (this.index < this.questions.length) { this.rendreQuestion(); return; }
        this.terminer();
    }

    terminer() {
        window.clearInterval(this.tic);
        const temps = this.secondes();
        const total = this.questions.length;
        const correct = this.correct;
        const pct = Math.round(correct / total * 100);

        Array.prototype.forEach.call(this.elPoints.children, (i, k) => { i.className = this.reponses[k] ? 'juste' : 'faux'; });
        this.elPoints.setAttribute('aria-valuenow', String(total));

        // Le fantôme : battu ou pas ? (comparé AVANT d'enregistrer le nouveau record)
        let fantome = '';
        if (this.fantomeActif && this.record) {
            const r = this.record;
            const battu = correct > r.correct || (correct === r.correct && temps < r.temps);
            fantome = battu
                ? `👻 Tu as battu ton fantôme${correct === r.correct ? ' de ' + formaterTemps(r.temps - temps) : ' avec un meilleur score'} !`
                : '👻 Le fantôme gagne cette fois. Rejoue, tu le rattrapes !';
        }

        // XP (js/xp.js) et progression (js/progression.js), chargés par le chat.
        let xp = null;
        if (window.KarniellaXP) { xp = window.KarniellaXP.gagnerQuiz(correct, total, this.slug); }
        if (window.KarniellaProgression) {
            window.KarniellaProgression.enregistrerQuiz(this.slug, correct, total, null, { temps: temps, fantome: this.fantomeActif });
        }
        if (pct >= 80 && window.KarniellaFete) { window.KarniellaFete(); }

        let emoji = '📚', message = 'Relis la leçon et retente !';
        if (pct === 100) { emoji = '🎉'; message = 'Sans faute, bravo !'; }
        else if (pct >= 66) { emoji = '👍'; message = 'Bien joué !'; }
        else if (pct >= 33) { emoji = '💪'; message = 'Continue tes efforts !'; }

        const gains = xp ? `
            <div class="quiz-gains">
                <span class="quiz-gain">+${xp.base} XP · ${correct} bonne${correct > 1 ? 's' : ''} réponse${correct > 1 ? 's' : ''}</span>
                ${xp.bonus ? `<span class="quiz-gain bonus">+${xp.bonus} XP · sans faute</span>` : ''}
            </div>` : '';
        const boutique = window.KarniellaCoquille ? window.KarniellaCoquille.racine + 'boutique.html' : null;

        this.elFantome.hidden = true;
        this.elScene.innerHTML = `
            <div class="quiz-fin">
                <span class="quiz-fin-emoji" aria-hidden="true">${emoji}</span>
                <p class="quiz-fin-titre">${message}</p>
                <p class="quiz-fin-score">Score : <strong>${correct}/${total}</strong> en <strong>${formaterTemps(temps)}</strong></p>
                ${gains}
                ${fantome ? `<p class="quiz-fin-fantome">${fantome}</p>` : ''}
                <div class="quiz-depart-boutons">
                    <button type="button" class="quiz-btn quiz-btn-plein quiz-rejouer">👻 Rejouer contre mon fantôme</button>
                    ${boutique && xp ? `<a class="quiz-btn quiz-btn-or" href="${boutique}">⭐ Boutique</a>` : ''}
                </div>
            </div>`;
        this.elScene.querySelector('.quiz-rejouer').addEventListener('click', () => this.rendreEtapes());
        this.elScene.querySelector('.quiz-fin-titre').setAttribute('tabindex', '-1');
        this.elScene.querySelector('.quiz-fin-titre').focus({ preventScroll: true });

        if (typeof this.options.finir === 'function') {
            this.options.finir({ correct: correct, total: total, temps: temps, xp: xp });
        }
    }
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
