// 체크박스 전체 선택/해제
function toggleSelectAll() {
    const selectAll = document.getElementById('selectAllCheckbox');
    const checkboxes = document.querySelectorAll('.product-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = selectAll.checked;
    });
}

// 일괄 수정 저장
async function saveAllEdits() {
    const editInputs = document.querySelectorAll('.edit-input');
    const updates = [];
    
    // 수정된 항목 수집
    const rows = document.querySelectorAll('[data-product-id]');
    rows.forEach(row => {
        const productId = row.getAttribute('data-product-id');
        const nameInput = document.getElementById(`productName_${productId}`);
        const priceInput = document.getElementById(`productPrice_${productId}`);
        
        if (nameInput && priceInput) {
            updates.push({
                id: productId,
                productName: nameInput.value.trim(),
                price: parseFloat(priceInput.value)
            });
        }
    });
    
    if (updates.length === 0) {
        alert('수정할 항목이 없습니다.');
        return;
    }
    
    if (!confirm(`${updates.length}개 제품의 정보를 수정하시겠습니까?`)) {
        return;
    }
    
    try {
        let successCount = 0;
        let failCount = 0;
        
        for (const update of updates) {
            try {
                const response = await fetch(`/api/products/${update.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        productName: update.productName,
                        price: update.price
                    })
                });
                
                if (response.ok) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (error) {
                console.error(`Error updating product ${update.id}:`, error);
                failCount++;
            }
        }
        
        alert(`수정 완료!\n성공: ${successCount}개\n실패: ${failCount}개`);
        
        // 제품 목록 새로고침
        if (successCount > 0) {
            const store = allStores.find(s => s.id === selectedStoreId);
            if (store) {
                selectStore(selectedStoreId, store.storeName);
            }
        }
    } catch (error) {
        console.error('Error saving edits:', error);
        alert('일괄 수정 중 오류가 발생했습니다.');
    }
}

// 선택 삭제
async function deleteSelectedProducts() {
    const checkboxes = document.querySelectorAll('.product-checkbox:checked');
    
    if (checkboxes.length === 0) {
        alert('삭제할 제품을 선택해주세요.');
        return;
    }
    
    if (!confirm(`선택된 ${checkboxes.length}개 제품을 삭제하시겠습니까?`)) {
        return;
    }
    
    const productIds = Array.from(checkboxes).map(cb => cb.getAttribute('data-product-id'));
    
    try {
        let successCount = 0;
        let failCount = 0;
        
        for (const productId of productIds) {
            try {
                const response = await fetch(`/api/products/${productId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (error) {
                console.error(`Error deleting product ${productId}:`, error);
                failCount++;
            }
        }
        
        alert(`삭제 완료!\n성공: ${successCount}개\n실패: ${failCount}개`);
        
        // 제품 목록 새로고침
        if (successCount > 0) {
            const store = allStores.find(s => s.id === selectedStoreId);
            if (store) {
                selectStore(selectedStoreId, store.storeName);
            }
            
            // 전체 선택 체크박스 해제
            const selectAll = document.getElementById('selectAllCheckbox');
            if (selectAll) {
                selectAll.checked = false;
            }
        }
    } catch (error) {
        console.error('Error deleting products:', error);
        alert('삭제 중 오류가 발생했습니다.');
    }
}

// 개별 수정
async function saveProductEdit(productId) {
    const nameInput = document.getElementById(`productName_${productId}`);
    const priceInput = document.getElementById(`productPrice_${productId}`);
    if (!nameInput || !priceInput) {
        alert('입력 필드를 찾을 수 없습니다.');
        return;
    }
    const productName = nameInput.value.trim();
    const price = parseFloat(priceInput.value);
    if (!productName) {
        alert('제품명을 입력해주세요.');
        return;
    }
    if (isNaN(price) || price <= 0) {
        alert('올바른 가격을 입력해주세요.');
        return;
    }
    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productName, price })
        });
        if (response.ok) {
            alert('저장되었습니다.');
            const store = allStores.find(s => s.id === selectedStoreId);
            if (store) selectStore(selectedStoreId, store.storeName);
        } else {
            alert('저장 실패');
        }
    } catch (error) {
        console.error('저장 오류:', error);
        alert('저장 중 오류가 발생했습니다.');
    }
}

// 개별 삭제
async function deleteSingleProduct(productId) {
    if (!confirm('이 제품을 삭제하시겠습니까?')) return;
    try {
        const response = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
        if (response.ok) {
            alert('삭제되었습니다.');
            const store = allStores.find(s => s.id === selectedStoreId);
            if (store) selectStore(selectedStoreId, store.storeName);
        } else {
            alert('삭제 실패');
        }
    } catch (error) {
        console.error('삭제 오류:', error);
        alert('삭제 중 오류가 발생했습니다.');
    }
}

