// 商品數據變數
let products = [];

// 載入商品數據
function loadProducts() {
 
    // 使用 fetchJsonData 函數
    const managedProductsJSON = fetchJsonData();    
    // 首先嘗試從管理系統載入商品數據
    const managedProducts = localStorage.getItem('products');
    if (managedProductsJSON) {
        products = JSON.parse(managedProducts);
        return;
    }
    

    // 如果沒有管理的商品數據，使用預設數據並儲存
    const defaultProducts = [
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
    
    products = defaultProducts;
    localStorage.setItem('products', JSON.stringify(products));
}

// DOM 元素
const productsGrid = document.getElementById('productsGrid');
const lightbox = document.getElementById('lightbox');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxTitle = document.getElementById('lightboxTitle');
const lightboxDescription = document.getElementById('lightboxDescription');
const lightboxPrice = document.getElementById('lightboxPrice');
const addToCartBtn = document.getElementById('addToCart');
const buyNowBtn = document.getElementById('buyNow');
const loading = document.getElementById('loading');

// 購物車
let cart = JSON.parse(localStorage.getItem('cart') || '[]');

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {initializeApp()});
// 初始化應用程式
function initializeApp() {
    loadProducts(); // 載入商品數據
    displayProducts();
    setupEventListeners();
    updateCartCount();
    
    // PWA 相關
    if ('serviceWorker' in navigator) {
        registerServiceWorker();
    }
}   

// 顯示商品
function displayProducts() {
    showLoading();
    
    // 模擬載入時間
    setTimeout(() => {
        productsGrid.innerHTML = products.map(product => createProductCard(product)).join('');
        hideLoading();
    }, 800);
}

// 建立商品卡片
function createProductCard(product) {
    return `
        <div class="product-card" onclick="openLightbox(${product.id})">
            <div class="product-image">
                <img src="${product.image}" alt="${product.title}" loading="lazy">
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.title}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-price">NT$ ${product.price.toLocaleString()}</div>
            </div>
        </div>
    `;
}

// 開啟光箱
function openLightbox(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    lightboxImg.src = product.image;
    lightboxImg.alt = product.title;
    lightboxTitle.textContent = product.title;
    lightboxDescription.textContent = product.description;
    lightboxPrice.textContent = `NT$ ${product.price.toLocaleString()}`;
    
    // 設定按鈕事件
    addToCartBtn.onclick = () => addToCart(product);
    buyNowBtn.onclick = () => buyNow(product);
    
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 關閉光箱
function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// 加入購物車
function addToCart(product) {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    showNotification(`${product.title} 已加入購物車！`);
    closeLightbox();
}

// 立即購買
function buyNow(product) {
    addToCart(product);
    showNotification(`正在前往結帳頁面...`);
    // 這裡可以跳轉到結帳頁面
    setTimeout(() => {
        alert('結帳功能開發中，敬請期待！');
    }, 1000);
}

// 更新購物車數量
function updateCartCount() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartIcon = document.querySelector('.cart-count');
    if (cartIcon) {
        cartIcon.textContent = totalItems;
    }
}

// 顯示通知
function showNotification(message) {
    // 建立通知元素
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background-color: var(--accent-color);
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        z-index: 3000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;
    
    document.body.appendChild(notification);
    
    // 顯示動畫
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // 3秒後移除
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
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

// 設定事件監聽器
function setupEventListeners() {
    // 光箱關閉事件
    lightboxClose.addEventListener('click', closeLightbox);
    
    // 點擊光箱背景關閉
    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });
    
    // ESC 鍵關閉光箱
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });
    
    // 導航連結平滑滾動
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
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
        });
    });
    
    // 滾動事件 - 更新導航狀態
    window.addEventListener('scroll', updateActiveNavLink);
}

// 更新活動導航連結
function updateActiveNavLink() {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let current = 'home';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        if (window.pageYOffset >= sectionTop) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
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

// 搜尋功能
function searchProducts(query) {
    const filteredProducts = products.filter(product =>
        product.title.toLowerCase().includes(query.toLowerCase()) ||
        product.description.toLowerCase().includes(query.toLowerCase()) ||
        product.category.toLowerCase().includes(query.toLowerCase())
    );
    
    productsGrid.innerHTML = filteredProducts.map(product => createProductCard(product)).join('');
    
    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                <p style="color: var(--text-secondary); font-size: 1.2rem;">找不到符合條件的商品</p>
            </div>
        `;
    }
}

// 商品分類篩選
function filterByCategory(category) {
    const filteredProducts = category === 'all' 
        ? products 
        : products.filter(product => product.category === category);
    
    productsGrid.innerHTML = filteredProducts.map(product => createProductCard(product)).join('');
}

// 價格範圍篩選
function filterByPrice(minPrice, maxPrice) {
    const filteredProducts = products.filter(product => 
        product.price >= minPrice && product.price <= maxPrice
    );
    
    productsGrid.innerHTML = filteredProducts.map(product => createProductCard(product)).join('');
}

// 觸控事件支援（移動設備）
let touchStartY = 0;
let touchEndY = 0;

document.addEventListener('touchstart', function(e) {
    touchStartY = e.changedTouches[0].screenY;
});

document.addEventListener('touchend', function(e) {
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartY - touchEndY;
    
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // 向上滑動
            window.scrollBy(0, 200);
        } else {
            // 向下滑動
            window.scrollBy(0, -200);
        }
    }
}

// 使用 async/await
async function fetchJsonData() {
    try {
        const response = await fetch('https://ws-cards.cloud/shop/defaultProducts.json');
        const data = await response.json();
        console.log(data);
        return data;
    } catch (error) {
        console.log('錯誤:'+ error);
        console.log('使用預設商品數據');
        const defaultProducts = [
            {
                id: 1,
                title: "經典白色T恤",
                description: "100%純棉材質，舒適透氣，適合日常穿著。簡約設計，百搭款式，是您衣櫃中不可缺少的基本款。",
                price: 899,
                image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=500&fit=crop",
                category: "服飾"
            }
        ]
        return defaultProducts;
    }

}

