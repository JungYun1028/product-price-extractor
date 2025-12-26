package com.productprice.service;

import com.productprice.model.ProductPrice;
import com.productprice.model.Store;
import com.productprice.repository.ProductPriceRepository;
import com.productprice.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

    private final ProductPriceRepository productPriceRepository;
    private final StoreRepository storeRepository;

    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();

        // 1. 제품별 가격 비교
        stats.put("productPriceComparison", getProductPriceComparison());

        // 2. 거래처별 제품 수 TOP 10
        stats.put("topStores", getTopStoresByProductCount());

        // 3. 최근 가격 업데이트 (7일 이내)
        stats.put("recentPriceUpdates", getRecentPriceUpdates());

        // 4. 전체 통계
        stats.put("totalProducts", productPriceRepository.count());
        stats.put("totalStores", storeRepository.count());

        return stats;
    }

    // 1. 제품별 가격 비교
    public List<Map<String, Object>> getProductPriceComparison() {
        List<ProductPrice> allProducts = productPriceRepository.findAllOrderByProductNameAndExtractedAt();

        // 제품명으로 그룹화
        Map<String, List<ProductPrice>> groupedByProduct = allProducts.stream()
                .collect(Collectors.groupingBy(ProductPrice::getProductName));

        List<Map<String, Object>> result = new ArrayList<>();

        for (Map.Entry<String, List<ProductPrice>> entry : groupedByProduct.entrySet()) {
            String productName = entry.getKey();
            List<ProductPrice> prices = entry.getValue();

            // 각 거래처별 최신 가격만 가져오기
            Map<Long, ProductPrice> latestPricePerStore = new HashMap<>();
            for (ProductPrice p : prices) {
                if (p.getStore() != null) {
                    Long storeId = p.getStore().getId();
                    if (!latestPricePerStore.containsKey(storeId) ||
                        p.getExtractedAt().isAfter(latestPricePerStore.get(storeId).getExtractedAt())) {
                        latestPricePerStore.put(storeId, p);
                    }
                }
            }

            if (latestPricePerStore.isEmpty()) continue;

            List<Map<String, Object>> storesPrices = new ArrayList<>();
            BigDecimal minPrice = null;
            BigDecimal maxPrice = null;
            BigDecimal sum = BigDecimal.ZERO;

            for (ProductPrice p : latestPricePerStore.values()) {
                Map<String, Object> storePrice = new HashMap<>();
                storePrice.put("storeName", p.getStore().getStoreName());
                storePrice.put("price", p.getPrice());
                storePrice.put("extractedAt", p.getExtractedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")));

                if (minPrice == null || p.getPrice().compareTo(minPrice) < 0) {
                    minPrice = p.getPrice();
                }
                if (maxPrice == null || p.getPrice().compareTo(maxPrice) > 0) {
                    maxPrice = p.getPrice();
                }
                sum = sum.add(p.getPrice());

                storesPrices.add(storePrice);
            }

            BigDecimal avgPrice = sum.divide(BigDecimal.valueOf(latestPricePerStore.size()), 2, BigDecimal.ROUND_HALF_UP);

            Map<String, Object> productData = new HashMap<>();
            productData.put("productName", productName);
            productData.put("stores", storesPrices);
            productData.put("avgPrice", avgPrice);
            productData.put("minPrice", minPrice);
            productData.put("maxPrice", maxPrice);
            productData.put("storeCount", latestPricePerStore.size());

            result.add(productData);
        }

        // 거래처 수가 많은 순으로 정렬
        result.sort((a, b) -> Integer.compare((Integer) b.get("storeCount"), (Integer) a.get("storeCount")));

        return result;
    }

    // 2. 거래처별 제품 수 TOP 10
    public List<Map<String, Object>> getTopStoresByProductCount() {
        List<Object[]> rawData = productPriceRepository.findStoreProductCountTop();

        return rawData.stream()
                .limit(10)
                .map(row -> {
                    Map<String, Object> store = new HashMap<>();
                    store.put("storeId", row[0]);
                    store.put("storeName", row[1]);
                    store.put("productCount", row[2]);
                    store.put("lastUpdate", row[3]);
                    return store;
                })
                .collect(Collectors.toList());
    }

    // 3. 최근 가격 업데이트 (7일 이내)
    public List<Map<String, Object>> getRecentPriceUpdates() {
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
        List<ProductPrice> recentPrices = productPriceRepository.findRecentPriceUpdates(sevenDaysAgo);

        // 거래처별, 제품별로 가격 변화 찾기
        Map<String, List<ProductPrice>> groupedByStoreAndProduct = recentPrices.stream()
                .filter(p -> p.getStore() != null)
                .collect(Collectors.groupingBy(p -> p.getStore().getId() + "_" + p.getProductName()));

        List<Map<String, Object>> priceChanges = new ArrayList<>();

        for (Map.Entry<String, List<ProductPrice>> entry : groupedByStoreAndProduct.entrySet()) {
            List<ProductPrice> productHistory = entry.getValue();
            if (productHistory.size() < 2) continue; // 변경 이력이 없으면 스킵

            // 최신순으로 정렬 (extractedAt DESC)
            productHistory.sort((a, b) -> b.getExtractedAt().compareTo(a.getExtractedAt()));

            ProductPrice latest = productHistory.get(0);
            ProductPrice previous = productHistory.get(1);

            if (!latest.getPrice().equals(previous.getPrice())) {
                Map<String, Object> change = new HashMap<>();
                change.put("storeName", latest.getStore().getStoreName());
                change.put("productName", latest.getProductName());
                change.put("previousPrice", previous.getPrice());
                change.put("currentPrice", latest.getPrice());
                change.put("priceChange", latest.getPrice().subtract(previous.getPrice()));
                change.put("changeDate", latest.getExtractedAt());
                change.put("isIncrease", latest.getPrice().compareTo(previous.getPrice()) > 0);

                priceChanges.add(change);
            }
        }

        // 최신 순으로 정렬
        priceChanges.sort((a, b) -> ((LocalDateTime) b.get("changeDate")).compareTo((LocalDateTime) a.get("changeDate")));

        return priceChanges.stream().limit(20).collect(Collectors.toList());
    }

    // 4. 거래처별 제품 가격 히스토리 (거래처 상세 페이지용)
    public Map<String, List<Map<String, Object>>> getStorePriceHistory(Long storeId) {
        List<ProductPrice> products = productPriceRepository.findByStoreIdOrderByProductNameAndExtractedAt(storeId);

        // 제품명으로 그룹화
        Map<String, List<ProductPrice>> groupedByProduct = products.stream()
                .collect(Collectors.groupingBy(ProductPrice::getProductName));

        Map<String, List<Map<String, Object>>> result = new HashMap<>();

        for (Map.Entry<String, List<ProductPrice>> entry : groupedByProduct.entrySet()) {
            String productName = entry.getKey();
            List<ProductPrice> history = entry.getValue();

            if (history.size() < 2) continue; // 히스토리가 1개 이하면 스킵

            // 최신순 정렬
            history.sort((a, b) -> b.getExtractedAt().compareTo(a.getExtractedAt()));

            List<Map<String, Object>> priceHistory = new ArrayList<>();
            for (int i = 0; i < Math.min(history.size(), 10); i++) {
                ProductPrice p = history.get(i);
                Map<String, Object> record = new HashMap<>();
                record.put("price", p.getPrice());
                record.put("date", p.getExtractedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")));

                if (i < history.size() - 1) {
                    BigDecimal prevPrice = history.get(i + 1).getPrice();
                    BigDecimal change = p.getPrice().subtract(prevPrice);
                    record.put("priceChange", change);
                    record.put("isIncrease", change.compareTo(BigDecimal.ZERO) > 0);
                }

                priceHistory.add(record);
            }

            result.put(productName, priceHistory);
        }

        return result;
    }
}

