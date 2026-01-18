# 系統架構說明

## 您的問題：這是靜態網站嗎？

**部分正確，但不完全正確。** 讓我詳細解釋：

---

## 系統組成

您的郵件發送系統由**兩部分**組成：

### 1. 前端（靜態部分）✅

**位置**：`public/` 目錄
- `index.html` - HTML 頁面（靜態）
- `style.css` - 樣式文件（靜態）
- `script.js` - JavaScript 邏輯（靜態）
- `config.js` - 配置文件（靜態）

**特點**：
- ✅ 這些文件是純靜態的
- ✅ 可以直接部署到 GitHub Pages
- ❌ **但是**，這些文件需要連接到後端 API 才能工作

### 2. 後端（動態部分）❌

**位置**：`server.js` 和相關文件
- `server.js` - Node.js 後端服務器
- `package.json` - Node.js 依賴
- `data/customers.json` - 客戶資料（需要後端讀寫）

**特點**：
- ❌ 需要 Node.js 運行環境
- ❌ 需要 Express 框架處理 API 請求
- ❌ 需要 Nodemailer 發送郵件（只能在服務器端運行）
- ❌ 需要文件系統操作（讀寫 JSON 文件）

---

## 為什麼不能直接用 GitHub Pages？

### 前端部分（可以）

`public/` 目錄中的文件**確實是靜態的**，可以部署到 GitHub Pages。

### 但前端需要後端 API

查看 `public/script.js`，您會發現它調用了很多 API：

```javascript
// 這些都需要後端服務器運行
fetch(`${API_BASE}/customers`)           // 獲取客戶列表
fetch(`${API_BASE}/send-email`)          // 發送郵件
fetch(`${API_BASE}/send-stats`)          // 獲取發送統計
fetch(`${API_BASE}/customers/import`)    // 導入客戶
```

這些 API 端點在 `server.js` 中定義：

```javascript
app.get('/api/customers', ...)           // 需要 Node.js 運行
app.post('/api/send-email', ...)         // 需要 Node.js 運行
app.get('/api/send-stats', ...)          // 需要 Node.js 運行
```

### 關鍵問題

1. **發送郵件**：`Nodemailer` 只能在 Node.js 環境中運行，無法在瀏覽器中運行
2. **文件操作**：讀寫 `customers.json` 需要服務器端權限
3. **安全性**：Gmail 密碼不能暴露在前端代碼中

---

## 類比說明

想像一下：

- **前端** = 餐廳的菜單（靜態，可以放在任何地方）
- **後端** = 餐廳的廚房（需要設備和人員，不能隨便移動）

GitHub Pages 就像一個**展示櫃**，可以放菜單（前端），但不能放廚房（後端）。

---

## 解決方案

### 方案 1：分離部署（當前方案）⭐

- **前端** → GitHub Pages（免費，靜態文件）
- **後端** → Render/Railway（免費，Node.js 環境）

前端通過 API 調用連接到後端。

### 方案 2：純靜態版本（不推薦）

如果完全移除後端，會失去：
- ❌ 無法發送郵件（Nodemailer 需要 Node.js）
- ❌ 無法儲存客戶資料（需要服務器端文件系統）
- ❌ 無法追蹤發送記錄（需要服務器端儲存）
- ❌ 安全性問題（Gmail 密碼會暴露在前端）

---

## 總結

| 部分 | 類型 | GitHub Pages 支援？ | 說明 |
|------|------|-------------------|------|
| `public/index.html` | 靜態 | ✅ 是 | 可以直接部署 |
| `public/script.js` | 靜態 | ✅ 是 | 可以直接部署 |
| `public/style.css` | 靜態 | ✅ 是 | 可以直接部署 |
| `server.js` | 動態 | ❌ 否 | 需要 Node.js 環境 |
| API 端點 (`/api/*`) | 動態 | ❌ 否 | 需要後端服務器 |
| 郵件發送功能 | 動態 | ❌ 否 | 需要 Nodemailer（Node.js） |

**結論**：
- 前端文件是靜態的，可以部署到 GitHub Pages
- 但前端**依賴**後端 API 才能正常工作
- 所以需要**分離部署**：前端在 GitHub Pages，後端在 Render/Railway

---

## 如果您想要純靜態版本

如果確實需要純靜態版本（不依賴後端），需要：

1. **使用瀏覽器 API 發送郵件**：
   - 使用 `mailto:` 連結（用戶需要手動發送）
   - 或使用第三方服務（如 EmailJS、Formspree）

2. **使用瀏覽器儲存**：
   - 使用 `localStorage` 儲存客戶資料（僅限本地）
   - 無法跨設備同步

3. **失去的功能**：
   - 批量發送郵件
   - 發送記錄追蹤
   - 發送限制管理
   - 數據持久化

**不建議**這樣做，因為會失去大部分核心功能。

---

## 當前架構的優勢

✅ **功能完整**：支援所有需要的功能  
✅ **安全性**：Gmail 密碼不會暴露在前端  
✅ **數據持久化**：客戶資料和發送記錄永久保存  
✅ **可擴展**：易於添加新功能  

---

## 建議

**保持當前架構**（前端 + 後端分離），然後：
1. 部署後端到 Render（免費）
2. 部署前端到 GitHub Pages（免費）
3. 兩者通過 API 連接

這樣既可以使用 GitHub Pages，又保留了所有功能！
