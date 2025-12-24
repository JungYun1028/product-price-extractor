# Product Price Extractor

마트 매대 사진에서 가격표의 제품명과 가격을 자동으로 추출하여 저장하는 시스템

## 1. 프로젝트 개요

지역 영업본부의 시장 경쟁력 분석 및 동향 파악을 위해 전국 주요 마트 매대 조사를 자동화하는 시스템입니다. 영업사원들이 촬영한 매대 사진에서 제품명과 가격 정보를 AI로 자동 인식하여 데이터 입력 업무 시간을 대폭 단축하고, 수작업 입력으로 인한 오류율을 최소화합니다.

---

## 2. 주요 서비스 기능

### 2.1 거래처 관리 기능

거래처 마스터 테이블을 기반으로 각 거래처별로 제품 가격 정보를 관리합니다.

**세부 사항:**
- 거래처 정보: 거래처명, 소속지점, 소속채널, 담당자
- 지점: 서울, 경기남부, 경기북부, 부산경남, 경북, 호남, 제주
- 채널: KA(대형마트), GT(일반유통), FS(편의점)
- 거래처별 필터링 및 검색 기능
- 테이블 형태의 직관적인 거래처 목록 UI

### 2.2 매대 사진 업로드 기능

영업사원이 모바일 또는 PC를 통해 촬영된 매대 사진을 간편하게 업로드할 수 있습니다.

**세부 사항:**
- 모바일 앱 / 웹 브라우저 모두 지원 (Mobile-only web UI)
- 드래그 앤 드롭 또는 파일 선택을 통한 업로드
- **사진 건별로 구역을 설정하기 때문에 한 번에 1개의 사진만 업로드 가능**
- 최대 10MB 이하의 이미지 파일 지원 (JPG, PNG)
- **EXIF Orientation 자동 처리** - 회전된 사진도 정확하게 인식
- 업로드 후 가격표 영역을 사용자가 직접 선택 가능

### 2.3 AI 기반 OCR 자동 인식

OpenAI Vision API(GPT-4o)를 활용하여 업로드된 사진에서 가격표의 텍스트를 자동으로 인식합니다.

**세부 사항:**
- 사진 속 제품명, 가격 자동 추출
- 다양한 가격표 형식 대응 (인쇄된 가격표, 수기 작성 가격표 등)
- 인식 정확도(Confidence Score)와 함께 제공
- 가격표에 따라 "할인" 여부도 함께 제공
  - **할인 판별 기준**: 특정 시각적/텍스트 신호를 기준으로 AI가 판단
    1. **키워드**: "할인", "특가", "세일" 등의 단어가 있으면
    2. **빨간색 텍스트**: 가격이나 문구가 빨간색이면
    3. **취소선**: 원래 가격에 줄이 그어져 있으면

### 2.4 사용자 선택 기반 데이터 저장

**AI 분석 후 사용자가 결과를 확인하고 선택적으로 저장**할 수 있습니다.

**세부 사항:**
- AI 분석 결과를 체크박스가 있는 테이블로 표시
- 전체선택 기능 제공
- 제품명/가격 인라인 수정 가능
- 정확도(Confidence Score) 퍼센트로 표시
  - 80% 이상: 파란색 (신뢰도 높음)
  - 80% 미만: 주황색 (신뢰도 낮음)
- 사용자가 선택한 항목만 DB에 저장
- 각 거래처별로 인식된 정보를 구조화된 형식(제품명, 가격)으로 자동 변환

### 2.5 인식된 가격표 데이터 수정 기능

AI가 인식한 정보를 수정하여 저장할 수 있습니다. 저장 후에도 제품명, 가격정보를 수정할 수 있습니다.

**세부 사항:**
- 분석 결과 화면에서 인라인 수정 가능
- 저장 후에도 거래처 상세 페이지에서 수정 가능
- 일괄 수정 저장 기능
- 촬영일자 수정 불가

### 2.6 영역 선택 기능

사용자가 이미지에서 AI가 분석할 영역을 직접 선택할 수 있습니다.

**세부 사항:**
- Canvas 기반 이미지 편집기
- 드래그로 여러 영역 추가 가능
- 영역별로 독립적인 AI 분석 수행
- **선택 삭제 모드**: 클릭하여 특정 영역 삭제
  - 마우스 hover 시 빨간색 강조 효과
  - 확인 대화상자로 실수 방지
- 전체 삭제 기능

### 2.7 대시보드 및 리포팅

거래처별로 수집된 매대 데이터를 시각화하여 실시간 현황 파악이 가능합니다.

