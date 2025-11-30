// Check authentication on page load
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();

        if (!data.authenticated) {
            window.location.href = '/admin/login.html';
            return false;
        }

        const usernameEl = document.getElementById('username');
        if (usernameEl) {
            usernameEl.textContent = data.username;
        }
        return true;
    } catch (error) {
        console.error('Error checking auth:', error);
        window.location.href = '/admin/login.html';
        return false;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing admin panel...');

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/admin/login.html';
            } catch (error) {
                console.error('Error logging out:', error);
            }
        });
    }

    // Tab Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;

            // Update active tab button
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update active tab content
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            const tabContent = document.getElementById(`${tabName}-tab`);
            if (tabContent) {
                tabContent.classList.add('active');
            }
        });
    });

    // Start the app
    init();
});


// ========== SUBJECTS ==========

async function loadSubjects() {
    console.log('Loading subjects...');
    try {
        const response = await fetch('/api/subjects');
        const data = await response.json();
        console.log('Subjects data:', data);

        if (data.success) {
            renderSubjects(data.data);
        }
    } catch (error) {
        console.error('Error loading subjects:', error);
    }
}

function renderSubjects(subjects) {
    console.log('renderSubjects called with:', subjects);
    const container = document.getElementById('subjects-list');
    console.log('Container element:', container);
    if (!container) {
        console.error('subjects-list container not found!');
        return;
    }
    container.innerHTML = subjects.map(subject => `
        <div class="data-card">
            <div class="data-card-header">
                <div class="data-card-title">
                    <span>${subject.icon}</span>
                    <span>${subject.name}</span>
                    <span class="badge ${subject.isActive ? 'badge-active' : 'badge-inactive'}">
                        ${subject.isActive ? 'Actif' : 'Inactif'}
                    </span>
                </div>
                <div class="data-card-actions">
                    <button class="btn-edit" onclick="editSubject('${subject.id}')">Modifier</button>
                    <button class="btn-delete" onclick="deleteSubject('${subject.id}')">Supprimer</button>
                </div>
            </div>
            <div class="data-card-body">
                <p>${subject.description}</p>
                ${subject.url ? `<p><strong>URL:</strong> ${subject.url}</p>` : ''}
            </div>
        </div>
    `).join('');
}

function showAddSubjectModal() {
    document.getElementById('subjectModalTitle').textContent = 'Ajouter une matière';
    document.getElementById('subjectForm').reset();
    document.getElementById('subjectId').value = '';
    document.getElementById('subjectModal').style.display = 'block';
}

async function editSubject(id) {
    try {
        const response = await fetch(`/api/subjects/${id}`);
        const data = await response.json();

        if (data.success) {
            const subject = data.data;
            document.getElementById('subjectModalTitle').textContent = 'Modifier la matière';
            document.getElementById('subjectId').value = subject.id;
            document.getElementById('subjectName').value = subject.name;
            document.getElementById('subjectIcon').value = subject.icon;
            document.getElementById('subjectDescription').value = subject.description;
            document.getElementById('subjectUrl').value = subject.url || '';
            document.getElementById('subjectActive').checked = subject.isActive;
            document.getElementById('subjectModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading subject:', error);
    }
}

async function deleteSubject(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette matière ?')) return;

    try {
        const response = await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
        const data = await response.json();

        if (data.success) {
            alert('Matière supprimée avec succès');
            loadSubjects();
        }
    } catch (error) {
        console.error('Error deleting subject:', error);
        alert('Erreur lors de la suppression');
    }
}

document.getElementById('subjectForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('subjectId').value;
    const subjectData = {
        name: document.getElementById('subjectName').value,
        icon: document.getElementById('subjectIcon').value,
        description: document.getElementById('subjectDescription').value,
        url: document.getElementById('subjectUrl').value,
        isActive: document.getElementById('subjectActive').checked
    };

    try {
        const url = id ? `/api/subjects/${id}` : '/api/subjects';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subjectData)
        });

        const data = await response.json();

        if (data.success) {
            alert(id ? 'Matière modifiée avec succès' : 'Matière créée avec succès');
            closeModal('subjectModal');
            loadSubjects();
        }
    } catch (error) {
        console.error('Error saving subject:', error);
        alert('Erreur lors de l\'enregistrement');
    }
});

// ========== LESSONS ==========

async function loadLessons() {
    console.log('Loading lessons...');
    try {
        const response = await fetch('/api/lessons');
        const data = await response.json();
        console.log('Lessons data:', data);

        if (data.success) {
            renderLessons(data.data);
        }
    } catch (error) {
        console.error('Error loading lessons:', error);
    }
}

