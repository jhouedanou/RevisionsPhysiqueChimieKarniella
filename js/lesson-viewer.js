document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const lessonId = urlParams.get('id');

    if (!lessonId) {
        alert('Aucune leçon spécifiée !');
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await fetch(`/api/lessons/${lessonId}`);
        if (!response.ok) throw new Error('Leçon introuvable');

        const lesson = await response.json();
        renderLesson(lesson);

        // Charger le quiz associé si disponible
        if (lesson.hasQuiz) {
            await loadQuizForLesson(lessonId);
        }
    } catch (error) {
        console.error('Erreur:', error);
        document.getElementById('lesson-content').innerHTML = `
            <div class="error-message">
                <h2>Oups ! 😕</h2>
                <p>Impossible de charger la leçon.</p>
                <a href="index.html" class="btn-back" style="position: static; display: inline-block; margin-top: 20px;">Retour à l'accueil</a>
            </div>
        `;
    }
});

function renderLesson(lesson) {
    document.title = `${lesson.title} - Karniella Révisions`;
    document.getElementById('lesson-title').textContent = lesson.title;
    document.getElementById('lesson-description').textContent = lesson.description;

    const contentContainer = document.getElementById('lesson-content');
    contentContainer.innerHTML = lesson.content;

    // Initialize Tabs if present
    const tabContents = contentContainer.querySelectorAll('.tab-content');
    const tabsContainer = document.getElementById('tabs-container');

    if (tabContents.length > 0) {
        tabsContainer.style.display = 'flex';

        tabContents.forEach((tab, index) => {
            // Try to find a title for the tab inside the content
            const titleEl = tab.querySelector('h2');
            let tabTitle = `Partie ${index + 1}`;
            if (titleEl) {
                // Use the h2 text but maybe shorten it or use it as is
                // Often the h2 is "I - Title", let's use a simplified version if possible
                // Or look for the comment <!-- TAB 1: TITLE --> which we can't easily see in DOM
                // Let's just use the H2 text or a generic name
                tabTitle = titleEl.textContent.replace(/^[^\w]+/, '').trim(); // Remove leading emojis
                // Truncate if too long
                if (tabTitle.length > 20) tabTitle = tabTitle.substring(0, 20) + '...';
            }

            const button = document.createElement('button');
            button.className = `tab-button ${index === 0 ? 'active' : ''}`;
            button.textContent = tabTitle;
            button.onclick = () => switchTab(tab.id);
            tabsContainer.appendChild(button);

            // Ensure first tab is active
            if (index === 0) tab.classList.add('active');
            else tab.classList.remove('active');
        });
    } else {
        tabsContainer.style.display = 'none';
    }

    // Re-attach event listeners for interactive elements if any
    attachInteractiveHandlers();
}

