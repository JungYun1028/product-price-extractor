package com.productprice.controller;

import com.productprice.service.DashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Slf4j
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        try {
            Map<String, Object> stats = dashboardService.getDashboardStats();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Error fetching dashboard stats", e);
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/store/{storeId}/price-history")
    public ResponseEntity<Map<String, Object>> getStorePriceHistory(@PathVariable Long storeId) {
        try {
            Map<String, Object> response = Map.of(
                    "storeId", storeId,
                    "priceHistory", dashboardService.getStorePriceHistory(storeId)
            );
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching store price history for store: {}", storeId, e);
            return ResponseEntity.status(500).build();
        }
    }
}

