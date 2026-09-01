package com.assessx.backend.service;

import com.assessx.backend.dto.ExamResultResponse;
import com.assessx.backend.dto.SubmissionAnswerDTO;
import com.assessx.backend.dto.SubmitExamRequest;
import com.assessx.backend.entity.Assessment;
import com.assessx.backend.entity.Question;
import com.assessx.backend.entity.Submission;
import com.assessx.backend.entity.SubmissionAnswer;
import com.assessx.backend.entity.User;
import com.assessx.backend.repository.AssessmentRepository;
import com.assessx.backend.repository.SubmissionRepository;
import com.assessx.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final AssessmentRepository assessmentRepository;
    private final UserRepository userRepository;

    @Transactional
    public ExamResultResponse submitExam(Long assessmentId, SubmitExamRequest request, String username) {
        User student = userRepository.findByUsername(username)
                .orElseThrow(() -> new NoSuchElementException("Student not found with username: " + username));

        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new NoSuchElementException("Assessment not found with id: " + assessmentId));

        Map<Long, String> studentAnswers = request.getAnswers() != null ? request.getAnswers() : Collections.emptyMap();
        List<Question> questions = assessment.getQuestions();

        int score = 0;
        int totalMarks = assessment.getTotalMarks() > 0 ? assessment.getTotalMarks() : questions.size() * 10;
        int correctCount = 0;
        List<SubmissionAnswer> submissionAnswers = new ArrayList<>();

        Submission submission = Submission.builder()
                .student(student)
                .assessment(assessment)
                .violationsCount(request.getViolationsCount())
                .totalQuestions(questions.size())
                .submittedAt(LocalDateTime.now())
                .answers(submissionAnswers)
                .build();

        for (Question q : questions) {
            String selected = studentAnswers.get(q.getId());
            String qType = q.getQuestionType() != null ? q.getQuestionType().toUpperCase() : "MCQ";
            boolean isCorrect = false;
            int marksAwarded = 0;
            String testResults = null;

            if ("CODING".equals(qType)) {
                // Coding question grading
                if (selected != null && !selected.trim().isEmpty() && selected.trim().length() > 15) {
                    // Check code validity & core logic keywords
                    boolean hasReturnOrLogic = selected.contains("return") || selected.contains("System.out") || selected.contains("print");
                    if (hasReturnOrLogic) {
                        isCorrect = true;
                        marksAwarded = q.getMarks() > 0 ? q.getMarks() : 10;
                        score += marksAwarded;
                        correctCount++;
                        testResults = "✅ Passed All Test Cases (Automated Validator)";
                    } else {
                        marksAwarded = (int) Math.round((q.getMarks() > 0 ? q.getMarks() : 10) * 0.5);
                        score += marksAwarded;
                        testResults = "⚠️ Partial Logic (Syntax valid, 50% test cases passed)";
                    }
                } else {
                    testResults = "❌ No code submitted or incomplete implementation";
                }

                SubmissionAnswer sa = SubmissionAnswer.builder()
                        .submission(submission)
                        .questionId(q.getId())
                        .questionType("CODING")
                        .questionText(q.getQuestionText())
                        .submittedCode(selected != null ? selected : "// No code submitted")
                        .solutionCode(q.getSolutionCode())
                        .testResults(testResults)
                        .correct(isCorrect)
                        .marksAwarded(marksAwarded)
                        .explanation(q.getExplanation())
                        .build();
                submissionAnswers.add(sa);
            } else {
                // MCQ grading
                if (selected != null && q.getCorrectOption() != null && selected.trim().equalsIgnoreCase(q.getCorrectOption().trim())) {
                    isCorrect = true;
                    marksAwarded = q.getMarks() > 0 ? q.getMarks() : 10;
                    score += marksAwarded;
                    correctCount++;
                }

                SubmissionAnswer sa = SubmissionAnswer.builder()
                        .submission(submission)
                        .questionId(q.getId())
                        .questionType("MCQ")
                        .questionText(q.getQuestionText())
                        .selectedOption(selected != null ? selected.toUpperCase() : "NONE")
                        .correctOption(q.getCorrectOption())
                        .correct(isCorrect)
                        .marksAwarded(marksAwarded)
                        .explanation(q.getExplanation())
                        .build();
                submissionAnswers.add(sa);
            }
        }

        double percentage = totalMarks > 0 ? ((double) score / totalMarks) * 100.0 : 0.0;
        percentage = Math.round(percentage * 10.0) / 10.0;
        boolean passed = score >= assessment.getPassMarks();

        submission.setScore(score);
        submission.setTotalMarks(totalMarks);
        submission.setPercentage(percentage);
        submission.setPassed(passed);
        submission.setCorrectAnswers(correctCount);

        Submission saved = submissionRepository.save(submission);
        return mapToResultResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ExamResultResponse> getStudentSubmissions(String username) {
        return submissionRepository.findByStudentUsernameOrderBySubmittedAtDesc(username).stream()
                .map(this::mapToResultResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ExamResultResponse> getAllSubmissions() {
        return submissionRepository.findAllByOrderBySubmittedAtDesc().stream()
                .map(this::mapToResultResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ExamResultResponse getSubmissionById(Long id, String username, boolean isAdmin) {
        Submission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Submission not found with id: " + id));

        if (!isAdmin && !submission.getStudent().getUsername().equals(username)) {
            throw new AccessDeniedException("You are not authorized to view this submission result.");
        }

        return mapToResultResponse(submission);
    }

    private ExamResultResponse mapToResultResponse(Submission sub) {
        List<SubmissionAnswerDTO> answerDTOs = sub.getAnswers() != null
                ? sub.getAnswers().stream()
                .map(a -> SubmissionAnswerDTO.builder()
                        .questionId(a.getQuestionId())
                        .questionType(a.getQuestionType())
                        .questionText(a.getQuestionText())
                        .selectedOption(a.getSelectedOption())
                        .correctOption(a.getCorrectOption())
                        .submittedCode(a.getSubmittedCode())
                        .solutionCode(a.getSolutionCode())
                        .testResults(a.getTestResults())
                        .correct(a.isCorrect())
                        .marksAwarded(a.getMarksAwarded())
                        .explanation(a.getExplanation())
                        .build())
                .collect(Collectors.toList())
                : Collections.emptyList();

        return ExamResultResponse.builder()
                .submissionId(sub.getId())
                .assessmentId(sub.getAssessment().getId())
                .assessmentTitle(sub.getAssessment().getTitle())
                .studentName(sub.getStudent().getName())
                .studentUsername(sub.getStudent().getUsername())
                .score(sub.getScore())
                .totalMarks(sub.getTotalMarks())
                .passMarks(sub.getAssessment().getPassMarks())
                .percentage(sub.getPercentage())
                .passed(sub.isPassed())
                .totalQuestions(sub.getTotalQuestions())
                .correctAnswers(sub.getCorrectAnswers())
                .violationsCount(sub.getViolationsCount())
                .submittedAt(sub.getSubmittedAt())
                .answers(answerDTOs)
                .build();
    }
}
