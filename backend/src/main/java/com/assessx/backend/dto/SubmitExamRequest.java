package com.assessx.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmitExamRequest {
    // Map of questionId -> selectedOption ("A", "B", "C", "D")
    private Map<Long, String> answers;
    private int violationsCount;
}
