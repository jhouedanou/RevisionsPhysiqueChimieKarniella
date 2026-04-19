const express = require('express');
const router = express.Router();
const dataManager = require('../utils/dataManager');
const { requireAuth } = require('./auth');

// ========== SUBJECTS ==========

// Get all subjects (public)
router.get('/subjects', async (req, res) => {
    try {
        const subjects = await dataManager.getSubjects();
        res.json({ success: true, data: subjects });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get subject by ID (public)
router.get('/subjects/:id', async (req, res) => {
    try {
        const subject = await dataManager.getSubjectById(req.params.id);
        if (!subject) {
            return res.status(404).json({ success: false, message: 'Matière non trouvée' });
        }
        res.json({ success: true, data: subject });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create subject (protected)
router.post('/subjects', requireAuth, async (req, res) => {
    try {
        const subject = await dataManager.createSubject(req.body);
        res.json({ success: true, data: subject });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update subject (protected)
router.put('/subjects/:id', requireAuth, async (req, res) => {
    try {
        const subject = await dataManager.updateSubject(req.params.id, req.body);
        res.json({ success: true, data: subject });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete subject (protected)
router.delete('/subjects/:id', requireAuth, async (req, res) => {
    try {
        await dataManager.deleteSubject(req.params.id);
        res.json({ success: true, message: 'Matière supprimée' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ========== LESSONS ==========

// Get all lessons (public)
router.get('/lessons', async (req, res) => {
    try {
        const subjectId = req.query.subjectId;
        const lessons = await dataManager.getLessons(subjectId);
        res.json({ success: true, data: lessons });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get lesson by ID (public)
router.get('/lessons/:id', async (req, res) => {
    try {
        const lesson = await dataManager.getLessonById(req.params.id);
        if (!lesson) {
            return res.status(404).json({ success: false, message: 'Leçon non trouvée' });
        }
        res.json({ success: true, data: lesson });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create lesson (protected)
router.post('/lessons', requireAuth, async (req, res) => {
    try {
        const lesson = await dataManager.createLesson(req.body);
        res.json({ success: true, data: lesson });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update lesson (protected)
router.put('/lessons/:id', requireAuth, async (req, res) => {
    try {
        const lesson = await dataManager.updateLesson(req.params.id, req.body);
        res.json({ success: true, data: lesson });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete lesson (protected)
router.delete('/lessons/:id', requireAuth, async (req, res) => {
    try {
        await dataManager.deleteLesson(req.params.id);
        res.json({ success: true, message: 'Leçon supprimée' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ========== QUIZZES ==========

// Get all quizzes (public)
router.get('/quizzes', async (req, res) => {
    try {
        const { subjectId, lessonId } = req.query;
        const quizzes = await dataManager.getQuizzes(subjectId, lessonId);
        res.json({ success: true, data: quizzes });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get quiz by ID (public)
router.get('/quizzes/:id', async (req, res) => {
    try {
        const quiz = await dataManager.getQuizById(req.params.id);
        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz non trouvé' });
        }
        res.json({ success: true, data: quiz });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create quiz (protected)
router.post('/quizzes', requireAuth, async (req, res) => {
    try {
        const quiz = await dataManager.createQuiz(req.body);
        res.json({ success: true, data: quiz });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update quiz (protected)
router.put('/quizzes/:id', requireAuth, async (req, res) => {
    try {
        const quiz = await dataManager.updateQuiz(req.params.id, req.body);
        res.json({ success: true, data: quiz });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete quiz (protected)
router.delete('/quizzes/:id', requireAuth, async (req, res) => {
    try {
        await dataManager.deleteQuiz(req.params.id);
        res.json({ success: true, message: 'Quiz supprimé' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
