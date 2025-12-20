package com.productprice.controller;

import com.productprice.dto.ProductPriceExtractResponse;
import com.productprice.dto.ProductPriceListResponse;
import com.productprice.dto.ReviewRequest;
import com.productprice.model.ProductPrice;
import com.productprice.service.ProductPriceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Slf4j
public class ProductController {

    private final ProductPriceService productPriceService;
    private static final String UPLOAD_DIR = "uploads";

    @PostMapping(value = "/extract", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProductPriceExtractResponse> extractProductPrices(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "store_id", required = false) Long storeId,
            @RequestParam(value = "location", required = false) String location) {

        try {
            // Validate file
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new ProductPriceExtractResponse(false, List.of(), 0, 0, "File is empty"));
            }

            if (!file.getContentType().startsWith("image/")) {
                return ResponseEntity.badRequest()
                        .body(new ProductPriceExtractResponse(false, List.of(), 0, 0, "File must be an image"));
            }

            // Save image
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String filename = "product_" + timestamp + "_" + file.getOriginalFilename();
            Path filePath = uploadPath.resolve(filename);
            Files.write(filePath, file.getBytes());

            String relativePath = UPLOAD_DIR + "/" + filename;

            // Extract products
            List<ProductPrice> products = productPriceService.extractAndSaveProducts(
                    file.getBytes(), relativePath, storeId, location);

            long pendingCount = products.stream()
                    .filter(p -> "PENDING_REVIEW".equals(p.getStatus()))
                    .count();

            return ResponseEntity.ok(new ProductPriceExtractResponse(
                    true,
                    products,
                    products.size(),
                    (int) pendingCount,
                    "Successfully extracted " + products.size() + " products"
            ));

        } catch (IOException e) {
            log.error("Error processing file", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ProductPriceExtractResponse(false, List.of(), 0, 0, "File processing error"));
        } catch (Exception e) {
            log.error("Error extracting products", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ProductPriceExtractResponse(false, List.of(), 0, 0, "Failed to extract products"));
        }
    }

    @GetMapping("/list")
    public ResponseEntity<ProductPriceListResponse> getProductList(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String product_name,
            @RequestParam(required = false) Long store_id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start_date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end_date) {

        Page<ProductPrice> productPage = productPriceService.getProductList(
                page, pageSize, product_name, store_id, start_date, end_date);

        ProductPriceListResponse response = new ProductPriceListResponse(
                productPage.getContent(),
                productPage.getTotalElements(),
                page,
                pageSize,
                productPage.getTotalPages()
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/review")
    public ResponseEntity<ProductPriceListResponse> getPendingReviewProducts(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {

        Page<ProductPrice> productPage = productPriceService.getPendingReviewProducts(page, pageSize);

        ProductPriceListResponse response = new ProductPriceListResponse(
                productPage.getContent(),
                productPage.getTotalElements(),
                page,
                pageSize,
                productPage.getTotalPages()
        );

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/review")
    public ResponseEntity<ProductPrice> updateProductReview(
            @PathVariable Long id,
            @RequestBody ReviewRequest request) {

        try {
            ProductPrice updated = productPriceService.updateProductReview(
                    id, request.getProductName(), request.getPrice(), request.getAction());
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductPrice> updateProduct(
            @PathVariable Long id,
            @RequestBody Map<String, Object> updates) {

        try {
            String productName = updates.containsKey("productName") ? 
                (String) updates.get("productName") : null;
            BigDecimal price = updates.containsKey("price") ? 
                new BigDecimal(updates.get("price").toString()) : null;
            
            ProductPrice updated = productPriceService.updateProduct(id, productName, price);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            log.error("Error updating product", e);
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/store/{storeId}")
    public ResponseEntity<List<ProductPrice>> getProductsByStore(
            @PathVariable Long storeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        LocalDateTime dateTime = date != null ? date.atStartOfDay() : null;
        List<ProductPrice> products = productPriceService.getProductsByStoreAndDate(storeId, dateTime);
        return ResponseEntity.ok(products);
    }

    @PostMapping("/manual")
    public ResponseEntity<ProductPrice> createProductManually(
            @RequestParam Long store_id,
            @RequestParam String product_name,
            @RequestParam BigDecimal price,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime extracted_at) {
        
        ProductPrice product = productPriceService.createProductManually(store_id, product_name, price, extracted_at);
        return ResponseEntity.ok(product);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        try {
            productPriceService.deleteProduct(id);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            log.error("Error deleting product {}: {}", id, e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping(value = "/extract-regions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProductPriceExtractResponse> extractProductPricesFromRegions(
            @RequestParam("file") MultipartFile file,
            @RequestParam("store_id") Long storeId,
            @RequestParam("regions") String regionsJson) {

        try {
            // Validate file
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new ProductPriceExtractResponse(false, List.of(), 0, 0, "File is empty"));
            }

            if (!file.getContentType().startsWith("image/")) {
                return ResponseEntity.badRequest()
                        .body(new ProductPriceExtractResponse(false, List.of(), 0, 0, "Only image files are allowed"));
            }

            log.info("Processing image with regions for store: {}", storeId);
            log.info("Regions JSON: {}", regionsJson);

            // Save original image
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String originalFileName = "original_" + timestamp + "_" + file.getOriginalFilename();
            Path originalFilePath = uploadPath.resolve(originalFileName);
            Files.write(originalFilePath, file.getBytes());

            String originalRelativePath = UPLOAD_DIR + "/" + originalFileName;

            // Extract products from regions (cropped images will be saved in service)
            List<ProductPrice> products = productPriceService.extractAndSaveProductsFromRegions(
                    file.getBytes(), UPLOAD_DIR, storeId, regionsJson, originalRelativePath);

            long pendingCount = products.stream()
                    .filter(p -> "PENDING_REVIEW".equals(p.getStatus()))
                    .count();

            return ResponseEntity.ok(new ProductPriceExtractResponse(
                    true,
                    products,
                    products.size(),
                    (int) pendingCount,
                    "Successfully extracted " + products.size() + " products from " + 
                    products.stream().map(p -> p.getMetadata()).filter(m -> m != null && m.contains("region")).count() + " regions"
            ));

        } catch (IOException e) {
            log.error("Error processing file", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ProductPriceExtractResponse(false, List.of(), 0, 0, "File processing error"));
        } catch (Exception e) {
            log.error("Error extracting products from regions", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ProductPriceExtractResponse(false, List.of(), 0, 0, "Failed to extract products: " + e.getMessage()));
        }
    }
}

