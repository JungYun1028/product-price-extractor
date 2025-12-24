// 이미지 크롭 에디터 관련 변수
let cropCanvas;
let cropCtx;
let cropImageObj;
let currentCropFile;
let cropRegions = []; // {x, y, width, height}
let isDrawing = false;
let drawStartX = 0;
let drawStartY = 0;
let currentRegion = null;
let canvasScaleX = 1;
let canvasScaleY = 1;
let analyzedProducts = []; // 분석된 제품 목록 (저장 전)
let deleteMode = false; // 선택 삭제 모드
let hoveredRegionIndex = -1; // 마우스 오버된 영역 인덱스

// 파일 선택 핸들러 - 크롭 에디터 표시
function handleDetailFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        alert('파일 크기는 10MB 이하여야 합니다.');
        return;
    }
    
    loadImageToCropEditor(file);
}

function handleDetailDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    const file = event.dataTransfer.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.');
        return;
    }
    
    loadImageToCropEditor(file);
}

// 이미지를 크롭 에디터에 로드
function loadImageToCropEditor(file) {
    currentCropFile = file;
    cropRegions = [];
    
    document.getElementById('detailUploadArea').style.display = 'none';
    document.getElementById('imageCropEditor').style.display = 'block';
    document.getElementById('cropResult').innerHTML = '';
    
    cropCanvas = document.getElementById('cropCanvas');
    cropCtx = cropCanvas.getContext('2d');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        // 이미지 로드 후 EXIF 방향 자동 보정을 위해 createImageBitmap 사용
        fetch(e.target.result)
            .then(res => res.blob())
            .then(blob => createImageBitmap(blob, { imageOrientation: 'from-image' }))
            .then(bitmap => {
                cropImageObj = bitmap;
                
                const maxWidth = 800;
                let displayWidth = bitmap.width;
                let displayHeight = bitmap.height;
                
                if (displayWidth > maxWidth) {
                    displayHeight = (displayHeight * maxWidth) / displayWidth;
                    displayWidth = maxWidth;
                }
                
                cropCanvas.width = displayWidth;
                cropCanvas.height = displayHeight;
                
                canvasScaleX = bitmap.width / displayWidth;
                canvasScaleY = bitmap.height / displayHeight;
                
                console.log('[INIT] 원본 이미지 (EXIF 보정 후):', bitmap.width, 'x', bitmap.height);
                console.log('[INIT] Canvas 크기:', displayWidth, 'x', displayHeight);
                console.log('[INIT] 스케일:', canvasScaleX, 'x', canvasScaleY);
                
                drawCropCanvas();
            })
            .catch(err => {
                console.error('이미지 로드 실패:', err);
                alert('이미지를 불러올 수 없습니다.');
            });
    };
    reader.readAsDataURL(file);
}

// 캔버스 그리기
function drawCropCanvas() {
    cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
    cropCtx.drawImage(cropImageObj, 0, 0, cropCanvas.width, cropCanvas.height);
    
    // 영역 그리기
    cropRegions.forEach((region, index) => {
        // 삭제 모드에서 마우스 오버된 영역은 빨간색으로 표시
        if (deleteMode && hoveredRegionIndex === index) {
            cropCtx.strokeStyle = '#ef4444';
            cropCtx.fillStyle = 'rgba(239, 68, 68, 0.1)';
            cropCtx.fillRect(region.x, region.y, region.width, region.height);
        } else {
            cropCtx.strokeStyle = '#22c55e';
        }
        
        cropCtx.lineWidth = 3;
        cropCtx.strokeRect(region.x, region.y, region.width, region.height);
        
        // 영역 번호 표시
        cropCtx.fillStyle = deleteMode && hoveredRegionIndex === index ? '#ef4444' : '#22c55e';
        cropCtx.font = 'bold 18px Arial';
        cropCtx.fillText(`#${index + 1}`, region.x + 5, region.y + 22);
    });
    
    // 현재 그리는 중인 영역
    if (currentRegion) {
        cropCtx.strokeStyle = '#3b82f6';
        cropCtx.lineWidth = 2;
        cropCtx.setLineDash([5, 5]);
        cropCtx.strokeRect(currentRegion.x, currentRegion.y, currentRegion.width, currentRegion.height);
        cropCtx.setLineDash([]);
    }
}