function renderLessons(lessons) {
    console.log('renderLessons called with:', lessons);
    const container = document.getElementById('lessons-list');
    console.log('Container element:', container);
    if (!container) {
        console.error('lessons-list container not found!');
        return;
    }
    container.innerHTML = lessons.map(lesson => `
        <div class="data-card">
            <div class="data-card-header">
                <div class="data-card-title">
                    <span>${lesson.icon}</span>
                    <span>${lesson.title}</span>
                    <span class="badge ${lesson.isActive ? 'badge-active' : 'badge-inactive'}">
                        ${lesson.isActive ? 'Actif' : 'Inactif'}
                    </span>
                </div>
                <div class="data-card-actions">
                    <button class="btn-edit" onclick="editLesson('${lesson.id}')">Modifier</button>
                    <button class="btn-delete" onclick="deleteLesson('${lesson.id}')">Supprimer</button>
                </div>
            </div>
            <div class="data-card-body">
                <p>${lesson.description}</p>
                <p><strong>URL:</strong> ${lesson.url}</p>
                ${lesson.hasQuiz ? '<p><strong>✅ Possède un quiz</strong></p>' : ''}
            </div>
        </div>
    `).join('');
}

async function showAddLessonModal() {
    await populateSubjectSelect('lessonSubject');
    document.getElementById('lessonModalTitle').textContent = 'Ajouter une leçon';
    document.getElementById('lessonForm').reset();
    document.getElementById('lessonId').value = '';
    document.getElementById('lessonModal').style.display = 'block';
}

async function editLesson(id) {
    try {
        await populateSubjectSelect('lessonSubject');

        const response = await fetch(`/api/lessons/${id}`);
        const data = await response.json();

        if (data.success) {
            const lesson = data.data;
            document.getElementById('lessonModalTitle').textContent = 'Modifier la leçon';
            document.getElementById('lessonId').value = lesson.id;
            document.getElementById('lessonSubject').value = lesson.subjectId;
            document.getElementById('lessonTitle').value = lesson.title;
            document.getElementById('lessonIcon').value = lesson.icon;
            document.getElementById('lessonDescription').value = lesson.description;
            document.getElementById('lessonUrl').value = lesson.url;
            document.getElementById('lessonActive').checked = lesson.isActive;
            document.getElementById('lessonHasQuiz').checked = lesson.hasQuiz;
            document.getElementById('lessonModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading lesson:', error);
    }
}

async function deleteLesson(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette leçon ?')) return;

    try {
        const response = await fetch(`/api/lessons/${id}`, { method: 'DELETE' });
        const data = await response.json();

        if (data.success) {
            alert('Leçon supprimée avec succès');
            loadLessons();
        }
    } catch (error) {
        console.error('Error deleting lesson:', error);
        alert('Erreur lors de la suppression');
    }
}

document.getElementById('lessonForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('lessonId').value;
    const lessonData = {
        subjectId: document.getElementById('lessonSubject').value,
        title: document.getElementById('lessonTitle').value,
        icon: document.getElementById('lessonIcon').value,
        description: document.getElementById('lessonDescription').value,
        url: document.getElementById('lessonUrl').value,
        isActive: document.getElementById('lessonActive').checked,
        hasQuiz: document.getElementById('lessonHasQuiz').checked
    };

    try {
        const url = id ? `/api/lessons/${id}` : '/api/lessons';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lessonData)
        });

        const data = await response.json();

        if (data.success) {
            alert(id ? 'Leçon modifiée avec succès' : 'Leçon créée avec succès');
            closeModal('lessonModal');
            loadLessons();
        }
    } catch (error) {
        console.error('Error saving lesson:', error);
        alert('Erreur lors de l\'enregistrement');
    }
});

// ========== QUIZZES ==========

let currentQuestions = [];

async function loadQuizzes() {
    console.log('Loading quizzes...');
    try {
        const response = await fetch('/api/quizzes');
        const data = await response.json();
        console.log('Quizzes data:', data);

        if (data.success) {
            renderQuizzes(data.data);
        }
    } catch (error) {
        console.error('Error loading quizzes:', error);
    }
}

function renderQuizzes(quizzes) {
    console.log('renderQuizzes called with:', quizzes);
    const container = document.getElementById('quizzes-list');
    console.log('Container element:', container);
    if (!container) {
        console.error('quizzes-list container not found!');
        return;
    }
    container.innerHTML = quizzes.map(quiz => `
        <div class="data-card">
            <div class="data-card-header">
                <div class="data-card-title">
                    <span>${quiz.icon || '🎓'}</span>
                    <span>${quiz.title}</span>
                    <span class="badge ${quiz.isActive ? 'badge-active' : 'badge-inactive'}">
                        ${quiz.isActive ? 'Actif' : 'Inactif'}
                    </span>
                </div>
                <div class="data-card-actions">
                    <button class="btn-edit" onclick="editQuiz('${quiz.id}')">Modifier</button>
                    <button class="btn-delete" onclick="deleteQuiz('${quiz.id}')">Supprimer</button>
                </div>
            </div>
            <div class="data-card-body">
                <p>${quiz.description || ''}</p>
                <p><strong>Nombre de questions:</strong> ${quiz.questions ? quiz.questions.length : 0}</p>
            </div>
        </div>
    `).join('');
}

