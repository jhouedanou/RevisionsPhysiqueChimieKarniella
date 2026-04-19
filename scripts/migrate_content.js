const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');

const DATA_DIR = path.join(__dirname, '../data');
const ROOT_DIR = path.join(__dirname, '../');

// Mappings for subjects
const SUBJECT_MAP = {
    'mathematiques': 'mathematiques',
    'physique': 'physique',
    'svt': 'svt',
    'histoire-geographie': 'histoire-geo',
    'education-civique': 'education-civique'
};

// Helper to generate ID
function generateId(text) {
    return text.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

async function migrate() {
    console.log('🚀 Starting migration...');

    // Read existing JSONs
    const subjectsData = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'subjects.json'), 'utf8'));
    const lessonsData = { lessons: [] }; // Start fresh for lessons to avoid duplicates
    const quizzesData = { quizzes: [] }; // Start fresh for quizzes

    // List of files to process
    const files = await fs.readdir(ROOT_DIR);
    const htmlFiles = files.filter(f => f.endsWith('.html') && !f.includes('index.html') && !f.includes('contrast-backup'));

    for (const file of htmlFiles) {
        console.log(`Processing ${file}...`);
        const content = await fs.readFile(path.join(ROOT_DIR, file), 'utf8');
        const $ = cheerio.load(content);

        // Determine subject
        let subjectId = null;
        if (file.includes('math')) subjectId = 'mathematiques';
        else if (file.includes('physique') || file.includes('circuit') || file.includes('electrique')) subjectId = 'physique';
        else if (file.includes('svt')) subjectId = 'svt';
        else if (file.includes('histoire')) subjectId = 'histoire-geo';
        else if (file.includes('civique')) subjectId = 'education-civique';

        if (!subjectId) continue;

        const title = $('h1').text().replace(/^[^\w]+/, '').trim(); // Remove leading emojis
        const isQuiz = file.includes('quiz');

        if (isQuiz) {
            // Process Quiz
            const quiz = {
                id: generateId(title),
                subjectId: subjectId,
                lessonId: null, // Can't easily determine lesson link automatically
                title: title,
                description: $('header p').text().trim(),
                icon: '📝',
                isActive: true,
                questions: []
            };

            $('.quiz-question').each((i, el) => {
                const qText = $(el).find('.question-text, p').first().text().replace(/^\d+\.\s*/, '').trim();
                const options = [];
                let correctAnswer = 0;
                let explanation = '';

                // Extract options
                $(el).find('.quiz-option, label').each((j, opt) => {
                    const optText = $(opt).text().trim();
                    options.push(optText);

                    // Try to find correct answer from script
                    // This is hard to parse from static JS, so we might need manual adjustment
                    // For now, we'll default to 0 if not found
                });

                // Extract correct answer from script content if possible
                // Looking for checkAnswer('q1', 'b', ...) or quizAnswers object
                const scriptContent = $('script').text();
                const qId = $(el).attr('id') || `q${i + 1}`;

                // Try to find answer in script
                const answerMatch = scriptContent.match(new RegExp(`${qId}['"]?\\s*,\\s*['"]([a-d])['"]`));
                if (answerMatch) {
                    const letter = answerMatch[1];
                    correctAnswer = letter.charCodeAt(0) - 97; // 'a' -> 0
                } else {
                    // Try object format: q1: 'b'
                    const objMatch = scriptContent.match(new RegExp(`${qId}\\s*:\\s*['"]([a-d])['"]`));
                    if (objMatch) {
                        const letter = objMatch[1];
                        correctAnswer = letter.charCodeAt(0) - 97;
                    }
                }

                // Try to find explanation
                const explMatch = scriptContent.match(new RegExp(`${qId}['"]?\\s*,\\s*['"][a-d]['"]\\s*,\\s*['"]([^'"]+)['"]`));
                if (explMatch) {
                    explanation = explMatch[1];
                }

                if (qText && options.length > 0) {
                    quiz.questions.push({
                        id: i + 1,
                        text: qText,
                        options: options,
                        correctAnswer: correctAnswer >= 0 ? correctAnswer : 0,
                        explanation: explanation
                    });
                }
            });

            if (quiz.questions.length > 0) {
                quizzesData.quizzes.push(quiz);
            }

        } else {
            // Process Lesson
            // Extract content from .container inside .content or just .container
            let contentHtml = '';
            const container = $('.container').first();

            if (container.length) {
                // Remove header/title from content as it will be rendered by the template
                container.find('h1').remove();
                // contentHtml = container.html(); // This keeps the container wrapper? No, innerHTML
                // Actually we want the whole structure inside .content usually

                // If there are tabs, we want to preserve them but maybe restructure?
                // For simplicity, let's take the .content innerHTML but clean it up
                const contentDiv = $('.content');
                if (contentDiv.length) {
                    contentHtml = contentDiv.html();
                } else {
                    contentHtml = container.html();
                }
            }

            if (contentHtml) {
                const lesson = {
                    id: generateId(title),
                    subjectId: subjectId,
                    title: title,
                    icon: '📄', // Default icon
                    description: $('header p').text().trim(),
                    content: contentHtml.trim(),
                    url: file, // Keep original URL reference
                    order: lessonsData.lessons.length + 1,
                    isActive: true,
                    hasQuiz: false // Will update if we find a matching quiz
                };
                lessonsData.lessons.push(lesson);
            }
        }
    }

    // Link quizzes to lessons
    for (const quiz of quizzesData.quizzes) {
        // Try to find matching lesson
        const matchingLesson = lessonsData.lessons.find(l =>
            quiz.title.toLowerCase().includes(l.title.toLowerCase()) ||
            l.title.toLowerCase().includes(quiz.title.replace('Quiz - ', '').toLowerCase())
        );

        if (matchingLesson) {
            quiz.lessonId = matchingLesson.id;
            matchingLesson.hasQuiz = true;
        }
    }

    // Write back to files
    await fs.writeFile(path.join(DATA_DIR, 'lessons.json'), JSON.stringify(lessonsData, null, 2));
    await fs.writeFile(path.join(DATA_DIR, 'quizzes.json'), JSON.stringify(quizzesData, null, 2));

    console.log(`✅ Migration complete!`);
    console.log(`Imported ${lessonsData.lessons.length} lessons`);
    console.log(`Imported ${quizzesData.quizzes.length} quizzes`);
}

migrate().catch(console.error);
