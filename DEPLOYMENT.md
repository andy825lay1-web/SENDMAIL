# 部署指南

## 為什麼不能直接使用 GitHub Pages？

GitHub Pages **只支援靜態網站**（HTML、CSS、JavaScript），不支援：
- ❌ Node.js 後端服務器
- ❌ 資料庫連接
- ❌ 伺服器端 API（如 `/api/send-email`）

這個專案需要：
- ✅ Node.js 運行環境（運行 `server.js`）
- ✅ Express 後端服務器（處理 API 請求）
- ✅ Nodemailer（發送郵件，需要 Node.js）

---

## 解決方案

### 方案 1：分離部署（推薦）⭐

**前端 → GitHub Pages**  
**後端 → Render / Railway / Vercel**

#### 步驟 1：部署後端到 Render（免費）

1. 前往：https://render.com
2. 註冊/登入帳號
3. 點擊 "New +" → "Web Service"
4. 連接 GitHub 倉庫：`andy825lay1-web/SENDMAIL`
5. 設置：
   - **Name**: `sendmail-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Root Directory**: `/`（根目錄）
6. 點擊 "Create Web Service"

#### 步驟 2：獲取後端 URL

部署完成後，Render 會提供一個 URL，例如：
```
https://sendmail-backend.onrender.com
```

#### 步驟 3：更新前端 API 地址

修改 `public/script.js`：

```javascript
// 改為您的 Render URL
const API_BASE = 'https://sendmail-backend.onrender.com/api';

// 或者根據環境自動切換
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api'
  : 'https://sendmail-backend.onrender.com/api';
```

#### 步驟 4：部署前端到 GitHub Pages

1. 在 GitHub 倉庫設置中：
   - 前往 `Settings` → `Pages`
   - Source: 選擇 `Deploy from a branch`
   - Branch: 選擇 `main` / `root`
   - 點擊 "Save"

2. GitHub Pages URL：
```
https://andy825lay1-web.github.io/SENDMAIL/
```

#### 步驟 5：創建 GitHub Actions 自動部署

創建 `.github/workflows/deploy-pages.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./public
```

---

### 方案 2：使用 Vercel（全棧部署）⭐

Vercel 支援 Node.js，可以同時部署前端和後端。

#### 步驟 1：安裝 Vercel CLI

```bash
npm install -g vercel
```

#### 步驟 2：部署

```bash
cd "/Users/caijunchang/Desktop/程式專案資料夾/冠軍區/郵件發送系統"
vercel
```

#### 步驟 3：更新 API 地址

Vercel 會自動提供 URL，例如：
```
https://sendmail.vercel.app
```

更新 `public/script.js`：

```javascript
const API_BASE = 'https://sendmail.vercel.app/api';
```

---

### 方案 3：使用 Railway（全棧部署）⭐

Railway 也支援 Node.js，免費方案足夠使用。

#### 步驟 1：前往 Railway

1. 前往：https://railway.app
2. 註冊/登入
3. 點擊 "New Project" → "Deploy from GitHub repo"
4. 選擇 `andy825lay1-web/SENDMAIL`

#### 步驟 2：設置環境變數（如果需要）

通常不需要額外設置。

#### 步驟 3：部署

Railway 會自動檢測 Node.js 並部署。

#### 步驟 4：獲取 URL

Railway 會提供一個 URL，例如：
```
https://sendmail-production.up.railway.app
```

更新 `public/script.js`：

```javascript
const API_BASE = 'https://sendmail-production.up.railway.app/api';
```

---

## 推薦方案

**建議使用方案 1（Render + GitHub Pages）**：
- ✅ Render 免費方案支援 Node.js
- ✅ GitHub Pages 免費且快速
- ✅ 前端和後端分離，易於維護
- ✅ 可以分別更新前端和後端

---

## 注意事項

### 後端限制

- **Render 免費方案**：
  - 服務器會在 15 分鐘無活動後休眠
  - 首次請求會比較慢（需要喚醒）
  - 建議升級到付費方案避免休眠

- **Vercel 免費方案**：
  - Serverless Functions 有執行時間限制（10 秒）
  - 長時間運行的任務（如批量發送郵件）可能超時
  - 需要調整為異步處理

- **Railway 免費方案**：
  - 每月 $5 免費額度
  - 超過後會暫停服務

### 前端 CORS 設置

確保後端允許 GitHub Pages 域名的跨域請求。

在 `server.js` 中：

```javascript
app.use(cors({
  origin: [
    'https://andy825lay1-web.github.io',
    'http://localhost:3000'
  ]
}));
```

---

## 快速開始

### 如果使用 Render + GitHub Pages：

1. **部署後端**：
   ```bash
   # 在 Render 創建新服務，連接 GitHub 倉庫
   ```

2. **修改前端 API**：
   ```javascript
   const API_BASE = 'https://YOUR-RENDER-URL.onrender.com/api';
   ```

3. **提交更改**：
   ```bash
   git add .
   git commit -m "更新 API 地址為 Render URL"
   git push
   ```

4. **啟用 GitHub Pages**：
   - GitHub 倉庫 → Settings → Pages
   - Source: `Deploy from a branch` → `main` → `/public`

完成！您的應用會在以下地址運行：
- 前端：`https://andy825lay1-web.github.io/SENDMAIL/`
- 後端：`https://YOUR-RENDER-URL.onrender.com`
