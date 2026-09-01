package com.assessx.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssessmentSummaryDTO {
    private Long id;
    private String title;
    private String description;
    private String category;
    private int durationMinutes;
    private int totalMarks;
    private int passMarks;
    private int questionsCount;
    private boolean active;
    private LocalDateTime createdAt;
}
