# Product Price Extractor

마트 매대 사진에서 가격표의 제품명과 가격을 자동으로 추출하여 저장하는 시스템

## 프로젝트 개요

지역 영업본부의 시장 경쟁력 분석 및 동향 파악을 위해 전국 주요 마트 매대 조사를 자동화하는 시스템입니다. 영업사원들이 촬영한 매대 사진에서 제품명과 가격 정보를 AI로 자동 인식하여 데이터 입력 업무 시간을 대폭 단축하고, 수작업 입력으로 인한 오류율을 최소화합니다.

## 주요 기능

### 1. 매대 사진 업로드 기능
- 모바일/웹 브라우저 지원 (Mobile-only web UI)
- 드래그 앤 드롭 또는 파일 선택을 통한 업로드
- 최대 10장 일괄 업로드 지원
- 최대 10MB 이하의 이미지 파일 지원 (JPG, PNG)
- 사진 메타데이터 자동 수집 (촬영 시간)

### 2. AI 기반 OCR 자동 인식
- OpenAI Vision API를 활용한 가격표 텍스트 자동 인식
- 제품명, 가격, SKU 등의 텍스트 추출
- 다양한 가격표 형식 대응 (인쇄된 가격표, 수기 작성 가격표, 바코드 등)
- 중복된 제품 정보 자동 필터링
- 인식 신뢰도(Confidence Score) 제공

### 3. 자동 데이터 입력 및 검증
- 인식된 데이터를 PostgreSQL 데이터베이스에 자동 저장
- 각 매장별로 구조화된 형식(제품명, 가격)으로 자동 변환
- 검증 결과를 영업사원에게 실시간 피드백

### 4. 수동 검수 및 수정 기능
- 인식 신뢰도가 낮은 항목(80% 이하) 자동 검수 대상 표시
- 웹 대시보드에서 검수 필요 항목 한눈에 확인
- 빠른 승인/수정 UI (체크박스, 인라인 편집 등)
- 자동승인 항목도 수정 가능
- 수정 이력 자동 기록

### 5. 대시보드 및 리포팅
- 거래처별 매대 데이터 시각화 (촬영일자, 제품명, 가격 리스트)
- 제품별 가격 비교 분석 (경쟁사 대비 가격)
- 매장/지역별 매대 현황 통계
- 내보내기 기능 (Excel, CSV 등)

## 기술 스택

- **Backend**: Spring Boot (Java)
- **Database**: PostgreSQL
- **AI Analysis**: OpenAI GPT-4o-mini (Vision API)

## 설치 및 설정

### 1. 필수 요구사항

- Java 17 이상
- Maven 3.6 이상 또는 Gradle 7.0 이상
- PostgreSQL 12 이상

### 2. 프로젝트 빌드

Maven을 사용하는 경우:

```bash
mvn clean install
```

Gradle을 사용하는 경우:

```bash
./gradlew build
```

### 3. 환경 변수 설정

`application.properties` 또는 `application.yml` 파일을 생성하고 다음 내용을 설정하세요:

```properties
# Database Configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/product_price_db
spring.datasource.username=postgres
spring.datasource.password=your_password
spring.datasource.driver-class-name=org.postgresql.Driver

# OpenAI Configuration
openai.model=gpt-4o-mini
openai.temperature=0.1

# Application Configuration
server.host=0.0.0.0
server.port=8000
logging.level.root=INFO
```

### 4. OpenAI API Key 설정

`application.properties` 또는 환경 변수로 설정:

```properties
openai.api.key=your-openai-api-key-here
```

또는 환경 변수로:

```bash
export OPENAI_API_KEY=your-openai-api-key-here
```

### 5. 데이터베이스 초기화

PostgreSQL에서 데이터베이스를 생성하고 `create_tables.sql` 스크립트를 실행하세요:

```bash
# 데이터베이스 생성
createdb -U postgres product_price_db

# 테이블 생성
psql -U postgres -d product_price_db -f create_tables.sql
```

또는 애플리케이션 실행 시 자동으로 테이블 생성되도록 설정할 수 있습니다.

## 실행

애플리케이션을 실행합니다:

```bash
mvn spring-boot:run
```

또는:

```bash
java -jar target/product-price-extractor-1.0.0.jar
```

