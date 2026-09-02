package com.assessx.backend.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.json.JSONArray;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.assessx.backend.entity.Question;

@Service
public class CodingExecutionService {
    private static final Logger log = LoggerFactory.getLogger(CodingExecutionService.class);
    private static final Pattern CLASS = Pattern.compile("public\\s+class\\s+([A-Za-z_][A-Za-z0-9_]*)");
    private final RunletClient runletClient;
    

    public CodingExecutionService(RunletClient runletClient) {
        this.runletClient = runletClient;
    }

    public Grade grade(Question question, String code) {
        if (code == null || code.isBlank()) return new Grade(0, 0, false, "No code submitted.");
        try {
            String tc = question.getTestCases();
            if (tc == null || tc.isBlank()) return new Grade(0, 0, false, "No hidden test cases are configured.");
            JSONArray tests = new JSONArray(tc);
            if (tests.isEmpty()) return new Grade(0, 0, false, "No hidden test cases are configured.");
            log.info("Coding submission received: questionId={}, language={}, codeLength={}, testCases={}", question.getId(), question.getProgrammingLanguage(), code.length(), tests.length());
            int passed = 0;
            for (int i = 0; i < tests.length(); i++) {
                JSONObject test = tests.getJSONObject(i);
                String input = test.has("input") ? test.optString("input", "") : "";
                String expected = test.has("expectedOutput") ? test.optString("expectedOutput", "") : test.optString("output", "");
                Result result = run(question.getProgrammingLanguage(), code, input);
                if (result.success() && normalize(result.output()).equals(normalize(expected))) passed++;
            }
            return new Grade(passed, tests.length(), passed == tests.length(), passed + "/" + tests.length() + " hidden test cases passed");
        } catch (Exception e) { return new Grade(0, 0, false, "Unable to evaluate submission."); }
    }

    public Result run(String language, String code, String input) {
        if (!"java".equalsIgnoreCase(language)) return new Result(false, "", "Server execution is currently available for Java questions only.");
        // First try the external Runlet service (keeps hidden tests on server-side only)
        try {
            Result remote = runletClient.execute(language, code, input == null ? "" : input);
            if (remote != null && (remote.error() == null || !remote.error().startsWith("Execution service error"))) return remote;
        } catch (Exception ignored) {}

        // Fallback to local compilation/execution if Runlet is unavailable
        Path dir = null;
        try {
            dir = Files.createTempDirectory("assessx-run-");
            Matcher m = CLASS.matcher(code); String className = m.find() ? m.group(1) : "Main";
            Files.writeString(dir.resolve(className + ".java"), code, StandardCharsets.UTF_8);
            Result compile = process(dir, new String[]{"javac", className + ".java"}, "");
            if (!compile.success()) return compile;
            return process(dir, new String[]{"java", "-cp", dir.toString(), className}, input == null ? "" : input);
        } catch (Exception e) { return new Result(false, "", "Compiler service unavailable.");
        } finally { if (dir != null) try (var paths = Files.walk(dir)) { paths.sorted(Comparator.reverseOrder()).forEach(p -> { try { Files.deleteIfExists(p); } catch (IOException ignored) {} }); } catch (IOException ignored) {} }
    }
    private Result process(Path dir, String[] command, String input) throws Exception {
        Process p = new ProcessBuilder(command).directory(dir.toFile()).redirectErrorStream(true).start();
        p.getOutputStream().write(input.getBytes(StandardCharsets.UTF_8)); p.getOutputStream().close();
        if (!p.waitFor(3, TimeUnit.SECONDS)) { p.destroyForcibly(); return new Result(false, "", "Execution timed out."); }
        String output = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        return p.exitValue() == 0 ? new Result(true, output, "") : new Result(false, "", output.length() > 1000 ? output.substring(0, 1000) : output);
    }
    private String normalize(String value) { return value == null ? "" : value.replace("\r\n", "\n").trim(); }
    public record Grade(int passed, int total, boolean allPassed, String summary) {}
    public record Result(boolean success, String output, String error) {}
}
