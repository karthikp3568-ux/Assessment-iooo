package com.assessx.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamResultResponse {
    private Long submissionId;
    private Long assessmentId;
    private String assessmentTitle;
    private String studentName;
    private String studentUsername;
    private int score;
    private int totalMarks;
    private int passMarks;
    private double percentage;
    private boolean passed;
    private int totalQuestions;
    private int correctAnswers;
    private int violationsCount;
    private LocalDateTime submittedAt;
    private List<SubmissionAnswerDTO> answers;
}
