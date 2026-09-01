// AssessX Live Exam Engine & Proctoring Handler

let assessment = null;
let questions = [];
let currentIndex = 0;
let answers = {}; // questionId -> "A"|"B"|"C"|"D"
let flaggedQuestions = new Set();
let timerInterval = null;
let timeRemaining = 0;
let violationsCount = 0;
let hasSubmitted = false;

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const assessmentId = urlParams.get('id');

    if (!assessmentId) {
        alert('No assessment ID specified.');
        window.location.href = 'student-dashboard.html';
        return;
    }

    await loadExam(assessmentId);
    setupProctoring();
    setupEventListeners();
});

async function loadExam(id) {
    try {
        assessment = await ApiService.get(`/assessments/${id}`);
        questions = assessment.questions || [];

        if (questions.length === 0) {
            alert('This assessment currently has no questions.');
            window.location.href = 'student-dashboard.html';
            return;
        }

        document.getElementById('examTitle').textContent = assessment.title;
        document.getElementById('examMeta').textContent = 
            `Category: ${assessment.category || 'General'} • Total Marks: ${assessment.totalMarks} • Duration: ${assessment.durationMinutes} mins`;

        timeRemaining = (assessment.durationMinutes || 30) * 60;
        startTimer();
        renderQuestion();
        renderPalette();
    } catch (error) {
        console.error('Failed to load assessment:', error);
        alert('Failed to load assessment. Please try again.');
        window.location.href = 'student-dashboard.html';
    }
}

function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            alert('Time is up! Submitting your assessment automatically.');
            submitExam(true);
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const timerEl = document.getElementById('timerDisplay');
    if (timerEl) {
        timerEl.textContent = display;
        if (timeRemaining < 300) {
            timerEl.style.color = '#EF4444'; // Red if under 5 mins
        }
    }
}

function renderQuestion() {
    if (!questions[currentIndex]) return;
    const q = questions[currentIndex];

    const qNumEl = document.getElementById('questionNumLabel');
    if (qNumEl) qNumEl.textContent = `Question ${currentIndex + 1} of ${questions.length}`;

    const marksEl = document.getElementById('questionMarksLabel');
    if (marksEl) marksEl.textContent = `${q.marks || 1} Marks`;

    const qTextEl = document.getElementById('questionText');
    if (qTextEl) qTextEl.textContent = q.questionText;

    const selectedOption = answers[q.id];

    const optionsContainer = document.getElementById('optionsContainer');
    const options = [
        { letter: 'A', text: q.optionA },
        { letter: 'B', text: q.optionB },
        { letter: 'C', text: q.optionC },
        { letter: 'D', text: q.optionD }
    ];

    optionsContainer.innerHTML = options.map(opt => `
        <div class="option-item ${selectedOption === opt.letter ? 'selected' : ''}" onclick="selectAnswer(${q.id}, '${opt.letter}')">
            <div class="option-letter">${opt.letter}</div>
            <div style="font-size: 0.95rem;">${escapeHtml(opt.text)}</div>
        </div>
    `).join('');

    // Update navigation button states
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const flagBtn = document.getElementById('flagBtn');

    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) {
        nextBtn.textContent = currentIndex === questions.length - 1 ? 'Review & Submit' : 'Next Question →';
    }
    if (flagBtn) {
        flagBtn.style.borderColor = flaggedQuestions.has(currentIndex) ? 'var(--warning)' : 'var(--border)';
        flagBtn.style.color = flaggedQuestions.has(currentIndex) ? 'var(--warning)' : 'var(--text-color)';
    }

    renderPalette();
}

window.selectAnswer = function(questionId, letter) {
    answers[questionId] = letter;
    renderQuestion();
    renderPalette();
};