API 문서는 `http://localhost:8000/docs`에서 확인할 수 있습니다.

## 사용자 업무 프로세스

### Step 1: 현장 사진 촬영
- 거래처 방문 시 매대 사진 촬영
- **촬영 팁**: 가격표 전체 + 밝은 조명 + 직각으로 + 사진을 확대했을 때 텍스트가 깨지지 않도록

### Step 2: 시스템에 매대 사진 업로드
- 앱에서 **"매대사진 등록"** 버튼 클릭
- **최대 10장 일괄 업로드 가능**
- **"업로드완료" 팝업창 표기**

### Step 3: 처리 대기 및 알림
- 업로드 후 AI 분석 동안 **"분석중"** 메시지 표기
- **분석완료 시 알림** 수신: "10장 처리완료! 8건 자동OK, 2건 검수요망"
- **평균 처리시간**: 업로드 후 **5분 내 완료**

### Step 4: 간편 검수
- **검수 필요 항목만 표시** (평균 10% 미만)
- 인식 신뢰도에 따른 상태 표시:
  - 🟢 자동승인 (신뢰도 80% 이상)
  - 🔴 수정필요 (신뢰도 80% 미만)
  - 🟠 수정/승인 가능 (자동승인 항목도 수정 가능)
- **1분 내 검수 완료** → **"전체 완료"** 승인

### Step 5: 완료 확인 및 공유
- 거래처별 - 작성일자별 - 등록된 제품-가격 저장
- 대시보드 페이지에서 조회 및 분석 가능

## API 엔드포인트

### 제품 가격 추출

**POST** `/api/products/extract`

이미지를 업로드하여 제품 가격을 추출합니다.

**파라미터:**
- `files`: 이미지 파일 배열 (필수, 최대 10개)
- `store_name`: 매장명 (선택)
- `location`: 위치 (선택)

**응답 예시:**
```json
{
  "success": true,
  "extracted_products": [
    {
      "id": 1,
      "product_name": "매일우유",
      "price": 2500.00,
      "confidence_score": 0.95,
      "status": "AUTO_APPROVED",
      "image_path": "uploads/product_20240101_120000.jpg",
      "extracted_at": "2024-01-01T12:00:00",
      "created_at": "2024-01-01T12:00:00"
    }
  ],
  "count": 1,
  "pending_review_count": 0,
  "message": "Successfully extracted 1 products"
}
```

### 제품 목록 조회

**GET** `/api/products/list`

저장된 제품 목록을 조회합니다.

**쿼리 파라미터:**
- `page`: 페이지 번호 (기본값: 1)
- `page_size`: 페이지당 항목 수 (기본값: 20, 최대: 100)
- `product_name`: 제품명 필터 (부분 일치)
- `store_name`: 매장명 필터
- `start_date`: 시작일자 (YYYY-MM-DD)
- `end_date`: 종료일자 (YYYY-MM-DD)

**응답 예시:**
```json
{
  "items": [
    {
      "id": 1,
      "product_name": "매일우유",
      "price": 2500.00,
      "store_name": "이마트 강남점",
      "image_path": "uploads/product_20240101_120000.jpg",
      "extracted_at": "2024-01-01T12:00:00",
      "created_at": "2024-01-01T12:00:00"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20,
  "total_pages": 1
}
```

### 검수 대기 항목 조회

**GET** `/api/products/review`

검수가 필요한 제품 목록을 조회합니다.

**쿼리 파라미터:**
- `page`: 페이지 번호 (기본값: 1)
- `page_size`: 페이지당 항목 수 (기본값: 20)

### 제품 정보 수정/승인

**PUT** `/api/products/{id}/review`

검수 항목을 수정하거나 승인합니다.

**요청 본문:**
```json
{
  "product_name": "매일요거트",
  "price": 2800.00,
  "action": "APPROVE"
}
```

### 대시보드 통계

**GET** `/api/dashboard/stats`

거래처별, 제품별 통계 정보를 조회합니다.

**쿼리 파라미터:**
- `store_name`: 매장명 필터
- `start_date`: 시작일자
- `end_date`: 종료일자

## 프로젝트 구조

