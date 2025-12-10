package com.productprice.repository;

import com.productprice.model.ProductPrice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ProductPriceRepository extends JpaRepository<ProductPrice, Long> {

    Page<ProductPrice> findByProductNameContainingIgnoreCase(String productName, Pageable pageable);

    Page<ProductPrice> findByStatus(String status, Pageable pageable);

    @Query("SELECT p FROM ProductPrice p WHERE " +
           "(:productName IS NULL OR :productName = '' OR LOWER(p.productName) LIKE LOWER(CONCAT('%', :productName, '%'))) AND " +
           "(:storeId IS NULL OR p.store.id = :storeId) AND " +
           "(:startDate IS NULL OR p.extractedAt >= :startDate) AND " +
           "(:endDate IS NULL OR p.extractedAt <= :endDate)")
    Page<ProductPrice> findWithFilters(
            @Param("productName") String productName,
            @Param("storeId") Long storeId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable
    );

    List<ProductPrice> findByStoreIdOrderByExtractedAtDesc(Long storeId);
    
    List<ProductPrice> findByStoreIdAndExtractedAtBetweenOrderByExtractedAtDesc(
            Long storeId, 
            LocalDateTime startDate, 
            LocalDateTime endDate
    );

    List<ProductPrice> findByStatusOrderByExtractedAtDesc(String status);
}

