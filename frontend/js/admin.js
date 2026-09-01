// Admin Dashboard Logic with Support for both MCQ and Coding Questions
// Now with dynamic multiple test cases per coding question

let questionCount = 0;
let testCaseCounters = {}; // Track test case count per question

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            const nameEl = document.getElementById('adminName');
            if (nameEl) nameEl.textContent = `Welcome, ${user.name || user.username || 'Admin'}`;
        } catch (e) {}
    }

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        ApiService.logout();
    });

    setupModal();
    await loadAdminData();
});

async function loadAdminData() {
    try {
        const [assessments, submissions] = await Promise.all([
            ApiService.get('/assessments'),
            ApiService.get('/submissions')
        ]);

        renderMetrics(assessments, submissions);
        renderAssessmentsTable(assessments);
        renderSubmissionsTable(submissions);
    } catch (error) {
        console.error('Failed to load admin data:', error);
    }
}

function renderMetrics(assessments = [], submissions = []) {
    document.getElementById('statAssessmentsCount').textContent = assessments.length;
    document.getElementById('statSubmissionsCount').textContent = submissions.length;

    const totalViolations = submissions.reduce((sum, s) => sum + (s.violationsCount || 0), 0);
    document.getElementById('statViolationsCount').textContent = totalViolations;

    if (submissions.length > 0) {
        const avg = Math.round(submissions.reduce((sum, s) => sum + (s.percentage || 0), 0) / submissions.length);
        document.getElementById('statAvgScore').textContent = `${avg}%`;
    } else {
        document.getElementById('statAvgScore').textContent = 'N/A';
    }
}

