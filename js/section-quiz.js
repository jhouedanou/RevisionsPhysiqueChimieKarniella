/**
 * Section Quiz Component
 * Interactive mini-quiz system for learning sections
 * Designed for Révisions Karniella
 */

class SectionQuiz {
    constructor(containerId, questions) {
        this.container = document.getElementById(containerId);
        this.questions = questions;
        this.currentAnswers = {};
        this.render();
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
        return `
            <div class="section-quiz-question" id="${qId}">
                <p class="question-text"><strong>${index + 1}.</strong> ${question.question}</p>
                <div class="question-options">
                    ${question.options.map((option, optIndex) => `
                        <label class="option-label">
                            <input 
                                type="radio" 
                                name="${qId}" 
                                value="${optIndex}"
                                onchange="sectionQuizInstances['${this.container.id}'].clearFeedback('${qId}')"
                            >
                            <span>${option}</span>
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

        // Alimente le suivi des progrès, partagé avec le chat. Le module est
        // chargé par chat-assistant.js : on ne suppose pas sa présence.
        if (window.KarniellaProgression) {
            const slug = window.location.pathname.split('/').pop().replace(/\.html$/, '');
            window.KarniellaProgression.enregistrerQuiz(slug, correct, total);
        }
    }
}

// Global registry for quiz instances
window.sectionQuizInstances = window.sectionQuizInstances || {};

/**
 * Initialize a section quiz
 * @param {string} containerId - ID of the container element
 * @param {Array} questions - Array of question objects
 */
function initSectionQuiz(containerId, questions) {
    const quiz = new SectionQuiz(containerId, questions);
    window.sectionQuizInstances[containerId] = quiz;
    return quiz;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SectionQuiz, initSectionQuiz };
}