function renderPalette() {
    const paletteGrid = document.getElementById('paletteGrid');
    if (!paletteGrid) return;

    paletteGrid.innerHTML = questions.map((q, idx) => {
        let cls = 'palette-btn';
        if (idx === currentIndex) cls += ' current';
        if (answers[q.id]) cls += ' answered';
        else if (flaggedQuestions.has(idx)) cls += ' flagged';

        return `<button class="${cls}" onclick="jumpToQuestion(${idx})">${idx + 1}</button>`;
    }).join('');
}

window.jumpToQuestion = function(idx) {
    if (idx >= 0 && idx < questions.length) {
        currentIndex = idx;
        renderQuestion();
    }
};

function setupEventListeners() {
    document.getElementById('prevBtn')?.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            renderQuestion();
        }
    });

    document.getElementById('nextBtn')?.addEventListener('click', () => {
        if (currentIndex < questions.length - 1) {
            currentIndex++;
            renderQuestion();
        } else {
            openSubmitModal();
        }
    });

    document.getElementById('flagBtn')?.addEventListener('click', () => {
        if (flaggedQuestions.has(currentIndex)) {
            flaggedQuestions.delete(currentIndex);
        } else {
            flaggedQuestions.add(currentIndex);
        }
        renderQuestion();
    });

    document.getElementById('finishExamBtn')?.addEventListener('click', openSubmitModal);
    document.getElementById('cancelSubmitBtn')?.addEventListener('click', closeSubmitModal);
    document.getElementById('confirmSubmitBtn')?.addEventListener('click', () => submitExam(false));
}

function openSubmitModal() {
    const answeredCount = Object.keys(answers).length;
    const unansweredCount = questions.length - answeredCount;

    document.getElementById('modalTotalQ').textContent = questions.length;
    document.getElementById('modalAnsweredQ').textContent = answeredCount;
    document.getElementById('modalUnansweredQ').textContent = unansweredCount;
    document.getElementById('submitModal')?.classList.remove('hidden');
}

function closeSubmitModal() {
    document.getElementById('submitModal')?.classList.add('hidden');
}

// Smart AI Proctoring System
function setupProctoring() {
    // 1. Tab-switch & Visibility Detection
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && !hasSubmitted) {
            recordViolation('Tab switched or minimized');
        }
    });

    window.addEventListener('blur', () => {
        if (!hasSubmitted) {
            recordViolation('Browser focus lost');
        }
    });

    // 2. Camera feed initialization (non-blocking)
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                const video = document.getElementById('webcamVideo');
                const placeholder = document.getElementById('webcamPlaceholder');
                if (video) {
                    video.srcObject = stream;
                    video.classList.remove('hidden');
                    if (placeholder) placeholder.classList.add('hidden');
                }
            })
            .catch(() => {
                // Keep simulated camera proctoring sensor active
            });
    }
}

function recordViolation(reason) {
    violationsCount++;
    const sidebarEl = document.getElementById('violationCountSidebar');
    const badgeEl = document.getElementById('violationCountBadge');
    const alertEl = document.getElementById('violationAlert');

    if (sidebarEl) sidebarEl.textContent = violationsCount;
    if (badgeEl) badgeEl.textContent = violationsCount;

    if (alertEl) {
        alertEl.classList.remove('hidden');
        setTimeout(() => {
            alertEl.classList.add('hidden');
        }, 3500);
    }
}

async function submitExam(auto = false) {
    if (hasSubmitted) return;
    hasSubmitted = true;

    if (timerInterval) clearInterval(timerInterval);

    const submitBtn = document.getElementById('confirmSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Grading Exam...';
    }

    try {
        const response = await ApiService.post(`/assessments/${assessment.id}/submit`, {
            answers: answers,
            violationsCount: violationsCount
        });

        if (response && response.submissionId) {
            window.location.href = `result.html?id=${response.submissionId}`;
        } else {
            alert('Assessment submitted successfully.');
            window.location.href = 'student-dashboard.html';
        }
    } catch (error) {
        console.error('Submission failed:', error);
        alert(error.message || 'Failed to submit assessment. Please check your network connection.');
        hasSubmitted = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Confirm & Submit';
        }
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
