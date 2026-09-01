// AssessX Result Scorecard Handler

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
        const result = await ApiService.get(`/submissions/${id}`);
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
    if ((res.violationsCount || 0) === 0) {
        violEl.innerHTML = `<span style="color: var(--secondary); font-size: 1.25rem;">0 (Verified)</span>`;
    } else {
        violEl.innerHTML = `<span style="color: var(--danger); font-size: 1.25rem;">${res.violationsCount} Flagged</span>`;
    }

    const reviewContainer = document.getElementById('answersReviewContainer');
    if (!reviewContainer) return;

    if (!res.answers || res.answers.length === 0) {
        reviewContainer.innerHTML = `<p style="color: var(--text-muted); text-align: center;">Detailed answer analysis not available for this record.</p>`;
        return;
    }

    reviewContainer.innerHTML = res.answers.map((a, idx) => {
        const isCorrect = a.correct;
        const borderColor = isCorrect ? 'var(--secondary)' : 'var(--danger)';
        const bgBadge = isCorrect ? 'badge-success' : 'badge-danger';
        const statusText = isCorrect ? '✓ Correct' : '✗ Incorrect';

        return `
            <div style="border-left: 4px solid ${borderColor}; padding: 1.25rem; background: var(--bg-color); border-radius: 0.5rem;">
                <div class="flex justify-between items-center mb-2">
                    <span style="font-weight: 700; font-size: 0.95rem;">Question ${idx + 1}</span>
                    <span class="badge ${bgBadge}">${statusText} (${a.marksAwarded} Marks)</span>
                </div>
                <div style="font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem;">
                    ${escapeHtml(a.questionText)}
                </div>
                <div class="flex gap-4 mb-2" style="font-size: 0.875rem;">
                    <div><strong>Your Answer:</strong> <span style="color: ${isCorrect ? 'var(--secondary)' : 'var(--danger)'}; font-weight: 600;">Option ${a.selectedOption || 'None'}</span></div>
                    <div><strong>Correct Answer:</strong> <span style="color: var(--secondary); font-weight: 600;">Option ${a.correctOption}</span></div>
                </div>
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
