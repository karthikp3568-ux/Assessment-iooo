package com.assessx.backend.controller;

import com.assessx.backend.dto.*;
import com.assessx.backend.service.AssessmentService;
import com.assessx.backend.service.SubmissionService;
import com.assessx.backend.service.CodingExecutionService;
import com.assessx.backend.repository.AssessmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/assessments")
@RequiredArgsConstructor
public class AssessmentController {

    private final AssessmentService assessmentService;
    private final SubmissionService submissionService;
    private final AssessmentRepository assessmentRepository;
    private final CodingExecutionService codingExecutionService;

    @GetMapping
    public ResponseEntity<List<AssessmentSummaryDTO>> getAllAssessments() {
        return ResponseEntity.ok(assessmentService.getAllActiveAssessments());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AssessmentDetailDTO> getAssessmentForExam(@PathVariable Long id) {
        return ResponseEntity.ok(assessmentService.getAssessmentForExam(id));
    }

    @PostMapping
    public ResponseEntity<AssessmentSummaryDTO> createAssessment(@RequestBody CreateAssessmentRequest request) {
        return ResponseEntity.ok(assessmentService.createAssessment(request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAssessment(@PathVariable Long id) {
        assessmentService.deleteAssessment(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<ExamResultResponse> submitExam(
            @PathVariable Long id,
            @RequestBody SubmitExamRequest request,
            Authentication authentication
    ) {
        String username = authentication != null ? authentication.getName() : "anonymous";
        return ResponseEntity.ok(submissionService.submitExam(id, request, username));
    }

    @PostMapping("/{id}/run")
    public ResponseEntity<RunCodeResponse> runCode(@PathVariable Long id, @RequestBody RunCodeRequest request) {
        var assessment = assessmentRepository.findById(id).orElseThrow(() -> new java.util.NoSuchElementException("Assessment not found"));
        var question = assessment.getQuestions().stream().filter(q -> q.getId().equals(request.getQuestionId()) && "CODING".equalsIgnoreCase(q.getQuestionType())).findFirst().orElseThrow(() -> new java.util.NoSuchElementException("Coding question not found"));
        var result = codingExecutionService.run(question.getProgrammingLanguage(), request.getCode(), request.getInput());
        return ResponseEntity.ok(new RunCodeResponse(result.success(), result.output(), result.error()));
    }
}