async function showAddQuizModal() {
    await populateSubjectSelect('quizSubject');
    document.getElementById('quizModalTitle').textContent = 'Ajouter un quiz';
    document.getElementById('quizForm').reset();
    document.getElementById('quizId').value = '';
    currentQuestions = [];
    renderQuestionsList();
    document.getElementById('quizModal').style.display = 'block';
}

async function editQuiz(id) {
    try {
        await populateSubjectSelect('quizSubject');

        const response = await fetch(`/api/quizzes/${id}`);
        const data = await response.json();

        if (data.success) {
            const quiz = data.data;
            document.getElementById('quizModalTitle').textContent = 'Modifier le quiz';
            document.getElementById('quizId').value = quiz.id;
            document.getElementById('quizSubject').value = quiz.subjectId;
            document.getElementById('quizLesson').value = quiz.lessonId || '';
            document.getElementById('quizTitle').value = quiz.title;
            document.getElementById('quizDescription').value = quiz.description || '';
            document.getElementById('quizIcon').value = quiz.icon || '';
            document.getElementById('quizActive').checked = quiz.isActive;

            currentQuestions = quiz.questions || [];
            renderQuestionsList();

            document.getElementById('quizModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading quiz:', error);
    }
}

async function deleteQuiz(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce quiz ?')) return;

    try {
        const response = await fetch(`/api/quizzes/${id}`, { method: 'DELETE' });
        const data = await response.json();

        if (data.success) {
            alert('Quiz supprimé avec succès');
            loadQuizzes();
        }
    } catch (error) {
        console.error('Error deleting quiz:', error);
        alert('Erreur lors de la suppression');
    }
}

function addQuestion() {
    currentQuestions.push({
        id: currentQuestions.length + 1,
        text: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        explanation: ''
    });
    renderQuestionsList();
}

function removeQuestion(index) {
    currentQuestions.splice(index, 1);
    // Renumber questions
    currentQuestions.forEach((q, i) => q.id = i + 1);
    renderQuestionsList();
}

function renderQuestionsList() {
    const container = document.getElementById('questionsList');
    container.innerHTML = currentQuestions.map((q, index) => `
        <div class="question-item">
            <div class="question-header">
                <h4>Question ${q.id}</h4>
                <button type="button" class="btn-delete" onclick="removeQuestion(${index})">Supprimer</button>
            </div>
            <div class="form-group">
                <label>Question</label>
                <input type="text" value="${q.text}" 
                    onchange="currentQuestions[${index}].text = this.value">
            </div>
            <div class="form-group">
                <label>Options de réponse</label>
                <div class="option-group">
                    ${q.options.map((opt, optIndex) => `
                        <div class="option-item">
                            <input type="radio" name="correct${index}" 
                                ${q.correctAnswer === optIndex ? 'checked' : ''}
                                onchange="currentQuestions[${index}].correctAnswer = ${optIndex}">
                            <input type="text" placeholder="Option ${optIndex + 1}" value="${opt}"
                                onchange="currentQuestions[${index}].options[${optIndex}] = this.value">
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="form-group">
                <label>Explication (optionnel)</label>
                <input type="text" value="${q.explanation || ''}"
                    onchange="currentQuestions[${index}].explanation = this.value">
            </div>
        </div>
    `).join('');
}

document.getElementById('quizForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('quizId').value;
    const quizData = {
        subjectId: document.getElementById('quizSubject').value,
        lessonId: document.getElementById('quizLesson').value || null,
        title: document.getElementById('quizTitle').value,
        description: document.getElementById('quizDescription').value,
        icon: document.getElementById('quizIcon').value,
        isActive: document.getElementById('quizActive').checked,
        questions: currentQuestions
    };

    try {
        const url = id ? `/api/quizzes/${id}` : '/api/quizzes';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quizData)
        });

        const data = await response.json();

        if (data.success) {
            alert(id ? 'Quiz modifié avec succès' : 'Quiz créé avec succès');
            closeModal('quizModal');
            loadQuizzes();
        }
    } catch (error) {
        console.error('Error saving quiz:', error);
        alert('Erreur lors de l\'enregistrement');
    }
});

// ========== UTILITIES ==========

async function populateSubjectSelect(selectId) {
    try {
        const response = await fetch('/api/subjects');
        const data = await response.json();

        if (data.success) {
            const select = document.getElementById(selectId);
            select.innerHTML = '<option value="">Sélectionner une matière</option>' +
                data.data.map(s => `<option value="${s.id}">${s.icon} ${s.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading subjects:', error);
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Initialize
async function init() {
    console.log('Admin.js: Initializing...');
    const authenticated = await checkAuth();
    console.log('Admin.js: Authenticated =', authenticated);
    if (authenticated) {
        console.log('Admin.js: Loading data...');
        loadSubjects();
        loadLessons();
        loadQuizzes();
    }
}
