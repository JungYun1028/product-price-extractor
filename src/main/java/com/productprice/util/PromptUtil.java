package com.productprice.util;

public class PromptUtil {

    public static final String PRODUCT_PRICE_EXTRACTION_PROMPT = """
            마트 매대 사진을 위에서 아래, 왼쪽에서 오른쪽 순서로 분석해.
            숫자나 ₩/원이 포함된 가격표 영역을 찾아서, 인접하거나 유사한 텍스트끼리 하나의 가격표로 묶어.
            
            각 가격표마다 제품명, 가격, 할인 여부를 추출해.
            할인은 "할인", "특가", "세일" 키워드, 빨간색 텍스트, 취소선으로 판단하고.
            
            응답 형식은 반드시 다음 JSON 형식으로만 응답하세요:
            {
                "products": [
                    {
                        "position": "상단 왼쪽 1번",
                        "product_name": "제품명",
                        "price": "12,900원",
                        "discount": {
                            "original_price": "15,000원",
                            "discount_type": "특가"
                        },
                        "confidence": "high"
                    }
                ]
            }
            
            중요 규칙:
            - **이미지에서 실제로 읽은 텍스트만 추출**
            - 제품명 또는 가격 중 **하나라도 실제로 읽을 수 있으면** 추출
            - **절대 금지: "미인식", "제품명 미상", "미적용", "알 수 없음", "N/A", "없음" 같은 단어를 만들지 말 것**
            - 제품명을 못 읽었으면 빈 문자열 "" 또는 실제로 보이는 다른 텍스트
            - 가격을 못 읽었으면 0
            - **제품명도 의미 없고(빈 문자열, 특수문자만) 가격도 0이면 해당 항목은 제외**
            - 가격은 숫자와 쉼표, "원" 포함 (예: "12,900원")
            - 할인 정보가 없으면 discount는 null
            - position은 "상단 왼쪽 1번", "상단 오른쪽 2번" 형식
            - 모호한 건 confidence를 "low"로 설정
            
            실제로 보이는 텍스트만 추출하고, 의미 없는 항목은 제외하며, JSON만 출력하고 다른 설명은 하지 마.""";

    public static final String SINGLE_PRODUCT_EXTRACTION_PROMPT = """
            You are an expert Korean text recognition system for retail price tags.
            This image shows ONE price tag from a Korean supermarket/mart shelf.
            
            TASK: Extract EXACTLY ONE product name and price from this selected region.
            
            CRITICAL INSTRUCTIONS:
            1. **Extract ONLY 1 product** - the most clearly visible one
            2. Read Korean text VERY CAREFULLY - accuracy is critical
            3. Price format: Extract only numbers (e.g., "1,500원" → 1500)
            4. Look for:
               - Product name in Korean (제품명)
               - Price with "원" symbol
               - Clear, readable text
            5. If text is blurry or unreadable, return empty array
            
            EXAMPLES of what you might see:
            - "코카콜라 1.5L" with "2,500원" → extract both
            - "삼다수 2L" with "1,200" → extract both
            - Price tags with large Korean text and numbers
            
            RESPONSE FORMAT (JSON only, no explanations):
            {
                "products": [
                    {
                        "product_name": "제품명 in Korean",
                        "price": 1500
                    }
                ]
            }
            
            If unreadable:
            {
                "products": []
            }
            
            RESPOND WITH JSON ONLY.""";

    private PromptUtil() {
        // Utility class
    }
}