**세부 사항:**
- 거래처별 매대 사진의 메타데이터(촬영일자, 제품명, 가격) 리스트 페이지
- 거래처 상세 페이지:
  - 거래처 정보 (거래처명, 소속지점, 소속채널, 담당자)
  - 촬영된 사진 슬라이드쇼 (최신순)
  - 제품 목록 테이블 (촬영일자, 제품명, 가격, 사진보기)
- 지점/채널별 필터링 기능
- 제품별 가격 비교 분석 (경쟁사 대비 가격)
- 매장/지역별 매대 현황 통계
- 내보내기 기능 (Excel, CSV 등)

---

## 3. 업무 프로세스

### Step 1: **현장 사진 촬영**

- 거래처 방문 시 매대 사진 촬영
- **촬영 팁**: 가격표 전체 + 밝은 조명 + 직각으로 + 사진을 확대했을 때 텍스트가 깨지지 않도록

### Step 2: 시스템에 매대 **사진 업로드**

- 거래처 목록에서 거래처 선택 → 상세 페이지 이동
- 하단 **"매대 사진 업로드"** 섹션에서 사진 업로드
- 업로드된 사진에서 AI 분석할 영역 설정
  - "영역 추가" 버튼 클릭 후 드래그로 가격표 영역 선택
  - 여러 개의 가격표 영역 선택 가능
  - "선택 삭제"로 잘못된 영역 제거 가능
- **"AI 분석 실행"** 버튼 클릭

### Step 3: **AI 분석 및 결과 확인**

- 업로드 후 AI 분석 동안 **"분석 중"** 메시지 표기
- 분석 완료 시 하단에 결과 테이블 표시
  - 제품명, 가격, 정확도, 할인 여부 표시
  - 체크박스로 저장할 항목 선택
  - 필요시 제품명/가격 직접 수정 가능

### Step 4: **선택 및 저장**

- 저장할 항목을 체크박스로 선택 (또는 전체선택)
- 필요시 제품명/가격 수정
- **"선택 항목 저장"** 버튼 클릭
- 저장 완료 후 상단 제품 목록 테이블에 반영

### Step 5: **완료 확인 및 관리**

- 거래처 상세 페이지에서 저장된 제품 확인
- 촬영된 사진 슬라이드쇼로 확인
- 제품 목록에서 일괄 수정 또는 선택 삭제 가능
- 대시보드에서 전체 거래처 현황 조회

---

## 4. 기술 스택

- **Backend**: Spring Boot (Java 17)
- **Database**: PostgreSQL 14
- **AI Analysis**: OpenAI GPT-4o (Vision API)
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Build Tool**: Maven 3.9
- **Version Control**: Git/GitHub

---

## 5. 설치 및 설정

### 5.1 필수 요구사항

- Java 17 이상
- Maven 3.6 이상
- PostgreSQL 12 이상
- OpenAI API Key

### 5.2 데이터베이스 설정

```bash
# PostgreSQL 데이터베이스 생성
createdb -U postgres product_price_extractor

# 테이블 생성
psql -U postgres -d product_price_extractor -f create_tables.sql
```

### 5.3 환경 변수 설정

`src/main/resources/application.properties` 파일 설정:

```properties
# Database Configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/product_price_extractor
spring.datasource.username=postgres
spring.datasource.password=your_password
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA Configuration
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

# Server Configuration
server.port=8000

# OpenAI Configuration
openai.api.key=${OPENAI_API_KEY}
openai.model=gpt-4o
openai.temperature=0.1

# File Upload
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=10MB

# Logging
logging.level.com.productprice=DEBUG
```

### 5.4 OpenAI API Key 설정

환경 변수 또는 `secret.json` 파일로 설정:

```bash
export OPENAI_API_KEY=your-openai-api-key-here
```

또는 `secret.json` 파일 생성:

```json
{
  "openai_api_key": "your-openai-api-key-here"
}
```

### 5.5 애플리케이션 실행

```bash
# Maven으로 빌드 및 실행
mvn clean install
mvn spring-boot:run

# 또는 JAR 파일 실행
java -jar target/product-price-extractor-1.0.0.jar
```

웹 브라우저에서 `http://localhost:8000` 접속

---

## 6. API 엔드포인트

### 6.1 거래처 관리

#### 거래처 목록 조회
**GET** `/api/stores`
- 쿼리 파라미터: `branch`, `channel`

#### 거래처 생성
**POST** `/api/stores`

#### 거래처 수정
**PUT** `/api/stores/{id}`

#### 거래처 삭제
**DELETE** `/api/stores/{id}`

### 6.2 제품 가격 관리

#### 영역 기반 AI 분석 (저장 안 함)
**POST** `/api/products/extract-regions`
- 파라미터:
  - `file`: 이미지 파일
  - `store_id`: 거래처 ID
  - `regions`: 영역 좌표 JSON

