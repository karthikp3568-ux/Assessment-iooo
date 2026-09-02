package com.assessx.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.assessx.backend.entity.Question;

public class CodingExecutionServiceTest {

    private final CodingExecutionService service = new CodingExecutionService(new RunletClient());

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
