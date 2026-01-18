# 🚀 Render 部署快速指南

## ✅ 準備工作已完成

- ✅ 代碼已推送到 GitHub
- ✅ Supabase 整合完成（712 位客戶數據）
- ✅ `render.yaml` 配置文件已準備
- ✅ `package.json` 配置正確

---

## 📋 5 分鐘部署步驟

### 步驟 1：前往 Render（1 分鐘）

1. 打開瀏覽器，訪問：**https://render.com**
2. 點擊 "Get Started for Free" 或 "Sign Up"
3. 使用 **GitHub 帳號登入**（推薦，方便連接倉庫）

---

### 步驟 2：創建 Web Service（2 分鐘）

1. 登入後，點擊右上角的 **"New +"** 按鈕
2. 選擇 **"Web Service"**

---

### 步驟 3：連接 GitHub 倉庫（1 分鐘）

1. 在 "Connect a repository" 區段：
   - 如果還沒有連接 GitHub，點擊 "Configure account" 並授權
   - 搜尋並選擇：**`andy825lay1-web/SENDMAIL`**
   - 點擊 **"Connect"**

---

### 步驟 4：配置服務設置（30 秒）

系統會**自動檢測** `render.yaml` 配置，但請確認以下設置：

**基本信息**：
- **Name**: `sendmail-backend`（可自定義）
- **Region**: 選擇最近的區域（如 **Singapore** 或 **Oregon**）
- **Branch**: `main`
- **Root Directory**: `/`（留空或填寫 `/`）

**構建和啟動**（應該自動填充）：
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**方案**：
- **Plan**: 選擇 **`Free`**（免費方案）

---

### 步驟 5：環境變數（可選）

如果需要，可以添加環境變數：

- **SUPABASE_URL**: `https://sqgrnowrcvspxhuudrqc.supabase.co`
- **SUPABASE_ANON_KEY**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**注意**：如果不設置，系統會使用代碼中的預設值（已經配置好了）。

---

### 步驟 6：創建服務（1 分鐘）

1. 點擊底部的 **"Create Web Service"**
2. Render 會自動：
   - 從 GitHub 拉取代碼
   - 執行 `npm install` 安裝依賴
   - 啟動 `npm start`
   - 開始部署

---

### 步驟 7：等待部署完成（3-5 分鐘）

1. 在服務詳情頁面，您會看到部署日誌
2. 等待幾分鐘，直到看到 **"Your service is live"** 訊息
3. **重要**：複製服務的 URL，例如：
   ```
   https://sendmail-backend.onrender.com
   ```
   或
   ```
   https://sendmail-backend-xxxx.onrender.com
   ```
   （如果名稱被占用，會有隨機後綴）

---

## 🔧 部署後的配置

### 步驟 1：更新前端 API 地址

**提供給我實際的 Render URL**，我會立即更新 `config.js`。

或者手動更新：

1. 編輯 `public/config.js`
2. 找到這一行：
   ```javascript
   : 'https://sendmail-backend.onrender.com';
   ```
3. 改為您的實際 Render URL
4. 提交並推送：
   ```bash
   git add public/config.js
   git commit -m "更新後端 URL 為實際的 Render 地址"
   git push
   ```

---

### 步驟 2：等待 GitHub Pages 重新部署

- 通常需要 1-2 分鐘
- 部署完成後，前端應該能正常連接後端

---

## ✅ 驗證部署

### 測試後端 API

在瀏覽器中訪問：
```
https://您的RenderURL.onrender.com/api/customers
```

應該看到 JSON 響應（客戶資料或空陣列 `[]`）

### 測試前端連接

1. 訪問：https://andy825lay1-web.github.io/SENDMAIL/public/index.html
2. 清除瀏覽器緩存（`Cmd + Shift + R` 或 `Ctrl + Shift + R`）
3. 打開開發者工具（F12）→ Console
4. 應該看到：
   ```
   🌐 GitHub Pages 模式
   📡 API 地址：https://您的RenderURL.onrender.com/api
   ```
5. 檢查客戶列表是否顯示（應該顯示 712 位客戶）

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

## 🐛 常見問題

### Q1: 部署失敗

**可能原因**：
- 構建錯誤
- 依賴安裝失敗
- 端口配置錯誤

**解決方法**：
- 查看部署日誌中的錯誤訊息
- 確認 `package.json` 中的依賴正確
- 確認 `npm start` 命令正確

---

### Q2: 服務無法啟動

**可能原因**：
- `server.js` 有錯誤
- 環境變數未設置
- Supabase 連接失敗

**解決方法**：
- 查看服務日誌（在 Render Dashboard 中）
- 確認 Supabase 配置正確
- 檢查環境變數

---

### Q3: 前端無法連接後端

**可能原因**：
- CORS 配置錯誤
- 後端 URL 不正確
- 服務正在休眠

**解決方法**：
- 確認 `server.js` 中的 CORS 配置包含 `https://andy825lay1-web.github.io`
- 確認 `config.js` 中的 URL 正確
- 如果是休眠，等待 30-60 秒喚醒

---

## 📝 檢查清單

部署前確認：
- [ ] GitHub 倉庫已推送最新代碼
- [ ] `render.yaml` 文件存在
- [ ] `package.json` 配置正確
- [ ] `server.js` 使用 `process.env.PORT`

部署後確認：
- [ ] 服務狀態為 "Live"
- [ ] 已複製服務 URL
- [ ] 後端 API 可以訪問（測試 `/api/customers`）
- [ ] `config.js` 已更新為實際的 URL
- [ ] 前端可以連接到後端
- [ ] 客戶列表可以顯示（712 位客戶）

---

## 🎯 下一步

1. **部署到 Render**（按照上述步驟）
2. **複製服務 URL**
3. **提供給我 URL**，我會更新 `config.js`
4. **推送到 GitHub**
5. **測試前端連接**

---

**準備好了！開始部署吧！** 🚀
