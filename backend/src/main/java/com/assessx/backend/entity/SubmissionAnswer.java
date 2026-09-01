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

    @Column(length = 2000)
    private String questionText;

    private String selectedOption;

    private String correctOption;

    private boolean correct;

    private int marksAwarded;

    @Column(length = 1000)
    private String explanation;
}
