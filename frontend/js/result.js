// AssessX Result Scorecard Handler supporting both MCQ and Coding Question breakdowns

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const submissionId = urlParams.get('id');

    if (!submissionId) {
        alert('No submission ID specified.');
        window.location.href = 'student-dashboard.html';
        return;
    }

    await loadResult(submissionId);
});

async function loadResult(id) {
    try {
        let result = null;
        try {
            result = await ApiService.get(`/submissions/${id}`);
        } catch (apiErr) {
            const localSaved = localStorage.getItem(`result_${id}`);
            if (localSaved) {
                result = JSON.parse(localSaved);
            } else {
                throw apiErr;
            }
        }
        renderScorecard(result);
    } catch (error) {
        console.error('Failed to load result:', error);
        document.getElementById('resultLoading').innerHTML = `
            <div class="alert alert-danger">
                Failed to load scorecard results: ${escapeHtml(error.message || 'Submission not found.')}
            </div>
        `;
    }
}

function renderScorecard(res) {
    document.getElementById('resultLoading').classList.add('hidden');
    document.getElementById('resultContent').classList.remove('hidden');

    document.getElementById('resultExamTitle').textContent = res.assessmentTitle;
    document.getElementById('candidateName').textContent = `Candidate: ${res.studentName} (${res.studentUsername})`;
    document.getElementById('percentageDisplay').textContent = `${res.percentage}%`;

    const passBadge = document.getElementById('passFailBadge');
    if (res.passed) {
        passBadge.textContent = '🎉 PASSED ASSESSMENT';
        passBadge.className = 'badge badge-success';
    } else {
        passBadge.textContent = '❌ FAILED (NEEDS IMPROVEMENT)';
        passBadge.className = 'badge badge-danger';
    }

    document.getElementById('statScore').textContent = `${res.score} / ${res.totalMarks}`;
    document.getElementById('statPassMarks').textContent = `${res.passMarks} Marks`;
    document.getElementById('statAccuracy').textContent = `${res.correctAnswers} / ${res.totalQuestions}`;

    const violEl = document.getElementById('statViolations');
    const auditCard = document.getElementById('proctoringAuditCard');
    const auditLogsList = document.getElementById('violationLogsList');
    const auditBadge = document.getElementById('auditViolationCountBadge');

    const violationsCount = res.violationsCount || 0;

    if (violationsCount === 0) {
        violEl.innerHTML = `<span style="color: var(--secondary); font-size: 1.25rem;">0 (Verified Clean)</span>`;
    } else {
        violEl.innerHTML = `<span style="color: var(--danger); font-size: 1.25rem;">${violationsCount} Flagged</span>`;
        
        if (auditCard && auditLogsList) {
            auditCard.classList.remove('hidden');
            if (auditBadge) auditBadge.textContent = `${violationsCount} Flagged`;

            let logs = [];
            try {
                const stored = localStorage.getItem(`violations_${res.submissionId}`);
                if (stored) logs = JSON.parse(stored);
            } catch (e) {}

            if (logs.length === 0) {
                logs = [`[Session Event] ${violationsCount} security/proctoring violation(s) recorded during test`];
            }

            auditLogsList.innerHTML = logs.map(l => `<div style="padding: 0.25rem 0; color: #DC2626; border-bottom: 1px dashed var(--border);">⚠️ ${escapeHtml(l)}</div>`).join('');
        }
    }

    const reviewContainer = document.getElementById('answersReviewContainer');
    if (!reviewContainer) return;

    if (!res.answers || res.answers.length === 0) {
        reviewContainer.innerHTML = `<p style="color: var(--text-muted); text-align: center;">Detailed answer analysis not available for this record.</p>`;
        return;
    }

    reviewContainer.innerHTML = res.answers.map((a, idx) => {
        const isCorrect = a.correct;
        const isCoding = (a.questionType && a.questionType.toUpperCase() === 'CODING') || (a.submittedCode != null && a.submittedCode.length > 5);
        const borderColor = isCorrect ? 'var(--secondary)' : 'var(--danger)';
        const bgBadge = isCorrect ? 'badge-success' : 'badge-danger';
        const statusText = isCorrect ? '✓ Correct / Passed' : '✗ Incomplete / Incorrect';
        const typeLabel = isCoding ? '💻 Coding Challenge' : '🔘 MCQ';

        return `
            <div style="border-left: 4px solid ${borderColor}; padding: 1.25rem; background: var(--bg-color); border-radius: 0.5rem;">
                <div class="flex justify-between items-center mb-2">
                    <span style="font-weight: 700; font-size: 0.95rem;">Question ${idx + 1} <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal;">(${typeLabel})</span></span>
                    <span class="badge ${bgBadge}">${statusText} (${a.marksAwarded} Marks)</span>
                </div>
                <div style="font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem; white-space: pre-wrap;">
                    ${escapeHtml(a.questionText)}
                </div>

                ${isCoding ? `
                    <div class="mb-2">
                        <div style="font-size: 0.8125rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.25rem;">Submitted Code Solution:</div>
                        <pre class="code-snippet-box">${escapeHtml(a.submittedCode || '// No code submitted')}</pre>
                    </div>
                    ${a.testResults ? `
                        <div style="font-size: 0.8125rem; margin-bottom: 0.5rem; font-weight: 600; color: ${isCorrect ? 'var(--secondary)' : 'var(--danger)'};">
                            ${escapeHtml(a.testResults)}
                        </div>
                    ` : ''}
                ` : `
                    <div class="flex gap-4 mb-2" style="font-size: 0.875rem;">
                        <div><strong>Your Answer:</strong> <span style="color: ${isCorrect ? 'var(--secondary)' : 'var(--danger)'}; font-weight: 600;">Option ${escapeHtml(a.selectedOption || 'None')}</span></div>
                        <div><strong>Correct Answer:</strong> <span style="color: var(--secondary); font-weight: 600;">Option ${escapeHtml(a.correctOption || 'N/A')}</span></div>
                    </div>
                `}

                ${a.explanation ? `
                    <div style="font-size: 0.8125rem; color: var(--text-muted); background: #FFFFFF; padding: 0.625rem 0.875rem; border-radius: 0.375rem; border: 1px solid var(--border);">
                        💡 <strong>Explanation:</strong> ${escapeHtml(a.explanation)}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
