package com.productprice.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "product_price", indexes = {
    @Index(name = "idx_product_name", columnList = "product_name"),
    @Index(name = "idx_extracted_at", columnList = "extracted_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ProductPrice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_name", nullable = false, length = 200)
    private String productName;

    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "image_path", length = 500)
    private String imagePath; // 크롭된 가격표 이미지 경로

    @Column(name = "original_image_path", length = 500)
    private String originalImagePath; // 원본 이미지 경로

    @Column(name = "extracted_at")
    @CreationTimestamp
    private LocalDateTime extractedAt;

    @Column(name = "created_at")
    @CreationTimestamp
    private LocalDateTime createdAt;

    @Column(name = "metadata", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String metadata; // JSON string for additional metadata

    @Column(name = "confidence_score")
    private Double confidenceScore;

    @Column(name = "status", length = 50)
    private String status; // AUTO_APPROVED, PENDING_REVIEW, APPROVED, REJECTED

    @Column(name = "is_discount")
    private Boolean isDiscount; // 할인 상품 여부

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "store_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Store store; // 거래처 정보
}

