package com.productprice.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.productprice.model.ProductPrice;
import com.productprice.model.Store;
import com.productprice.repository.ProductPriceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductPriceService {

    private final ProductPriceRepository repository;
    private final OpenAIService openAIService;
    private final StoreService storeService;
    private final ObjectMapper objectMapper;

    @Transactional
    public List<ProductPrice> extractAndSaveProducts(byte[] imageBytes, String imagePath, Long storeId, String location) {
        try {
            // Extract products using OpenAI
            List<OpenAIService.ProductInfo> extractedProducts = openAIService.extractProductsFromImage(imageBytes);

            // Get store if storeId is provided
            final Store store;
            if (storeId != null) {
                store = storeService.getStoreById(storeId)
                        .orElseThrow(() -> new RuntimeException("Store not found with id: " + storeId));
            } else {
                store = null;
            }

            final Store finalStore = store;
            final String finalLocation = location;

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
                        product.setStore(finalStore);
                        
                        // Set metadata
                        String metadata = String.format(
                                "{\"location\":\"%s\"}",
                                finalLocation != null ? finalLocation : ""
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
                                             Long storeId, LocalDateTime startDate, LocalDateTime endDate) {
        Pageable pageable = PageRequest.of(page - 1, pageSize);
        
        if (productName != null || storeId != null || startDate != null || endDate != null) {
            return repository.findWithFilters(productName, storeId, startDate, endDate, pageable);
        }
        
        return repository.findAll(pageable);
    }

    public List<ProductPrice> getProductsByStoreAndDate(Long storeId, LocalDateTime date) {
        if (date != null) {
            LocalDateTime startOfDay = date.toLocalDate().atStartOfDay();
            LocalDateTime endOfDay = date.toLocalDate().atTime(23, 59, 59);
            return repository.findByStoreIdAndExtractedAtBetweenOrderByExtractedAtDesc(storeId, startOfDay, endOfDay);
        } else {
            return repository.findByStoreIdOrderByExtractedAtDesc(storeId);
        }
    }

    @Transactional
    public ProductPrice createProductManually(Long storeId, String productName, BigDecimal price, LocalDateTime extractedAt) {
        Store store = storeService.getStoreById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found with id: " + storeId));
        
        ProductPrice product = new ProductPrice();
        product.setProductName(productName);
        product.setPrice(price);
        product.setStore(store);
        product.setExtractedAt(extractedAt != null ? extractedAt : LocalDateTime.now());
        product.setStatus("APPROVED");
        
        return repository.save(product);
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

    @Transactional
    public List<ProductPrice> extractAndSaveProductsFromRegions(
            byte[] imageBytes, String uploadDir, Long storeId, String regionsJson, String originalImagePath) {
        
        try {
            // Parse regions JSON
            List<Map<String, Integer>> regions = objectMapper.readValue(
                    regionsJson, new TypeReference<List<Map<String, Integer>>>() {});
            
            log.info("Processing {} regions", regions.size());
            
            // Get store
            final Store store;
            if (storeId != null) {
                store = storeService.getStoreById(storeId)
                        .orElseThrow(() -> new RuntimeException("Store not found with id: " + storeId));
            } else {
                store = null;
            }
            
            List<ProductPrice> allProducts = new ArrayList<>();
            
            // Convert byte array to BufferedImage
            BufferedImage originalImage = ImageIO.read(new ByteArrayInputStream(imageBytes));
            
            // Process each region
            for (int i = 0; i < regions.size(); i++) {
                Map<String, Integer> region = regions.get(i);
                final int regionIndex = i + 1;
                int x = region.get("x");
                int y = region.get("y");
                int width = region.get("width");
                int height = region.get("height");
                
                // 영역을 이미지 범위로 클램핑
                x = Math.max(0, x);
                y = Math.max(0, y);
                width = Math.min(width, originalImage.getWidth() - x);
                height = Math.min(height, originalImage.getHeight() - y);
                
                if (width <= 0 || height <= 0) {
                    log.warn("Skipping region {} due to invalid size", regionIndex);
                    continue;
                }
                
                log.info("Processing region {}: x={}, y={}, width={}, height={}", regionIndex, x, y, width, height);
                
                final int fx = x;
                final int fy = y;
                final int fWidth = width;
                final int fHeight = height;
                
                try {
                    // Crop image
                    BufferedImage croppedImage = originalImage.getSubimage(fx, fy, fWidth, fHeight);
                    
                    // Convert to byte array
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    ImageIO.write(croppedImage, "jpg", baos);
                    byte[] croppedBytes = baos.toByteArray();
                    
                    // Save cropped image
                    String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
                    String croppedFileName = "cropped_" + timestamp + "_region" + regionIndex + ".jpg";
                    Path croppedPath = Paths.get(uploadDir, croppedFileName);
                    ImageIO.write(croppedImage, "jpg", croppedPath.toFile());
                    String croppedImagePath = uploadDir + "/" + croppedFileName;
                    
                    // Extract products from cropped image
                    List<OpenAIService.ProductInfo> extractedProducts = 
                            openAIService.extractProductsFromImage(croppedBytes, false);
                    
                    log.info("Region {}: Extracted {} products", regionIndex, extractedProducts.size());
                    
                    // Convert to ProductPrice entities
                    List<ProductPrice> products = extractedProducts.stream()
                            .map(info -> {
                                ProductPrice product = new ProductPrice();
                                product.setProductName(info.productName());
                                product.setPrice(BigDecimal.valueOf(info.price()));
                                product.setImagePath(croppedImagePath);
                                product.setOriginalImagePath(originalImagePath);
                                product.setConfidenceScore(info.confidenceScore());
                                product.setStatus(info.confidenceScore() != null && info.confidenceScore() >= 0.8
                                        ? "AUTO_APPROVED" : "PENDING_REVIEW");
                                product.setStore(store);
                                product.setIsDiscount(info.isDiscount() != null ? info.isDiscount() : false);
                                
                                String metadata = String.format(
                                        "{\"region\": %d, \"x\": %d, \"y\": %d, \"width\": %d, \"height\": %d}",
                                        regionIndex, fx, fy, fWidth, fHeight
                                );
                                product.setMetadata(metadata);
                                
                                return product;
                            })
                            .collect(Collectors.toList());
                    
                    allProducts.addAll(products);
                    
                } catch (Exception e) {
                    log.error("Error processing region {}: {}", regionIndex, e.getMessage(), e);
                }
            }
            
            // Save all products
            if (!allProducts.isEmpty()) {
                allProducts = repository.saveAll(allProducts);
                log.info("Saved {} products from {} regions", allProducts.size(), regions.size());
            } else {
                log.warn("No products extracted from any regions");
            }
            
            return allProducts;
            
        } catch (Exception e) {
            log.error("Error extracting products from regions", e);
            throw new RuntimeException("Failed to extract products from regions: " + e.getMessage(), e);
        }
    }
}