function switchTab(tabId) {
    // Update buttons
    const buttons = document.querySelectorAll('.tab-button');
    const contents = document.querySelectorAll('.tab-content');

    // Find index of the tab to activate to update buttons correctly
    let activeIndex = -1;
    contents.forEach((content, index) => {
        if (content.id === tabId) {
            content.classList.add('active');
            activeIndex = index;
        } else {
            content.classList.remove('active');
        }
    });

    buttons.forEach((btn, index) => {
        if (index === activeIndex) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // Scroll to top of content
    document.querySelector('.content').scrollTop = 0;
}

// Global function for inline onclicks in the HTML content
window.navigateToTab = function (tabId) {
    switchTab(tabId);
}

function attachInteractiveHandlers() {
    // Re-implement any specific JS logic that was in the original files
    // For example, the math calculators or quiz checks inside lessons

    // Math Lesson 1: Calculators
    const calcBtn = document.querySelector('button[onclick="verifierDivisibilite()"]');
    if (calcBtn) {
        calcBtn.onclick = verifierDivisibilite;
    }

    // Add other specific handlers here as needed or move them to a shared utility
    // Since we can't easily execute inline scripts from innerHTML, we might need to
    // reimplement the logic here or ensure it's available globally.
}

// Specific Logic for Math Lesson 2 (Divisors)
window.verifierDivisibilite = function () {
    const nombre = parseInt(document.getElementById('nombreInput').value);
    const resultDiv = document.getElementById('resultatDiv');

    if (!nombre) return;

    let resultat = `<strong>Le nombre ${nombre} est divisible par :</strong><br>`;
    let diviseurs = [];

    if (nombre % 2 === 0) diviseurs.push("2 (car il est pair)");
    if (nombre % 3 === 0) diviseurs.push("3 (car la somme de ses chiffres est divisible par 3)");
    if (nombre % 4 === 0) diviseurs.push("4 (car ses deux derniers chiffres forment un multiple de 4)");
    if (nombre % 5 === 0) diviseurs.push("5 (car il finit par 0 ou 5)");
    if (nombre % 9 === 0) diviseurs.push("9 (car la somme de ses chiffres est divisible par 9)");
    if (nombre % 10 === 0) diviseurs.push("10 (car il finit par 0)");

    if (diviseurs.length > 0) {
        resultat += "<ul>" + diviseurs.map(d => `<li>${d}</li>`).join('') + "</ul>";
    } else {
        resultat += "<p>Aucun des critères usuels (2, 3, 4, 5, 9, 10) ne fonctionne.</p>";
    }

    resultDiv.innerHTML = resultat;
    resultDiv.classList.add('show');
}

// ============================================
// QUIZ FUNCTIONALITY
// ============================================

let currentQuiz = null;

async function loadQuizForLesson(lessonId) {
    try {
        const response = await fetch(`/api/quizzes?lessonId=${lessonId}`);
        if (!response.ok) {
            console.log('Pas de quiz pour cette leçon');
            return;
        }

        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
            renderQuiz(result.data[0]);
        }
    } catch (error) {
        console.error('Erreur lors du chargement du quiz:', error);
    }
}

function renderQuiz(quiz) {
    currentQuiz = quiz;

    const quizSection = document.getElementById('quiz-section');
    const quizHeader = document.getElementById('quiz-header');
    const quizSubtitle = document.getElementById('quiz-subtitle');
    const questionsContainer = document.getElementById('questions-list');

    if (!quizSection || !questionsContainer) return;

    // Modern styled header with Tailwind
    quizHeader.className = 'text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3';
    quizHeader.innerHTML = `
        <span class="text-4xl">📝</span>
        <span>${quiz.title}</span>
    `;

    quizSubtitle.className = 'text-gray-600 text-lg mb-8';
    quizSubtitle.textContent = `${quiz.questions.length} questions pour évaluer votre compréhension`;

    questionsContainer.innerHTML = '';

    quiz.questions.forEach((q, index) => {
        const questionEl = document.createElement('div');
        questionEl.className = 'mb-8 bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300';
        questionEl.id = `question-${index}`;

        let optionsHtml = '';
        q.options.forEach((opt, optIndex) => {
            optionsHtml += `
                <label class="flex items-start p-4 mb-3 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-pink-400 hover:bg-pink-50 cursor-pointer transition-all duration-200 group">
                    <input type="radio" name="q${index}" value="${optIndex}" class="mt-1 w-5 h-5 text-pink-500 focus:ring-pink-500 focus:ring-2">
                    <span class="ml-3 text-gray-700 group-hover:text-gray-900 font-medium">${opt}</span>
                </label>
            `;
        });

        questionEl.innerHTML = `
            <div class="flex items-start mb-4">
                <span class="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md">${index + 1}</span>
                <span class="ml-4 text-lg font-semibold text-gray-800 leading-relaxed">${q.text}</span>
            </div>
            <div class="ml-14 space-y-2">
                ${optionsHtml}
            </div>
            <div class="ml-14 mt-4 quiz-feedback hidden" id="feedback-q${index}"></div>
        `;

        questionsContainer.appendChild(questionEl);
    });

    // Afficher la section quiz
    quizSection.style.display = 'block';

    // Attacher l'événement de vérification
    const submitButton = document.getElementById('submit-quiz');
    if (submitButton) {
        // Style the submit button with Tailwind
        submitButton.className = 'w-full md:w-auto px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transform transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-pink-300';
        submitButton.onclick = checkQuizAnswers;
    }
}

function checkQuizAnswers() {
    if (!currentQuiz) return;

    let score = 0;
    let total = currentQuiz.questions.length;
    let allAnswered = true;

    currentQuiz.questions.forEach((q, index) => {
        const selected = document.querySelector(`input[name="q${index}"]:checked`);
        const feedbackEl = document.getElementById(`feedback-q${index}`);

        if (!selected) {
            allAnswered = false;
            feedbackEl.innerHTML = `
                <div class="flex items-start p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
                    <span class="text-2xl mr-3">⚠️</span>
                    <span class="text-yellow-800 font-medium">Veuillez sélectionner une réponse.</span>
                </div>
            `;
            feedbackEl.classList.remove('hidden');
            return;
        }

        const selectedValue = parseInt(selected.value);

        if (selectedValue === q.correctAnswer) {
            score++;
            feedbackEl.innerHTML = `
                <div class="flex items-start p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
                    <span class="text-2xl mr-3">✅</span>
                    <div>
                        <span class="text-green-800 font-bold block">Bonne réponse !</span>
                        ${q.explanation ? `<span class="text-green-700 text-sm mt-1 block">${q.explanation}</span>` : ''}
                    </div>
                </div>
            `;
            feedbackEl.classList.remove('hidden');
        } else {
            feedbackEl.innerHTML = `
                <div class="flex items-start p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                    <span class="text-2xl mr-3">❌</span>
                    <div>
                        <span class="text-red-800 font-bold block">Mauvaise réponse</span>
                        <span class="text-red-700 text-sm mt-1 block">La bonne réponse était : <strong>${q.options[q.correctAnswer]}</strong></span>
                        ${q.explanation ? `<span class="text-red-600 text-sm mt-2 block">${q.explanation}</span>` : ''}
                    </div>
                </div>
            `;
            feedbackEl.classList.remove('hidden');
        }
    });

    if (!allAnswered) {
        // Modern alert
        const quizSection = document.getElementById('quiz-section');
        const alertDiv = document.createElement('div');
        alertDiv.className = 'fixed top-4 right-4 z-50 bg-yellow-500 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-bounce';
        alertDiv.innerHTML = `
            <span class="text-2xl">⚠️</span>
            <span class="font-bold">Veuillez répondre à toutes les questions !</span>
        `;
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 3000);
        return;
    }

    const resultEl = document.getElementById('quiz-result');
    resultEl.style.display = 'block';

    const percentage = (score / total) * 100;
    let message = "";
    let emoji = "";
    let bgColor = "";
    let borderColor = "";

    if (percentage === 100) {
        message = "Parfait ! Vous maîtrisez le sujet !";
        emoji = "🏆";
        bgColor = "bg-gradient-to-r from-yellow-400 to-orange-500";
        borderColor = "border-yellow-500";
    } else if (percentage >= 80) {
        message = "Très bien ! Excellent travail !";
        emoji = "👏";
        bgColor = "bg-gradient-to-r from-green-400 to-emerald-500";
        borderColor = "border-green-500";
    } else if (percentage >= 50) {
        message = "Pas mal ! Continuez comme ça !";
        emoji = "👍";
        bgColor = "bg-gradient-to-r from-blue-400 to-cyan-500";
        borderColor = "border-blue-500";
    } else {
        message = "Il faut réviser encore un peu.";
        emoji = "💪";
        bgColor = "bg-gradient-to-r from-purple-400 to-pink-500";
        borderColor = "border-purple-500";
    }

    resultEl.className = `mt-8 p-8 rounded-2xl shadow-2xl border-4 ${borderColor} bg-white transform transition-all duration-500`;
    resultEl.innerHTML = `
        <div class="text-center">
            <div class="${bgColor} text-white inline-block px-8 py-6 rounded-full text-6xl mb-4 shadow-lg">
                ${emoji}
            </div>
            <h3 class="text-4xl font-bold text-gray-800 mb-2">${message}</h3>
            <div class="flex items-center justify-center gap-4 mt-6">
                <div class="text-center">
                    <div class="text-6xl font-bold ${bgColor} bg-clip-text text-transparent">${score}</div>
                    <div class="text-gray-600 font-medium">bonnes réponses</div>
                </div>
                <div class="text-5xl text-gray-300">/</div>
                <div class="text-center">
                    <div class="text-6xl font-bold text-gray-400">${total}</div>
                    <div class="text-gray-600 font-medium">questions</div>
                </div>
            </div>
            <div class="mt-6 text-2xl font-semibold text-gray-700">${percentage.toFixed(0)}%</div>
            <div class="mt-8">
                <div class="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                    <div class="${bgColor} h-6 rounded-full transition-all duration-1000 flex items-center justify-end pr-2" style="width: ${percentage}%">
                        <span class="text-white text-xs font-bold">${percentage.toFixed(0)}%</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Smooth scroll to result
    setTimeout(() => {
        resultEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
}

