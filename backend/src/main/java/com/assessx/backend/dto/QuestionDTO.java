package com.assessx.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionDTO {
    private Long id;
    private String questionType; // "MCQ" or "CODING"
    private String questionText;
    
    // MCQ fields
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;
    
    // Coding fields
    private String starterCode;
    private String programmingLanguage;
    private String sampleInput;
    private String sampleOutput;
    
    private int marks;
}
