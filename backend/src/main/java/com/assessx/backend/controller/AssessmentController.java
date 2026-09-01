package com.assessx.backend.controller;

import com.assessx.backend.dto.*;
import com.assessx.backend.service.AssessmentService;
import com.assessx.backend.service.SubmissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/assessments")
@RequiredArgsConstructor
public class AssessmentController {

    private final AssessmentService assessmentService;
    private final SubmissionService submissionService;

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
}
