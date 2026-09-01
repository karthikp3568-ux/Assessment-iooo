package com.assessx.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateQuestionRequest {
    @Builder.Default
    private String questionType = "MCQ"; // "MCQ" or "CODING"
    
    private String questionText;
    
    // MCQ fields
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;
    private String correctOption; // "A", "B", "C", "D"
    
    // Coding fields
    private String starterCode;
    private String programmingLanguage;
    private String sampleInput;
    private String sampleOutput;
    private String testCases;
    private String solutionCode;
    
    private int marks;
    private String explanation;
}
