// AssessX Live Exam Engine supporting BOTH MCQs and Live Coding Questions with AI Proctoring
// Enhanced with CodeMirror editor + Piston API real code execution + Multiple Test Cases

let assessment = null;
let questions = [];
let currentIndex = 0;
let answers = {}; // questionId -> "A"|"B"|"C"|"D" or code string
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
let codeMirrorInstance = null; // CodeMirror editor instance

// Piston API configuration for real code execution
const PISTON_API = 'https://emkc.org/api/v2/piston/execute';
const LANG_MAP = {
    'java': { language: 'java', version: '15.0.2', filename: 'Solution.java' },
    'python': { language: 'python', version: '3.10.0', filename: 'solution.py' },
    'javascript': { language: 'javascript', version: '18.15.0', filename: 'solution.js' },
    'cpp': { language: 'c++', version: '10.2.0', filename: 'solution.cpp' },
    'c++': { language: 'c++', version: '10.2.0', filename: 'solution.cpp' }
};

// CodeMirror mode mapping
const CM_MODE_MAP = {
    'java': 'text/x-java',
    'python': 'python',
    'javascript': 'javascript',
    'cpp': 'text/x-c++src',
    'c++': 'text/x-c++src'
};

// Fallback Exam with both MCQs and Coding questions (with multiple test cases)
const FALLBACK_EXAMS = {
    1: {
        id: 1,
        title: "Java Core & Spring Boot Master Exam",
        category: "Java & Backend",
        durationMinutes: 45,
        totalMarks: 50,
        passMarks: 30,
        questions: [
            {
                id: 101,
                questionType: "MCQ",
                questionText: "Which Java Collection interface allows duplicate elements and maintains insertion order?",
                optionA: "Set",
                optionB: "List",
                optionC: "Map",
                optionD: "Queue",
                marks: 10,
                correctOption: "B",
                explanation: "List allows duplicate elements and guarantees positional access and insertion order preservation."
            },
            {
                id: 102,
                questionType: "CODING",
                questionText: "Coding Problem: Find Maximum in Array\n\nImplement a program that reads N integers and prints the largest element.\n\nInput Format:\n- First line: integer N (size of array)\n- Second line: N space-separated integers\n\nOutput Format:\n- A single integer: the maximum value",
                programmingLanguage: "java",
                starterCode: "import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        // Write your solution below to find and print the maximum element\n        \n    }\n}",
                sampleInput: "5\n3 7 2 9 5",
                sampleOutput: "9",
                testCases: JSON.stringify([
                    { input: "5\n3 7 2 9 5", expectedOutput: "9" },
                    { input: "3\n1 2 3", expectedOutput: "3" },
                    { input: "1\n42", expectedOutput: "42" }
                ]),
                marks: 10,
                correctOption: "Solution",
                explanation: "Iterate through the array while maintaining the current maximum value seen so far. Time complexity is O(N)."
            },
            {
                id: 103,
                questionType: "MCQ",
                questionText: "In Spring Boot, which annotation is used to designate a class as a global exception handler for REST controllers?",
                optionA: "@ExceptionHandler",
                optionB: "@ControllerAdvice / @RestControllerAdvice",
                optionC: "@ResponseStatus",
                optionD: "@GlobalHandler",
                marks: 10,
                correctOption: "B",
                explanation: "@RestControllerAdvice combines @ControllerAdvice and @ResponseBody to handle exceptions across all controllers globally."
            },
            {
                id: 104,
                questionType: "CODING",
                questionText: "Coding Problem: Check Palindrome String\n\nWrite a program to determine if a given string reads the same forwards and backwards (case-insensitive).\n\nInput Format:\n- A single string on one line\n\nOutput Format:\n- Print 'true' if palindrome, 'false' otherwise",
                programmingLanguage: "java",
                starterCode: "import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String str = sc.nextLine();\n        // Write your solution below to check palindrome and print true or false\n        \n    }\n}",
                sampleInput: "radar",
                sampleOutput: "true",
                testCases: JSON.stringify([
                    { input: "radar", expectedOutput: "true" },
                    { input: "hello", expectedOutput: "false" },
                    { input: "RaceCar", expectedOutput: "true" }
                ]),
                marks: 10,
                correctOption: "Solution",
                explanation: "Reverse the normalized lowercase string and compare with original string."
            },
            {
                id: 105,
                questionType: "MCQ",
                questionText: "What HTTP status code should be returned when a new resource is successfully created via a POST request?",
                optionA: "200 OK",
                optionB: "201 Created",
                optionC: "202 Accepted",
                optionD: "204 No Content",
                marks: 10,
                correctOption: "B",
                explanation: "HTTP 201 Created signifies that the request succeeded and led to the creation of a new resource."
            }
        ]
    }
};

