package com.productprice.dto;

import com.productprice.model.ProductPrice;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductPriceListResponse {
    private List<ProductPrice> items;
    private Long total;
    private Integer page;
    private Integer pageSize;
    private Integer totalPages;
}

