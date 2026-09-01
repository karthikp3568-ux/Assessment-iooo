package com.assessx.backend.repository;

import com.assessx.backend.entity.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    List<Submission> findByStudentUsernameOrderBySubmittedAtDesc(String username);
    List<Submission> findAllByOrderBySubmittedAtDesc();
    long countByStudentUsername(String username);
}