```
product-price-extractor/
├── src/
│   └── main/
│       ├── java/
│       │   └── com/
│       │       └── productprice/
│       │           ├── ProductPriceExtractorApplication.java  # Spring Boot 애플리케이션
│       │           ├── config/              # 설정 클래스
│       │           │   ├── DatabaseConfig.java
│       │           │   └── OpenAIConfig.java
│       │           ├── controller/          # REST API 컨트롤러
│       │           │   ├── ProductController.java
│       │           │   └── DashboardController.java
│       │           ├── service/             # 비즈니스 로직
│       │           │   ├── ProductService.java
│       │           │   ├── OpenAIService.java
│       │           │   └── ImageService.java
│       │           ├── repository/          # 데이터베이스 접근
│       │           │   └── ProductRepository.java
│       │           ├── model/               # 엔티티 모델
│       │           │   └── Product.java
│       │           ├── dto/                 # 데이터 전송 객체
│       │           │   ├── ProductRequest.java
│       │           │   └── ProductResponse.java
│       │           └── util/                # 유틸리티
│       │               └── PromptUtil.java   # OpenAI 프롬프트
│       └── resources/
│           ├── application.properties       # 애플리케이션 설정
│           └── db/
│               └── migration/              # 데이터베이스 마이그레이션
├── uploads/             # 업로드된 이미지 저장 디렉토리
├── pom.xml              # Maven 의존성 (또는 build.gradle)
├── create_tables.sql    # 데이터베이스 테이블 생성 스크립트
├── README.md            # 프로젝트 문서
└── .gitignore           # Git 제외 파일 목록
```

## 기대효과

### 업무 효율성 개선
- **시간 단축**: 하루 ASIS) 60분 → TOBE) 15분 (75% 절감)
  - 영업사원 1인당 하루 평균 10개 마트 방문, 마트당 3장 사진 촬영, 일일 30장 처리
  - ASIS) 수작업 장당 2분 소요 → 60분
  - TOBE) OCR 자동화로 장당 30초 → 15분

### 데이터 품질 향상
- **오류율 감소**: 수작업 입력 오류율 **15-20%**에서 OCR+검증로직 적용 시 **3-5%**로 감소
- **휴먼에러 75%↓**: 월 1,500장(50명×30장) 기준 **연간 오류 수정 시간 1,800시간 절감**
- **데이터 완성도 향상**: 누락률 10% → 2%로 개선, **완전한 시장조사 데이터 95% 확보**로 가격 정책 결정 정확도 20% 향상 예상

### 의사결정 속도 향상
- **데이터 수집 주기 단축**: 기존 **일주일 소요** → **당일 완료**
- 시장 가격 변동(주 2-3회) 대응 시간 **83% 단축**(7일→1일)
- 경쟁사 가격 인상 시 **24시간 내 대응** 가능
- **의사결정 비용 절감**: 지연으로 인한 매출 손실(일 5백만원 추정) **연 9억원 절감** 가능

### 사용자 만족도 개선
- **업무 부하 감소**: 데이터 입력 비중 **40%→4%**로 감소
- 영업사원당 **추가 영업활동 시간 월 45시간 확보**
- 고객 방문 횟수 20% 증가 예상
- **직무전환 효과**: 단순 입력 → **데이터 검증/분석 역할**로 격상
- 업무 만족도 조사 점수 **평균 3.2→4.5** 예상(5점 만점)

### 확장성 및 미래 대비
- **ROI 분석**: 초기 개발비 5천만원 + 연 OpenAI API 비용 3천만원 = **1년차 총 8천만원**
- 인력 절감(월 1.5억원)으로 **10개월 내 투자회수**, **2년차 순이익 1.8억원** 예상
- **확장 활용**: 동일 OCR로 **바코드 인식(재고관리)**, **포장재 손상 감지**, **경쟁제품 진열 위치 분석** 등 **연 3개 서비스 추가 개발** 가능
- AI 인프라 재활용률 **80%**

## 주의사항

- 업로드된 이미지는 `uploads/` 디렉토리에 저장됩니다.
- OpenAI API 키는 환경 변수나 설정 파일로 관리하며, 버전 관리에서 제외하는 것을 권장합니다.
- 프로덕션 환경에서는 CORS 설정을 적절히 구성하세요.
- 이미지 파일 크기 제한(최대 10MB)을 준수하세요.
- 일괄 업로드 시 최대 10장까지만 지원됩니다.



