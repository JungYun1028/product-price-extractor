let currentPage = 1;
let currentTab = 'store';
let selectedStoreId = null;
let storeFiles = [];

// 탭 전환
function showTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabName + '-tab').classList.add('active');
    event.target.classList.add('active');
    
    if (tabName === 'store') {
        if (allStores.length === 0) {
            loadStores();
        } else {
            filterStores(); // 이미 로드된 경우 필터만 적용
        }
    } else if (tabName === 'list') {
        loadProductList();
    } else if (tabName === 'dashboard') {
        loadDashboard();
    } else if (tabName === 'upload') {
        loadStoresForUpload();
    }
}

// 파일 선택
let selectedFiles = [];

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    addFiles(files);
}

function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    const files = Array.from(event.dataTransfer.files);
    addFiles(files);
}

function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
}

function handleDragLeave(event) {
    event.currentTarget.classList.remove('dragover');
}

function updateFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span>📷</span>
            <span class="file-name">${file.name}</span>
            <span class="file-size">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
            <button onclick="removeFile(${index})" style="margin-left: 10px; padding: 5px 10px; background: #ef4444; color: white; border: none; border-radius: 5px; cursor: pointer;">삭제</button>
        `;
        fileList.appendChild(fileItem);
    });
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileList();
    document.getElementById('uploadBtn').disabled = selectedFiles.length === 0;
}

// 이미지 업로드 및 추출
async function uploadImages() {
    if (selectedFiles.length === 0) {
        alert('파일을 선택해주세요.');
        return;
    }
    
    const storeName = document.getElementById('storeName').value;
    const location = document.getElementById('location').value;
    
    const progressContainer = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const resultContainer = document.getElementById('extractResult');
    
    progressContainer.style.display = 'block';
    resultContainer.innerHTML = '';
    document.getElementById('uploadBtn').disabled = true;
    
    let successCount = 0;
    let failCount = 0;
    const totalFiles = selectedFiles.length;
    
    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        if (storeName) formData.append('store_name', storeName);
        if (location) formData.append('location', location);
        
        progressText.textContent = `처리 중... (${i + 1}/${totalFiles})`;
        progressFill.style.width = `${((i + 1) / totalFiles) * 100}%`;
        
        try {
            const response = await fetch('/api/products/extract', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                successCount += result.count;
                resultContainer.innerHTML += `
                    <div class="result-item success">
                        <h3>${file.name}</h3>
                        <p>${result.count}개 제품 추출 완료</p>
                        ${result.pendingReviewCount > 0 ? `<p style="color: #f59e0b;">⚠️ ${result.pendingReviewCount}개 항목 검수 필요</p>` : ''}
                    </div>
                `;
            } else {
                failCount++;
                resultContainer.innerHTML += `
                    <div class="result-item error">
                        <h3>❌ ${file.name}</h3>
                        <p>${result.message || '추출 실패'}</p>
                    </div>
                `;
            }
        } catch (error) {
            failCount++;
            resultContainer.innerHTML += `
                <div class="result-item error">
                    <h3>❌ ${file.name}</h3>
                    <p>오류: ${error.message}</p>
                </div>
            `;
        }
    }
    
    progressText.textContent = `완료! 성공: ${successCount}, 실패: ${failCount}`;
    document.getElementById('uploadBtn').disabled = false;
    
    // 성공 시 목록 새로고침
    if (successCount > 0 && currentTab === 'list') {
        loadProductList();
    }
}

// 제품 목록 로드
async function loadProductList(page = 1) {
    currentPage = page;
    const productName = document.getElementById('productNameFilter')?.value || '';
    const storeName = document.getElementById('storeNameFilter')?.value || '';
    const startDate = document.getElementById('startDateFilter')?.value || '';
    const endDate = document.getElementById('endDateFilter')?.value || '';
    
    const params = new URLSearchParams({
        page: page,
        page_size: 20
    });
    
    if (productName) params.append('product_name', productName);
    if (storeName) params.append('store_name', storeName);
    if (startDate) params.append('start_date', startDate + 'T00:00:00');
    if (endDate) params.append('end_date', endDate + 'T23:59:59');
    
    try {
        const response = await fetch(`/api/products/list?${params}`);
        const data = await response.json();
        
        displayProductList(data);
    } catch (error) {
        const productList = document.getElementById('productList');
        if (productList) {
            productList.innerHTML = `<p class="loading">오류: ${error.message}</p>`;
        } else {
            console.warn('productList element not found; skipping render');
        }
    }
}

function displayProductList(data) {
    const productList = document.getElementById('productList');
    if (!productList) {
        console.warn('productList element not found; skipping render');
        return;
    }
    
    if (data.items.length === 0) {
        productList.innerHTML = '<p class="loading">등록된 제품이 없습니다.</p>';
        return;
    }
    
    let html = '';
    data.items.forEach(item => {
        const metadata = item.metadata ? JSON.parse(item.metadata) : {};
        const statusClass = item.status === 'AUTO_APPROVED' || item.status === 'APPROVED' ? 'approved' : 
                           item.status === 'PENDING_REVIEW' ? 'pending' : 'review';
        const statusText = item.status === 'AUTO_APPROVED' ? '자동승인' : 
                          item.status === 'APPROVED' ? '승인됨' : 
                          item.status === 'PENDING_REVIEW' ? '검수대기' : '검수필요';
        
        html += `
            <div class="product-item">
                <div class="product-header">
                    <div class="product-name">${item.productName}</div>
                    <div class="product-price">${parseInt(item.price).toLocaleString()}원</div>
                </div>
                <div class="product-meta">
                    <span>📅 ${new Date(item.extractedAt).toLocaleDateString('ko-KR')}</span>
                    ${metadata.store_name ? `<span>🏪 ${metadata.store_name}</span>` : ''}
                    ${metadata.location ? `<span>📍 ${metadata.location}</span>` : ''}
                    <span class="status-badge status-${statusClass}">${statusText}</span>
                </div>
            </div>
        `;
    });
    
    productList.innerHTML = html;
    
    // 페이지네이션
    displayPagination(data.page, data.totalPages);
}

function displayPagination(currentPage, totalPages) {
    const pagination = document.getElementById('pagination');
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="${i === currentPage ? 'active' : ''}" onclick="loadProductList(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<span>...</span>`;
        }
    }
    pagination.innerHTML = html;
}

