// API 配置
// 根據環境自動切換 API 地址

(function() {
  // 檢測環境
  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
  
  const isGitHubPages = window.location.hostname.includes('github.io');
  
  // API 基礎 URL
  // 本地開發：使用 localhost
  // GitHub Pages：需要設置為後端服務的 URL（如 Render、Railway 等）
  // 請在部署後更新下面的 BACKEND_URL
  const BACKEND_URL = isLocalhost 
    ? 'http://localhost:3000'
    : 'https://YOUR-BACKEND-URL.onrender.com'; // 👈 部署後端後，修改此處
  
  // 全局 API 基礎地址
  window.API_BASE = `${BACKEND_URL}/api`;
  
  // 在控制台顯示當前配置（方便調試）
  if (isLocalhost) {
    console.log('🔧 本地開發模式');
    console.log('📡 API 地址：', window.API_BASE);
  } else if (isGitHubPages) {
    console.log('🌐 GitHub Pages 模式');
    console.log('📡 API 地址：', window.API_BASE);
    if (BACKEND_URL.includes('YOUR-BACKEND-URL')) {
      console.warn('⚠️ 警告：請更新 config.js 中的 BACKEND_URL');
    }
  }
})();
