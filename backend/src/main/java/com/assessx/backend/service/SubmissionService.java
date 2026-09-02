package com.assessx.backend.service;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.assessx.backend.dto.*;
import com.assessx.backend.entity.*;
import com.assessx.backend.repository.*;
import lombok.RequiredArgsConstructor;

@Service @RequiredArgsConstructor
public class SubmissionService {
  private final SubmissionRepository submissionRepository;
  private final AssessmentRepository assessmentRepository;
  private final UserRepository userRepository;
  private final CodingExecutionService codingExecutionService;
  @Transactional public ExamResultResponse submitExam(Long id, SubmitExamRequest request, String username) {
    User student=userRepository.findByUsername(username).orElseThrow(()->new NoSuchElementException("Student not found with username: "+username));
    Assessment assessment=assessmentRepository.findById(id).orElseThrow(()->new NoSuchElementException("Assessment not found with id: "+id));
    Map<Long,String> submitted=request.getAnswers()==null?Collections.emptyMap():request.getAnswers(); List<SubmissionAnswer> answers=new ArrayList<>();
    Submission submission=Submission.builder().student(student).assessment(assessment).violationsCount(request.getViolationsCount()).totalQuestions(assessment.getQuestions().size()).submittedAt(LocalDateTime.now()).answers(answers).build(); int score=0,correctCount=0;
    for(Question q:assessment.getQuestions()) { String value=submitted.get(q.getId()); boolean coding="CODING".equalsIgnoreCase(q.getQuestionType()),correct; int marks; SubmissionAnswer answer;
      if(coding) { CodingExecutionService.Grade grade=codingExecutionService.grade(q,value); correct=grade.allPassed(); int max=q.getMarks()>0?q.getMarks():10; marks=grade.total()==0?0:(int)Math.round((double)grade.passed()*max/grade.total()); answer=SubmissionAnswer.builder().submission(submission).questionId(q.getId()).questionType("CODING").questionText(q.getQuestionText()).submittedCode(value==null?"":value).testResults(grade.summary()).correct(correct).marksAwarded(marks).explanation(q.getExplanation()).build(); }
      else { correct=value!=null&&q.getCorrectOption()!=null&&value.trim().equalsIgnoreCase(q.getCorrectOption().trim()); marks=correct?(q.getMarks()>0?q.getMarks():10):0; answer=SubmissionAnswer.builder().submission(submission).questionId(q.getId()).questionType("MCQ").questionText(q.getQuestionText()).selectedOption(value==null?"NONE":value.toUpperCase()).correctOption(q.getCorrectOption()).correct(correct).marksAwarded(marks).explanation(q.getExplanation()).build(); }
      score+=marks;if(correct)correctCount++;answers.add(answer); }
    int total=assessment.getTotalMarks()>0?assessment.getTotalMarks():assessment.getQuestions().size()*10; submission.setScore(score);submission.setTotalMarks(total);submission.setPercentage(total==0?0:Math.round((double)score*1000/total)/10.0);submission.setPassed(score>=assessment.getPassMarks());submission.setCorrectAnswers(correctCount);return map(submissionRepository.save(submission)); }
  @Transactional(readOnly=true) public List<ExamResultResponse> getStudentSubmissions(String username){return submissionRepository.findByStudentUsernameOrderBySubmittedAtDesc(username).stream().map(this::map).collect(Collectors.toList());}
  @Transactional(readOnly=true) public List<ExamResultResponse> getAllSubmissions(){return submissionRepository.findAllByOrderBySubmittedAtDesc().stream().map(this::map).collect(Collectors.toList());}
  @Transactional(readOnly=true) public ExamResultResponse getSubmissionById(Long id,String username,boolean admin){Submission s=submissionRepository.findById(id).orElseThrow(()->new NoSuchElementException("Submission not found with id: "+id));if(!admin&&!s.getStudent().getUsername().equals(username))throw new AccessDeniedException("You are not authorized to view this submission result.");return map(s);}
  private ExamResultResponse map(Submission s){List<SubmissionAnswerDTO> a=s.getAnswers()==null?Collections.emptyList():s.getAnswers().stream().map(x->SubmissionAnswerDTO.builder().questionId(x.getQuestionId()).questionType(x.getQuestionType()).questionText(x.getQuestionText()).selectedOption(x.getSelectedOption()).correctOption(x.getCorrectOption()).submittedCode(x.getSubmittedCode()).testResults(x.getTestResults()).correct(x.isCorrect()).marksAwarded(x.getMarksAwarded()).explanation(x.getExplanation()).build()).collect(Collectors.toList());return ExamResultResponse.builder().submissionId(s.getId()).assessmentId(s.getAssessment().getId()).assessmentTitle(s.getAssessment().getTitle()).studentName(s.getStudent().getName()).studentUsername(s.getStudent().getUsername()).score(s.getScore()).totalMarks(s.getTotalMarks()).passMarks(s.getAssessment().getPassMarks()).percentage(s.getPercentage()).passed(s.isPassed()).totalQuestions(s.getTotalQuestions()).correctAnswers(s.getCorrectAnswers()).violationsCount(s.getViolationsCount()).submittedAt(s.getSubmittedAt()).answers(a).build();}
}