// 영역 추가 시작
function startDrawingRegion() {
    const btn = document.getElementById('addRegionBtn');
    if (btn.classList.contains('active')) {
        btn.classList.remove('active');
        cropCanvas.style.cursor = 'default';
    } else {
        btn.classList.add('active');
        cropCanvas.style.cursor = 'crosshair';
    }
}

// 선택 삭제 모드 토글
function toggleDeleteMode() {
    deleteMode = !deleteMode;
    const btn = document.getElementById('deleteRegionBtn');
    const addBtn = document.getElementById('addRegionBtn');
    
    if (deleteMode) {
        btn.classList.add('active');
        btn.textContent = '✅ 삭제 모드 (클릭하여 삭제)';
        btn.style.background = '#ef4444';
        cropCanvas.style.cursor = 'pointer';
        
        // 영역 추가 버튼 비활성화
        addBtn.classList.remove('active');
        isDrawing = false;
        currentRegion = null;
    } else {
        btn.classList.remove('active');
        btn.textContent = '❌ 선택 삭제';
        btn.style.background = '';
        cropCanvas.style.cursor = 'default';
        hoveredRegionIndex = -1;
        drawCropCanvas();
    }
}

// 클릭 지점에 있는 영역 찾기
function findRegionAtPoint(x, y) {
    // 역순으로 검색 (위에 그려진 영역 우선)
    for (let i = cropRegions.length - 1; i >= 0; i--) {
        const region = cropRegions[i];
        if (x >= region.x && x <= region.x + region.width &&
            y >= region.y && y <= region.y + region.height) {
            return i;
        }
    }
    return -1;
}

// 전체 삭제
function clearAllRegions() {
    if (cropRegions.length === 0) {
        alert('삭제할 영역이 없습니다.');
        return;
    }
    if (confirm(`선택된 영역 ${cropRegions.length}개를 모두 삭제하시겠습니까?`)) {
        cropRegions = [];
        drawCropCanvas();
    }
}

