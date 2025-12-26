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

    // 대시보드용: 제품별로 그룹화된 모든 가격 정보
    @Query("SELECT p FROM ProductPrice p ORDER BY p.productName, p.extractedAt DESC")
    List<ProductPrice> findAllOrderByProductNameAndExtractedAt();

    // 대시보드용: 거래처별 제품 수 (TOP N)
    @Query("SELECT p.store.id as storeId, p.store.storeName as storeName, COUNT(DISTINCT p.productName) as productCount, MAX(p.extractedAt) as lastUpdate " +
           "FROM ProductPrice p WHERE p.store IS NOT NULL " +
           "GROUP BY p.store.id, p.store.storeName " +
           "ORDER BY productCount DESC")
    List<Object[]> findStoreProductCountTop();

    // 대시보드용: 최근 N일 이내 가격 변경 내역
    @Query("SELECT p FROM ProductPrice p WHERE p.extractedAt >= :since ORDER BY p.extractedAt DESC")
    List<ProductPrice> findRecentPriceUpdates(@Param("since") LocalDateTime since);

    // 거래처 상세용: 특정 거래처의 제품별 가격 히스토리
    @Query("SELECT p FROM ProductPrice p WHERE p.store.id = :storeId ORDER BY p.productName, p.extractedAt DESC")
    List<ProductPrice> findByStoreIdOrderByProductNameAndExtractedAt(@Param("storeId") Long storeId);
}

