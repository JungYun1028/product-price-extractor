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
        cropCtx.strokeStyle = '#22c55e';
        cropCtx.lineWidth = 3;
        cropCtx.strokeRect(region.x, region.y, region.width, region.height);
        
        // 영역 번호 표시
        cropCtx.fillStyle = '#22c55e';
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
    cropResult.innerHTML = '<p class="loading">AI가 선택된 영역을 분석 중입니다...</p>';
    
    const formData = new FormData();
    formData.append('file', currentCropFile);
    formData.append('store_id', selectedStoreId);
    
    // 실제 이미지 좌표로 변환 (이미 계산된 canvasScaleX/Y 사용)
    const scaledRegions = cropRegions.map(r => ({
        x: Math.round(r.x * canvasScaleX),
        y: Math.round(r.y * canvasScaleY),
        width: Math.round(r.width * canvasScaleX),
        height: Math.round(r.height * canvasScaleY)
    }));
    console.log('[DEBUG] canvasScaleX:', canvasScaleX, 'canvasScaleY:', canvasScaleY);
    console.log('[DEBUG] cropRegions (canvas coords):', cropRegions);
    console.log('[DEBUG] scaledRegions (image coords):', scaledRegions);
    formData.append('regions', JSON.stringify(scaledRegions));
    
    try {
        const response = await fetch('/api/products/extract-regions', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        
        if (response.ok && result.products && result.products.length > 0) {
            let resultHtml = `<h4 style="color: #10b981;">✅ 분석 완료! (${result.products.length}개 제품 추출)</h4>`;
            resultHtml += '<ul style="margin: 10px 0; padding-left: 20px; list-style: none;">';
            result.products.forEach(p => {
                let discountInfo = '';
                if (p.isDiscount) {
                    discountInfo = '<span style="color: #ef4444; font-weight: bold;">[할인]</span> ';
                }
                resultHtml += `<li style="margin-bottom: 8px;">✓ ${discountInfo}<strong>${p.productName}</strong>: ${parseInt(p.price).toLocaleString()}원</li>`;
            });
            resultHtml += '</ul>';
            cropResult.innerHTML = resultHtml;
            
            // 3초 후 제품 목록 새로고침 (에디터는 닫지 않음, 이미지를 유지)
            setTimeout(() => {
                if (typeof loadStoreProducts === 'function') {
                    loadStoreProducts(selectedStoreId);
                } else {
                    console.warn('loadStoreProducts is not defined; skipping refresh');
                }
                // 에디터 닫지 않음: 사용자가 이미지와 영역을 계속 볼 수 있게 유지
            }, 3000);
        } else {
            cropResult.innerHTML = `<p style="color: #ef4444;">❌ 분석 실패: ${result.message || '제품을 인식하지 못했습니다.'}</p>`;
        }
    } catch (error) {
        console.error('Error analyzing regions:', error);
        cropResult.innerHTML = `<p style="color: #ef4444;">❌ 분석 중 오류 발생: ${error.message}</p>`;
    }
}

// 에디터 취소
function cancelCropEditor() {
    document.getElementById('imageCropEditor').style.display = 'none';
    document.getElementById('detailUploadArea').style.display = 'block';
    document.getElementById('detailFileInput').value = '';
    currentCropFile = null;
    cropRegions = [];
    isDrawing = false;
    currentRegion = null;
}

// 캔버스 마우스 이벤트
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('cropCanvas');
    if (!canvas) return;
    
    canvas.addEventListener('mousedown', (e) => {
        // 버튼 상태와 관계없이 바로 드로잉 시작 (여러 영역 연속 추가)
        const rect = canvas.getBoundingClientRect();
        const cssX = e.clientX - rect.left;
        const cssY = e.clientY - rect.top;
        
        console.log('[MOUSE] CSS 좌표:', cssX, cssY, '| Canvas CSS 크기:', rect.width, rect.height, '| Canvas 논리:', canvas.width, canvas.height);
        
        // CSS 좌표를 Canvas 논리 좌표로 변환
        drawStartX = (cssX / rect.width) * canvas.width;
        drawStartY = (cssY / rect.height) * canvas.height;
        
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
        if (!isDrawing) return;
        
        const rect = canvas.getBoundingClientRect();
        const cssX = e.clientX - rect.left;
        const cssY = e.clientY - rect.top;
        
        // CSS 좌표를 Canvas 논리 좌표로 변환
        const canvasX = (cssX / rect.width) * canvas.width;
        const canvasY = (cssY / rect.height) * canvas.height;
        
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

