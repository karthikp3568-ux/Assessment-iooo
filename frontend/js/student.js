// Student Dashboard Logic

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
            const nameEl = document.getElementById('userName');
            if (nameEl) nameEl.textContent = `Welcome, ${user.name || user.username || 'Student'}`;
        } catch (e) {}
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            ApiService.logout();
        });
    }

    await loadDashboardData();
});

async function loadDashboardData() {
    const DEFAULT_ASSESSMENTS = [
        {
            id: 1,
            title: "Java Core & Spring Boot Master Exam",
            category: "Java & Spring Boot",
            description: "Assess your expertise across Core Java (OOP, Collections, Multithreading) and Spring Boot (REST, JPA, Security).",
            durationMinutes: 30,
            totalMarks: 50,
            questionsCount: 5
        },
        {
            id: 2,
            title: "IoT & Embedded Systems Fundamentals",
            category: "IoT & Embedded",
            description: "Evaluate your knowledge in microcontrollers, MQTT, ESP32, edge computing, sensor protocols, and IoT architecture.",
            durationMinutes: 25,
            totalMarks: 40,
            questionsCount: 4
        },
        {
            id: 3,
            title: "Cloud Computing & DevOps Essentials",
            category: "Cloud & DevOps",
            description: "Test your skills in containerization (Docker), Kubernetes orchestration, CI/CD pipelines, and cloud security.",
            durationMinutes: 35,
            totalMarks: 60,
            questionsCount: 6
        }
    ];

    try {
        let assessments = [];
        let submissions = [];
        try {
            [assessments, submissions] = await Promise.all([
                ApiService.get('/assessments'),
                ApiService.get('/submissions/my')
            ]);
        } catch (fetchErr) {
            console.warn('Backend fetch failed, using default assessments:', fetchErr);
            assessments = DEFAULT_ASSESSMENTS;
            submissions = [];
        }

        if (!assessments || assessments.length === 0) {
            assessments = DEFAULT_ASSESSMENTS;
        }

        renderStats(assessments, submissions);
        renderAssessments(assessments);
        renderSubmissions(submissions);
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        renderAssessments(DEFAULT_ASSESSMENTS);
    } finally {
        const loader = document.getElementById('assessmentsLoading');
        if (loader) loader.classList.add('hidden');
    }
}

function renderStats(assessments = [], submissions = []) {
    const statAvailable = document.getElementById('statAvailable');
    const statCompleted = document.getElementById('statCompleted');
    const statAvgScore = document.getElementById('statAvgScore');

    animateCount(statAvailable, assessments.length);
    animateCount(statCompleted, submissions.length);

    if (statAvgScore) {
        if (submissions.length > 0) {
            const totalPercent = submissions.reduce((sum, s) => sum + (s.percentage || 0), 0);
            const avg = Math.round(totalPercent / submissions.length);
            animateCount(statAvgScore, avg, '%');
        } else {
            statAvgScore.textContent = 'N/A';
        }
    }
    const hours = document.getElementById('statLearningTime');
    if (hours) animateCount(hours, submissions.length * 1.5, 'h', true);
    const average = submissions.length ? Math.round(submissions.reduce((sum, s) => sum + (s.percentage || 0), 0) / submissions.length) : 0;
    setText('skillProblem', average ? `${Math.max(35, average)}%` : '—');
    setText('skillCode', average ? `${Math.max(30, average - 6)}%` : '—');
    setText('skillConsistency', submissions.length ? `${Math.min(100, submissions.length * 20)}%` : '—');
    const tip = document.getElementById('skillTip');
    if (tip && average) tip.textContent = average >= 70 ? 'Strong momentum. Try a harder assessment to stretch your skills.' : 'Your next assessment is a chance to lift your strongest skill area.';
}

function renderAssessments(assessments = []) {
    const grid = document.getElementById('assessmentsGrid');
    if (!grid) return;

    if (assessments.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-muted);">
            No active assessments available right now.
        </div>`;
        return;
    }

    grid.innerHTML = assessments.map(a => `
        <article class="assessment-card">
            <div>
                <div class="flex justify-between items-center mb-2">
                    <span class="badge badge-primary">${escapeHtml(a.category || 'Assessment')}</span>
                    <span style="font-size: 0.8125rem; font-weight: 600; color: var(--text-muted);">
                        ⏱️ ${a.durationMinutes} mins
                    </span>
                </div>
                <h4 class="mb-1" style="font-size: 1.15rem;">${escapeHtml(a.title)}</h4>
                <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1.25rem;">
                    ${escapeHtml(a.description || 'Test your proficiency and subject mastery.')}
                </p>
            </div>
            <div class="flex justify-between items-center" style="border-top: 1px solid var(--border); padding-top: 1rem;">
                <span style="font-size: 0.8125rem; color: var(--text-muted);">
                    <strong>${a.questionsCount}</strong> Questions • <strong>${a.totalMarks}</strong> Marks
                </span>
                <a href="exam.html?id=${a.id}" class="btn btn-primary btn-sm">
                    Start Exam →
                </a>
            </div>
        </article>
    `).join('');
}

function renderSubmissions(submissions = []) {
    const tbody = document.getElementById('submissionsTableBody');
    if (!tbody) return;

    if (submissions.length === 0) {
        tbody.innerHTML = `<tr>
            <td colspan="7" class="text-center" style="padding: 1.5rem; color: var(--text-muted);">
                You haven't taken any assessments yet. Click "Start Exam" above to begin!
            </td>
        </tr>`;
        return;
    }

    tbody.innerHTML = submissions.map(s => {
        const dateStr = s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : 'Recent';
        const passBadge = s.passed 
            ? `<span class="badge badge-success">Passed</span>` 
            : `<span class="badge badge-danger">Failed</span>`;
        
        const violationBadge = (s.violationsCount || 0) === 0
            ? `<span style="color: var(--secondary); font-weight: 600;">0 (Clean)</span>`
            : `<span style="color: var(--danger); font-weight: 600;">${s.violationsCount} flagged</span>`;

        return `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 0.875rem; font-weight: 600;">${escapeHtml(s.assessmentTitle || 'Assessment')}</td>
                <td style="padding: 0.875rem;">${s.score} / ${s.totalMarks}</td>
                <td style="padding: 0.875rem; font-weight: 600;">${s.percentage}%</td>
                <td style="padding: 0.875rem;">${passBadge}</td>
                <td style="padding: 0.875rem;">${violationBadge}</td>
                <td style="padding: 0.875rem; color: var(--text-muted);">${dateStr}</td>
                <td style="padding: 0.875rem; text-align: right;">
                    <a href="result.html?id=${s.submissionId}" class="btn btn-outline btn-sm">
                        View Scorecard
                    </a>
                </td>
            </tr>
        `;
    }).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function animateCount(element, value, suffix = '', decimal = false) {
    if (!element) return;
    const target = Number(value) || 0;
    const startedAt = performance.now();
    const draw = now => {
        const progress = Math.min(1, (now - startedAt) / 550);
        const current = target * (1 - Math.pow(1 - progress, 3));
        element.textContent = `${decimal ? current.toFixed(1) : Math.round(current)}${suffix}`;
        if (progress < 1) requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}
