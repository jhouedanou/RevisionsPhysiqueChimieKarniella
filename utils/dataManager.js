const fs = require('fs').promises;
const path = require('path');

class DataManager {
    constructor() {
        this.dataDir = path.join(__dirname, '../data');
    }

    async readJSON(filename) {
        try {
            const filePath = path.join(this.dataDir, filename);
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error reading ${filename}:`, error);
            throw error;
        }
    }

    async writeJSON(filename, data) {
        try {
            const filePath = path.join(this.dataDir, filename);
            await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error(`Error writing ${filename}:`, error);
            throw error;
        }
    }

    // Subjects
    async getSubjects() {
        const data = await this.readJSON('subjects.json');
        return data.subjects.sort((a, b) => a.order - b.order);
    }

    async getSubjectById(id) {
        const subjects = await this.getSubjects();
        return subjects.find(s => s.id === id);
    }

    async createSubject(subject) {
        const data = await this.readJSON('subjects.json');
        const newSubject = {
            id: this.generateId(subject.name),
            ...subject,
            order: data.subjects.length + 1
        };
        data.subjects.push(newSubject);
        await this.writeJSON('subjects.json', data);
        return newSubject;
    }

    async updateSubject(id, updates) {
        const data = await this.readJSON('subjects.json');
        const index = data.subjects.findIndex(s => s.id === id);
        if (index === -1) throw new Error('Subject not found');
        data.subjects[index] = { ...data.subjects[index], ...updates, id };
        await this.writeJSON('subjects.json', data);
        return data.subjects[index];
    }

    async deleteSubject(id) {
        const data = await this.readJSON('subjects.json');
        data.subjects = data.subjects.filter(s => s.id !== id);
        await this.writeJSON('subjects.json', data);
        return true;
    }

    // Lessons
    async getLessons(subjectId = null) {
        const data = await this.readJSON('lessons.json');
        let lessons = data.lessons;
        if (subjectId) {
            lessons = lessons.filter(l => l.subjectId === subjectId);
        }
        return lessons.sort((a, b) => a.order - b.order);
    }

    async getLessonById(id) {
        const lessons = await this.getLessons();
        return lessons.find(l => l.id === id);
    }

    async createLesson(lesson) {
        const data = await this.readJSON('lessons.json');
        const newLesson = {
            id: this.generateId(lesson.title),
            ...lesson,
            order: data.lessons.filter(l => l.subjectId === lesson.subjectId).length + 1
        };
        data.lessons.push(newLesson);
        await this.writeJSON('lessons.json', data);
        return newLesson;
    }

    async updateLesson(id, updates) {
        const data = await this.readJSON('lessons.json');
        const index = data.lessons.findIndex(l => l.id === id);
        if (index === -1) throw new Error('Lesson not found');
        data.lessons[index] = { ...data.lessons[index], ...updates, id };
        await this.writeJSON('lessons.json', data);
        return data.lessons[index];
    }

    async deleteLesson(id) {
        const data = await this.readJSON('lessons.json');
        data.lessons = data.lessons.filter(l => l.id !== id);
        await this.writeJSON('lessons.json', data);
        return true;
    }

    // Quizzes
    async getQuizzes(subjectId = null, lessonId = null) {
        const data = await this.readJSON('quizzes.json');
        let quizzes = data.quizzes;
        if (subjectId) {
            quizzes = quizzes.filter(q => q.subjectId === subjectId);
        }
        if (lessonId) {
            quizzes = quizzes.filter(q => q.lessonId === lessonId);
        }
        return quizzes;
    }

    async getQuizById(id) {
        const quizzes = await this.getQuizzes();
        return quizzes.find(q => q.id === id);
    }

    async createQuiz(quiz) {
        const data = await this.readJSON('quizzes.json');
        const newQuiz = {
            id: this.generateId(quiz.title),
            ...quiz
        };
        data.quizzes.push(newQuiz);
        await this.writeJSON('quizzes.json', data);
        return newQuiz;
    }

    async updateQuiz(id, updates) {
        const data = await this.readJSON('quizzes.json');
        const index = data.quizzes.findIndex(q => q.id === id);
        if (index === -1) throw new Error('Quiz not found');
        data.quizzes[index] = { ...data.quizzes[index], ...updates, id };
        await this.writeJSON('quizzes.json', data);
        return data.quizzes[index];
    }

    async deleteQuiz(id) {
        const data = await this.readJSON('quizzes.json');
        data.quizzes = data.quizzes.filter(q => q.id !== id);
        await this.writeJSON('quizzes.json', data);
        return true;
    }

    // Helper function to generate IDs from names
    generateId(name) {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') +
            '-' + Date.now();
    }
}

module.exports = new DataManager();
