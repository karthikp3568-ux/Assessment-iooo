package com.assessx.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmissionAnswerDTO {
    private Long questionId;
    private String questionText;
    private String selectedOption;
    private String correctOption;
    private boolean correct;
    private int marksAwarded;
    private String explanation;
}
