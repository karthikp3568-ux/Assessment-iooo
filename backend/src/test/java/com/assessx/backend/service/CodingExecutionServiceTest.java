package com.assessx.backend.service;

import com.assessx.backend.entity.Question;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class CodingExecutionServiceTest {

    private final CodingExecutionService service = new CodingExecutionService();

    @Test
    void grade_nullOrBlankCode_returnsNoCodeGrade() {
        Question q = new Question();
        q.setTestCases(null);
        var grade = service.grade(q, null);
        assertEquals(0, grade.passed());
        assertFalse(grade.allPassed());
        assertTrue(grade.summary().toLowerCase().contains("no code"));
    }

    @Test
    void run_nonJavaLanguage_returnsUnavailableMessage() {
        var result = service.run("python", "print('hi')", null);
        assertFalse(result.success());
        assertTrue(result.error().toLowerCase().contains("server execution is currently available for java questions only") || result.error().toLowerCase().contains("java questions only"));
    }
}
