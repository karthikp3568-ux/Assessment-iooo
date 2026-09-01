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

@Component
@RequiredArgsConstructor
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
                    .description("Comprehensive test evaluating Java fundamentals, OOP, Collections, Multithreading, REST APIs, and Spring Security architecture.")
                    .category("Java & Backend")
                    .durationMinutes(45)
                    .totalMarks(50)
                    .passMarks(30)
                    .active(true)
                    .createdAt(LocalDateTime.now().minusDays(3))
                    .questions(new ArrayList<>())
                    .build();

            List<Question> javaQuestions = List.of(
                    Question.builder()
                            .assessment(javaExam)
                            .questionText("Which Java Collection interface allows duplicate elements and maintains insertion order?")
                            .optionA("Set")
                            .optionB("List")
                            .optionC("Map")
                            .optionD("Queue")
                            .correctOption("B")
                            .marks(10)
                            .explanation("List allows duplicate elements and guarantees positional access and insertion order preservation.")
                            .build(),
                    Question.builder()
                            .assessment(javaExam)
                            .questionText("In Spring Boot, which annotation is used to designate a class as a global exception handler for REST controllers?")
                            .optionA("@ExceptionHandler")
                            .optionB("@ControllerAdvice / @RestControllerAdvice")
                            .optionC("@ResponseStatus")
                            .optionD("@GlobalHandler")
                            .correctOption("B")
                            .marks(10)
                            .explanation("@RestControllerAdvice combines @ControllerAdvice and @ResponseBody to handle exceptions across all controllers globally.")
                            .build(),
                    Question.builder()
                            .assessment(javaExam)
                            .questionText("What HTTP status code should be returned when a new resource is successfully created via a POST request?")
                            .optionA("200 OK")
                            .optionB("201 Created")
                            .optionC("202 Accepted")
                            .optionD("204 No Content")
                            .correctOption("B")
                            .marks(10)
                            .explanation("HTTP 201 Created signifies that the request succeeded and led to the creation of a new resource.")
                            .build(),
                    Question.builder()
                            .assessment(javaExam)
                            .questionText("Which garbage collector in modern Java provides ultra-low pause times regardless of heap size?")
                            .optionA("Serial GC")
                            .optionB("Parallel GC")
                            .optionC("ZGC (Z Garbage Collector)")
                            .optionD("CMS (Concurrent Mark Sweep)")
                            .correctOption("C")
                            .marks(10)
                            .explanation("ZGC is a scalable low-latency garbage collector capable of handling terabytes of memory with sub-millisecond pauses.")
                            .build(),
                    Question.builder()
                            .assessment(javaExam)
                            .questionText("In Spring Security, what is the default session creation policy recommended for stateless REST APIs using JWT tokens?")
                            .optionA("SessionCreationPolicy.ALWAYS")
                            .optionB("SessionCreationPolicy.IF_REQUIRED")
                            .optionC("SessionCreationPolicy.STATELESS")
                            .optionD("SessionCreationPolicy.NEVER")
                            .correctOption("C")
                            .marks(10)
                            .explanation("SessionCreationPolicy.STATELESS instructs Spring Security to never create or use HTTP sessions to store SecurityContext.")
                            .build()
            );
            javaExam.getQuestions().addAll(javaQuestions);
            assessmentRepository.save(javaExam);

            Assessment iotExam = Assessment.builder()
                    .title("IoT & Embedded Systems Fundamentals")
                    .description("Assessment on microcontroller architectures, communication protocols (MQTT, HTTP, CoAP), sensor interfacing, and edge computing.")
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
                            .questionText("Which lightweight publish-subscribe network protocol is most widely used for IoT messaging over TCP/IP?")
                            .optionA("HTTP/2")
                            .optionB("MQTT")
                            .optionC("AMQP")
                            .optionD("SNMP")
                            .correctOption("B")
                            .marks(10)
                            .explanation("MQTT (Message Queuing Telemetry Transport) is an ISO standard publish-subscribe-based messaging protocol designed for constrained devices.")
                            .build(),
                    Question.builder()
                            .assessment(iotExam)
                            .questionText("How many physical data lines (wires) are required for the I2C (Inter-Integrated Circuit) communication bus?")
                            .optionA("1 line (One-Wire)")
                            .optionB("2 lines (SDA and SCL)")
                            .optionC("4 lines (MISO, MOSI, SCK, CS)")
                            .optionD("8 lines (Parallel)")
                            .correctOption("B")
                            .marks(10)
                            .explanation("I2C utilizes two bidirectional open-drain lines: Serial Data Line (SDA) and Serial Clock Line (SCL).")
                            .build(),
                    Question.builder()
                            .assessment(iotExam)
                            .questionText("What is the primary advantage of ESP32 over a standard Arduino Uno (ATmega328P)?")
                            .optionA("Lower operating voltage only")
                            .optionB("Built-in Wi-Fi and Bluetooth with dual-core 32-bit MCU")
                            .optionC("No requirement for firmware")
                            .optionD("Smaller flash memory")
                            .correctOption("B")
                            .marks(10)
                            .explanation("ESP32 features integrated Wi-Fi and dual-mode Bluetooth with a powerful Xtensa dual-core 32-bit processor.")
                            .build(),
                    Question.builder()
                            .assessment(iotExam)
                            .questionText("What does QoS 1 represent in MQTT protocol message delivery?")
                            .optionA("At most once (fire and forget)")
                            .optionB("At least once (acknowledged delivery)")
                            .optionC("Exactly once (assured delivery)")
                            .optionD("Zero delivery")
                            .correctOption("B")
                            .marks(10)
                            .explanation("QoS 1 guarantees that the message arrives at the receiver at least once, requiring a PUBACK response.")
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
                            .questionText("What is the smallest deployable computing unit that can be created and managed in Kubernetes?")
                            .optionA("Container")
                            .optionB("Pod")
                            .optionC("Cluster")
                            .optionD("ReplicaSet")
                            .correctOption("B")
                            .marks(10)
                            .explanation("A Pod is the basic execution unit of a Kubernetes application, encapsulating one or more containers.")
                            .build(),
                    Question.builder()
                            .assessment(cloudExam)
                            .questionText("In Docker, which instruction is used to set the working directory for subsequent instructions in the Dockerfile?")
                            .optionA("DIR")
                            .optionB("WORKDIR")
                            .optionC("CD")
                            .optionD("FOLDER")
                            .correctOption("B")
                            .marks(10)
                            .explanation("WORKDIR sets the working directory for any RUN, CMD, ENTRYPOINT, COPY and ADD instructions.")
                            .build(),
                    Question.builder()
                            .assessment(cloudExam)
                            .questionText("Which principle describes infrastructure deployment managed using declarative configuration files?")
                            .optionA("Infrastructure as Code (IaC)")
                            .optionB("Monolithic Deployment")
                            .optionC("Manual Server Provisioning")
                            .optionD("Stateless Networking")
                            .correctOption("A")
                            .marks(10)
                            .explanation("Infrastructure as Code (IaC) is the management and provisioning of infrastructure through code rather than manual processes.")
                            .build()
            );
            cloudExam.getQuestions().addAll(cloudQuestions);
            assessmentRepository.save(cloudExam);

            // 3. Seed a sample submission for the demo student
            Submission sampleSub = Submission.builder()
                    .student(student)
                    .assessment(javaExam)
                    .score(40)
                    .totalMarks(50)
                    .percentage(80.0)
                    .passed(true)
                    .totalQuestions(5)
                    .correctAnswers(4)
                    .violationsCount(0)
                    .submittedAt(LocalDateTime.now().minusHours(4))
                    .answers(new ArrayList<>())
                    .build();

            submissionRepository.save(sampleSub);
        }
    }
}
