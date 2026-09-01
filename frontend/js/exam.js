// AssessX Live Exam Engine with Real-Time AI Phone Detection & Strict Security Lockdown

let assessment = null;
let questions = [];
let currentIndex = 0;
let answers = {}; // questionId -> "A"|"B"|"C"|"D"
let flaggedQuestions = new Set();
let timerInterval = null;
let timeRemaining = 0;
let violationsCount = 0;
const MAX_VIOLATIONS = 5;
let violationLogs = [];
let hasSubmitted = false;
let isExamStarted = false;
let cocoModel = null;
let detectionInterval = null;
let audioCtx = null;
let lastPhoneViolationTime = 0;

// Fallback Questions to ensure student is NEVER blocked under any network/server scenario
const FALLBACK_EXAMS = {
    1: {
        id: 1,
        title: "Java Core & Spring Boot Master Exam",
        category: "Java & Spring Boot",
        durationMinutes: 30,
        totalMarks: 50,
        passMarks: 30,
        questions: [
            {
                id: 101,
                questionText: "Which HTTP status code is returned by Spring Boot when a resource is successfully created via @PostMapping?",
                optionA: "200 OK",
                optionB: "201 Created",
                optionC: "204 No Content",
                optionD: "302 Found",
                marks: 10,
                correctOption: "B",
                explanation: "HTTP 201 Created is the standard response indicating that the request has succeeded and led to the creation of a resource."
            },
            {
                id: 102,
                questionText: "Which annotation in Spring Boot is used to mark a class as a global exception handling component?",
                optionA: "@ExceptionHandler",
                optionB: "@ControllerAdvice / @RestControllerAdvice",
                optionC: "@ResponseStatus",
                optionD: "@ErrorHandling",
                marks: 10,
                correctOption: "B",
                explanation: "@ControllerAdvice and @RestControllerAdvice allow handling exceptions across the whole application in one global component."
            },
            {
                id: 103,
                questionText: "What is the primary role of the ApplicationContext in the Spring Framework?",
                optionA: "Managing database connections and transactions directly",
                optionB: "IoC Container responsible for instantiating, configuring, and wiring beans",
                optionC: "Compiling Java bytecode to native machine code",
                optionD: "Rendering HTML user interfaces on the server",
                marks: 10,
                correctOption: "B",
                explanation: "ApplicationContext is Spring's central Inversion of Control (IoC) container that manages bean lifecycle and dependency injection."
            },
            {
                id: 104,
                questionText: "In Java, what is the key difference between String, StringBuilder, and StringBuffer?",
                optionA: "String is mutable; StringBuilder is immutable; StringBuffer is thread-unsafe",
                optionB: "String is immutable; StringBuilder is mutable and thread-safe; StringBuffer is non-synchronized",
                optionC: "String is immutable; StringBuilder is mutable and non-synchronized; StringBuffer is mutable and thread-safe",
                optionD: "There is no difference in memory allocation or synchronization",
                marks: 10,
                correctOption: "C",
                explanation: "String objects are immutable. StringBuilder provides mutable strings without thread synchronization (fastest for single-thread), while StringBuffer methods are synchronized for thread-safety."
            },
            {
                id: 105,
                questionText: "Which JPA cascade type ensures that when a parent entity is deleted, all associated child entities are also removed?",
                optionA: "CascadeType.PERSIST",
                optionB: "CascadeType.MERGE",
                optionC: "CascadeType.REMOVE / CascadeType.ALL",
                optionD: "CascadeType.REFRESH",
                marks: 10,
                correctOption: "C",
                explanation: "CascadeType.REMOVE (or CascadeType.ALL which includes REMOVE) propagates the delete operation from parent to associated child entities."
            }
        ]
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    // Ensure student demo token exists if none present
    let token = localStorage.getItem('token');
    if (!token) {
        token = 'demo_student_token_' + Date.now();
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({
            name: 'Alex Johnson',
            username: 'student',
            role: 'STUDENT'
        }));
    }

    const urlParams = new URLSearchParams(window.location.search);
    const assessmentId = urlParams.get('id') || '1';

    await loadExam(assessmentId);
    setupKeyboardAndMouseLockdown();
    initAIProctoringEngine();
    setupEventListeners();
});