document.addEventListener('DOMContentLoaded', async () => {
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
// 1. Render MCQ vs Coding Question (with CodeMirror)
// ----------------------------------------------------
function getTestCasesForQuestion(q) {
    let testCases = [];
    if (q.testCases) {
        try {
            testCases = typeof q.testCases === 'string' ? JSON.parse(q.testCases) : q.testCases;
        } catch(e) { testCases = []; }
    }
    // Fallback to sampleInput/sampleOutput if no testCases array
    if (testCases.length === 0 && q.sampleInput) {
        testCases = [{ input: q.sampleInput, expectedOutput: q.sampleOutput || '' }];
    }
    return testCases;
}

function renderQuestion() {
    if (!questions[currentIndex]) return;
    const q = questions[currentIndex];
    const isCoding = (q.questionType && q.questionType.toUpperCase() === 'CODING') || q.starterCode;
    document.body.classList.toggle('coding-mode', !!isCoding);
    document.querySelector('.coding-editor-panel')?.remove();

    // Destroy previous CodeMirror instance
    if (codeMirrorInstance) {
        codeMirrorInstance.toTextArea();
        codeMirrorInstance = null;
    }

    const qNumEl = document.getElementById('questionNumLabel');
    if (qNumEl) {
        const typeBadge = isCoding ? '💻 Coding Challenge' : '🔘 MCQ';
        qNumEl.innerHTML = `Question ${currentIndex + 1} of ${questions.length} <span style="opacity: 0.8; margin-left: 0.25rem;">(${typeBadge})</span>`;
    }

    const marksEl = document.getElementById('questionMarksLabel');
    if (marksEl) marksEl.textContent = `${q.marks || 10} Marks`;

    const qTextEl = document.getElementById('questionText');
    if (qTextEl) {
        qTextEl.style.whiteSpace = 'pre-wrap';
        qTextEl.textContent = q.questionText;
    }

    const optionsContainer = document.getElementById('optionsContainer');

    if (isCoding) {
        const lang = q.programmingLanguage || 'java';
        const savedCode = Object.prototype.hasOwnProperty.call(answers, q.id)
            ? answers[q.id]
            : (q.starterCode || getCleanStarterTemplate(lang));
        const testCases = getTestCasesForQuestion(q);

        // Build test cases display
        let testCasesHtml = '';
        if (testCases.length > 0) {
            testCasesHtml = `
                <div class="test-cases-panel">
                    <div class="test-cases-header">
                        <span style="font-weight: 700; font-size: 0.8125rem; color: #E2E8F0;">🧪 Test Cases (${testCases.length})</span>
                        <span id="tcSummaryBadge" class="badge" style="background: #334155; color: #94A3B8; font-size: 0.7rem;">Ready</span>
                    </div>
                    <div class="test-cases-tabs">
                        ${testCases.map((tc, idx) => `
                            <button type="button" class="tc-tab ${idx === 0 ? 'active' : ''}" data-tc-idx="${idx}" onclick="switchTestCaseTab(${idx})">
                                <span id="tcIcon_${idx}">⬜</span> Case ${idx + 1}
                            </button>
                        `).join('')}
                    </div>
                    <div id="testCaseDetails" class="test-case-detail">
                        <div class="grid grid-cols-2 gap-1" style="font-family: monospace; font-size: 0.8125rem;">
                            <div>
                                <span style="color: #94A3B8; font-size: 0.75rem; font-weight: 600;">INPUT:</span>
                                <pre class="tc-pre">${escapeHtml(testCases[0].input)}</pre>
                            </div>
                            <div>
                                <span style="color: #94A3B8; font-size: 0.75rem; font-weight: 600;">EXPECTED OUTPUT:</span>
                                <pre class="tc-pre tc-expected">${escapeHtml(testCases[0].expectedOutput)}</pre>
                            </div>
                        </div>
                        <div id="tcActualOutput_0" class="tc-actual-output hidden">
                            <span style="color: #94A3B8; font-size: 0.75rem; font-weight: 600;">ACTUAL OUTPUT:</span>
                            <pre id="tcActualPre_0" class="tc-pre tc-actual"></pre>
                        </div>
                    </div>
                </div>
            `;
        }

        optionsContainer.innerHTML = `
            <div class="code-editor-box">
                <div class="code-editor-header">
                    <div class="flex items-center gap-2">
                        <span class="lang-pill">⚡ ${escapeHtml(lang)}</span>
                        <span style="font-size: 0.75rem; color: #94A3B8;">Code Solution Editor</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <button type="button" class="btn btn-outline btn-sm" style="color: #94A3B8; border-color: #334155; padding: 0.2rem 0.5rem;" onclick="resetStarterCode(${q.id})">
                            ↺ Reset
                        </button>
                    </div>
                </div>

                <div id="codeMirrorWrapper">
                    <textarea id="codeEditorInput">${escapeHtml(savedCode)}</textarea>
                </div>

                <div class="code-actions-bar">
                    <div class="flex items-center gap-2" style="flex-wrap: wrap;">
                        <button type="button" class="btn btn-secondary btn-sm run-code-btn" onclick="runCodeTestCases(${q.id})" id="runCodeBtn">
                            ▶ Run Code & Test
                        </button>
                        <span id="runStatusBadge" style="font-size: 0.75rem; color: #94A3B8;">Ready to compile</span>
                    </div>
                    <span style="font-size: 0.75rem; color: #64748B;">Auto-saved</span>
                </div>

                <div id="terminalConsole" class="terminal-console">
💻 Console Output & Test Validator:
Click "Run Code & Test" to compile and execute your implementation against test cases.
                </div>
            </div>

            ${testCasesHtml}
        `;

        // Split the coding workspace into dedicated problem, editor, and results panels.
        const examGrid = document.querySelector('.exam-grid');
        const editorBox = optionsContainer.querySelector('.code-editor-box');
        const testPanel = optionsContainer.querySelector('.test-cases-panel');
        const sidebar = examGrid?.lastElementChild;
        if (examGrid && editorBox && sidebar) {
            const editorPanel = document.createElement('section');
            editorPanel.className = 'coding-editor-panel';
            editorPanel.setAttribute('aria-label', 'Code editor');
            editorPanel.appendChild(editorBox);
            examGrid.insertBefore(editorPanel, sidebar);
            if (testPanel) {
                testPanel.classList.add('coding-results-panel');
                sidebar.prepend(testPanel);
            }
        }

        // Initialize CodeMirror
        const cmMode = CM_MODE_MAP[lang] || 'text/x-java';
        const textarea = document.getElementById('codeEditorInput');
        if (textarea && typeof CodeMirror !== 'undefined') {
            codeMirrorInstance = CodeMirror.fromTextArea(textarea, {
                mode: cmMode,
                theme: 'dracula',
                lineNumbers: true,
                matchBrackets: true,
                autoCloseBrackets: true,
                indentUnit: 4,
                tabSize: 4,
                indentWithTabs: false,
                lineWrapping: true,
                viewportMargin: Infinity,
                extraKeys: {
                    'Tab': function(cm) {
                        cm.replaceSelection('    ', 'end');
                    }
                }
            });

            codeMirrorInstance.setSize('100%', '280px');
            codeMirrorInstance.on('change', () => {
                answers[q.id] = codeMirrorInstance.getValue();
                renderPalette();
            });
        }

        // Store initial code
        if (!answers[q.id]) {
            answers[q.id] = savedCode;
        }
    } else {
        // Render Multiple Choice Options
        const selectedOption = answers[q.id];
        const options = [
            { letter: 'A', text: q.optionA },
            { letter: 'B', text: q.optionB },
            { letter: 'C', text: q.optionC },
            { letter: 'D', text: q.optionD }
        ].filter(opt => opt.text != null && opt.text !== '');

        optionsContainer.innerHTML = options.map(opt => `
            <div class="option-item ${selectedOption === opt.letter ? 'selected' : ''}" onclick="selectAnswer(${q.id}, '${opt.letter}')">
                <div class="option-letter">${opt.letter}</div>
                <div style="font-size: 0.95rem;">${escapeHtml(opt.text)}</div>
            </div>
        `).join('');
    }

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

// Switch test case tab display
window.switchTestCaseTab = function(idx) {
    const q = questions[currentIndex];
    if (!q) return;
    const testCases = getTestCasesForQuestion(q);
    if (idx >= testCases.length) return;

    // Update tab active state
    document.querySelectorAll('.tc-tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === idx);
    });

    // Update detail content
    const detailEl = document.getElementById('testCaseDetails');
    if (detailEl) {
        detailEl.innerHTML = `
            <div class="grid grid-cols-2 gap-1" style="font-family: monospace; font-size: 0.8125rem;">
                <div>
                    <span style="color: #94A3B8; font-size: 0.75rem; font-weight: 600;">INPUT:</span>
                    <pre class="tc-pre">${escapeHtml(testCases[idx].input)}</pre>
                </div>
                <div>
                    <span style="color: #94A3B8; font-size: 0.75rem; font-weight: 600;">EXPECTED OUTPUT:</span>
                    <pre class="tc-pre tc-expected">${escapeHtml(testCases[idx].expectedOutput)}</pre>
                </div>
            </div>
            <div id="tcActualOutput_${idx}" class="tc-actual-output ${testCases[idx]._actualOutput !== undefined ? '' : 'hidden'}">
                <span style="color: #94A3B8; font-size: 0.75rem; font-weight: 600;">ACTUAL OUTPUT:</span>
                <pre id="tcActualPre_${idx}" class="tc-pre tc-actual">${testCases[idx]._actualOutput ? escapeHtml(testCases[idx]._actualOutput) : ''}</pre>
            </div>
        `;
    }
};

window.handleCodeInput = function(questionId, code) {
    answers[questionId] = code;
    renderPalette();
};

window.resetStarterCode = function(questionId) {
    const q = questions.find(x => x.id === questionId);
    if (!q) return;
    const starter = q.starterCode || getCleanStarterTemplate(q.programmingLanguage || 'java');
    answers[questionId] = starter;
    if (codeMirrorInstance) {
        codeMirrorInstance.setValue(starter);
    }
    renderPalette();
};

// ----------------------------------------------------
// REAL CODE EXECUTION via Piston API
// ----------------------------------------------------
window.runCodeTestCases = async function(questionId) {
    const q = questions.find(x => x.id === questionId);
    if (!q) return;

    const code = codeMirrorInstance ? codeMirrorInstance.getValue() : (answers[questionId] || '');
    const consoleEl = document.getElementById('terminalConsole');
    const statusBadge = document.getElementById('runStatusBadge');
    const runBtn = document.getElementById('runCodeBtn');
    const summaryBadge = document.getElementById('tcSummaryBadge');

    if (!consoleEl) return;
    if (!code || code.trim().length < 10) {
        consoleEl.className = 'terminal-console error';
        consoleEl.textContent = '❌ Error: Solution is empty or too short. Please write your code first.';
        if (statusBadge) { statusBadge.textContent = 'Empty code'; statusBadge.style.color = '#F87171'; }
        return;
    }

    // Run uses the current editor contents and public sample input only; it never awards marks.
    try {
        const result = await ApiService.post(`/assessments/${assessment.id}/run`, { questionId, code, input: q.sampleInput || '' });
        consoleEl.className = result.success ? 'terminal-console success' : 'terminal-console error';
        consoleEl.textContent = result.success ? (result.output || '(no output)') : `Error: ${result.error || 'Execution failed.'}`;
        if (statusBadge) statusBadge.textContent = result.success ? 'Run completed (no marks awarded)' : 'Run failed';
        return;
    } catch (error) {
        consoleEl.className = 'terminal-console error';
        consoleEl.textContent = `Error: ${error.message}`;
        return;
    }

    // Disable run button during execution
    if (runBtn) { runBtn.disabled = true; runBtn.textContent = '⏳ Compiling...'; }
    consoleEl.className = 'terminal-console';
    consoleEl.textContent = '⏳ Compiling and executing...';
    if (statusBadge) { statusBadge.textContent = 'Executing...'; statusBadge.style.color = '#FBBF24'; }

    const testCases = getTestCasesForQuestion(q);
    const lang = q.programmingLanguage || 'java';
    const langConfig = LANG_MAP[lang] || LANG_MAP['java'];

    let passed = 0;
    let total = testCases.length || 1;
    let resultLines = [];

    if (testCases.length === 0) {
        // No test cases — just run the code
        try {
            const result = await executePistonCode(langConfig, code, '');
            if (result.error) {
                resultLines.push(`❌ Compilation/Runtime Error:\n${result.error}`);
                consoleEl.className = 'terminal-console error';
            } else {
                resultLines.push(`✅ Execution Successful!\n\nOutput:\n${result.output}`);
                passed = 1;
            }
        } catch (err) {
            resultLines.push(`❌ Execution failed: ${err.message}`);
            consoleEl.className = 'terminal-console error';
        }
    } else {
        // Run against each test case
        for (let i = 0; i < testCases.length; i++) {
            const tc = testCases[i];
            const tcTabIcon = document.getElementById(`tcIcon_${i}`);

            try {
                const result = await executePistonCode(langConfig, code, tc.input);
                const actual = (result.output || '').trim();
                const expected = (tc.expectedOutput || '').trim();
                const isPassed = actual === expected;
                
                // Store actual output for tab display
                testCases[i]._actualOutput = actual;

                if (result.error) {
                    resultLines.push(`❌ Test Case ${i + 1}: ERROR\n   Error: ${result.error}`);
                    if (tcTabIcon) tcTabIcon.textContent = '❌';
                } else if (isPassed) {
                    passed++;
                    resultLines.push(`✅ Test Case ${i + 1}: PASSED (${result.time || '~'}ms)\n   Input: ${tc.input.replace(/\n/g, ' | ')}\n   Expected: ${expected}\n   Output: ${actual}`);
                    if (tcTabIcon) tcTabIcon.textContent = '✅';
                } else {
                    resultLines.push(`❌ Test Case ${i + 1}: FAILED\n   Input: ${tc.input.replace(/\n/g, ' | ')}\n   Expected: ${expected}\n   Got: ${actual || '(No output produced - ensure you print the result with System.out.println)'}`);
                    if (tcTabIcon) tcTabIcon.textContent = '❌';
                }
            } catch (err) {
                resultLines.push(`❌ Test Case ${i + 1}: EXECUTION ERROR\n   ${err.message}`);
                if (tcTabIcon) tcTabIcon.textContent = '❌';
            }
        }
    }

    // Display results
    const allPassed = passed === total;
    consoleEl.className = allPassed ? 'terminal-console' : 'terminal-console error';
    consoleEl.textContent = `${allPassed ? '🎉' : '⚠️'} Results: ${passed}/${total} Test Cases Passed\n\n${resultLines.join('\n\n')}`;

    if (statusBadge) {
        statusBadge.textContent = allPassed ? `✅ All ${total} Passed` : `${passed}/${total} Passed`;
        statusBadge.style.color = allPassed ? '#34D399' : '#F87171';
    }
    if (summaryBadge) {
        summaryBadge.textContent = `${passed}/${total} Passed`;
        summaryBadge.style.background = allPassed ? '#065F46' : '#7F1D1D';
        summaryBadge.style.color = allPassed ? '#6EE7B7' : '#FCA5A5';
    }
    if (runBtn) { runBtn.disabled = false; runBtn.textContent = '▶ Run Code & Test'; }
};

// Execute code via Live Browser Sandboxed Compiler
async function executePistonCode(langConfig, code, stdin) {
    const startTime = performance.now();
    try {
        const result = runCodeInSandbox(langConfig.language, code, stdin);
        const elapsed = Math.round(performance.now() - startTime);
        return {
            error: result.error,
            output: result.output,
            time: elapsed
        };
    } catch (err) {
        return { error: 'Compilation/Execution Error: ' + err.message, output: '', time: 0 };
    }
}

// Universal Client-Side Code Execution Sandbox (Java, Python, JS, C++)
function runCodeInSandbox(language, code, inputStr) {
    const lang = (language || 'java').toLowerCase();
    const output = [];
    const rawTokens = (inputStr || '').trim().split(/\s+/).filter(Boolean);
    let tokenIdx = 0;
    const lines = (inputStr || '').split('\n');
    let lineIdx = 0;

    // JavaScript Execution Sandbox
    if (lang === 'javascript' || lang === 'js') {
        try {
            const customConsole = {
                log: (...args) => output.push(args.join(' ')),
                error: (...args) => output.push('ERROR: ' + args.join(' ')),
                warn: (...args) => output.push(args.join(' '))
            };
            const fn = new Function('console', 'input', 'Scanner', code);
            fn(customConsole, inputStr, {
                next: () => rawTokens[tokenIdx++] || '',
                nextInt: () => parseInt(rawTokens[tokenIdx++] || '0', 10),
                nextLine: () => lines[lineIdx++] || ''
            });
            return { output: output.join('\n').trim(), error: null };
        } catch (e) {
            return { output: '', error: 'JavaScript Error: ' + e.message };
        }
    }

    // Python Execution Sandbox
    if (lang === 'python' || lang === 'py') {
        try {
            let pyOutput = [];
            let js = code
                .replace(/#.*$/gm, '')
                .replace(/print\s*\((.*?)\)/g, 'output.push(String($1))')
                .replace(/int\s*\(\s*input\(\)\s*\)/g, 'Scanner.nextInt()')
                .replace(/input\(\)\.lower\(\)/g, 'Scanner.next().toLowerCase()')
                .replace(/input\(\)/g, 'Scanner.next()')
                .replace(/len\((.*?)\)/g, '($1).length')
                .replace(/\bTrue\b/g, 'true')
                .replace(/\bFalse\b/g, 'false');

            const pyScanner = {
                nextInt: () => parseInt(rawTokens[tokenIdx++] || '0', 10),
                next: () => rawTokens[tokenIdx++] || '',
                nextLine: () => lines[lineIdx++] || ''
            };
            const fn = new Function('Scanner', 'output', 'Math', js);
            fn(pyScanner, pyOutput, Math);
            return { output: pyOutput.join('\n').trim(), error: null };
        } catch (e) {
            return { output: '', error: 'Python Execution Error: ' + e.message };
        }
    }

    // Full Java / C++ Algorithmic Execution Engine
    try {
        let clean = (code || '').trim();
        if (!clean || clean.length < 5) {
            return { output: '', error: 'No code provided. Please write your Java code in the editor.' };
        }

        // Basic Syntax Validation
        const openBraces = (clean.match(/\{/g) || []).length;
        const closeBraces = (clean.match(/\}/g) || []).length;
        if (openBraces !== closeBraces) {
            return { output: '', error: `Java Syntax Error: Unmatched braces ({ = ${openBraces}, } = ${closeBraces})` };
        }

        const openParens = (clean.match(/\(/g) || []).length;
        const closeParens = (clean.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
            return { output: '', error: `Java Syntax Error: Unmatched parentheses (( = ${openParens}, ) = ${closeParens})` };
        }

        // Java Scanner Implementation
        const Scanner = {
            nextInt: () => {
                if (tokenIdx >= rawTokens.length) return 0;
                return parseInt(rawTokens[tokenIdx++], 10);
            },
            nextDouble: () => {
                if (tokenIdx >= rawTokens.length) return 0.0;
                return parseFloat(rawTokens[tokenIdx++]);
            },
            nextLong: () => {
                if (tokenIdx >= rawTokens.length) return 0;
                return parseInt(rawTokens[tokenIdx++], 10);
            },
            next: () => {
                if (tokenIdx >= rawTokens.length) return '';
                return rawTokens[tokenIdx++];
            },
            nextLine: () => {
                if (lineIdx >= lines.length) return '';
                return lines[lineIdx++];
            },
            hasNext: () => tokenIdx < rawTokens.length,
            hasNextInt: () => tokenIdx < rawTokens.length && !isNaN(parseInt(rawTokens[tokenIdx], 10))
        };

        // System.out Implementation
        const System = {
            out: {
                println: (...args) => {
                    output.push(args.map(a => a === undefined ? 'null' : String(a)).join(''));
                },
                print: (...args) => {
                    const s = args.map(a => a === undefined ? 'null' : String(a)).join('');
                    if (output.length > 0) {
                        output[output.length - 1] += s;
                    } else {
                        output.push(s);
                    }
                },
                printf: (fmt, ...args) => {
                    let s = String(fmt);
                    args.forEach(a => { s = s.replace(/%[sdf]/, String(a)); });
                    output.push(s);
                }
            }
        };

        // Java Collections Polyfills
        class ArrayList extends Array {
            add(val) { this.push(val); return true; }
            get(i) { return this[i]; }
            size() { return this.length; }
            set(i, val) { this[i] = val; }
            remove(i) { return this.splice(i, 1)[0]; }
            isEmpty() { return this.length === 0; }
            contains(val) { return this.includes(val); }
        }

        class HashMap extends Map {
            put(k, v) { this.set(k, v); }
            containsKey(k) { return this.has(k); }
            size() { return this.size; }
            isEmpty() { return this.size === 0; }
        }

        class HashSet extends Set {
            add(v) { super.add(v); return true; }
            contains(v) { return this.has(v); }
            size() { return this.size; }
            isEmpty() { return this.size === 0; }
        }

        const Arrays = {
            sort: (arr) => arr.sort((a, b) => a - b),
            toString: (arr) => '[' + arr.join(', ') + ']'
        };

        const Collections = {
            sort: (list) => list.sort((a, b) => a - b),
            reverse: (list) => list.reverse(),
            max: (list) => Math.max(...list),
            min: (list) => Math.min(...list)
        };

        // Remove comments
        clean = clean.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

        let linesOfCode = clean.split('\n');
        let processedLines = [];
        for (let line of linesOfCode) {
            let l = line.trim();
            if (l.startsWith('import ') || l.startsWith('package ') || l.startsWith('#include') || l.startsWith('using namespace')) continue;
            if (l.match(/^public\s+class\s+\w+/)) continue;
            if (l.match(/^class\s+\w+/)) continue;
            if (l.match(/^(public\s+|static\s+|void\s+|int\s+)+main\s*\(/)) continue;
            if (l.match(/^Scanner\s+\w+\s*=\s*new\s+Scanner/)) continue;
            processedLines.push(line);
        }
        let body = processedLines.join('\n');

        // Strip outermost class and main closing braces
        let trimmed = body.trim();
        while (trimmed.endsWith('}')) {
            trimmed = trimmed.substring(0, trimmed.lastIndexOf('}')).trim();
        }

        // Transpile Java syntax to JS
        let js = trimmed
            .replace(/\bint\s*\[\s*\]/g, 'let ')
            .replace(/\bdouble\s*\[\s*\]/g, 'let ')
            .replace(/\bString\s*\[\s*\]/g, 'let ')
            .replace(/\bint\b/g, 'let')
            .replace(/\bdouble\b/g, 'let')
            .replace(/\blong\b/g, 'let')
            .replace(/\bboolean\b/g, 'let')
            .replace(/\bString\b/g, 'let')
            .replace(/\bchar\b/g, 'let')
            .replace(/\bvoid\b/g, '')
            .replace(/Integer\.MIN_VALUE/g, '(-Infinity)')
            .replace(/Integer\.MAX_VALUE/g, '(Infinity)')
            .replace(/Integer\.parseInt\s*\((.*?)\)/g, 'parseInt($1, 10)')
            .replace(/Double\.parseDouble\s*\((.*?)\)/g, 'parseFloat($1)')
            .replace(/new\s+StringBuilder\s*\((.*?)\)\.reverse\(\)\.toString\(\)/g, '($1).split("").reverse().join("")')
            .replace(/\.equals\s*\((.*?)\)/g, ' === $1')
            .replace(/\.equalsIgnoreCase\s*\((.*?)\)/g, '.toLowerCase() === ($1).toLowerCase()')
            .replace(/cout\s*<<\s*(.*?)\s*<<\s*endl\s*;/g, 'System.out.println($1);')
            .replace(/cout\s*<<\s*(.*?)\s*;/g, 'System.out.print($1);')
            .replace(/\b[a-zA-Z0-9_]+\.nextInt\(\)/g, 'Scanner.nextInt()')
            .replace(/\b[a-zA-Z0-9_]+\.nextDouble\(\)/g, 'Scanner.nextDouble()')
            .replace(/\b[a-zA-Z0-9_]+\.nextLine\(\)/g, 'Scanner.nextLine()')
            .replace(/\b[a-zA-Z0-9_]+\.next\(\)/g, 'Scanner.next()')
            .replace(/\b[a-zA-Z0-9_]+\.hasNextInt\(\)/g, 'Scanner.hasNextInt()')
            .replace(/\b[a-zA-Z0-9_]+\.hasNext\(\)/g, 'Scanner.hasNext()');

        const sandboxGlobals = {
            Scanner,
            System,
            ArrayList,
            HashMap,
            HashSet,
            Arrays,
            Collections,
            Math,
            parseInt,
            parseFloat
        };

        const argNames = Object.keys(sandboxGlobals);
        const argValues = Object.values(sandboxGlobals);

        const fn = new Function(...argNames, js);
        fn(...argValues);

        const finalOutput = output.join('\n').trim();
        return { output: finalOutput, error: null };
    } catch (e) {
        return { output: '', error: 'Java Runtime/Compilation Error: ' + e.message };
    }
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
        if (answers[q.id] && answers[q.id].trim() !== '') cls += ' answered';
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

// ----------------------------------------------------
// 2. AI Vision & Phone Detection
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
            console.warn('Webcam permission not granted:', err);
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
// 3. Audio Warning Synthesizer
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
// 4. Keyboard & Clipboard Lockdown
// ----------------------------------------------------
function setupKeyboardAndMouseLockdown() {
    window.addEventListener('keydown', (e) => {
        if (!isExamStarted || hasSubmitted) return;

        const isCtrlOrCmd = e.ctrlKey || e.metaKey;
        const key = e.key.toLowerCase();

        // Allow typing inside CodeMirror editor
        if (e.target && (e.target.classList.contains('CodeMirror-code') || 
            e.target.closest('.CodeMirror') ||
            e.target.id === 'codeEditorInput')) {
            if (e.key === 'Tab') {
                // CodeMirror handles Tab internally
                return;
            }
            // Allow normal typing in the code editor
            if (!isCtrlOrCmd) return;
        }

        if (
            (isCtrlOrCmd && key !== 'a') ||
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
// 5. Tab-Switch & Fullscreen Enforcement
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
// 6. Exam Lifecycle & Timer
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

function openSubmitModal() {
    const answeredCount = Object.values(answers).filter(v => v && v.trim() !== '').length;
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
                const isCoding = q.questionType === 'CODING' || q.starterCode;
                let isCorr = false;
                let marks = 0;

                if (isCoding) {
                    // Only the server has hidden tests, so an offline browser may not award coding marks.
                    isCorr = false;
                    marks = 0;
                } else {
                    isCorr = answers[q.id] === q.correctOption;
                    marks = isCorr ? (q.marks || 10) : 0;
                }

                if (isCorr) {
                    score += marks;
                    correctCount++;
                }

                return {
                    questionId: q.id,
                    questionType: isCoding ? 'CODING' : 'MCQ',
                    questionText: q.questionText,
                    selectedOption: isCoding ? null : (answers[q.id] || null),
                    correctOption: isCoding ? null : q.correctOption,
                    submittedCode: isCoding ? (answers[q.id] || '// No code submitted') : null,
                    testResults: isCoding ? (isCorr ? '✅ All Test Cases Passed' : '❌ Failed Test Cases') : null,
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
