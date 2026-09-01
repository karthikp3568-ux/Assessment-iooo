package com.assessx.backend.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "questions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id", nullable = false)
    @JsonBackReference
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Assessment assessment;

    @Builder.Default
    @Column(nullable = false)
    private String questionType = "MCQ"; // "MCQ" or "CODING"

    @Column(length = 2000, nullable = false)
    private String questionText;

    // MCQ Fields (Nullable for CODING questions)
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;
    private String correctOption; // 'A', 'B', 'C', or 'D'

    // Coding Question Fields
    @Column(columnDefinition = "TEXT")
    private String starterCode;

    private String programmingLanguage; // "java", "python", "javascript", "cpp"

    @Column(columnDefinition = "TEXT")
    private String sampleInput;

    @Column(columnDefinition = "TEXT")
    private String sampleOutput;

    @Column(columnDefinition = "TEXT")
    private String testCases; // JSON array of [{"input": "...", "output": "..."}]

    @Column(columnDefinition = "TEXT")
    private String solutionCode;

    private int marks;

    @Column(length = 1000)
    private String explanation;
}
