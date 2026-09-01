package com.assessx.backend.config;

import com.assessx.backend.entity.*;
import com.assessx.backend.repository.AssessmentRepository;
import com.assessx.backend.repository.SubmissionRepository;
import com.assessx.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

// Suppress warnings: admin/student vars used for save() side-effect, submissionRepository reserved for future seeding

@Component
@RequiredArgsConstructor
@SuppressWarnings("unused")
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final AssessmentRepository assessmentRepository;
    private final SubmissionRepository submissionRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        // 1. Seed Users
        User admin = userRepository.findByUsername("admin").orElseGet(() ->
                userRepository.save(User.builder()
                        .name("System Administrator")
                        .username("admin")
                        .password(passwordEncoder.encode("admin123"))
                        .role(Role.ADMIN)
                        .build())
        );

        User student = userRepository.findByUsername("student").orElseGet(() ->
                userRepository.save(User.builder()
                        .name("Alex Johnson")
                        .username("student")
                        .password(passwordEncoder.encode("student123"))
                        .role(Role.STUDENT)
                        .build())
        );

        // 2. Seed Assessments if database is empty
        if (assessmentRepository.count() == 0) {
            Assessment javaExam = Assessment.builder()
                    .title("Java Core & Spring Boot Master Exam")
                    .description("Comprehensive test evaluating Java fundamentals, OOP, Collections, Multithreading, REST APIs, and hands-on coding challenges.")
                    .category("Java & Backend")
                    .durationMinutes(45)
                    .totalMarks(50)
                    .passMarks(30)
                    .active(true)
                    .createdAt(LocalDateTime.now().minusDays(3))
                    .questions(new ArrayList<>())
                    .build();

            List<Question> javaQuestions = List.of(
                    // MCQ 1
                    Question.builder()
                            .assessment(javaExam)
                            .questionType("MCQ")
                            .questionText("Which Java Collection interface allows duplicate elements and maintains insertion order?")
                            .optionA("Set")
                            .optionB("List")
                            .optionC("Map")
                            .optionD("Queue")
                            .correctOption("B")
                            .marks(10)
                            .explanation("List allows duplicate elements and guarantees positional access and insertion order preservation.")
                            .build(),
                    // Coding Challenge 1
                    Question.builder()
                            .assessment(javaExam)
                            .questionType("CODING")
                            .questionText("Coding Problem: Find Maximum in Array\n\nImplement a method that takes an integer array and returns the largest element.\n\nExample:\nInput: [3, 7, 2, 9, 5]\nOutput: 9")
                            .programmingLanguage("java")
                            .starterCode("public class Solution {\n    public static int findMax(int[] arr) {\n        // Write your solution here\n        int max = arr[0];\n        for (int num : arr) {\n            if (num > max) max = num;\n        }\n        return max;\n    }\n}")
                            .sampleInput("[3, 7, 2, 9, 5]")
                            .sampleOutput("9")
                            .testCases("[{\"input\": \"[3, 7, 2, 9, 5]\", \"output\": \"9\"}, {\"input\": \"[-5, -1, -10]\", \"output\": \"-1\"}]")
                            .solutionCode("public class Solution {\n    public static int findMax(int[] arr) {\n        int max = arr[0];\n        for (int n : arr) if (n > max) max = n;\n        return max;\n    }\n}")
                            .marks(10)
                            .explanation("Iterate through the array while maintaining the current maximum value seen so far. Time complexity is O(N).")
                            .build(),
                    // MCQ 2
                    Question.builder()
                            .assessment(javaExam)
                            .questionType("MCQ")
                            .questionText("In Spring Boot, which annotation is used to designate a class as a global exception handler for REST controllers?")
                            .optionA("@ExceptionHandler")
                            .optionB("@ControllerAdvice / @RestControllerAdvice")
                            .optionC("@ResponseStatus")
                            .optionD("@GlobalHandler")
                            .correctOption("B")
                            .marks(10)
                            .explanation("@RestControllerAdvice combines @ControllerAdvice and @ResponseBody to handle exceptions across all controllers globally.")
                            .build(),
                    // Coding Challenge 2
                    Question.builder()
                            .assessment(javaExam)
                            .questionType("CODING")
                            .questionText("Coding Problem: Check Palindrome String\n\nWrite a method to determine if a given string reads the same forwards and backwards (case-insensitive).\n\nExample:\nInput: \"radar\"\nOutput: true")
                            .programmingLanguage("java")
                            .starterCode("public class Solution {\n    public static boolean isPalindrome(String str) {\n        // Write your solution here\n        String clean = str.toLowerCase();\n        return clean.equals(new StringBuilder(clean).reverse().toString());\n    }\n}")
                            .sampleInput("\"radar\"")
                            .sampleOutput("true")
                            .testCases("[{\"input\": \"\\\"radar\\\"\", \"output\": \"true\"}, {\"input\": \"\\\"hello\\\"\", \"output\": \"false\"}]")
                            .solutionCode("public class Solution {\n    public static boolean isPalindrome(String s) {\n        String clean = s.toLowerCase();\n        return clean.equals(new StringBuilder(clean).reverse().toString());\n    }\n}")
                            .marks(10)
                            .explanation("Reverse the normalized lowercase string and compare with original string.")
                            .build(),
                    // MCQ 3
                    Question.builder()
                            .assessment(javaExam)
                            .questionType("MCQ")
                            .questionText("What HTTP status code should be returned when a new resource is successfully created via a POST request?")
                            .optionA("200 OK")
                            .optionB("201 Created")
                            .optionC("202 Accepted")
                            .optionD("204 No Content")
                            .correctOption("B")
                            .marks(10)
                            .explanation("HTTP 201 Created signifies that the request succeeded and led to the creation of a new resource.")
                            .build()
            );
            javaExam.getQuestions().addAll(javaQuestions);
            assessmentRepository.save(javaExam);

            Assessment iotExam = Assessment.builder()
                    .title("IoT & Embedded Systems Fundamentals")
                    .description("Assessment on microcontroller architectures, communication protocols (MQTT, HTTP, CoAP), sensor interfacing, and edge programming.")
                    .category("IoT & Hardware")
                    .durationMinutes(30)
                    .totalMarks(40)
                    .passMarks(24)
                    .active(true)
                    .createdAt(LocalDateTime.now().minusDays(2))
                    .questions(new ArrayList<>())
                    .build();

            List<Question> iotQuestions = List.of(
                    Question.builder()
                            .assessment(iotExam)
                            .questionType("MCQ")
                            .questionText("Which lightweight publish-subscribe network protocol is most widely used for IoT messaging over TCP/IP?")
                            .optionA("HTTP/2")
                            .optionB("MQTT")
                            .optionC("AMQP")
                            .optionD("SNMP")
                            .correctOption("B")
                            .marks(10)
                            .explanation("MQTT is designed for constrained devices and low-bandwidth high-latency networks.")
                            .build(),
                    Question.builder()
                            .assessment(iotExam)
                            .questionType("CODING")
                            .questionText("Coding Problem: IoT Sensor Temperature Converter\n\nWrite a function that converts a Celsius reading to Fahrenheit.\nFormula: (C * 9/5) + 32\n\nExample:\nInput: 25.0\nOutput: 77.0")
                            .programmingLanguage("python")
                            .starterCode("def celsius_to_fahrenheit(c: float) -> float:\n    # Write your conversion logic here\n    return (c * 9/5) + 32")
                            .sampleInput("25.0")
                            .sampleOutput("77.0")
                            .testCases("[{\"input\": \"25.0\", \"output\": \"77.0\"}, {\"input\": \"0.0\", \"output\": \"32.0\"}]")
                            .solutionCode("def celsius_to_fahrenheit(c: float) -> float:\n    return (c * 9/5) + 32")
                            .marks(10)
                            .explanation("Multiply Celsius temperature by 9/5 and add 32 to get Fahrenheit.")
                            .build(),
                    Question.builder()
                            .assessment(iotExam)
                            .questionType("MCQ")
                            .questionText("How many physical data lines (wires) are required for the I2C communication bus?")
                            .optionA("1 line")
                            .optionB("2 lines (SDA and SCL)")
                            .optionC("4 lines")
                            .optionD("8 lines")
                            .correctOption("B")
                            .marks(10)
                            .explanation("I2C utilizes two bidirectional open-drain lines: Serial Data Line (SDA) and Serial Clock Line (SCL).")
                            .build(),
                    Question.builder()
                            .assessment(iotExam)
                            .questionType("MCQ")
                            .questionText("What does QoS 1 represent in MQTT protocol message delivery?")
                            .optionA("At most once")
                            .optionB("At least once (acknowledged delivery)")
                            .optionC("Exactly once")
                            .optionD("Zero delivery")
                            .correctOption("B")
                            .marks(10)
                            .explanation("QoS 1 guarantees delivery at least once with PUBACK confirmation.")
                            .build()
            );
            iotExam.getQuestions().addAll(iotQuestions);
            assessmentRepository.save(iotExam);

            Assessment cloudExam = Assessment.builder()
                    .title("Cloud Computing & DevOps Essentials")
                    .description("Covers Docker containerization, Kubernetes orchestration, CI/CD pipelines, and cloud native architectures.")
                    .category("Cloud & DevOps")
                    .durationMinutes(30)
                    .totalMarks(30)
                    .passMarks(18)
                    .active(true)
                    .createdAt(LocalDateTime.now().minusDays(1))
                    .questions(new ArrayList<>())
                    .build();

            List<Question> cloudQuestions = List.of(
                    Question.builder()
                            .assessment(cloudExam)
                            .questionType("MCQ")
                            .questionText("What is the smallest deployable computing unit that can be created and managed in Kubernetes?")
                            .optionA("Container")
                            .optionB("Pod")
                            .optionC("Cluster")
                            .optionD("ReplicaSet")
                            .correctOption("B")
                            .marks(10)
                            .explanation("A Pod is the basic execution unit of a Kubernetes application.")
                            .build(),
                    Question.builder()
                            .assessment(cloudExam)
                            .questionType("MCQ")
                            .questionText("In Docker, which instruction is used to set the working directory for subsequent instructions in the Dockerfile?")
                            .optionA("DIR")
                            .optionB("WORKDIR")
                            .optionC("CD")
                            .optionD("FOLDER")
                            .correctOption("B")
                            .marks(10)
                            .explanation("WORKDIR sets the working directory for any RUN, CMD, ENTRYPOINT, COPY instructions.")
                            .build(),
                    Question.builder()
                            .assessment(cloudExam)
                            .questionType("MCQ")
                            .questionText("Which principle describes infrastructure deployment managed using declarative configuration files?")
                            .optionA("Infrastructure as Code (IaC)")
                            .optionB("Monolithic Deployment")
                            .optionC("Manual Provisioning")
                            .optionD("Stateless Networking")
                            .correctOption("A")
                            .marks(10)
                            .explanation("Infrastructure as Code (IaC) allows provisioning infrastructure through code.")
                            .build()
            );
            cloudExam.getQuestions().addAll(cloudQuestions);
            assessmentRepository.save(cloudExam);
        }
    }
}
