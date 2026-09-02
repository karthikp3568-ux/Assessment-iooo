package com.assessx.backend.service;

import com.assessx.backend.dto.*;
import com.assessx.backend.entity.Assessment;
import com.assessx.backend.entity.Question;
import com.assessx.backend.repository.AssessmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AssessmentService {

    private final AssessmentRepository assessmentRepository;

    @Transactional(readOnly = true)
    public List<AssessmentSummaryDTO> getAllActiveAssessments() {
        return assessmentRepository.findByActiveTrue().stream()
                .map(this::mapToSummaryDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AssessmentDetailDTO getAssessmentForExam(Long id) {
        Assessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Assessment not found with id: " + id));

        List<QuestionDTO> questionDTOs = assessment.getQuestions().stream()
                .map(q -> QuestionDTO.builder()
                        .id(q.getId())
                        .questionType(q.getQuestionType() != null ? q.getQuestionType() : "MCQ")
                        .questionText(q.getQuestionText())
                        .optionA(q.getOptionA())
                        .optionB(q.getOptionB())
                        .optionC(q.getOptionC())
                        .optionD(q.getOptionD())
                        .starterCode(q.getStarterCode())
                        .programmingLanguage(q.getProgrammingLanguage() != null ? q.getProgrammingLanguage() : "java")
                        .sampleInput(q.getSampleInput())
                        .sampleOutput(q.getSampleOutput())
                        .marks(q.getMarks())
                        .build())
                .collect(Collectors.toList());

        return AssessmentDetailDTO.builder()
                .id(assessment.getId())
                .title(assessment.getTitle())
                .description(assessment.getDescription())
                .category(assessment.getCategory())
                .durationMinutes(assessment.getDurationMinutes())
                .totalMarks(assessment.getTotalMarks())
                .passMarks(assessment.getPassMarks())
                .questions(questionDTOs)
                .build();
    }

    @Transactional
    public AssessmentSummaryDTO createAssessment(CreateAssessmentRequest request) {
        Assessment assessment = Assessment.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .category(request.getCategory())
                .durationMinutes(request.getDurationMinutes() > 0 ? request.getDurationMinutes() : 30)
                .passMarks(request.getPassMarks())
                .active(true)
                .createdAt(LocalDateTime.now())
                .questions(new ArrayList<>())
                .build();

        int totalMarks = 0;
        if (request.getQuestions() != null && !request.getQuestions().isEmpty()) {
            for (CreateQuestionRequest qReq : request.getQuestions()) {
                int marks = qReq.getMarks() > 0 ? qReq.getMarks() : 10;
                totalMarks += marks;
                
                String qType = qReq.getQuestionType() != null && !qReq.getQuestionType().isBlank()
                        ? qReq.getQuestionType().toUpperCase() : "MCQ";

                Question question = Question.builder()
                        .assessment(assessment)
                        .questionType(qType)
                        .questionText(qReq.getQuestionText())
                        .optionA(qReq.getOptionA())
                        .optionB(qReq.getOptionB())
                        .optionC(qReq.getOptionC())
                        .optionD(qReq.getOptionD())
                        .correctOption(qReq.getCorrectOption() != null ? qReq.getCorrectOption().toUpperCase() : (qType.equals("MCQ") ? "A" : null))
                        .starterCode(qReq.getStarterCode())
                        .programmingLanguage(qReq.getProgrammingLanguage() != null ? qReq.getProgrammingLanguage() : "java")
                        .sampleInput(qReq.getSampleInput())
                        .sampleOutput(qReq.getSampleOutput())
                        .testCases(qReq.getTestCases())
                        .solutionCode(qReq.getSolutionCode())
                        .marks(marks)
                        .explanation(qReq.getExplanation())
                        .build();
                assessment.getQuestions().add(question);
            }
        }
        assessment.setTotalMarks(totalMarks);
        if (assessment.getPassMarks() <= 0) {
            assessment.setPassMarks((int) Math.ceil(totalMarks * 0.5));
        }

        Assessment saved = assessmentRepository.save(assessment);
        return mapToSummaryDTO(saved);
    }

    @Transactional
    public void deleteAssessment(Long id) {
        if (!assessmentRepository.existsById(id)) {
            throw new NoSuchElementException("Assessment not found with id: " + id);
        }
        assessmentRepository.deleteById(id);
    }

    private AssessmentSummaryDTO mapToSummaryDTO(Assessment assessment) {
        return AssessmentSummaryDTO.builder()
                .id(assessment.getId())
                .title(assessment.getTitle())
                .description(assessment.getDescription())
                .category(assessment.getCategory())
                .durationMinutes(assessment.getDurationMinutes())
                .totalMarks(assessment.getTotalMarks())
                .passMarks(assessment.getPassMarks())
                .questionsCount(assessment.getQuestions() != null ? assessment.getQuestions().size() : 0)
                .active(assessment.isActive())
                .createdAt(assessment.getCreatedAt())
                .build();
    }
}
