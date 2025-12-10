package com.productprice.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.io.File;
import java.io.IOException;

@Configuration
@ConfigurationProperties(prefix = "openai")
@Data
@Slf4j
public class OpenAIConfig {
    private String apiKey;
    private String model = "gpt-4o-mini";
    private Double temperature = 0.1;

    @PostConstruct
    public void loadSecretJson() {
        // If apiKey is not set from application.properties or environment variable,
        // try to load from secret.json
        if (apiKey == null || apiKey.isEmpty()) {
            try {
                File secretFile = new File("secret.json");
                if (secretFile.exists()) {
                    ObjectMapper mapper = new ObjectMapper();
                    JsonNode jsonNode = mapper.readTree(secretFile);
                    String secretKey = jsonNode.get("openai_api_key").asText();
                    if (secretKey != null && !secretKey.isEmpty()) {
                        this.apiKey = secretKey;
                        log.info("OpenAI API key loaded from secret.json");
                    }
                }
            } catch (IOException e) {
                log.warn("Could not load secret.json: {}", e.getMessage());
            }
        }
    }
}

