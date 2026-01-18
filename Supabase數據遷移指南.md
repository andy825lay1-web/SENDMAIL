# 📊 Supabase 數據遷移指南

**專案**：郵件發送系統  
**資料來源**：本地 JSON 文件（`data/customers.json`）  
**目標**：Supabase 數據庫

---

## ✅ 已完成的工作

### 1️⃣ 創建 Supabase 表

✅ **表已創建**：`sendmail_customers`

**表結構**：
- `id` (UUID) - 主鍵，自動生成
- `customer_id` (TEXT) - 客戶唯一識別碼（對應 JSON 中的 id）
- `name` (TEXT) - 客戶名稱
- `email` (TEXT) - 客戶郵件地址
- `phone` (TEXT) - 客戶電話號碼
- `last_sent_date` (DATE) - 最後發送日期
- `sent_count` (INTEGER) - 總發送次數
- `send_history` (JSONB) - 發送歷史記錄
- `created_at` (TIMESTAMPTZ) - 創建時間
- `updated_at` (TIMESTAMPTZ) - 更新時間

**索引**：
- ✅ `email` 索引（加快查詢）
- ✅ `customer_id` 索引（唯一索引）
- ✅ `last_sent_date` 索引（過濾未發送客戶）

**RLS 政策**：
- ✅ 公開讀取（SELECT）
- ✅ 公開插入（INSERT）
- ✅ 公開更新（UPDATE）
- ✅ 公開刪除（DELETE）

---

## 📋 當前數據狀態

### 本地數據
- **位置**：`data/customers.json`
- **總數**：712 位客戶
- **格式**：
  ```json
  {
    "id": "1",
    "name": "0916425262",
    "email": "0916425262@gmail.com",
    "phone": "0916425262",
    "lastSentDate": "2025-01-18",
    "sentCount": 5,
    "sendHistory": [...]
  }
  ```

### Supabase 表
- **表名**：`sendmail_customers`
- **當前記錄數**：待遷移
- **狀態**：✅ 表已創建，可以開始遷移

---

## 🚀 遷移步驟

### 方法 1：使用遷移腳本（推薦）

#### 步驟 1：安裝 Supabase 客戶端

```bash
cd "/Users/caijunchang/Desktop/程式專案資料夾/冠軍區/郵件發送系統"
npm install @supabase/supabase-js
```

#### 步驟 2：設置 Supabase 環境變數

創建 `.env` 文件或設置環境變數：

```bash
# 方法 1：創建 .env 文件
cat > .env << EOF
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
EOF

# 方法 2：直接設置環境變數
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
```

