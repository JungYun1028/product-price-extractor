package com.productprice.dto;

import com.productprice.model.ProductPrice;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductPriceExtractResponse {
    private Boolean success;
    private List<ProductPrice> extractedProducts;
    private Integer count;
    private Integer pendingReviewCount;
    private String message;
}

