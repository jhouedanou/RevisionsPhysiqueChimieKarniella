document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get('id');

    if (!quizId) {
        alert('Aucun quiz spécifié !');
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await fetch(`/api/quizzes/${quizId}`);
        if (!response.ok) throw new Error('Quiz introuvable');

        const quiz = await response.json();
        renderQuiz(quiz);
    } catch (error) {
        console.error('Erreur:', error);
        document.getElementById('loading').innerHTML = `
            <div class="error-message">
                <h2>Oups ! 😕</h2>
                <p>Impossible de charger le quiz.</p>
                <a href="index.html" class="btn-back" style="position: static; display: inline-block; margin-top: 20px;">Retour à l'accueil</a>
            </div>
        `;
    }
});

let currentQuiz = null;

function renderQuiz(quiz) {
    currentQuiz = quiz;
    document.title = `${quiz.title} - Karniella Révisions`;
    document.getElementById('quiz-title').textContent = quiz.title;
    document.getElementById('quiz-description').textContent = quiz.description;
    document.getElementById('quiz-header').textContent = `📝 ${quiz.title}`;
    document.getElementById('quiz-subtitle').textContent = `${quiz.questions.length} questions pour évaluer votre compréhension`;

    const questionsContainer = document.getElementById('questions-list');
    questionsContainer.innerHTML = '';

    quiz.questions.forEach((q, index) => {
        const questionEl = document.createElement('div');
        questionEl.className = 'quiz-question';
        questionEl.id = `question-${index}`;

        let optionsHtml = '';
        q.options.forEach((opt, optIndex) => {
            optionsHtml += `
                <label class="quiz-option">
                    <input type="radio" name="q${index}" value="${optIndex}"> ${opt}
                </label>
            `;
        });

        questionEl.innerHTML = `
            <span class="question-number">${index + 1}</span>
            <span class="question-text">${q.text}</span>
            <div class="quiz-options">
                ${optionsHtml}
            </div>
            <div class="quiz-feedback" id="feedback-q${index}"></div>
        `;

        questionsContainer.appendChild(questionEl);
    });

    document.getElementById('loading').style.display = 'none';
    document.getElementById('quiz-container').style.display = 'flex';

    document.getElementById('submit-quiz').onclick = checkAnswers;
}

function checkAnswers() {
    if (!currentQuiz) return;

    let score = 0;
    let total = currentQuiz.questions.length;
    let allAnswered = true;

    currentQuiz.questions.forEach((q, index) => {
        const selected = document.querySelector(`input[name="q${index}"]:checked`);
        const feedbackEl = document.getElementById(`feedback-q${index}`);

        if (!selected) {
            allAnswered = false;
            feedbackEl.textContent = "Veuillez sélectionner une réponse.";
            feedbackEl.className = "quiz-feedback incorrect";
            return;
        }

        const selectedValue = parseInt(selected.value);

        if (selectedValue === q.correctAnswer) {
            score++;
            feedbackEl.textContent = "Bonne réponse ! " + (q.explanation || "");
            feedbackEl.className = "quiz-feedback correct";
        } else {
            feedbackEl.textContent = `Mauvaise réponse. La bonne réponse était : ${q.options[q.correctAnswer]}. ` + (q.explanation || "");
            feedbackEl.className = "quiz-feedback incorrect";
        }
    });

    if (!allAnswered) {
        alert("Veuillez répondre à toutes les questions !");
        return;
    }

    const resultEl = document.getElementById('quiz-result');
    resultEl.style.display = 'block';

    const percentage = (score / total) * 100;
    let message = "";

    if (percentage === 100) message = "Excellent ! 🏆";
    else if (percentage >= 80) message = "Très bien ! 👏";
    else if (percentage >= 50) message = "Pas mal ! 👍";
    else message = "Il faut réviser encore un peu. 💪";

    resultEl.innerHTML = `
        <h3>Résultat : ${score} / ${total}</h3>
        <p>${message}</p>
    `;

    // Scroll to result
    resultEl.scrollIntoView({ behavior: 'smooth' });
}
