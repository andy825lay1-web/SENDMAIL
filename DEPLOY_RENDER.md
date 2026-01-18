# Render 後端部署指南

## 📋 部署步驟

### 方法 1：使用 Render Dashboard（推薦，圖形化界面）

#### 步驟 1：註冊/登入 Render

1. 前往：https://render.com
2. 點擊 "Get Started for Free"
3. 使用 GitHub 帳號登入（推薦，方便連接倉庫）

#### 步驟 2：創建新的 Web Service

1. 登入後，點擊右上角的 "New +" 按鈕
2. 選擇 "Web Service"

#### 步驟 3：連接 GitHub 倉庫

1. 在 "Connect a repository" 區段：
   - 如果還沒有連接 GitHub，點擊 "Configure account" 並授權
   - 搜尋並選擇：`andy825lay1-web/SENDMAIL`
   - 點擊 "Connect"

#### 步驟 4：配置服務設置

在設置頁面填寫以下資訊：

**基本信息：**
- **Name**: `sendmail-backend`（或您喜歡的名稱）
- **Region**: 選擇最近的區域（例如：Singapore 或 Oregon）
- **Branch**: `main`
- **Root Directory**: `/`（留空或填寫 `/`）

**構建和啟動：**
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**環境變數（可選）：**
- 目前不需要額外設置環境變數，系統會自動使用預設值

#### 步驟 5：選擇方案

- **Plan**: 選擇 `Free`（免費方案）
  - ⚠️ 注意：免費方案會休眠，如果 15 分鐘沒有請求會暫停服務
  - 首次請求可能需要 30-60 秒喚醒

#### 步驟 6：創建服務

1. 點擊底部的 "Create Web Service"
2. Render 會自動：
   - 從 GitHub 拉取代碼
   - 執行 `npm install` 安裝依賴
   - 啟動服務

#### 步驟 7：等待部署完成

1. 在服務詳情頁面，您會看到部署日誌
2. 等待幾分鐘，直到看到 "Your service is live" 訊息
3. 複製服務的 URL，例如：`https://sendmail-backend.onrender.com`

---

### 方法 2：使用 Render CLI（進階，命令列）

如果您已經安裝 Render CLI：

```bash
# 安裝 Render CLI（如果尚未安裝）
npm install -g render-cli

# 登入 Render
render login

# 部署服務
render deploy
```

---

## 🔧 部署後的配置

### 1. 獲取後端 URL

部署完成後，Render 會提供一個 URL，例如：
```
https://sendmail-backend.onrender.com
```

**重要**：複製這個 URL，稍後會用到！

### 2. 更新前端 API 地址

編輯 `public/config.js` 文件：

```javascript
const BACKEND_URL = isLocalhost 
  ? 'http://localhost:3000'
  : 'https://sendmail-backend.onrender.com'; // 👈 替換為您的 Render URL
```

### 3. 提交並推送更改

```bash
cd "/Users/caijunchang/Desktop/程式專案資料夾/冠軍區/郵件發送系統"
git add public/config.js
git commit -m "更新後端 API 地址"
git push
```

### 4. 等待 GitHub Pages 重新部署

GitHub Pages 會自動檢測到更改並重新部署（通常需要 1-2 分鐘）。

---

## ✅ 驗證部署

### 測試後端 API

1. 打開瀏覽器，訪問：
   ```
   https://sendmail-backend.onrender.com/api/customers
   ```
2. 如果看到 JSON 響應（可能是空陣列 `[]`），表示後端正常運行

### 測試前端連接

1. 訪問 GitHub Pages：
   ```
   https://andy825lay1-web.github.io/SENDMAIL/
   ```
2. 打開瀏覽器開發者工具（F12）
3. 切換到 "Console" 標籤
4. 應該看到：
   ```
   🌐 GitHub Pages 模式
   📡 API 地址：https://sendmail-backend.onrender.com/api
   ```
5. 嘗試載入客戶列表，檢查是否能正常連接後端

---

## ⚠️ Render 免費方案限制

### 休眠機制

- **條件**：如果 15 分鐘內沒有任何請求，服務會進入休眠狀態
- **影響**：首次請求需要 30-60 秒來喚醒服務
- **解決方案**：
  1. 升級到付費方案（$7/月）避免休眠
  2. 使用外部服務定期發送請求保持服務活躍（如 UptimeRobot）

### 其他限制

- **資源限制**：512MB RAM，0.1 CPU
- **構建時間**：每次部署最多 10 分鐘
- **帶寬**：100GB/月

---

## 🔄 自動部署

Render 支援自動部署：

- **觸發條件**：每次推送到 `main` 分支時自動部署
- **設置**：在服務設置中啟用 "Auto-Deploy"（預設已啟用）

---

## 🛠️ 疑難排解

### 問題 1：部署失敗

**可能原因**：
- `package.json` 錯誤
- 構建命令失敗
- 端口設置錯誤

**解決方案**：
1. 檢查 Render 日誌（在服務詳情頁面的 "Logs" 標籤）
2. 確保 `package.json` 中的 `start` 命令正確
3. 確保 `server.js` 使用 `process.env.PORT` 而不是固定端口

### 問題 2：服務無法啟動

**檢查**：
1. 查看 Render 日誌
2. 確保 `npm start` 命令正確
3. 確保所有依賴都已安裝

### 問題 3：前端無法連接後端

**檢查**：
1. 確保 `public/config.js` 中的 `BACKEND_URL` 正確
2. 檢查瀏覽器控制台是否有 CORS 錯誤
3. 檢查後端服務是否正在運行（訪問 Render URL）

### 問題 4：CORS 錯誤

**解決方案**：
- 確保 `server.js` 中的 `cors` 設置包含 GitHub Pages 域名：
  ```javascript
  origin: [
    'https://andy825lay1-web.github.io',
    'http://localhost:3000'
  ]
  ```

---

## 📞 需要幫助？

如果遇到問題：
1. 檢查 Render 日誌
2. 查看 `SETUP_GITHUB_PAGES.md` 獲取更多信息
3. 訪問 Render 文檔：https://render.com/docs

---

完成以上步驟後，您的後端就會部署到 Render，前端就可以正常連接了！🎉
