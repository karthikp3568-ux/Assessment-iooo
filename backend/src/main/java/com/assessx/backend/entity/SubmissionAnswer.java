package com.assessx.backend.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "submission_answers")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmissionAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id", nullable = false)
    @JsonBackReference
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Submission submission;

    private Long questionId;

    @Builder.Default
    private String questionType = "MCQ"; // "MCQ" or "CODING"

    @Column(length = 2000)
    private String questionText;

    // For MCQ
    private String selectedOption;
    private String correctOption;

    // For Coding
    @Column(columnDefinition = "TEXT")
    private String submittedCode;

    @Column(columnDefinition = "TEXT")
    private String solutionCode;

    private String testResults; // e.g. "3/3 Test Cases Passed"

    private boolean correct;

    private int marksAwarded;

    @Column(length = 1000)
    private String explanation;
}
