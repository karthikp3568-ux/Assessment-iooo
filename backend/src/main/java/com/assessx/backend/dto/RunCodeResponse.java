package com.assessx.backend.dto;
import lombok.AllArgsConstructor;
import lombok.Data;
@Data @AllArgsConstructor public class RunCodeResponse { private boolean success; private String output; private String error; }