async function loadExam(id) {
    try {
        assessment = await ApiService.get(`/assessments/${id}`);
        questions = assessment.questions || [];
    } catch (error) {
        console.warn('Backend API assessment load failed, using resilient test fallback:', error);
        assessment = FALLBACK_EXAMS[id] || FALLBACK_EXAMS[1];
        questions = assessment.questions || [];
    }

    if (questions.length === 0) {
        assessment = FALLBACK_EXAMS[1];
        questions = assessment.questions || [];
    }

    document.getElementById('examTitle').textContent = assessment.title;
    document.getElementById('examMeta').textContent = 
        `Category: ${assessment.category || 'General'} • Total Marks: ${assessment.totalMarks} • Duration: ${assessment.durationMinutes} mins`;

    timeRemaining = (assessment.durationMinutes || 30) * 60;
    renderQuestion();
    renderPalette();
}

// ----------------------------------------------------
// 1. AI Vision & Phone Detection (COCO-SSD / TensorFlow.js)
// ----------------------------------------------------
async function initAIProctoringEngine() {
    const statusEl = document.getElementById('aiModelStatus');
    const startBtn = document.getElementById('startFullscreenExamBtn');

    if (startBtn) startBtn.disabled = false;

    try {
        if (typeof cocoSsd !== 'undefined') {
            cocoModel = await cocoSsd.load();
            if (statusEl) {
                statusEl.innerHTML = '🔒 AI Vision & Phone Detection Engine Ready!';
                statusEl.style.color = 'var(--secondary)';
            }
        }
    } catch (e) {
        console.warn('AI Vision model loading in background:', e);
    }
}

async function startCameraAndDetection() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
                audio: false
            });

            const video = document.getElementById('webcamVideo');
            const placeholder = document.getElementById('webcamPlaceholder');
            if (video) {
                video.srcObject = stream;
                video.classList.remove('hidden');
                if (placeholder) placeholder.classList.add('hidden');

                video.onloadedmetadata = () => {
                    video.play();
                    startContinuousObjectDetection(video);
                };
            }
        } catch (err) {
            console.warn('Webcam permission not granted (standard sensor fallback active):', err);
        }
    }
}

function startContinuousObjectDetection(video) {
    const canvas = document.getElementById('detectionCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    detectionInterval = setInterval(async () => {
        if (!cocoModel || hasSubmitted || !isExamStarted || video.paused || video.ended) return;

        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;

        try {
            const predictions = await cocoModel.detect(video);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            let phoneDetected = false;

            predictions.forEach(pred => {
                const className = pred.class.toLowerCase();
                const score = pred.score;

                if ((className === 'cell phone' || className === 'phone' || className === 'remote' || className === 'laptop') && score > 0.45) {
                    phoneDetected = true;

                    // Draw red bounding box
                    ctx.strokeStyle = '#EF4444';
                    ctx.lineWidth = 4;
                    ctx.strokeRect(pred.bbox[0], pred.bbox[1], pred.bbox[2], pred.bbox[3]);

                    ctx.fillStyle = '#EF4444';
                    ctx.font = 'bold 16px Inter, sans-serif';
                    ctx.fillText(`🚨 ${pred.class.toUpperCase()} (${Math.round(score * 100)}%)`, pred.bbox[0], pred.bbox[1] > 20 ? pred.bbox[1] - 5 : 20);
                }
            });

            if (phoneDetected) {
                const now = Date.now();
                if (now - lastPhoneViolationTime > 6000) {
                    lastPhoneViolationTime = now;
                    triggerPhoneViolationAlert();
                }
            } else {
                document.getElementById('proctorWidgetBox')?.classList.remove('phone-alert-flash');
            }
        } catch (e) {}
    }, 1000);
}

function triggerPhoneViolationAlert() {
    playSecurityBuzzer();
    const box = document.getElementById('proctorWidgetBox');
    const banner = document.getElementById('phoneAlertBanner');
    const countEl = document.getElementById('phoneViolationCount');

    if (box) box.classList.add('phone-alert-flash');
    if (banner) banner.classList.remove('hidden');

    recordViolation('Mobile Phone / Unauthorized Device Detected by AI Camera');
    if (countEl) countEl.textContent = violationsCount;

    setTimeout(() => {
        if (banner) banner.classList.add('hidden');
        if (box) box.classList.remove('phone-alert-flash');
    }, 4500);
}

