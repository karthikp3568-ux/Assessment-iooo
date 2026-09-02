package com.assessx.backend.service;

import com.assessx.backend.dto.SubmitExamRequest;
import com.assessx.backend.entity.*;
import com.assessx.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SubmissionServiceTest {

    @Mock
    SubmissionRepository submissionRepository;
    @Mock
    AssessmentRepository assessmentRepository;
    @Mock
    UserRepository userRepository;
    @Mock
    CodingExecutionService codingExecutionService;

    @Captor
    ArgumentCaptor<Submission> submissionCaptor;

    SubmissionService service;

    @BeforeEach
    void setup() {
        service = new SubmissionService(submissionRepository, assessmentRepository, userRepository, codingExecutionService);
    }

    @Test
    void submitExam_mcqCorrectAwardedMarks() {
        User user = new User(); user.setId(1L); user.setUsername("alice"); user.setName("Alice");
        Question q = Question.builder().id(1L).questionType("MCQ").questionText("Q?").correctOption("A").marks(10).build();
        Assessment a = Assessment.builder().id(2L).title("Test").questions(List.of(q)).passMarks(5).totalMarks(10).build();

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(assessmentRepository.findById(2L)).thenReturn(Optional.of(a));
        when(submissionRepository.save(any())).thenAnswer(inv -> { Submission s = inv.getArgument(0); s.setId(100L); return s; });

        SubmitExamRequest req = new SubmitExamRequest(); Map<Long,String> answers = new HashMap<>(); answers.put(1L, "A"); req.setAnswers(answers);
        var res = service.submitExam(2L, req, "alice");

        assertEquals(100L, res.getSubmissionId());
        assertEquals(10, res.getScore());
        assertTrue(res.isPassed());
        verify(submissionRepository).save(submissionCaptor.capture());
        Submission saved = submissionCaptor.getValue();
        assertEquals(1, saved.getAnswers().size());
    }

    @Test
    void submitExam_codingDelegatesToExecutionService() {
        User user = new User(); user.setId(1L); user.setUsername("bob"); user.setName("Bob");
        Question q = Question.builder().id(10L).questionType("CODING").questionText("CodeQ").marks(20).programmingLanguage("java").build();
        Assessment a = Assessment.builder().id(3L).title("Coding").questions(List.of(q)).passMarks(10).totalMarks(20).build();

        when(userRepository.findByUsername("bob")).thenReturn(Optional.of(user));
        when(assessmentRepository.findById(3L)).thenReturn(Optional.of(a));
        when(submissionRepository.save(any())).thenAnswer(inv -> { Submission s = inv.getArgument(0); s.setId(200L); return s; });

        when(codingExecutionService.grade(eq(q), anyString())).thenReturn(new CodingExecutionService.Grade(1,1,true,"1/1 hidden test cases passed"));

        SubmitExamRequest req = new SubmitExamRequest(); Map<Long,String> answers = new HashMap<>(); answers.put(10L, "public class Main { public static void main(String[]a){ System.out.println(\"ok\"); } }"); req.setAnswers(answers);
        var res = service.submitExam(3L, req, "bob");

        assertEquals(200L, res.getSubmissionId());
        assertTrue(res.isPassed());
        verify(codingExecutionService).grade(eq(q), anyString());
    }
}