#### 선택 항목 저장
**POST** `/api/products/save-selected`
- 요청 본문: 선택된 제품 배열

#### 거래처별 제품 조회
**GET** `/api/products/store/{storeId}`
- 쿼리 파라미터: `date` (선택)

#### 제품 일괄 수정
**PUT** `/api/products/batch`
- 요청 본문: 수정된 제품 배열

#### 제품 일괄 삭제
**DELETE** `/api/products/batch`
- 요청 본문: 제품 ID 배열

### 6.3 대시보드

#### 대시보드 통계
**GET** `/api/dashboard/stats`

---

## 7. 프로젝트 구조

```
product-price-extractor/
├── src/
│   └── main/
│       ├── java/
│       │   └── com/productprice/
│       │       ├── ProductPriceExtractorApplication.java
│       │       ├── config/
│       │       │   ├── DatabaseConfig.java
│       │       │   ├── OpenAIConfig.java
│       │       │   └── WebConfig.java
│       │       ├── controller/
│       │       │   ├── ProductController.java
│       │       │   ├── StoreController.java
│       │       │   ├── DashboardController.java
│       │       │   └── HomeController.java
│       │       ├── service/
│       │       │   ├── ProductPriceService.java
│       │       │   ├── OpenAIService.java
│       │       │   └── StoreService.java
│       │       ├── repository/
│       │       │   ├── ProductPriceRepository.java
│       │       │   └── StoreRepository.java
│       │       ├── model/
│       │       │   ├── ProductPrice.java
│       │       │   └── Store.java
│       │       ├── dto/
│       │       │   ├── ProductPriceExtractResponse.java
│       │       │   └── ProductPriceListResponse.java
│       │       └── util/
│       │           └── PromptUtil.java
│       └── resources/
│           ├── application.properties
│           └── static/
│               ├── index.html
│               ├── css/
│               │   └── style.css
│               └── js/
│                   ├── app.js
│                   ├── crop-editor.js
│                   └── table-actions.js
├── uploads/                    # 업로드된 이미지 저장
├── create_tables.sql          # DB 테이블 생성 스크립트
├── pom.xml                    # Maven 의존성
├── README.md
└── .gitignore
```

---

## 8. 주요 개선 사항 (최신 업데이트)

### 2025년 12월 24일
- ✅ AI 분석 결과 사용자 선택 후 저장 기능 구현
- ✅ 브랜드 색상(#004A98, #0066CC) 전체 적용
- ✅ 거래처 목록 UI를 카드 그리드에서 테이블 형태로 개편
- ✅ EXIF Orientation 자동 처리 (회전된 이미지 정확히 crop)
- ✅ 영역 선택 삭제 기능 추가 (hover 효과 포함)
- ✅ 분석 결과 체크박스 테이블, 전체선택, 일괄 수정 기능
- ✅ 정확도(Confidence Score) 퍼센트로 표시

---

## 9. 기대효과

### 업무 효율성 개선
- **시간 단축**: 하루 60분 → 15분 (75% 절감)
- 영업사원 1인당 하루 평균 10개 마트 방문
- ASIS) 수작업 장당 2분 → 60분
- TOBE) OCR 자동화로 장당 30초 → 15분

### 데이터 품질 향상
- **오류율 감소**: 15-20% → 3-5%
- **휴먼에러 75%↓**: 월 1,500장 기준 연간 1,800시간 절감
- **데이터 완성도 향상**: 누락률 10% → 2%

### 의사결정 속도 향상
- **데이터 수집 주기 단축**: 일주일 → 당일 완료
- 시장 가격 변동 대응 시간 83% 단축 (7일→1일)
- 경쟁사 가격 인상 시 24시간 내 대응 가능

### 사용자 만족도 개선
- **업무 부하 감소**: 데이터 입력 비중 40%→4%
- 영업사원당 추가 영업활동 시간 월 45시간 확보
- 고객 방문 횟수 20% 증가 예상

---

## 10. 주의사항

- 업로드된 이미지는 `uploads/` 디렉토리에 저장됩니다.
- OpenAI API 키는 환경 변수나 `secret.json`으로 관리하며, Git에서 제외하세요.
- 이미지 파일 크기 제한(최대 10MB)을 준수하세요.
- 영역 설정이 필요하므로 한 번에 1개의 사진만 업로드 가능합니다.
- EXIF Orientation이 자동으로 처리되므로 회전된 사진도 정확하게 인식됩니다.

---

## 11. 라이선스

이 프로젝트는 내부 사용을 위한 프로젝트입니다.

---

## 12. 문의

프로젝트 관련 문의사항이 있으시면 GitHub Issues를 통해 연락주세요.

Repository: https://github.com/JungYun1028/product-price-extractor
