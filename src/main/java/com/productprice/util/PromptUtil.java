package com.productprice.util;

public class PromptUtil {

    public static final String PRODUCT_PRICE_EXTRACTION_PROMPT = """
            이 이미지는 마트 매대의 가격표 사진입니다.
            이미지에서 보이는 모든 제품의 이름과 가격을 정확히 추출해주세요.
            
            중요 사항:
            1. 가격표에 표시된 모든 제품을 빠짐없이 추출하세요
            2. 제품명은 정확히 읽어주세요 (오타나 잘못 읽지 않도록 주의)
            3. 가격은 숫자만 추출하세요 (예: "1,500원" -> 1500)
            4. 가격이 없는 제품은 제외하세요
            5. 같은 제품이 여러 번 나타나면 각각 별도로 추출하세요
            
            응답 형식은 반드시 다음 JSON 형식으로만 응답하세요:
            {
                "products": [
                    {
                        "product_name": "제품명",
                        "price": 1500
                    },
                    {
                        "product_name": "제품명2",
                        "price": 2000
                    }
                ]
            }
            
            JSON 형식만 응답하고 다른 설명은 하지 마세요.""";

    private PromptUtil() {
        // Utility class
    }
}

