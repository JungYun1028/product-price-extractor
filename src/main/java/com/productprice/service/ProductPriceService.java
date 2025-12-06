package com.productprice.service;

import com.productprice.model.ProductPrice;
import com.productprice.repository.ProductPriceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductPriceService {

    private final ProductPriceRepository repository;
    private final OpenAIService openAIService;

    @Transactional
    public List<ProductPrice> extractAndSaveProducts(byte[] imageBytes, String imagePath, String storeName, String location) {
        try {
            // Extract products using OpenAI
            List<OpenAIService.ProductInfo> extractedProducts = openAIService.extractProductsFromImage(imageBytes);

            // Convert to ProductPrice entities
            List<ProductPrice> products = extractedProducts.stream()
                    .map(info -> {
                        ProductPrice product = new ProductPrice();
                        product.setProductName(info.productName());
                        product.setPrice(BigDecimal.valueOf(info.price()));
                        product.setImagePath(imagePath);
                        product.setConfidenceScore(info.confidenceScore());
                        product.setStatus(info.confidenceScore() != null && info.confidenceScore() >= 0.8 
                                ? "AUTO_APPROVED" : "PENDING_REVIEW");
                        
                        // Set metadata
                        String metadata = String.format(
                                "{\"store_name\":\"%s\",\"location\":\"%s\"}",
                                storeName != null ? storeName : "",
                                location != null ? location : ""
                        );
                        product.setMetadata(metadata);
                        
                        return product;
                    })
                    .collect(Collectors.toList());

            // Save to database
            return repository.saveAll(products);
        } catch (Exception e) {
            log.error("Error extracting and saving products", e);
            throw new RuntimeException("Failed to extract products: " + e.getMessage(), e);
        }
    }

    public Page<ProductPrice> getProductList(int page, int pageSize, String productName, 
                                             String storeName, LocalDateTime startDate, LocalDateTime endDate) {
        Pageable pageable = PageRequest.of(page - 1, pageSize);
        
        if (productName != null || storeName != null || startDate != null || endDate != null) {
            return repository.findWithFilters(productName, storeName, startDate, endDate, pageable);
        }
        
        return repository.findAll(pageable);
    }

    public Page<ProductPrice> getPendingReviewProducts(int page, int pageSize) {
        Pageable pageable = PageRequest.of(page - 1, pageSize);
        return repository.findByStatus("PENDING_REVIEW", pageable);
    }

    @Transactional
    public ProductPrice updateProductReview(Long id, String productName, BigDecimal price, String action) {
        ProductPrice product = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));

        if (productName != null) {
            product.setProductName(productName);
        }
        if (price != null) {
            product.setPrice(price);
        }
        if ("APPROVE".equals(action)) {
            product.setStatus("APPROVED");
        }

        return repository.save(product);
    }
}

