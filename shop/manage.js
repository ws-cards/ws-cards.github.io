// 商品管理系統

// 從 main.js 導入商品數據或使用本地存儲
let products = [];
let editingProductId = null;
let deleteProductId = null;

// DOM 元素
const productForm = document.getElementById('productForm');
const editProductForm = document.getElementById('editProductForm');
const productsTableBody = document.getElementById('productsTableBody');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const loading = document.getElementById('loading');

// 統計元素
const totalProductsEl = document.getElementById('totalProducts');
const totalValueEl = document.getElementById('totalValue');
const categoryCountEl = document.getElementById('categoryCount');

// 模態框元素
const editModal = document.getElementById('editModal');
const deleteModal = document.getElementById('deleteModal');
const editModalClose = document.getElementById('editModalClose');
const deleteModalClose = document.getElementById('deleteModalClose');

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeManagement();
});

// 初始化管理系統
function initializeManagement() {
    loadProducts();
    setupEventListeners();
    displayProducts();
    updateStatistics();
    
    // PWA 相關
    if ('serviceWorker' in navigator) {
        registerServiceWorker();
    }
}

// 載入商品數據
function loadProducts() {
    // 從 localStorage 載入商品數據，如果沒有則使用預設數據
    const storedProducts = localStorage.getItem('products');
    if (storedProducts) {
        products = JSON.parse(storedProducts);
    } else {
        // 使用預設商品數據
        products = [
            {
                id: 1,
                title: "經典白色T恤",
                description: "100%純棉材質，舒適透氣，適合日常穿著。簡約設計，百搭款式，是您衣櫃中不可缺少的基本款。",
                price: 899,
                image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=500&fit=crop",
                category: "服飾"
            },
            {
                id: 2,
                title: "時尚背包",
                description: "多功能設計，大容量收納空間。防水材質，適合上班上學使用。時尚外觀搭配實用功能。",
                price: 1299,
                image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&h=500&fit=crop",
                category: "配件"
            },
            {
                id: 3,
                title: "運動鞋",
                description: "專業運動鞋，提供優秀的腳部支撐和緩震效果。適合跑步、健身等各種運動場合。",
                price: 2499,
                image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop",
                category: "鞋類"
            },
            {
                id: 4,
                title: "無線耳機",
                description: "高品質音效，長續航力，支援降噪功能。輕巧設計，攜帶方便，是音樂愛好者的首選。",
                price: 3999,
                image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop",
                category: "電子產品"
            },
            {
                id: 5,
                title: "咖啡杯",
                description: "精美陶瓷材質，保溫效果佳。優雅設計，適合居家使用或辦公室享用咖啡時光。",
                price: 599,
                image: "https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=500&h=500&fit=crop",
                category: "居家用品"
            },
            {
                id: 6,
                title: "手錶",
                description: "精緻石英機芯，不鏽鋼錶帶，防水設計。商務休閒兩相宜，展現您的品味與格調。",
                price: 4999,
                image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop",
                category: "配件"
            }
        ];
        saveProducts();
    }
}

// 儲存商品數據
function saveProducts() {
    localStorage.setItem('products', JSON.stringify(products));
    // 同時更新 main.js 使用的商品數據
    localStorage.setItem('mainProducts', JSON.stringify(products));
}

// 顯示商品列表
function displayProducts(productsToShow = products) {
    showLoading();
    
    setTimeout(() => {
        productsTableBody.innerHTML = productsToShow.map(product => createProductRow(product)).join('');
        hideLoading();
    }, 300);
}

