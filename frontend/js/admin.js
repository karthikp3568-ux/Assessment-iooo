// Admin Dashboard Logic

let questionCount = 0;

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
        if (questionCount === 0) addQuestionBlock();
    });

    const closeModal = () => modal?.classList.add('hidden');
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    addQBtn?.addEventListener('click', () => addQuestionBlock());

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveNewAssessment();
    });
}

function addQuestionBlock() {
    questionCount++;
    const container = document.getElementById('questionsContainer');
    const qIndex = questionCount;

    const block = document.createElement('div');
    block.id = `qblock_${qIndex}`;
    block.style.background = '#F8FAFC';
    block.style.border = '1px solid var(--border)';
    block.style.borderRadius = '0.5rem';
    block.style.padding = '1rem';

    block.innerHTML = `
        <div class="flex justify-between items-center mb-1">
            <strong>Question ${qIndex}</strong>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeQuestionBlock(${qIndex})">Remove</button>
        </div>
        <div class="form-group mb-1">
            <input type="text" class="form-control q-text" required placeholder="Enter question text">
        </div>
        <div class="grid grid-cols-2 gap-1 mb-1">
            <input type="text" class="form-control q-opt-a" required placeholder="Option A">
            <input type="text" class="form-control q-opt-b" required placeholder="Option B">
            <input type="text" class="form-control q-opt-c" required placeholder="Option C">
            <input type="text" class="form-control q-opt-d" required placeholder="Option D">
        </div>
        <div class="grid grid-cols-2 gap-1">
            <div>
                <label style="font-size: 0.75rem; font-weight: 600;">Correct Option</label>
                <select class="form-control q-correct" required>
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                </select>
            </div>
            <div>
                <label style="font-size: 0.75rem; font-weight: 600;">Marks</label>
                <input type="number" class="form-control q-marks" value="10" min="1" required>
            </div>
        </div>
    `;

    container.appendChild(block);
}

window.removeQuestionBlock = function(idx) {
    const block = document.getElementById(`qblock_${idx}`);
    if (block) block.remove();
};

async function saveNewAssessment() {
    const title = document.getElementById('examTitleInput')?.value;
    const category = document.getElementById('examCategoryInput')?.value;
    const durationMinutes = parseInt(document.getElementById('examDurationInput')?.value || '30', 10);
    const description = document.getElementById('examDescriptionInput')?.value;

    const questionBlocks = document.querySelectorAll('#questionsContainer > div');
    const questions = [];

    questionBlocks.forEach(b => {
        const qText = b.querySelector('.q-text')?.value;
        const optA = b.querySelector('.q-opt-a')?.value;
        const optB = b.querySelector('.q-opt-b')?.value;
        const optC = b.querySelector('.q-opt-c')?.value;
        const optD = b.querySelector('.q-opt-d')?.value;
        const correct = b.querySelector('.q-correct')?.value;
        const marks = parseInt(b.querySelector('.q-marks')?.value || '10', 10);

        if (qText && optA && optB) {
            questions.push({
                questionText: qText,
                optionA: optA,
                optionB: optB,
                optionC: optC || 'N/A',
                optionD: optD || 'N/A',
                correctOption: correct,
                marks: marks
            });
        }
    });

    if (questions.length === 0) {
        alert('Please add at least one question.');
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

        alert('Assessment created successfully!');
        document.getElementById('createModal')?.classList.add('hidden');
        document.getElementById('createAssessmentForm')?.reset();
        document.getElementById('questionsContainer').innerHTML = '';
        questionCount = 0;
        await loadAdminData();
    } catch (error) {
        alert('Failed to save assessment: ' + error.message);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
