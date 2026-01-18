# GitHub Pages 設置步驟

## 為什麼需要分離部署？

GitHub Pages **只支援靜態網站**（HTML、CSS、JavaScript），不支援：
- ❌ Node.js 後端
- ❌ 資料庫
- ❌ 伺服器端 API

這個專案需要 Node.js 後端來：
- 處理 API 請求（`/api/send-email` 等）
- 發送郵件（Nodemailer）
- 儲存客戶資料

## 解決方案：分離部署

**前端** → GitHub Pages（免費）  
**後端** → Render / Railway（免費支援 Node.js）

---

## 步驟 1：部署後端到 Render

### 1.1 前往 Render

1. 前往：https://render.com
2. 註冊/登入（可以使用 GitHub 帳號登入）

### 1.2 創建 Web Service

1. 點擊 "New +" → "Web Service"
2. 連接 GitHub 倉庫：`andy825lay1-web/SENDMAIL`
3. 設置：
   - **Name**: `sendmail-backend`
   - **Region**: 選擇最近的區域
   - **Branch**: `main`
   - **Root Directory**: `/`（根目錄）
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. 點擊 "Create Web Service"

### 1.3 等待部署完成

Render 會自動：
1. 從 GitHub 拉取代碼
2. 執行 `npm install`
3. 啟動 `npm start`
4. 提供一個 URL，例如：`https://sendmail-backend.onrender.com`

**重要**：複製這個 URL，稍後會用到！

---

## 步驟 2：更新前端 API 地址

### 2.1 編輯 config.js

打開 `public/config.js`，找到這一行：

```javascript
const BACKEND_URL = isLocalhost 
    ? 'http://localhost:3000'
    : 'https://YOUR-BACKEND-URL.onrender.com'; // 👈 部署後端後，修改此處
```

將 `YOUR-BACKEND-URL.onrender.com` 改為步驟 1.3 中複製的 URL（不需要 `https://` 前綴）。

例如，如果後端 URL 是 `https://sendmail-backend.onrender.com`，則改為：

```javascript
const BACKEND_URL = isLocalhost 
    ? 'http://localhost:3000'
    : 'https://sendmail-backend.onrender.com';
```

### 2.2 提交更改

```bash
cd "/Users/caijunchang/Desktop/程式專案資料夾/冠軍區/郵件發送系統"
git add public/config.js
git commit -m "更新後端 API 地址"
git push
```

---

## 步驟 3：啟用 GitHub Pages

### 3.1 前往倉庫設置

1. 前往：https://github.com/andy825lay1-web/SENDMAIL
2. 點擊 "Settings" 標籤
3. 在左側選單找到 "Pages"

### 3.2 設置 Pages

1. 在 "Source" 區段：
   - 選擇 "Deploy from a branch"
   - Branch: 選擇 `main`
   - Folder: 選擇 `/ (root)`
2. 點擊 "Save"

### 3.3 等待部署

GitHub 會在幾分鐘內部署，完成後會顯示：

```
Your site is live at https://andy825lay1-web.github.io/SENDMAIL/
```

**注意**：如果選擇 `/ (root)`，GitHub Pages 會從根目錄尋找 `index.html`。由於我們的 `index.html` 在 `public/` 目錄中，有兩種選擇：

#### 選項 A：手動設置 root 目錄（推薦）

在 GitHub Pages 設置中，選擇：
- Branch: `main`
- Folder: `/public`

#### 選項 B：使用 GitHub Actions（自動化）

如果選項 A 不可用，可以添加 GitHub Actions 自動部署：

1. 在 GitHub 倉庫中，創建文件：`.github/workflows/deploy-pages.yml`
2. 內容見下面的 GitHub Actions 配置

---

## 步驟 4：（可選）添加 GitHub Actions 自動部署

如果您想要自動部署到 GitHub Pages，可以添加這個工作流程：

### 4.1 在 GitHub 上創建文件

1. 前往：https://github.com/andy825lay1-web/SENDMAIL
2. 點擊 "Add file" → "Create new file"
3. 文件名：`.github/workflows/deploy-pages.yml`
4. 內容：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
    paths:
      - 'public/**'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './public'
      
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

5. 點擊 "Commit new file"

### 4.2 啟用 GitHub Pages

設置與步驟 3 相同，但這次 GitHub Actions 會自動處理部署。

---

## 步驟 5：測試

### 5.1 訪問前端

打開瀏覽器，訪問：
```
https://andy825lay1-web.github.io/SENDMAIL/
```

### 5.2 檢查 API 連接

1. 打開瀏覽器開發者工具（F12）
2. 切換到 "Console" 標籤
3. 您應該看到：
   ```
   🌐 GitHub Pages 模式
   📡 API 地址：https://YOUR-BACKEND-URL.onrender.com/api
   ```

### 5.3 測試功能

嘗試：
- 載入客戶列表
- 發送測試郵件

---

## 注意事項

### Render 免費方案限制

- **休眠**：如果 15 分鐘沒有請求，服務器會休眠
- **喚醒時間**：首次請求可能需要 30-60 秒喚醒服務器
- **解決方案**：升級到付費方案（$7/月）避免休眠

### CORS 設置

後端已設置允許 GitHub Pages 域名的跨域請求：
```javascript
origin: [
  'https://andy825lay1-web.github.io',
  'http://localhost:3000'
]
```

### 環境變數

後端已支援 `PORT` 環境變數，Render 會自動設置，無需手動配置。

---

## 完成後的 URL

- **前端**：https://andy825lay1-web.github.io/SENDMAIL/
- **後端**：https://YOUR-BACKEND-URL.onrender.com

---

## 疑難排解

### 問題：前端無法連接到後端

**解決方案**：
1. 檢查 `public/config.js` 中的 `BACKEND_URL` 是否正確
2. 檢查 Render 服務器是否正在運行
3. 檢查瀏覽器控制台是否有 CORS 錯誤

### 問題：GitHub Pages 找不到 index.html

**解決方案**：
1. 確保在 GitHub Pages 設置中選擇 `/public` 作為源目錄
2. 或使用 GitHub Actions 自動部署（步驟 4）

### 問題：後端請求超時

**解決方案**：
- Render 免費方案在休眠時需要喚醒時間
- 等待 30-60 秒後重試
- 或升級到付費方案避免休眠

---

## 推薦：升級 Render 付費方案

如果經常使用，建議升級 Render 付費方案（$7/月）：
- ✅ 服務器不會休眠
- ✅ 更快的響應時間
- ✅ 更好的性能

---

完成以上步驟後，您的應用就可以在 GitHub Pages 上運行了！🎉