// 建立商品行
function createProductRow(product) {
    return `
        <tr>
            <td>
                <img src="${product.image}" alt="${product.title}" class="product-image-small" loading="lazy">
            </td>
            <td>
                <strong>${product.title}</strong>
            </td>
            <td>
                <span class="category-badge">${product.category}</span>
            </td>
            <td>
                <strong style="color: var(--accent-color);">NT$ ${product.price.toLocaleString()}</strong>
            </td>
            <td>
                <div class="product-description-short" title="${product.description}">
                    ${product.description}
                </div>
            </td>
            <td>
                <div class="product-actions">
                    <button class="action-btn edit-btn" onclick="openEditModal(${product.id})">
                        ✏️ 編輯
                    </button>
                    <button class="action-btn delete-btn" onclick="openDeleteModal(${product.id})">
                        🗑️ 刪除
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// 更新統計數據
function updateStatistics() {
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, product) => sum + product.price, 0);
    const categories = [...new Set(products.map(product => product.category))];
    
    totalProductsEl.textContent = totalProducts;
    totalValueEl.textContent = `NT$ ${totalValue.toLocaleString()}`;
    categoryCountEl.textContent = categories.length;
}

// 設定事件監聽器
function setupEventListeners() {
    // 新增商品表單
    productForm.addEventListener('submit', handleAddProduct);
    
    // 編輯商品表單
    editProductForm.addEventListener('submit', handleEditProduct);
    
    // 搜尋功能
    searchInput.addEventListener('input', debounce(performSearch, 300));
    
    // 模態框關閉事件
    editModalClose.addEventListener('click', closeEditModal);
    deleteModalClose.addEventListener('click', closeDeleteModal);
    
    // 點擊模態框背景關閉
    editModal.addEventListener('click', function(e) {
        if (e.target === editModal) closeEditModal();
    });
    
    deleteModal.addEventListener('click', function(e) {
        if (e.target === deleteModal) closeDeleteModal();
    });
    
    // ESC 鍵關閉模態框
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeEditModal();
            closeDeleteModal();
        }
    });
    
    // 確認刪除按鈕
    document.getElementById('confirmDelete').addEventListener('click', confirmDelete);
    
    // 導航連結平滑滾動
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
                
                // 更新活動狀態
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
}

// 處理新增商品
function handleAddProduct(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const submitText = document.getElementById('submitText');
    const submitLoader = document.getElementById('submitLoader');
    
    // 顯示載入狀態
    submitText.style.display = 'none';
    submitLoader.style.display = 'inline-block';
    submitBtn.disabled = true;
    
    // 模擬API請求延遲
    setTimeout(() => {
        const formData = new FormData(productForm);
        const newProduct = {
            id: Date.now(), // 使用時間戳作為ID
            title: formData.get('title'),
            description: formData.get('description'),
            price: parseInt(formData.get('price')),
            image: formData.get('image'),
            category: formData.get('category')
        };
        
        // 驗證數據
        if (validateProduct(newProduct)) {
            products.push(newProduct);
            saveProducts();
            displayProducts();
            updateStatistics();
            resetForm();
            showToast('商品新增成功！', 'success');
        } else {
            showToast('請檢查輸入的數據！', 'error');
        }
        
        // 恢復按鈕狀態
        submitText.style.display = 'inline-block';
        submitLoader.style.display = 'none';
        submitBtn.disabled = false;
    }, 1000);
}

// 處理編輯商品
function handleEditProduct(e) {
    e.preventDefault();
    
    const formData = new FormData(editProductForm);
    const productId = parseInt(document.getElementById('editProductId').value);
    
    const updatedProduct = {
        id: productId,
        title: formData.get('title'),
        description: formData.get('description'),
        price: parseInt(formData.get('price')),
        image: formData.get('image'),
        category: formData.get('category')
    };
    
    // 驗證數據
    if (validateProduct(updatedProduct)) {
        const productIndex = products.findIndex(p => p.id === productId);
        if (productIndex !== -1) {
            products[productIndex] = updatedProduct;
            saveProducts();
            displayProducts();
            updateStatistics();
            closeEditModal();
            showToast('商品更新成功！', 'success');
        }
    } else {
        showToast('請檢查輸入的數據！', 'error');
    }
}

// 驗證商品數據
function validateProduct(product) {
    return product.title && 
           product.description && 
           product.price > 0 && 
           product.image && 
           product.category;
}

// 開啟編輯模態框
function openEditModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    document.getElementById('editProductId').value = product.id;
    document.getElementById('editProductTitle').value = product.title;
    document.getElementById('editProductDescription').value = product.description;
    document.getElementById('editProductPrice').value = product.price;
    document.getElementById('editProductImage').value = product.image;
    document.getElementById('editProductCategory').value = product.category;
    
    editModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 關閉編輯模態框
function closeEditModal() {
    editModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    editProductForm.reset();
}

// 開啟刪除確認模態框
function openDeleteModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    deleteProductId = productId;
    document.getElementById('deleteProductImage').src = product.image;
    document.getElementById('deleteProductTitle').textContent = product.title;
    document.getElementById('deleteProductPrice').textContent = `NT$ ${product.price.toLocaleString()}`;
    
    deleteModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 關閉刪除確認模態框
function closeDeleteModal() {
    deleteModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    deleteProductId = null;
}

// 確認刪除商品
function confirmDelete() {
    if (deleteProductId) {
        const productIndex = products.findIndex(p => p.id === deleteProductId);
        if (productIndex !== -1) {
            const deletedProduct = products[productIndex];
            products.splice(productIndex, 1);
            saveProducts();
            displayProducts();
            updateStatistics();
            closeDeleteModal();
            showToast(`已刪除商品：${deletedProduct.title}`, 'success');
        }
    }
}

// 搜尋商品
function performSearch() {
    const query = searchInput.value.toLowerCase().trim();
    const filteredProducts = products.filter(product =>
        product.title.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
    );
    
    displayProducts(filteredProducts);
    
    if (query && filteredProducts.length === 0) {
        productsTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    找不到符合條件的商品
                </td>
            </tr>
        `;
    }
}

// 根據分類篩選
function filterByCategory() {
    const category = categoryFilter.value;
    const filteredProducts = category === 'all' 
        ? products 
        : products.filter(product => product.category === category);
    
    displayProducts(filteredProducts);
}

// 重置表單
function resetForm() {
    productForm.reset();
}

// 顯示Toast通知
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // 顯示動畫
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // 3秒後移除
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toastContainer.contains(toast)) {
                toastContainer.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// 顯示載入畫面
function showLoading() {
    loading.classList.add('active');
}

// 隱藏載入畫面
function hideLoading() {
    loading.classList.remove('active');
}

// 防抖函數
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 註冊 Service Worker
function registerServiceWorker() {
    navigator.serviceWorker.register('/sw.js')
        .then(registration => {
            console.log('Service Worker 註冊成功:', registration);
        })
        .catch(error => {
            console.log('Service Worker 註冊失敗:', error);
        });
}

// 匯出數據（可選功能）
function exportData() {
    const dataStr = JSON.stringify(products, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'products.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('數據匯出成功！', 'success');
}

// 匯入數據（可選功能）
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedProducts = JSON.parse(e.target.result);
            if (Array.isArray(importedProducts)) {
                products = importedProducts;
                saveProducts();
                displayProducts();
                updateStatistics();
                showToast('數據匯入成功！', 'success');
            } else {
                showToast('無效的數據格式！', 'error');
            }
        } catch (error) {
            showToast('文件讀取失敗！', 'error');
        }
    };
    reader.readAsText(file);
}
