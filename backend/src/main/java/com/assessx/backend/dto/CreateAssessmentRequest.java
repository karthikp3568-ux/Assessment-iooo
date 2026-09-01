package com.assessx.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAssessmentRequest {
    private String title;
    private String description;
    private String category;
    private int durationMinutes;
    private int passMarks;
    private List<CreateQuestionRequest> questions;
}