**如何獲取 Supabase URL 和 Key**：
1. 前往 Supabase Dashboard：https://supabase.com/dashboard
2. 選擇您的專案
3. 進入 "Settings" → "API"
4. 複製：
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_ANON_KEY`

#### 步驟 3：執行遷移腳本

```bash
node migrate-to-supabase.js
```

**遷移過程**：
- ✅ 讀取本地 `data/customers.json`
- ✅ 轉換資料格式（JSON → Supabase）
- ✅ 批次插入（每批 100 筆，避免速率限制）
- ✅ 顯示進度和結果

---

### 方法 2：使用 Supabase Dashboard（手動）

#### 步驟 1：導出 JSON 數據

```bash
# 複製 customers.json 內容
cat data/customers.json
```

#### 步驟 2：在 Supabase Dashboard 中插入

1. 前往 Supabase Dashboard
2. 選擇您的專案
3. 進入 "Table Editor"
4. 選擇 `sendmail_customers` 表
5. 點擊 "Insert row" 或 "Insert from CSV/JSON"
6. 貼上 JSON 數據

**注意**：手動插入 712 筆資料可能較耗時。

---

### 方法 3：使用 SQL 直接插入

#### 步驟 1：準備 SQL 插入語句

```bash
# 生成 SQL 插入語句
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/customers.json', 'utf8'));
const sql = data.map(c => {
  const customer_id = c.id || String(Date.now());
  const name = (c.name || '').replace(/'/g, \"''\");
  const email = (c.email || '').replace(/'/g, \"''\");
  const phone = c.phone ? c.phone.replace(/'/g, \"''\") : null;
  const last_sent_date = c.lastSentDate ? \`'\${c.lastSentDate}'\` : 'NULL';
  const sent_count = c.sentCount || 0;
  const send_history = JSON.stringify(c.sendHistory || []).replace(/'/g, \"''\");
  
  return \`INSERT INTO sendmail_customers (customer_id, name, email, phone, last_sent_date, sent_count, send_history) VALUES ('\${customer_id}', '\${name}', '\${email}', \${phone ? \`'\${phone}'\` : 'NULL'}, \${last_sent_date}, \${sent_count}, '\${send_history}'::jsonb) ON CONFLICT (customer_id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, last_sent_date = EXCLUDED.last_sent_date, sent_count = EXCLUDED.sent_count, send_history = EXCLUDED.send_history;\`;
}).join('\\n');
fs.writeFileSync('migrate-customers.sql', sql);
console.log('SQL 文件已生成：migrate-customers.sql');
"
```

#### 步驟 2：在 Supabase SQL Editor 執行

1. 前往 Supabase Dashboard
2. 進入 "SQL Editor"
3. 創建新查詢
4. 複製 `migrate-customers.sql` 的內容
5. 執行查詢

---

## 🔍 驗證遷移結果

### 檢查數據總數

```sql
-- 檢查 Supabase 中的客戶總數
SELECT COUNT(*) as total_customers
FROM sendmail_customers;
```

### 檢查數據完整性

```sql
-- 檢查前 10 筆資料
SELECT 
  customer_id,
  name,
  email,
  phone,
  last_sent_date,
  sent_count
FROM sendmail_customers
ORDER BY created_at DESC
LIMIT 10;
```

### 檢查重複

```sql
-- 檢查是否有重複的 email
SELECT email, COUNT(*) as count
FROM sendmail_customers
GROUP BY email
HAVING COUNT(*) > 1;
```

---

## 📊 遷移後的數據對應

### JSON → Supabase 欄位對應

| JSON 欄位 | Supabase 欄位 | 說明 |
|----------|--------------|------|
| `id` | `customer_id` | 客戶唯一識別碼 |
| `name` | `name` | 客戶名稱 |
| `email` | `email` | 客戶郵件地址 |
| `phone` | `phone` | 客戶電話號碼 |
| `lastSentDate` | `last_sent_date` | 最後發送日期 |
| `sentCount` | `sent_count` | 總發送次數 |
| `sendHistory` | `send_history` | 發送歷史記錄（JSONB） |

---

## ⚠️ 注意事項

### 1. 數據去重

遷移腳本會使用 `upsert`（INSERT ... ON CONFLICT），如果 `customer_id` 已存在，會更新現有記錄。

### 2. 速率限制

- 遷移腳本已設置批次大小（100 筆/批）
- 每批之間有 1 秒延遲，避免速率限制
- 總遷移時間約 8-10 秒（712 筆）

### 3. 數據驗證

遷移後請驗證：
- ✅ 總數是否正確（712 筆）
- ✅ Email 是否正確
- ✅ 發送記錄是否正確

### 4. 備份

遷移前建議備份：
```bash
# 備份本地 JSON
cp data/customers.json data/customers-backup-$(date +%Y%m%d).json
```

---

## 🔄 遷移後的更新

### 更新後端代碼

遷移完成後，需要更新 `server.js` 以從 Supabase 讀取資料：

1. 安裝 Supabase 客戶端：
   ```bash
   npm install @supabase/supabase-js
   ```

2. 更新 `server.js` 使用 Supabase API

3. 更新 `public/script.js` 以從 Supabase 獲取客戶列表

---

## 📝 遷移腳本使用說明

### 基本使用

```bash
# 1. 設置環境變數
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"

# 2. 執行遷移
node migrate-to-supabase.js
```

### 使用 .env 文件

```bash
# 1. 創建 .env 文件
cat > .env << EOF
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
EOF

# 2. 使用 dotenv 載入（需要安裝 dotenv）
npm install dotenv
# 然後在 migrate-to-supabase.js 開頭添加：
# require('dotenv').config();

# 3. 執行遷移
node migrate-to-supabase.js
```

---

## ✅ 下一步

遷移完成後：

1. ✅ 驗證數據完整性
2. ⏳ 更新後端代碼使用 Supabase
3. ⏳ 更新前端代碼使用 Supabase
4. ⏳ 測試郵件發送功能

---

**表已創建，可以開始遷移數據！** 🎉
