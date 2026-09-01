package com.assessx.backend.controller;

import com.assessx.backend.dto.ExamResultResponse;
import com.assessx.backend.service.SubmissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/submissions")
@RequiredArgsConstructor
public class SubmissionController {

    private final SubmissionService submissionService;

    @GetMapping("/my")
    public ResponseEntity<List<ExamResultResponse>> getMySubmissions(Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "student";
        return ResponseEntity.ok(submissionService.getStudentSubmissions(username));
    }

    @GetMapping
    public ResponseEntity<List<ExamResultResponse>> getAllSubmissions() {
        return ResponseEntity.ok(submissionService.getAllSubmissions());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExamResultResponse> getSubmissionById(
            @PathVariable Long id,
            Authentication authentication
    ) {
        String username = authentication != null ? authentication.getName() : "";
        boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));
        return ResponseEntity.ok(submissionService.getSubmissionById(id, username, isAdmin));
    }
}
