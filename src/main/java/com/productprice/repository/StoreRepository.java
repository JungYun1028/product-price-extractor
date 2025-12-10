package com.productprice.repository;

import com.productprice.model.Store;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoreRepository extends JpaRepository<Store, Long> {

    Optional<Store> findByStoreName(String storeName);

    List<Store> findByStoreNameContainingIgnoreCase(String storeName);

    @Query("SELECT s FROM Store s WHERE " +
           "(:storeName IS NULL OR LOWER(s.storeName) LIKE LOWER(CONCAT('%', :storeName, '%'))) AND " +
           "(:channel IS NULL OR LOWER(s.channel) LIKE LOWER(CONCAT('%', :channel, '%'))) AND " +
           "(:branch IS NULL OR LOWER(s.branch) LIKE LOWER(CONCAT('%', :branch, '%')))")
    List<Store> findWithFilters(
            @Param("storeName") String storeName,
            @Param("channel") String channel,
            @Param("branch") String branch
    );
}