// ----------------------------------------------------
// 2. Audio Warning Synthesizer
// ----------------------------------------------------
function playSecurityBuzzer() {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.45);
    } catch (e) {}
}

// ----------------------------------------------------
// 3. Keyboard & Clipboard Lockdown
// ----------------------------------------------------
function setupKeyboardAndMouseLockdown() {
    window.addEventListener('keydown', (e) => {
        if (!isExamStarted || hasSubmitted) return;

        const isCtrlOrCmd = e.ctrlKey || e.metaKey;
        const key = e.key.toLowerCase();

        if (
            isCtrlOrCmd ||
            key === 'f12' ||
            key === 'f5' ||
            (e.altKey && key === 'tab') ||
            key === 'escape'
        ) {
            e.preventDefault();
            e.stopPropagation();

            showKeyBlockedToast(`Shortcut [${e.ctrlKey ? 'Ctrl+' : ''}${e.key.toUpperCase()}] is blocked during exams!`);
            recordViolation(`Attempted prohibited keyboard shortcut: ${e.key.toUpperCase()}`);
            playSecurityBuzzer();
            return false;
        }
    }, true);

    document.addEventListener('contextmenu', (e) => {
        if (!isExamStarted || hasSubmitted) return;
        e.preventDefault();
        showKeyBlockedToast('Right-click context menu is strictly disabled.');
        return false;
    });

    ['copy', 'paste', 'cut'].forEach(evt => {
        document.addEventListener(evt, (e) => {
            if (!isExamStarted || hasSubmitted) return;
            e.preventDefault();
            showKeyBlockedToast(`Clipboard operation (${evt.toUpperCase()}) is blocked!`);
            recordViolation(`Clipboard action attempted: ${evt}`);
        });
    });
}

function showKeyBlockedToast(msg) {
    const toast = document.getElementById('keyBlockedToast');
    const msgEl = document.getElementById('keyBlockedMsg');
    if (msgEl) msgEl.textContent = msg;
    if (toast) {
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 2800);
    }
}

// ----------------------------------------------------
// 4. Tab-Switch & Fullscreen Enforcement
// ----------------------------------------------------
function setupProctoring() {
    document.addEventListener('visibilitychange', () => {
        if (!isExamStarted || hasSubmitted) return;
        if (document.hidden) {
            showLockdownModal('Tab switch or browser minimization detected!');
            recordViolation('Tab switched away from exam room');
        }
    });

    window.addEventListener('blur', () => {
        if (!isExamStarted || hasSubmitted) return;
        showLockdownModal('Window focus lost. Please return to the examination window.');
        recordViolation('Exam window focus lost');
    });

    document.addEventListener('fullscreenchange', () => {
        if (!isExamStarted || hasSubmitted) return;
        if (!document.fullscreenElement) {
            showLockdownModal('You have exited fullscreen lockdown mode!');
            recordViolation('Exited fullscreen mode');
        }
    });
}

function showLockdownModal(reason) {
    playSecurityBuzzer();
    const overlay = document.getElementById('lockdownOverlay');
    const msgEl = document.getElementById('lockdownOverlayMsg');
    const countEl = document.getElementById('lockdownViolationCount');

    if (msgEl) msgEl.textContent = reason;
    if (countEl) countEl.textContent = `${violationsCount} / ${MAX_VIOLATIONS}`;
    if (overlay) overlay.classList.remove('hidden');
}

function recordViolation(reason) {
    if (hasSubmitted) return;
    violationsCount++;
    const timestamp = new Date().toLocaleTimeString();
    violationLogs.push(`[${timestamp}] ${reason}`);

    const sidebarEl = document.getElementById('violationCountSidebar');
    const badgeEl = document.getElementById('violationCountBadge');
    const alertEl = document.getElementById('violationAlert');
    const reasonEl = document.getElementById('violationReasonText');
    const lockdownCountEl = document.getElementById('lockdownViolationCount');

    if (sidebarEl) sidebarEl.textContent = `${violationsCount} / ${MAX_VIOLATIONS}`;
    if (badgeEl) badgeEl.textContent = violationsCount;
    if (lockdownCountEl) lockdownCountEl.textContent = `${violationsCount} / ${MAX_VIOLATIONS}`;
    if (reasonEl) reasonEl.textContent = reason;

    if (alertEl) {
        alertEl.classList.remove('hidden');
        setTimeout(() => alertEl.classList.add('hidden'), 3500);
    }

    if (violationsCount >= MAX_VIOLATIONS) {
        alert(`🚨 MAXIMUM PROCTORING VIOLATIONS (${MAX_VIOLATIONS}) EXCEEDED!\nYour assessment has been automatically locked and submitted.`);
        submitExam(true);
    }
}