function filterProducts() {
    loadProductList(1);
}

function resetFilters() {
    document.getElementById('productNameFilter').value = '';
    document.getElementById('storeNameFilter').value = '';
    document.getElementById('startDateFilter').value = '';
    document.getElementById('endDateFilter').value = '';
    loadProductList(1);
}

// 대시보드 로드
async function loadDashboard() {
    try {
        const response = await fetch('/api/dashboard/stats');
        const data = await response.json();
        
        displayDashboard(data);
    } catch (error) {
        document.getElementById('dashboardStats').innerHTML = `<p class="loading">오류: ${error.message}</p>`;
    }
}

function displayDashboard(data) {
    const dashboardStats = document.getElementById('dashboardStats');
    
    dashboardStats.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">전체 제품 수</div>
            <div class="stat-value">${data.total_products || 0}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">전체 매장 수</div>
            <div class="stat-value">${data.total_stores || 0}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">검수 대기</div>
            <div class="stat-value">${data.pending_reviews || 0}</div>
        </div>
    `;
}

// 거래처 관련 함수들
let allStores = []; // 전체 거래처 목록 저장

async function loadStores() {
    try {
        const response = await fetch('/api/stores');
        allStores = await response.json();
        
        filterStores(); // 필터 적용하여 표시
        
        // URL 파라미터 확인하여 거래처 상세 페이지 표시 (거래처 로드 후)
        const urlParams = new URLSearchParams(window.location.search);
        const storeId = urlParams.get('store');
        if (storeId) {
            const store = allStores.find(s => s.id == storeId);
            if (store) {
                // 약간의 지연을 두어 DOM이 준비되도록 함
                setTimeout(() => {
                    selectStore(parseInt(storeId), store.storeName);
                }, 100);
            }
        }
    } catch (error) {
        console.error('거래처 목록 로드 실패:', error);
    }
}

function filterStores() {
    const branchFilter = document.getElementById('branchFilter')?.value || '';
    const channelFilter = document.getElementById('channelFilter')?.value || '';
    
    const uploadStoreSelect = document.getElementById('uploadStoreSelect');
    
    // 필터링된 거래처 목록
    let filteredStores = allStores.filter(store => {
        const branchMatch = !branchFilter || store.branch === branchFilter;
        const channelMatch = !channelFilter || store.channel === channelFilter;
        return branchMatch && channelMatch;
    });
    
    // 거래처 리스트 표시
    displayStoreList(filteredStores);
    
    // 이미지 업로드 탭의 드롭다운 업데이트 (전체 거래처)
    if (uploadStoreSelect) {
        uploadStoreSelect.innerHTML = '<option value="">거래처를 선택하세요 (선택사항)</option>';
        allStores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.id;
            option.textContent = `${store.storeName}${store.channel ? ' (' + store.channel + ')' : ''}`;
            uploadStoreSelect.appendChild(option);
        });
    }
}

function displayStoreList(stores) {
    const storeList = document.getElementById('storeList');
    
    if (!storeList) return;
    
    if (stores.length === 0) {
        storeList.innerHTML = '<p class="loading">조건에 맞는 거래처가 없습니다.</p>';
        return;
    }
    
    let html = `
        <table class="stores-table">
            <thead>
                <tr>
                    <th style="width: 50px;">No</th>
                    <th>거래처명</th>
                    <th style="width: 120px;">소속지점</th>
                    <th style="width: 100px;">채널</th>
                    <th style="width: 120px;">담당자</th>
                    <th style="width: 100px;">조회</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    stores.forEach((store, index) => {
        html += `
            <tr class="store-row" onclick="selectStore(${store.id}, '${store.storeName.replace(/'/g, "\\'")}')">
                <td style="text-align: center; color: #666;">${index + 1}</td>
                <td style="font-weight: 600; color: #004A98;">${store.storeName}</td>
                <td style="text-align: center;">
                    <span class="badge badge-branch">${store.branch || '-'}</span>
                </td>
                <td style="text-align: center;">
                    <span class="badge badge-channel">${store.channel || '-'}</span>
                </td>
                <td style="text-align: center;">${store.manager || '-'}</td>
                <td style="text-align: center;">
                    <button class="btn-view" onclick="event.stopPropagation(); selectStore(${store.id}, '${store.storeName.replace(/'/g, "\\'")}')">
                        상세보기
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    storeList.innerHTML = html;
}

function resetStoreFilters() {
    document.getElementById('branchFilter').value = '';
    document.getElementById('channelFilter').value = '';
    filterStores();
}

async function loadStoresForUpload() {
    try {
        const response = await fetch('/api/stores');
        const stores = await response.json();
        
        const uploadStoreSelect = document.getElementById('uploadStoreSelect');
        if (!uploadStoreSelect) return;
        
        uploadStoreSelect.innerHTML = '<option value="">거래처를 선택하세요 (선택사항)</option>';
        
        stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.id;
            option.textContent = `${store.storeName}${store.channel ? ' (' + store.channel + ')' : ''}`;
            uploadStoreSelect.appendChild(option);
        });
    } catch (error) {
        console.error('거래처 목록 로드 실패:', error);
    }
}

function showStoreForm() {
    document.getElementById('storeForm').style.display = 'block';
    document.getElementById('storeFormTitle').textContent = '거래처 추가';
    document.getElementById('storeNameInput').value = '';
    document.getElementById('storeChannelInput').value = '';
    document.getElementById('storeBranchInput').value = '';
    document.getElementById('storeManagerInput').value = '';
}

function cancelStoreForm() {
    document.getElementById('storeForm').style.display = 'none';
}

async function saveStore() {
    const storeName = document.getElementById('storeNameInput').value;
    if (!storeName) {
        alert('거래처명을 입력해주세요.');
        return;
    }
    
    const store = {
        storeName: storeName,
        channel: document.getElementById('storeChannelInput').value || null,
        branch: document.getElementById('storeBranchInput').value || null,
        manager: document.getElementById('storeManagerInput').value || null
    };
    
    try {
        const response = await fetch('/api/stores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(store)
        });
        
        if (response.ok) {
            alert('거래처가 저장되었습니다.');
            cancelStoreForm();
            loadStores();
        } else {
            alert('거래처 저장에 실패했습니다.');
        }
    } catch (error) {
        alert('오류: ' + error.message);
    }
}

let currentStoreProducts = [];
let currentStoreImages = [];
let currentSlideIndex = 0;
let modalSlideIndex = 0;
let modalImages = [];

async function selectStore(storeId, storeName) {
    selectedStoreId = storeId;
    
    // 거래처 정보 가져오기
    const store = allStores.find(s => s.id === storeId);
    if (!store) {
        alert('거래처 정보를 찾을 수 없습니다.');
        return;
    }
    
    // 거래처 목록 페이지 숨기기
    document.getElementById('store-tab').style.display = 'none';
    
    // 거래처 상세 페이지 표시
    const detailPage = document.getElementById('store-detail-page');
    detailPage.style.display = 'block';
    
    // 거래처 정보 표시
    document.getElementById('storeDetailName').textContent = store.storeName;
    const storeInfo = document.getElementById('storeDetailInfo');
    let infoHtml = '';
    if (store.branch) {
        infoHtml += `<span class="store-badge branch">${store.branch}</span>`;
    }
    if (store.channel) {
        infoHtml += `<span class="store-badge channel">${store.channel}</span>`;
    }
    if (store.manager) {
        infoHtml += `<span class="store-info-text">담당자: ${store.manager}</span>`;
    }
    storeInfo.innerHTML = infoHtml;
    
    // URL 업데이트 (히스토리 관리)
    window.history.pushState({ storeId: storeId }, '', `?store=${storeId}`);
    
    try {
        const response = await fetch(`/api/products/store/${storeId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const products = await response.json();
        
        // products가 배열인지 확인
        if (!Array.isArray(products)) {
            console.error('예상치 못한 응답 형식:', products);
            document.getElementById('storeProductsTableBody').innerHTML = '<tr><td colspan="4" class="loading">데이터 형식 오류가 발생했습니다.</td></tr>';
            return;
        }
        
        currentStoreProducts = products;
        displayStoreProducts(products, store);
    } catch (error) {
        console.error('제품 로드 오류:', error);
        document.getElementById('storeProductsTableBody').innerHTML = `<tr><td colspan="4" class="loading">오류: ${error.message}</td></tr>`;
    }
}

function goBackToStoreList() {
    // 거래처 상세 페이지 숨기기
    document.getElementById('store-detail-page').style.display = 'none';
    
    // 거래처 목록 페이지 표시
    document.getElementById('store-tab').style.display = 'block';
    
    // URL 업데이트
    window.history.pushState({}, '', window.location.pathname);
    
    // 스크롤 맨 위로
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function displayStoreProducts(products, store) {
    const tableBody = document.getElementById('storeProductsTableBody');
    
    // products가 배열인지 다시 확인
    if (!Array.isArray(products)) {
        tableBody.innerHTML = '<tr><td colspan="5" class="loading">데이터 형식 오류가 발생했습니다.</td></tr>';
        return;
    }
    
    if (products.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="loading">등록된 제품이 없습니다.</td></tr>';
        document.getElementById('imageSlideshow').style.display = 'none';
        return;
    }
    
    // 촬영일자 최신순으로 정렬
    products.sort((a, b) => {
        const dateA = new Date(a.extractedAt);
        const dateB = new Date(b.extractedAt);
        return dateB - dateA; // 최신순
    });
    
    // 원본 이미지 경로 수집 (슬라이드쇼용)
    const imageMap = new Map();
    products.forEach(item => {
        const orig = item.originalImagePath || item.imagePath;
        if (orig && !imageMap.has(orig)) {
            imageMap.set(orig, { ...item, imagePath: orig });
        }
    });
    currentStoreImages = Array.from(imageMap.values()).sort((a, b) => {
        const dateA = new Date(a.extractedAt);
        const dateB = new Date(b.extractedAt);
        return dateB - dateA;
    });
    displayImageSlideshow(currentStoreImages);
    
    // 테이블 생성
    let html = '';
    products.forEach((item, index) => {
        const date = new Date(item.extractedAt).toLocaleDateString('ko-KR');
        const time = new Date(item.extractedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        const escapedPath = item.imagePath ? item.imagePath.replace(/'/g, "\\'") : '';
        
        html += `
            <tr data-product-id="${item.id}">
                <td style="text-align:center;"><input type="checkbox" class="product-checkbox" data-product-id="${item.id}"></td>
                <td>${date} ${time}</td>
                <td>
                    <input type="text" value="${item.productName}" 
                           id="productName_${item.id}" class="edit-input"
                           style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
                </td>
                <td>
                    <input type="number" value="${parseInt(item.price)}" 
                           id="productPrice_${item.id}" class="edit-input"
                           style="width: 100px; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">원
                </td>
                <td>
                    ${item.imagePath ? `<button class="btn-view-image" onclick="openImageModal('${escapedPath}', ${index})">📷 사진보기</button>` : '-'}
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

function getImageUrl(imagePath) {
    if (!imagePath) return '';
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    // uploads/로 시작하면 그대로, 아니면 /uploads/ 추가
    if (imagePath.startsWith('uploads/')) {
        return '/' + imagePath;
    }
    return '/uploads/' + imagePath;
}

function displayImageSlideshow(images) {
    const slideshowContainer = document.getElementById('imageSlideshow');
    const slideshowImages = document.getElementById('slideshowImages');
    
    if (images.length === 0) {
        slideshowContainer.style.display = 'none';
        return;
    }
    
    slideshowContainer.style.display = 'block';
    currentSlideIndex = 0;
    
    // 촬영일자 최신순으로 다시 한번 정렬 (확실하게)
    const sortedImages = [...images].sort((a, b) => {
        const dateA = new Date(a.extractedAt);
        const dateB = new Date(b.extractedAt);
        return dateB - dateA; // 최신순
    });
    
    let html = '';
    sortedImages.forEach((item, index) => {
        const imageUrl = getImageUrl(item.imagePath);
        const escapedPath = item.imagePath.replace(/'/g, "\\'");
        const date = new Date(item.extractedAt).toLocaleDateString('ko-KR');
        const time = new Date(item.extractedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        
        html += `
            <div class="slide ${index === 0 ? 'active' : ''}" style="display: ${index === 0 ? 'block' : 'none'};">
                <div class="slide-image-wrapper">
                    <img src="${imageUrl}" alt="Product Image ${index + 1}" onclick="openImageModal('${escapedPath}', ${index})">
                    <div class="slide-date-info">📅 ${date} ${time}</div>
                </div>
            </div>
        `;
    });
    
    slideshowImages.innerHTML = html;
    document.getElementById('totalSlides').textContent = sortedImages.length;
    document.getElementById('currentSlide').textContent = '1';
    
    // currentStoreImages도 업데이트
    currentStoreImages = sortedImages;
}

function changeSlide(direction) {
    if (currentStoreImages.length === 0) return;
    
    currentSlideIndex += direction;
    
    if (currentSlideIndex < 0) {
        currentSlideIndex = currentStoreImages.length - 1;
    } else if (currentSlideIndex >= currentStoreImages.length) {
        currentSlideIndex = 0;
    }
    
    const slides = document.querySelectorAll('#slideshowImages .slide');
    slides.forEach((slide, index) => {
        slide.style.display = index === currentSlideIndex ? 'block' : 'none';
        slide.classList.toggle('active', index === currentSlideIndex);
    });
    
    document.getElementById('currentSlide').textContent = currentSlideIndex + 1;
}

function openImageModal(imagePath, startIndex) {
    modalImages = currentStoreImages.map(item => item.imagePath);
    modalSlideIndex = modalImages.findIndex(path => path === imagePath);
    if (modalSlideIndex === -1) modalSlideIndex = startIndex || 0;
    
    const modal = document.getElementById('imageModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    displayModalImage();
}

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function changeModalSlide(direction) {
    if (modalImages.length === 0) return;
    
    modalSlideIndex += direction;
    
    if (modalSlideIndex < 0) {
        modalSlideIndex = modalImages.length - 1;
    } else if (modalSlideIndex >= modalImages.length) {
        modalSlideIndex = 0;
    }
    
    displayModalImage();
}

function displayModalImage() {
    if (modalImages.length === 0) return;
    
    const imagePath = modalImages[modalSlideIndex];
    const imageUrl = getImageUrl(imagePath);
    
    document.getElementById('modalImage').src = imageUrl;
    document.getElementById('modalCurrentSlide').textContent = modalSlideIndex + 1;
    document.getElementById('modalTotalSlides').textContent = modalImages.length;
}

// ESC 키로 모달 닫기
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeImageModal();
    }
});

// 거래처 상세 페이지 - 파일 업로드 관련 (크롭 에디터로 단일 업로드)
let detailFiles = [];

function handleDetailFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    loadImageToCropEditor(file); // crop-editor.js
}

function handleDetailDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    const file = event.dataTransfer.files[0];
    if (!file) return;
    loadImageToCropEditor(file); // crop-editor.js
}

// 멀티파일 리스트는 더 이상 사용하지 않지만, 호출 시 안전하게 무시
function updateDetailFileList() {
    const fileList = document.getElementById('detailFileList');
    if (!fileList) return;
    fileList.innerHTML = '';
}

function removeDetailFile(index) {
    detailFiles.splice(index, 1);
    updateDetailFileList();
    const btn = document.getElementById('detailUploadBtn');
    if (btn) btn.disabled = detailFiles.length === 0;
}

async function uploadDetailImages() {
    if (!selectedStoreId) {
        alert('거래처 정보가 없습니다. 거래처 목록에서 다시 선택해주세요.');
        return;
    }
    
    if (detailFiles.length === 0) {
        alert('파일을 선택해주세요.');
        return;
    }
    
    const progressContainer = document.getElementById('detailUploadProgress');
    const progressFill = document.getElementById('detailProgressFill');
    const progressText = document.getElementById('detailProgressText');
    const resultContainer = document.getElementById('detailExtractResult');
    
    progressContainer.style.display = 'block';
    resultContainer.innerHTML = '';
    document.getElementById('detailUploadBtn').disabled = true;
    
    let successCount = 0;
    let failCount = 0;
    let totalExtracted = 0;
    let totalPendingReview = 0;
    const totalFiles = detailFiles.length;
    
    for (let i = 0; i < detailFiles.length; i++) {
        const file = detailFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('store_id', selectedStoreId);
        
        progressText.textContent = `AI 분석 중... (${i + 1}/${totalFiles})`;
        progressFill.style.width = `${((i + 1) / totalFiles) * 100}%`;
        
        try {
            const response = await fetch('/api/products/extract', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                successCount++;
                totalExtracted += result.count;
                totalPendingReview += result.pendingReviewCount || 0;
                
                // 추출된 제품 상세 정보 표시
                let productsHtml = '<ul style="margin: 10px 0; padding-left: 20px;">';
                if (result.products && result.products.length > 0) {
                    result.products.forEach(p => {
                        productsHtml += `<li>${p.productName}: ${parseInt(p.price).toLocaleString()}원</li>`;
                    });
                }
                productsHtml += '</ul>';
                
                resultContainer.innerHTML += `
                    <div class="result-item success">
                        <h3>✅ ${file.name}</h3>
                        <p><strong>${result.count}개 제품 추출 완료</strong></p>
                        ${productsHtml}
                        ${result.pendingReviewCount > 0 ? `<p style="color: #f59e0b; margin-top: 10px;">⚠️ ${result.pendingReviewCount}개 항목 검수 필요</p>` : '<p style="color: #0066CC; margin-top: 10px;">✅ 모든 항목 자동 승인</p>'}
                    </div>
                `;
            } else {
                failCount++;
                resultContainer.innerHTML += `
                    <div class="result-item error">
                        <h3>❌ ${file.name}</h3>
                        <p>${result.message || '추출 실패'}</p>
                    </div>
                `;
            }
        } catch (error) {
            failCount++;
            resultContainer.innerHTML += `
                <div class="result-item error">
                    <h3>❌ ${file.name}</h3>
                    <p>오류: ${error.message}</p>
                </div>
            `;
        }
    }
    
    progressText.textContent = `분석 완료! 총 ${totalExtracted}개 제품 추출 (성공: ${successCount}장, 실패: ${failCount}장)`;
    document.getElementById('detailUploadBtn').disabled = false;
    detailFiles = [];
    updateDetailFileList();
    
    // 완료 메시지
    if (successCount > 0) {
        resultContainer.innerHTML += `
            <div class="result-item success" style="margin-top: 20px;">
                <h3>🎉 업로드 완료!</h3>
                <p>총 ${totalExtracted}개 제품이 추출되었습니다.</p>
                ${totalPendingReview > 0 ? `<p style="color: #f59e0b;">⚠️ ${totalPendingReview}개 항목은 검수 메뉴에서 확인해주세요.</p>` : ''}
                <p style="margin-top: 10px;">잠시 후 제품 목록이 자동으로 업데이트됩니다...</p>
            </div>
        `;
        
        // 3초 후 제품 목록 새로고침
        setTimeout(() => {
            const store = allStores.find(s => s.id === selectedStoreId);
            if (store) {
                selectStore(selectedStoreId, store.storeName);
            }
        }, 3000);
    }
}

async function addManualProduct() {
    if (!selectedStoreId) {
        alert('거래처를 먼저 선택해주세요.');
        return;
    }
    
    const productName = document.getElementById('manualProductName').value;
    const price = document.getElementById('manualProductPrice').value;
    
    if (!productName || !price) {
        alert('제품명과 가격을 입력해주세요.');
        return;
    }
    
    const extractedAt = document.getElementById('manualExtractedAt').value;
    const params = new URLSearchParams({
        store_id: selectedStoreId,
        product_name: productName,
        price: price
    });
    
    if (extractedAt) {
        params.append('extracted_at', extractedAt);
    }
    
    try {
        const response = await fetch(`/api/products/manual?${params}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            alert('제품이 추가되었습니다.');
            document.getElementById('manualProductName').value = '';
            document.getElementById('manualProductPrice').value = '';
            document.getElementById('manualExtractedAt').value = '';
            loadStoreProducts();
        } else {
            alert('제품 추가에 실패했습니다.');
        }
    } catch (error) {
        alert('오류: ' + error.message);
    }
}

// 거래처별 파일 업로드
function handleStoreFileSelect(event) {
    const files = Array.from(event.target.files);
    addStoreFiles(files);
}

function handleStoreDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    const files = Array.from(event.dataTransfer.files);
    addStoreFiles(files);
}

function addStoreFiles(files) {
    const validFiles = files.filter(file => {
        return file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024;
    });
    
    if (storeFiles.length + validFiles.length > 10) {
        alert('최대 10개까지만 업로드할 수 있습니다.');
        return;
    }
    
    storeFiles = [...storeFiles, ...validFiles];
    updateStoreFileList();
    document.getElementById('storeUploadBtn').disabled = storeFiles.length === 0;
}

function updateStoreFileList() {
    const fileList = document.getElementById('storeFileList');
    fileList.innerHTML = '';
    
    storeFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span>📷</span>
            <span class="file-name">${file.name}</span>
            <span class="file-size">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
            <button onclick="removeStoreFile(${index})" style="margin-left: 10px; padding: 5px 10px; background: #ef4444; color: white; border: none; border-radius: 5px; cursor: pointer;">삭제</button>
        `;
        fileList.appendChild(fileItem);
    });
}

function removeStoreFile(index) {
    storeFiles.splice(index, 1);
    updateStoreFileList();
    document.getElementById('storeUploadBtn').disabled = storeFiles.length === 0;
}

async function uploadStoreImages() {
    if (!selectedStoreId) {
        alert('거래처를 먼저 선택해주세요.');
        return;
    }
    
    if (storeFiles.length === 0) {
        alert('파일을 선택해주세요.');
        return;
    }
    
    const progressContainer = document.getElementById('storeUploadProgress');
    const progressFill = document.getElementById('storeProgressFill');
    const progressText = document.getElementById('storeProgressText');
    const resultContainer = document.getElementById('storeExtractResult');
    
    progressContainer.style.display = 'block';
    resultContainer.innerHTML = '';
    document.getElementById('storeUploadBtn').disabled = true;
    
    let successCount = 0;
    let failCount = 0;
    const totalFiles = storeFiles.length;
    
    for (let i = 0; i < storeFiles.length; i++) {
        const file = storeFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('store_id', selectedStoreId);
        
        progressText.textContent = `처리 중... (${i + 1}/${totalFiles})`;
        progressFill.style.width = `${((i + 1) / totalFiles) * 100}%`;
        
        try {
            const response = await fetch('/api/products/extract', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                successCount += result.count;
                resultContainer.innerHTML += `
                    <div class="result-item success">
                        <h3>✅ ${file.name}</h3>
                        <p>${result.count}개 제품 추출 완료</p>
                    </div>
                `;
            } else {
                failCount++;
                resultContainer.innerHTML += `
                    <div class="result-item error">
                        <h3>❌ ${file.name}</h3>
                        <p>${result.message || '추출 실패'}</p>
                    </div>
                `;
            }
        } catch (error) {
            failCount++;
            resultContainer.innerHTML += `
                <div class="result-item error">
                    <h3>❌ ${file.name}</h3>
                    <p>오류: ${error.message}</p>
                </div>
            `;
        }
    }
    
    progressText.textContent = `완료! 성공: ${successCount}, 실패: ${failCount}`;
    document.getElementById('storeUploadBtn').disabled = false;
    storeFiles = [];
    updateStoreFileList();
    
    if (successCount > 0) {
        loadStoreProducts();
    }
}

// 이미지 업로드 함수 수정 (store_id 사용)
async function uploadImages() {
    if (selectedFiles.length === 0) {
        alert('파일을 선택해주세요.');
        return;
    }
    
    const storeId = document.getElementById('uploadStoreSelect')?.value || null;
    const location = document.getElementById('location').value;
    
    const progressContainer = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const resultContainer = document.getElementById('extractResult');
    
    progressContainer.style.display = 'block';
    resultContainer.innerHTML = '';
    document.getElementById('uploadBtn').disabled = true;
    
    let successCount = 0;
    let failCount = 0;
    const totalFiles = selectedFiles.length;
    
    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        if (storeId) formData.append('store_id', storeId);
        if (location) formData.append('location', location);
        
        progressText.textContent = `처리 중... (${i + 1}/${totalFiles})`;
        progressFill.style.width = `${((i + 1) / totalFiles) * 100}%`;
        
        try {
            const response = await fetch('/api/products/extract', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                successCount += result.count;
                resultContainer.innerHTML += `
                    <div class="result-item success">
                        <h3>✅ ${file.name}</h3>
                        <p>${result.count}개 제품 추출 완료</p>
                        ${result.pendingReviewCount > 0 ? `<p style="color: #f59e0b;">⚠️ ${result.pendingReviewCount}개 항목 검수 필요</p>` : ''}
                    </div>
                `;
            } else {
                failCount++;
                resultContainer.innerHTML += `
                    <div class="result-item error">
                        <h3>❌ ${file.name}</h3>
                        <p>${result.message || '추출 실패'}</p>
                    </div>
                `;
            }
        } catch (error) {
            failCount++;
            resultContainer.innerHTML += `
                <div class="result-item error">
                    <h3>❌ ${file.name}</h3>
                    <p>오류: ${error.message}</p>
                </div>
            `;
        }
    }
    
    progressText.textContent = `완료! 성공: ${successCount}, 실패: ${failCount}`;
    document.getElementById('uploadBtn').disabled = false;
    
    // 성공 시 목록 새로고침
    if (successCount > 0 && currentTab === 'list') {
        loadProductList();
    }
}

// 제품 목록에서 store_id 필터 사용
async function loadProductList(page = 1) {
    currentPage = page;
    const productName = document.getElementById('productNameFilter')?.value || '';
    const storeName = document.getElementById('storeNameFilter')?.value || '';
    const startDate = document.getElementById('startDateFilter')?.value || '';
    const endDate = document.getElementById('endDateFilter')?.value || '';
    
    const params = new URLSearchParams({
        page: page,
        page_size: 20
    });
    
    if (productName) params.append('product_name', productName);
    if (storeName) {
        // store_name으로 검색 시 store_id로 변환 필요 (간단히 store_name으로 검색)
        params.append('store_name', storeName);
    }
    if (startDate) params.append('start_date', startDate + 'T00:00:00');
    if (endDate) params.append('end_date', endDate + 'T23:59:59');
    
    try {
        const response = await fetch(`/api/products/list?${params}`);
        const data = await response.json();
        
        displayProductList(data);
    } catch (error) {
        const productList = document.getElementById('productList');
        if (productList) {
            productList.innerHTML = `<p class="loading">오류: ${error.message}</p>`;
        } else {
            console.warn('productList element not found; skipping render');
        }
    }
}

function displayProductList(data) {
    const productList = document.getElementById('productList');
    if (!productList) {
        console.warn('productList element not found; skipping render');
        return;
    }
    
    if (data.items.length === 0) {
        productList.innerHTML = '<p class="loading">등록된 제품이 없습니다.</p>';
        return;
    }
    
    let html = '';
    data.items.forEach(item => {
        const metadata = item.metadata ? JSON.parse(item.metadata) : {};
        const statusClass = item.status === 'AUTO_APPROVED' || item.status === 'APPROVED' ? 'approved' : 
                           item.status === 'PENDING_REVIEW' ? 'pending' : 'review';
        const statusText = item.status === 'AUTO_APPROVED' ? '자동승인' : 
                          item.status === 'APPROVED' ? '승인됨' : 
                          item.status === 'PENDING_REVIEW' ? '검수대기' : '검수필요';
        
        html += `
            <div class="product-item">
                <div class="product-header">
                    <div class="product-name">${item.productName}</div>
                    <div class="product-price">${parseInt(item.price).toLocaleString()}원</div>
                </div>
                <div class="product-meta">
                    <span>📅 ${new Date(item.extractedAt).toLocaleDateString('ko-KR')}</span>
                    ${item.store ? `<span>🏪 ${item.store.storeName}</span>` : (metadata.store_name ? `<span>🏪 ${metadata.store_name}</span>` : '')}
                    ${metadata.location ? `<span>📍 ${metadata.location}</span>` : ''}
                    <span class="status-badge status-${statusClass}">${statusText}</span>
                </div>
            </div>
        `;
    });
    
    productList.innerHTML = html;
    
    // 페이지네이션
    displayPagination(data.page, data.totalPages);
}

// 초기화
document.addEventListener('DOMContentLoaded', async function() {
    await loadStores(); // 거래처 목록 로드 (전체)
    loadProductList();
    
    // 브라우저 뒤로가기/앞으로가기 처리
    window.addEventListener('popstate', function(event) {
        const urlParams = new URLSearchParams(window.location.search);
        const storeId = urlParams.get('store');
        if (storeId && allStores.length > 0) {
            const store = allStores.find(s => s.id == storeId);
            if (store) {
                selectStore(parseInt(storeId), store.storeName);
            }
        } else {
            goBackToStoreList();
        }
    });
});


