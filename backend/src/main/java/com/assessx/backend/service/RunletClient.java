package com.assessx.backend.service;

import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class RunletClient {
    private static final Logger log = LoggerFactory.getLogger(RunletClient.class);
    private static final String RUNLET_URL = "https://runlet.codealong.live/execute";
    private final RestTemplate rest;

    public RunletClient() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(10000);
        this.rest = new RestTemplate(factory);
    }

    public CodingExecutionService.Result execute(String language, String code, String stdin) {
        try {
            JSONObject payload = new JSONObject();
            payload.put("language", language == null ? "java" : language);
            payload.put("code", code == null ? "" : code);
            payload.put("stdin", stdin == null ? "" : stdin);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> entity = new HttpEntity<>(payload.toString(), headers);
            ResponseEntity<String> resp = rest.postForEntity(RUNLET_URL, entity, String.class);
            String body = resp.getBody() == null ? "" : resp.getBody();
            log.debug("Runlet response: {}", body);
            JSONObject json = new JSONObject(body.isBlank() ? "{}" : body);
            String stdout = json.optString("stdout", json.optString("output", ""));
            String stderr = json.optString("stderr", json.optString("error", ""));
            boolean success = json.has("success") ? json.optBoolean("success") : (resp.getStatusCode().is2xxSuccessful() && json.optInt("exitCode", 0) == 0);
            return new CodingExecutionService.Result(success, stdout, stderr == null ? "" : stderr);
        } catch (Exception e) {
            log.warn("Runlet execution failed: {}", e.toString());
            return new CodingExecutionService.Result(false, "", "Execution service error: " + e.getMessage());
        }
    }
}
