package com.productprice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.productprice.config.OpenAIConfig;
import com.productprice.util.PromptUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class OpenAIService {

    private final OpenAIConfig openAIConfig;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    public List<ProductInfo> extractProductsFromImage(byte[] imageBytes) {
        try {
            if (openAIConfig.getApiKey() == null || openAIConfig.getApiKey().isEmpty()) {
                log.error("OpenAI API key is not configured");
                return new ArrayList<>();
            }

            // Encode image to base64
            String imageBase64 = Base64.getEncoder().encodeToString(imageBytes);

            // Prepare request to OpenAI API
            String url = "https://api.openai.com/v1/chat/completions";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(openAIConfig.getApiKey());

            // Build request body
            String requestBody = buildRequestBody(imageBase64);

            HttpEntity<String> request = new HttpEntity<>(requestBody, headers);

            // Call OpenAI API
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.POST, request, String.class);

            // Parse response
            return parseResponse(response.getBody());

        } catch (Exception e) {
            log.error("Error extracting products from image", e);
            return new ArrayList<>();
        }
    }

    private String buildRequestBody(String imageBase64) {
        try {
            // Build JSON request body for OpenAI Vision API
            String content = String.format(
                    "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"%s\"}," +
                    "{\"type\":\"image_url\",\"image_url\":{\"url\":\"data:image/jpeg;base64,%s\"}}]}",
                    PromptUtil.PRODUCT_PRICE_EXTRACTION_PROMPT.replace("\"", "\\\"").replace("\n", "\\n"),
                    imageBase64
            );

            return String.format(
                    "{\"model\":\"%s\",\"messages\":[%s],\"temperature\":%f,\"response_format\":{\"type\":\"json_object\"}}",
                    openAIConfig.getModel(),
                    content,
                    openAIConfig.getTemperature()
            );
        } catch (Exception e) {
            log.error("Error building request body", e);
            throw new RuntimeException("Failed to build request body", e);
        }
    }

    private List<ProductInfo> parseResponse(String responseBody) {
        List<ProductInfo> products = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode choices = root.get("choices");
            if (choices != null && choices.isArray() && choices.size() > 0) {
                String content = choices.get(0).get("message").get("content").asText();
                JsonNode contentJson = objectMapper.readTree(content);
                JsonNode productsNode = contentJson.get("products");
                
                if (productsNode != null && productsNode.isArray()) {
                    for (JsonNode productNode : productsNode) {
                        String productName = productNode.get("product_name").asText();
                        double price = productNode.get("price").asDouble();
                        // Default confidence score (OpenAI doesn't provide this, so we estimate)
                        double confidenceScore = 0.9;
                        
                        products.add(new ProductInfo(productName, price, confidenceScore));
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error parsing OpenAI response", e);
        }
        return products;
    }

    public record ProductInfo(String productName, Double price, Double confidenceScore) {}
}

