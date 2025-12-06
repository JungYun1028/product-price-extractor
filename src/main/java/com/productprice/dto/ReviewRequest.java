package com.productprice.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ReviewRequest {
    private String productName;
    private BigDecimal price;
    private String action; // APPROVE, REJECT
}