// AI 분석 실행
async function analyzeRegions() {
    if (!currentCropFile) {
        alert('먼저 이미지를 업로드해주세요.');
        return;
    }
    if (cropRegions.length === 0) {
        alert('분석할 영역을 하나 이상 선택해주세요.');
        return;
    }
    if (!selectedStoreId) {
        alert('거래처 정보가 없습니다. 거래처 목록에서 다시 선택해주세요.');
        return;
    }
    
    const cropResult = document.getElementById('cropResult');
    cropResult.innerHTML = '<p class="loading">EXIF 방향을 보정한 이미지를 생성 중...</p>';
    
    try {
        // cropImageObj (ImageBitmap)를 Canvas에 그려서 EXIF 적용된 이미지를 Blob으로 변환
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = cropImageObj.width;
        tempCanvas.height = cropImageObj.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(cropImageObj, 0, 0);
        
        // Canvas를 Blob으로 변환
        const rotatedBlob = await new Promise((resolve) => {
            tempCanvas.toBlob(resolve, 'image/jpeg', 0.95);
        });
        
        console.log('[DEBUG] EXIF 적용된 이미지 생성 완료:', cropImageObj.width, 'x', cropImageObj.height);
        
        cropResult.innerHTML = '<p class="loading">AI가 선택된 영역을 분석 중입니다...</p>';
        
        const formData = new FormData();
        // 원본 파일 대신 EXIF 적용된 Blob 전송
        formData.append('file', rotatedBlob, currentCropFile.name);
        formData.append('store_id', selectedStoreId);
        
        // 실제 이미지 좌표로 변환 (cropImageObj 크기 기준)
        const scaledRegions = cropRegions.map(r => ({
            x: Math.round(r.x * canvasScaleX),
            y: Math.round(r.y * canvasScaleY),
            width: Math.round(r.width * canvasScaleX),
            height: Math.round(r.height * canvasScaleY)
        }));
        console.log('[DEBUG] canvasScaleX:', canvasScaleX, 'canvasScaleY:', canvasScaleY);
        console.log('[DEBUG] cropRegions (canvas coords):', cropRegions);
        console.log('[DEBUG] scaledRegions (EXIF 적용 이미지 기준):', scaledRegions);
        formData.append('regions', JSON.stringify(scaledRegions));
        
        const response = await fetch('/api/products/extract-regions', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        
        if (response.ok && result.products && result.products.length > 0) {
            analyzedProducts = result.products;
            displayAnalyzedProducts(analyzedProducts);
        } else {
            cropResult.innerHTML = `<p style="color: #ef4444;">❌ 분석 실패: ${result.message || '제품을 인식하지 못했습니다.'}</p>`;
        }
    } catch (error) {
        console.error('Error analyzing regions:', error);
        cropResult.innerHTML = `<p style="color: #ef4444;">❌ 분석 중 오류 발생: ${error.message}</p>`;
    }
}

// 분석 결과 표시 (체크박스 리스트)
function displayAnalyzedProducts(products) {
    const cropResult = document.getElementById('cropResult');
    
    let html = `
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; border: 2px solid #0066CC;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h4 style="color: #004A98; margin: 0;">✅ 분석 완료! (${products.length}개 제품 추출)</h4>
                <div>
                    <label style="margin-right: 15px; cursor: pointer;">
                        <input type="checkbox" id="selectAllAnalyzed" onchange="toggleAllAnalyzed()" style="margin-right: 5px;">
                        전체선택
                    </label>
                    <button class="btn-primary" onclick="saveSelectedAnalyzed()" style="padding: 8px 20px;">
                        💾 선택 항목 저장
                    </button>
                </div>
            </div>
            <table class="products-table" style="width: 100%; background: white;">
                <thead>
                    <tr>
                        <th style="width: 40px;"><input type="checkbox" id="selectAllAnalyzedHeader" onchange="toggleAllAnalyzed()"></th>
                        <th>제품명</th>
                        <th>가격</th>
                        <th>정확도</th>
                        <th>할인</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    products.forEach((p, index) => {
        const confidence = p.confidenceScore ? (p.confidenceScore * 100).toFixed(0) + '%' : 'N/A';
        const confidenceColor = p.confidenceScore >= 0.8 ? '#0066CC' : '#f59e0b';
        const discountBadge = p.isDiscount ? '<span style="background: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.85em;">할인</span>' : '-';
        
        html += `
            <tr>
                <td><input type="checkbox" class="analyzed-checkbox" data-index="${index}" checked></td>
                <td><input type="text" value="${p.productName || ''}" data-index="${index}" data-field="productName" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px;"></td>
                <td><input type="number" value="${p.price || 0}" data-index="${index}" data-field="price" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px;"></td>
                <td style="color: ${confidenceColor}; font-weight: bold;">${confidence}</td>
                <td>${discountBadge}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    cropResult.innerHTML = html;
}

// 전체선택 토글
function toggleAllAnalyzed() {
    const selectAll = document.getElementById('selectAllAnalyzed') || document.getElementById('selectAllAnalyzedHeader');
    const checkboxes = document.querySelectorAll('.analyzed-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
    
    // 두 개의 전체선택 체크박스 동기화
    const otherSelectAll = selectAll.id === 'selectAllAnalyzed' 
        ? document.getElementById('selectAllAnalyzedHeader') 
        : document.getElementById('selectAllAnalyzed');
    if (otherSelectAll) otherSelectAll.checked = selectAll.checked;
}

// 선택 항목 저장
async function saveSelectedAnalyzed() {
    const checkboxes = document.querySelectorAll('.analyzed-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('저장할 항목을 선택해주세요.');
        return;
    }
    
    // 사용자가 수정한 값 반영
    checkboxes.forEach(cb => {
        const index = parseInt(cb.dataset.index);
        const productNameInput = document.querySelector(`input[data-index="${index}"][data-field="productName"]`);
        const priceInput = document.querySelector(`input[data-index="${index}"][data-field="price"]`);
        
        if (productNameInput) analyzedProducts[index].productName = productNameInput.value;
        if (priceInput) analyzedProducts[index].price = parseFloat(priceInput.value);
    });
    
    const selectedProducts = Array.from(checkboxes).map(cb => {
        const index = parseInt(cb.dataset.index);
        return analyzedProducts[index];
    });
    
    try {
        const response = await fetch('/api/products/save-selected', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(selectedProducts)
        });
        
        if (response.ok) {
            alert(`✅ ${selectedProducts.length}개 제품이 저장되었습니다!`);
            
            // 제품 목록 새로고침 및 에디터 닫기
            if (typeof loadStoreProducts === 'function') {
                loadStoreProducts(selectedStoreId);
            }
            cancelCropEditor();
        } else {
            alert('❌ 저장 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('Error saving products:', error);
        alert('❌ 저장 중 오류가 발생했습니다: ' + error.message);
    }
}

// 에디터 취소
function cancelCropEditor() {
    document.getElementById('imageCropEditor').style.display = 'none';
    document.getElementById('detailUploadArea').style.display = 'block';
    document.getElementById('detailFileInput').value = '';
    currentCropFile = null;
    cropRegions = [];
    analyzedProducts = [];
    isDrawing = false;
    currentRegion = null;
    deleteMode = false;
    hoveredRegionIndex = -1;
}

// 캔버스 마우스 이벤트
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('cropCanvas');
    if (!canvas) return;
    
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const cssX = e.clientX - rect.left;
        const cssY = e.clientY - rect.top;
        
        // CSS 좌표를 Canvas 논리 좌표로 변환
        const canvasX = (cssX / rect.width) * canvas.width;
        const canvasY = (cssY / rect.height) * canvas.height;
        
        // 삭제 모드일 때
        if (deleteMode) {
            const regionIndex = findRegionAtPoint(canvasX, canvasY);
            if (regionIndex !== -1) {
                if (confirm(`영역 #${regionIndex + 1}을(를) 삭제하시겠습니까?`)) {
                    cropRegions.splice(regionIndex, 1);
                    hoveredRegionIndex = -1;
                    drawCropCanvas();
                }
            }
            return;
        }
        
        // 영역 추가 모드
        console.log('[MOUSE] CSS 좌표:', cssX, cssY, '| Canvas CSS 크기:', rect.width, rect.height, '| Canvas 논리:', canvas.width, canvas.height);
        
        drawStartX = canvasX;
        drawStartY = canvasY;
        
        console.log('[MOUSE] Canvas 논리 좌표:', drawStartX, drawStartY);
        
        isDrawing = true;
        currentRegion = { x: drawStartX, y: drawStartY, width: 0, height: 0 };
        // 버튼 표시 상태만 유지
        const btn = document.getElementById('addRegionBtn');
        if (btn && !btn.classList.contains('active')) {
            btn.classList.add('active');
            canvas.style.cursor = 'crosshair';
        }
    });
    
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const cssX = e.clientX - rect.left;
        const cssY = e.clientY - rect.top;
        
        // CSS 좌표를 Canvas 논리 좌표로 변환
        const canvasX = (cssX / rect.width) * canvas.width;
        const canvasY = (cssY / rect.height) * canvas.height;
        
        // 삭제 모드일 때 hover 효과
        if (deleteMode && !isDrawing) {
            const regionIndex = findRegionAtPoint(canvasX, canvasY);
            if (hoveredRegionIndex !== regionIndex) {
                hoveredRegionIndex = regionIndex;
                drawCropCanvas();
            }
            return;
        }
        
        // 영역 그리는 중
        if (!isDrawing) return;
        
        currentRegion.width = canvasX - drawStartX;
        currentRegion.height = canvasY - drawStartY;
        drawCropCanvas();
    });
    
    canvas.addEventListener('mouseup', () => {
        if (!isDrawing) return;
        
        isDrawing = false;
        
        // Normalize region (ensure positive width/height)
        const normalizedRegion = {
            x: Math.min(drawStartX, drawStartX + currentRegion.width),
            y: Math.min(drawStartY, drawStartY + currentRegion.height),
            width: Math.abs(currentRegion.width),
            height: Math.abs(currentRegion.height)
        };
        
        if (normalizedRegion.width > 10 && normalizedRegion.height > 10) {
            cropRegions.push(normalizedRegion);
        }
        
        currentRegion = null;
        drawCropCanvas();
        // 계속 그릴 수 있도록 버튼/커서 상태 유지 (영역 추가를 다시 누를 때까지 활성)
        const btn = document.getElementById('addRegionBtn');
        if (btn && btn.classList.contains('active')) {
            canvas.style.cursor = 'crosshair';
        }
    });
    
    canvas.addEventListener('mouseleave', () => {
        if (isDrawing) {
            isDrawing = false;
            currentRegion = null;
            drawCropCanvas();
        }
    });
});