function renderAssessmentsTable(assessments = []) {
    const tbody = document.getElementById('assessmentsTableBody');
    if (!tbody) return;

    if (assessments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 1.5rem; color: var(--text-muted);">No assessments configured. Click "+ Create New Assessment" above.</td></tr>`;
        return;
    }

    tbody.innerHTML = assessments.map(a => `
        <tr style="border-bottom: 1px solid var(--border);">
            <td style="padding: 0.875rem; font-weight: 600;">${escapeHtml(a.title)}</td>
            <td style="padding: 0.875rem;"><span class="badge badge-primary">${escapeHtml(a.category || 'General')}</span></td>
            <td style="padding: 0.875rem;">${a.questionsCount}</td>
            <td style="padding: 0.875rem;">${a.totalMarks}</td>
            <td style="padding: 0.875rem;">${a.durationMinutes} mins</td>
            <td style="padding: 0.875rem; text-align: right;">
                <button class="btn btn-danger btn-sm" onclick="deleteAssessment(${a.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

window.deleteAssessment = async function(id) {
    if (!confirm('Are you sure you want to delete this assessment?')) return;
    try {
        await ApiService.request(`/assessments/${id}`, { method: 'DELETE' });
        await loadAdminData();
    } catch (error) {
        alert('Failed to delete assessment: ' + error.message);
    }
};

function renderSubmissionsTable(submissions = []) {
    const tbody = document.getElementById('adminSubmissionsTableBody');
    if (!tbody) return;

    if (submissions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 1.5rem; color: var(--text-muted);">No candidate submissions yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = submissions.map(s => {
        const dateStr = s.submittedAt ? new Date(s.submittedAt).toLocaleString() : 'Recent';
        const passBadge = s.passed 
            ? `<span class="badge badge-success">Passed</span>` 
            : `<span class="badge badge-danger">Failed</span>`;

        const violText = (s.violationsCount || 0) === 0
            ? `<span style="color: var(--secondary); font-weight: 600;">0 Violations</span>`
            : `<span style="color: var(--danger); font-weight: 700;">⚠️ ${s.violationsCount} Flagged</span>`;

        return `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 0.875rem; font-weight: 600;">${escapeHtml(s.studentName)} <span style="font-size: 0.75rem; color: var(--text-muted);">(${escapeHtml(s.studentUsername)})</span></td>
                <td style="padding: 0.875rem;">${escapeHtml(s.assessmentTitle)}</td>
                <td style="padding: 0.875rem;"><strong>${s.score} / ${s.totalMarks}</strong> (${s.percentage}%)</td>
                <td style="padding: 0.875rem;">${passBadge}</td>
                <td style="padding: 0.875rem;">${violText}</td>
                <td style="padding: 0.875rem; font-size: 0.8125rem; color: var(--text-muted);">${dateStr}</td>
                <td style="padding: 0.875rem; text-align: right;">
                    <a href="result.html?id=${s.submissionId}" class="btn btn-outline btn-sm">
                        View Result
                    </a>
                </td>
            </tr>
        `;
    }).join('');
}

function setupModal() {
    const modal = document.getElementById('createModal');
    const openBtn = document.getElementById('openCreateModalBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelModalBtn');
    const addQBtn = document.getElementById('addQuestionBtn');
    const form = document.getElementById('createAssessmentForm');

    openBtn?.addEventListener('click', () => {
        modal?.classList.remove('hidden');
        if (questionCount === 0) addQuestionBlock('MCQ');
    });

    const closeModal = () => modal?.classList.add('hidden');
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    addQBtn?.addEventListener('click', () => addQuestionBlock('MCQ'));

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveNewAssessment();
    });
}

window.addQuestionBlock = function(defaultType = 'MCQ') {
    questionCount++;
    const container = document.getElementById('questionsContainer');
    const qIndex = questionCount;
    testCaseCounters[qIndex] = 0;

    const block = document.createElement('div');
    block.id = `qblock_${qIndex}`;
    block.dataset.qtype = defaultType;
    block.style.background = '#F8FAFC';
    block.style.border = '1px solid var(--border)';
    block.style.borderRadius = '0.5rem';
    block.style.padding = '1.25rem';

    block.innerHTML = `
        <div class="flex justify-between items-center mb-2" style="flex-wrap: wrap; gap: 0.5rem;">
            <div class="flex items-center gap-2" style="flex-wrap: wrap;">
                <strong>Question ${qIndex}</strong>
                <div class="type-toggle-group">
                    <button type="button" class="type-toggle-btn ${defaultType === 'MCQ' ? 'active' : ''}" onclick="switchQuestionType(${qIndex}, 'MCQ')">🔘 Multiple Choice</button>
                    <button type="button" class="type-toggle-btn ${defaultType === 'CODING' ? 'active' : ''}" onclick="switchQuestionType(${qIndex}, 'CODING')">💻 Coding Question</button>
                </div>
            </div>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeQuestionBlock(${qIndex})">Remove</button>
        </div>

        <div class="form-group mb-2">
            <label class="form-label" style="font-size: 0.8125rem;">Question / Problem Statement *</label>
            <textarea class="form-control q-text" rows="2" required placeholder="Enter question or coding problem statement..."></textarea>
        </div>

        <!-- MCQ Section -->
        <div id="mcqSection_${qIndex}" class="${defaultType === 'CODING' ? 'hidden' : ''}">
            <div class="grid grid-cols-2 gap-1 mb-2">
                <div>
                    <label class="form-label" style="font-size: 0.75rem;">Option A *</label>
                    <input type="text" class="form-control q-opt-a" placeholder="Option A">
                </div>
                <div>
                    <label class="form-label" style="font-size: 0.75rem;">Option B *</label>
                    <input type="text" class="form-control q-opt-b" placeholder="Option B">
                </div>
                <div>
                    <label class="form-label" style="font-size: 0.75rem;">Option C</label>
                    <input type="text" class="form-control q-opt-c" placeholder="Option C">
                </div>
                <div>
                    <label class="form-label" style="font-size: 0.75rem;">Option D</label>
                    <input type="text" class="form-control q-opt-d" placeholder="Option D">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2 mb-2">
                <div>
                    <label class="form-label" style="font-size: 0.75rem;">Correct Option *</label>
                    <select class="form-control q-correct">
                        <option value="A">Option A</option>
                        <option value="B">Option B</option>
                        <option value="C">Option C</option>
                        <option value="D">Option D</option>
                    </select>
                </div>
                <div>
                    <label class="form-label" style="font-size: 0.75rem;">Marks *</label>
                    <input type="number" class="form-control q-marks" value="10" min="1" required>
                </div>
            </div>
        </div>

        <!-- Coding Section -->
        <div id="codingSection_${qIndex}" class="${defaultType === 'MCQ' ? 'hidden' : ''}">
            <div class="grid grid-cols-2 gap-2 mb-2">
                <div>
                    <label class="form-label" style="font-size: 0.75rem;">Programming Language *</label>
                    <select class="form-control q-lang">
                        <option value="java">Java</option>
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                        <option value="cpp">C++</option>
                    </select>
                </div>
                <div>
                    <label class="form-label" style="font-size: 0.75rem;">Marks *</label>
                    <input type="number" class="form-control q-coding-marks" value="10" min="1">
                </div>
            </div>

            <div class="form-group mb-2">
                <label class="form-label" style="font-size: 0.75rem;">Starter Template Code</label>
                <textarea class="form-control q-starter" rows="4" style="font-family: monospace; font-size: 0.8125rem;" placeholder="public class Solution {\n    public static int solve() {\n        // Student code here\n        return 0;\n    }\n}"></textarea>
            </div>

            <!-- Dynamic Test Cases Section -->
            <div class="test-cases-section mb-2">
                <div class="flex justify-between items-center mb-1" style="flex-wrap: wrap; gap: 0.5rem;">
                    <label class="form-label" style="font-size: 0.8125rem; margin-bottom: 0; color: var(--primary); font-weight: 700;">
                        🧪 Test Cases <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 400;">(add input/output pairs)</span>
                    </label>
                    <button type="button" class="btn btn-outline btn-sm" onclick="addTestCase(${qIndex})" style="border-color: var(--primary); color: var(--primary);">
                        + Add Test Case
                    </button>
                </div>
                <div id="testCasesContainer_${qIndex}" class="flex flex-col gap-1">
                    <!-- Dynamic test case rows added here -->
                </div>
                <div id="noTestCasesMsg_${qIndex}" style="padding: 0.75rem; text-align: center; color: var(--text-muted); font-size: 0.8125rem; background: #FFFFFF; border: 1px dashed var(--border); border-radius: 0.375rem;">
                    No test cases added yet. Click "+ Add Test Case" to add input/output pairs.
                </div>
            </div>
        </div>

        <div class="form-group mb-0">
            <label class="form-label" style="font-size: 0.75rem;">Explanation / Solution Details</label>
            <input type="text" class="form-control q-explanation" placeholder="Optional explanation for result review">
        </div>
    `;

    container.appendChild(block);

    // Auto-add first test case for coding questions
    if (defaultType === 'CODING') {
        addTestCase(qIndex);
    }
};

// Add a test case row to a question
window.addTestCase = function(qIndex) {
    testCaseCounters[qIndex] = (testCaseCounters[qIndex] || 0) + 1;
    const tcIndex = testCaseCounters[qIndex];
    const container = document.getElementById(`testCasesContainer_${qIndex}`);
    const noMsg = document.getElementById(`noTestCasesMsg_${qIndex}`);
    if (noMsg) noMsg.style.display = 'none';

    const tcBlock = document.createElement('div');
    tcBlock.id = `tc_${qIndex}_${tcIndex}`;
    tcBlock.className = 'test-case-row';
    tcBlock.style.cssText = 'background: #FFFFFF; border: 1px solid var(--border); border-radius: 0.5rem; padding: 0.75rem; position: relative;';

    tcBlock.innerHTML = `
        <div class="flex justify-between items-center" style="margin-bottom: 0.5rem;">
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em;">
                Test Case #${tcIndex}
            </span>
            <button type="button" class="btn btn-danger btn-sm" style="padding: 0.15rem 0.5rem; font-size: 0.7rem;" onclick="removeTestCase(${qIndex}, ${tcIndex})">
                ✕ Remove
            </button>
        </div>
        <div class="grid grid-cols-2 gap-1">
            <div>
                <label class="form-label" style="font-size: 0.7rem; margin-bottom: 0.2rem;">Input</label>
                <textarea class="form-control tc-input" rows="2" style="font-family: monospace; font-size: 0.8125rem;" placeholder="e.g. 5\n3 7 2 9 5"></textarea>
            </div>
            <div>
                <label class="form-label" style="font-size: 0.7rem; margin-bottom: 0.2rem;">Expected Output</label>
                <textarea class="form-control tc-output" rows="2" style="font-family: monospace; font-size: 0.8125rem;" placeholder="e.g. 9"></textarea>
            </div>
        </div>
    `;

    container.appendChild(tcBlock);
};

// Remove a test case row
window.removeTestCase = function(qIndex, tcIndex) {
    const tcBlock = document.getElementById(`tc_${qIndex}_${tcIndex}`);
    if (tcBlock) tcBlock.remove();

    // Show "no test cases" message if empty
    const container = document.getElementById(`testCasesContainer_${qIndex}`);
    if (container && container.children.length === 0) {
        const noMsg = document.getElementById(`noTestCasesMsg_${qIndex}`);
        if (noMsg) noMsg.style.display = 'block';
    }
};

window.switchQuestionType = function(idx, type) {
    const block = document.getElementById(`qblock_${idx}`);
    if (!block) return;
    block.dataset.qtype = type;

    const mcqSec = document.getElementById(`mcqSection_${idx}`);
    const codingSec = document.getElementById(`codingSection_${idx}`);

    const btns = block.querySelectorAll('.type-toggle-btn');
    btns.forEach(b => {
        b.classList.toggle('active', (type === 'MCQ' && b.textContent.includes('Multiple Choice')) || (type === 'CODING' && b.textContent.includes('Coding')));
    });

    if (type === 'CODING') {
        mcqSec?.classList.add('hidden');
        codingSec?.classList.remove('hidden');
        // Auto-add first test case if none exist
        const tcContainer = document.getElementById(`testCasesContainer_${idx}`);
        if (tcContainer && tcContainer.children.length === 0) {
            addTestCase(idx);
        }
    } else {
        codingSec?.classList.add('hidden');
        mcqSec?.classList.remove('hidden');
    }
};

window.removeQuestionBlock = function(idx) {
    const block = document.getElementById(`qblock_${idx}`);
    if (block) block.remove();
    delete testCaseCounters[idx];
};

// Collect test cases from a question block
function collectTestCases(block, qIndex) {
    const tcContainer = document.getElementById(`testCasesContainer_${qIndex}`);
    if (!tcContainer) return [];

    const testCases = [];
    const rows = tcContainer.querySelectorAll('.test-case-row');
    rows.forEach(row => {
        const input = row.querySelector('.tc-input')?.value || '';
        const output = row.querySelector('.tc-output')?.value || '';
        if (input.trim() || output.trim()) {
            testCases.push({ input: input, expectedOutput: output });
        }
    });
    return testCases;
}

async function saveNewAssessment() {
    const title = document.getElementById('examTitleInput')?.value;
    const category = document.getElementById('examCategoryInput')?.value;
    const durationMinutes = parseInt(document.getElementById('examDurationInput')?.value || '30', 10);
    const description = document.getElementById('examDescriptionInput')?.value;

    const questionBlocks = document.querySelectorAll('#questionsContainer > div');
    const questions = [];

    questionBlocks.forEach(b => {
        const qType = b.dataset.qtype || 'MCQ';
        const qText = b.querySelector('.q-text')?.value;
        const explanation = b.querySelector('.q-explanation')?.value;

        if (qType === 'CODING') {
            const lang = b.querySelector('.q-lang')?.value || 'java';
            const starter = b.querySelector('.q-starter')?.value || `// Write your ${lang} code here\n`;
            const marks = parseInt(b.querySelector('.q-coding-marks')?.value || '10', 10);

            // Collect all test cases
            const qIndex = b.id.replace('qblock_', '');
            const testCases = collectTestCases(b, qIndex);

            // First test case becomes sampleInput/sampleOutput for backward compat
            const sInput = testCases.length > 0 ? testCases[0].input : '';
            const sOutput = testCases.length > 0 ? testCases[0].expectedOutput : '';

            if (qText) {
                questions.push({
                    questionType: 'CODING',
                    questionText: qText,
                    programmingLanguage: lang,
                    starterCode: starter,
                    sampleInput: sInput,
                    sampleOutput: sOutput,
                    testCases: JSON.stringify(testCases),
                    marks: marks,
                    explanation: explanation
                });
            }
        } else {
            const optA = b.querySelector('.q-opt-a')?.value;
            const optB = b.querySelector('.q-opt-b')?.value;
            const optC = b.querySelector('.q-opt-c')?.value;
            const optD = b.querySelector('.q-opt-d')?.value;
            const correct = b.querySelector('.q-correct')?.value || 'A';
            const marks = parseInt(b.querySelector('.q-marks')?.value || '10', 10);

            if (qText && optA && optB) {
                questions.push({
                    questionType: 'MCQ',
                    questionText: qText,
                    optionA: optA,
                    optionB: optB,
                    optionC: optC || 'N/A',
                    optionD: optD || 'N/A',
                    correctOption: correct,
                    marks: marks,
                    explanation: explanation
                });
            }
        }
    });

    if (questions.length === 0) {
        alert('Please add at least one complete question.');
        return;
    }

    try {
        await ApiService.post('/assessments', {
            title,
            category,
            durationMinutes,
            description,
            questions
        });

        alert('Assessment created successfully with MCQ & Coding questions!');
        document.getElementById('createModal')?.classList.add('hidden');
        document.getElementById('createAssessmentForm')?.reset();
        document.getElementById('questionsContainer').innerHTML = '';
        questionCount = 0;
        testCaseCounters = {};
        await loadAdminData();
    } catch (error) {
        alert('Failed to save assessment: ' + error.message);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