// ----------------------------------------------------
// 5. Exam Lifecycle & Timer
// ----------------------------------------------------
function setupEventListeners() {
    document.getElementById('startFullscreenExamBtn')?.addEventListener('click', async () => {
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            }
        } catch (e) {
            console.warn('Fullscreen request bypassed:', e);
        }

        document.getElementById('startExamModal')?.classList.add('hidden');
        isExamStarted = true;
        startCameraAndDetection();
        setupProctoring();
        startTimer();
        renderQuestion();
        renderPalette();
    });

    document.getElementById('resumeExamBtn')?.addEventListener('click', async () => {
        try {
            if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            }
        } catch (e) {}
        document.getElementById('lockdownOverlay')?.classList.add('hidden');
    });

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
            timerEl.style.color = '#EF4444';
        }
    }
}

function renderQuestion() {
    if (!questions[currentIndex]) return;
    const q = questions[currentIndex];

    const qNumEl = document.getElementById('questionNumLabel');
    if (qNumEl) qNumEl.textContent = `Question ${currentIndex + 1} of ${questions.length}`;

    const marksEl = document.getElementById('questionMarksLabel');
    if (marksEl) marksEl.textContent = `${q.marks || 10} Marks`;

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

async function submitExam(auto = false) {
    if (hasSubmitted) return;
    hasSubmitted = true;

    if (timerInterval) clearInterval(timerInterval);
    if (detectionInterval) clearInterval(detectionInterval);

    try {
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen();
        }
    } catch (e) {}

    const submitBtn = document.getElementById('confirmSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Grading Exam...';
    }

    try {
        let response = null;
        try {
            response = await ApiService.post(`/assessments/${assessment.id}/submit`, {
                answers: answers,
                violationsCount: violationsCount
            });
        } catch (apiErr) {
            console.warn('Backend API submission unreachable, computing client-side scorecard:', apiErr);
            // Client-side auto grading fallback
            let score = 0;
            let correctCount = 0;
            const fullAnswers = questions.map(q => {
                const isCorr = answers[q.id] === q.correctOption;
                const marks = isCorr ? (q.marks || 10) : 0;
                if (isCorr) {
                    score += marks;
                    correctCount++;
                }
                return {
                    questionId: q.id,
                    questionText: q.questionText,
                    selectedOption: answers[q.id] || null,
                    correctOption: q.correctOption,
                    explanation: q.explanation,
                    correct: isCorr,
                    marksAwarded: marks
                };
            });

            const percentage = Math.round((score / (assessment.totalMarks || 50)) * 100);
            const passed = score >= (assessment.passMarks || 30);
            const subId = 'sub_' + Date.now();

            const mockResult = {
                submissionId: subId,
                assessmentId: assessment.id,
                assessmentTitle: assessment.title,
                studentName: 'Alex Johnson',
                studentUsername: 'student',
                score: score,
                totalMarks: assessment.totalMarks || 50,
                passMarks: assessment.passMarks || 30,
                percentage: percentage,
                passed: passed,
                correctAnswers: correctCount,
                totalQuestions: questions.length,
                violationsCount: violationsCount,
                submittedAt: new Date().toISOString(),
                answers: fullAnswers
            };

            localStorage.setItem(`result_${subId}`, JSON.stringify(mockResult));
            response = { submissionId: subId };
        }

        localStorage.setItem(`violations_${response.submissionId}`, JSON.stringify(violationLogs));

        if (response && response.submissionId) {
            window.location.href = `result.html?id=${response.submissionId}`;
        } else {
            window.location.href = 'student-dashboard.html';
        }
    } catch (error) {
        console.error('Submission failed:', error);
        alert(error.message || 'Failed to submit assessment.');
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
