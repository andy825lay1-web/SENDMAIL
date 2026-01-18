# 🔒 Supabase RLS 政策檢查報告

**檢查時間**：2025-01-18  
**專案目錄**：`/Users/caijunchang/Desktop/程式專案資料夾/冠軍區/郵件發送系統`

---

## ✅ 檢查結果摘要

| 項目 | 狀態 | 數量 |
|------|------|------|
| 總表數 | ✅ 已檢查 | 14 個表 |
| RLS 已啟用 | ✅ 大部分啟用 | 13 個表 |
| RLS 未啟用 | ⚠️ **需注意** | 1 個表（estate_attendance_meetings） |
| RLS 政策總數 | ✅ 已配置 | 61 個政策 |
| Storage 政策 | ✅ 已配置 | 14 個政策 |

---

## 📊 詳細檢查結果

### 1️⃣ RLS 狀態檢查

**查詢結果**：共檢查 14 個表

| 表名 | RLS 狀態 | 說明 |
|------|---------|------|
| estate_attendance_checkins | ✅ 已啟用 | 有 4 個政策 |
| estate_attendance_lottery_winners | ✅ 已啟用 | 有 5 個政策 |
| estate_attendance_meetings | ❌ **未啟用** | ⚠️ **需要啟用**（有 4 個政策但 RLS 未啟用） |
| estate_attendance_members | ✅ 已啟用 | 有 4 個政策 |
| estate_attendance_prizes | ✅ 已啟用 | 有 4 個政策 |
| foodcarcalss | ✅ 已啟用 | 有 4 個政策 |
| frontend_notices | ✅ 已啟用 | 有 4 個政策 |
| frontend_schedule | ✅ 已啟用 | 有 3 個政策（缺少 DELETE） |
| girls | ✅ 已啟用 | 有 4 個政策 |
| invite_event_images | ✅ 已啟用 | 有 4 個政策 |
| line_bot_keywords | ✅ 已啟用 | 有 4 個政策 |
| location_settings | ✅ 已啟用 | 有 4 個政策 |
| n8n_config | ✅ 已啟用 | 有 4 個政策 |
| site_links | ✅ 已啟用 | 有 4 個政策 |

**⚠️ 發現的問題**：
- `estate_attendance_meetings` 表已配置 RLS 政策，但 RLS **未啟用**
- `frontend_schedule` 表缺少 DELETE 政策

**建議修復**：
```sql
-- 啟用 estate_attendance_meetings 的 RLS
ALTER TABLE estate_attendance_meetings ENABLE ROW LEVEL SECURITY;
```

---

### 2️⃣ RLS 政策檢查

**查詢結果**：共找到 **47 個 public schema 政策** + **14 個 storage 政策** = **61 個政策**

#### Public Schema 政策統計

| 表名 | 政策數量 | SELECT | INSERT | UPDATE | DELETE | ALL |
|------|---------|--------|--------|--------|--------|-----|
| estate_attendance_checkins | 4 | 1 | 1 | 1 | 1 | 0 |
| estate_attendance_lottery_winners | 5 | 1 | 1 | 1 | 1 | 1 |
| estate_attendance_meetings | 4 | 1 | 1 | 1 | 1 | 0 |
| estate_attendance_members | 4 | 1 | 1 | 1 | 1 | 0 |
| estate_attendance_prizes | 4 | 1 | 1 | 1 | 1 | 0 |
| foodcarcalss | 4 | 1 | 1 | 1 | 1 | 0 |
| frontend_notices | 4 | 1 | 1 | 1 | 1 | 0 |
| frontend_schedule | 3 | 1 | 1 | 1 | 0 | 0 |
| girls | 4 | 1 | 1 | 1 | 1 | 0 |
| invite_event_images | 4 | 1 | 1 | 1 | 1 | 0 |
| line_bot_keywords | 4 | 1 | 1 | 1 | 1 | 0 |
| location_settings | 4 | 1 | 1 | 1 | 1 | 0 |
| n8n_config | 4 | 1 | 1 | 1 | 1 | 0 |
| site_links | 4 | 1 | 1 | 1 | 1 | 0 |

#### Storage Schema 政策

| 表名 | 政策數量 | 說明 |
|------|---------|------|
| storage.objects | 14 | 涵蓋所有 buckets 的讀寫刪除操作 |

**政策類型分析**：
- ✅ 大部分表都有完整的 CRUD 政策（SELECT, INSERT, UPDATE, DELETE）
- ⚠️ 大部分政策都是 `{public}` 角色（公開訪問）
- ⚠️ 只有 `estate_attendance_checkins` 有 `{authenticated}` 角色的政策

**安全性評估**：
- ⚠️ **大部分表允許公開訪問**（`{public}` 角色）
- ⚠️ 如果需要限制訪問，應改用 `{authenticated}` 或自定義角色

---

### 3️⃣ 政策統計

#### 按命令類型統計

| 命令類型 | 政策數量 | 說明 |
|---------|---------|------|
| SELECT | 15 | 查詢政策 |
| INSERT | 15 | 插入政策 |
| UPDATE | 15 | 更新政策 |
| DELETE | 14 | 刪除政策（frontend_schedule 缺少） |
| ALL | 1 | 全部操作政策（estate_attendance_lottery_winners） |

#### 按角色統計

| 角色 | 政策數量 | 說明 |
|------|---------|------|
| {public} | 43 | 公開訪問（任何人都可以訪問） |
| {authenticated} | 4 | 需要認證（estate_attendance_checkins） |

**安全建議**：
- ⚠️ 大部分表使用 `{public}` 角色，允許未認證用戶訪問
- ✅ 如果需要保護數據，應改用 `{authenticated}` 角色
- ✅ `estate_attendance_checkins` 已正確使用認證政策

---

## 🔍 RLS 政策詳情

### 主要表的政策詳情

#### 1. estate_attendance_checkins（已啟用 RLS，認證訪問）

| 政策名稱 | 角色 | 操作 | 狀態 |
|---------|------|------|------|
| checkins_select_owner | authenticated | SELECT | ✅ 已設定 |
| checkins_insert_owner | authenticated | INSERT | ✅ 已設定 |
| checkins_update_owner | authenticated | UPDATE | ✅ 已設定 |
| checkins_delete_owner | authenticated | DELETE | ✅ 已設定 |

**說明**：✅ 安全性良好，只允許認證用戶訪問自己的記錄

---

#### 2. estate_attendance_meetings（❌ RLS 未啟用）

| 政策名稱 | 角色 | 操作 | 狀態 |
|---------|------|------|------|
| Allow public read access | public | SELECT | ✅ 已設定 |
| Allow public insert access | public | INSERT | ✅ 已設定 |
| Allow public update access | public | UPDATE | ✅ 已設定 |
| Allow public delete access | public | DELETE | ✅ 已設定 |

**⚠️ 問題**：RLS 未啟用，政策不會生效！
**修復**：
```sql
ALTER TABLE estate_attendance_meetings ENABLE ROW LEVEL SECURITY;
```

---

#### 3. frontend_schedule（缺少 DELETE 政策）

| 政策名稱 | 角色 | 操作 | 狀態 |
|---------|------|------|------|
| 允許匿名讀取時刻表資料 | public | SELECT | ✅ 已設定 |
| 允許匿名插入時刻表資料 | public | INSERT | ✅ 已設定 |
| 允許匿名更新時刻表資料 | public | UPDATE | ✅ 已設定 |
| - | - | DELETE | ❌ **缺少** |

**建議**：如果需要允許刪除操作，添加 DELETE 政策：
```sql
CREATE POLICY "允許匿名刪除時刻表資料"
ON frontend_schedule FOR DELETE
TO public
USING (true);
```

---

#### 4. Storage Objects 政策（14 個政策）

**主要政策**：
- ✅ 公開讀取（`Allow public read access`）
- ✅ 認證用戶上傳（`Authenticated users can upload`）
- ✅ 公開上傳到特定 buckets（`Allow public uploads to estate_attendance`）
- ✅ 公開刪除（`Allow public delete`）

**說明**：Storage 政策涵蓋多個 buckets，包括：
- estate_attendance
- hua-real-estate
- 其他公開 buckets

---

## ⚠️ 安全建議

### 啟用 RLS 的重要性

**Row Level Security (RLS)** 是 PostgreSQL 的安全功能，允許您根據用戶身份和角色控制對表行的訪問。對於 Supabase 專案來說，RLS 是保護數據的關鍵。

### 最佳實踐

1. **所有表都應啟用 RLS**：
   - ✅ 即使是公開數據，也應該啟用 RLS
   - ✅ 使用政策來明確控制訪問權限

2. **為每種操作設置政策**：
   - SELECT：查詢數據
   - INSERT：插入數據
   - UPDATE：更新數據
   - DELETE：刪除數據

3. **使用明確的條件**：
   - 基於 `auth.uid()` 來過濾數據
   - 使用角色和權限來控制訪問

---

## 📝 RLS 政策範例

### 範例 1：用戶只能訪問自己的數據

```sql
-- 啟用 RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 創建 SELECT 政策（用戶只能查詢自己的記錄）
CREATE POLICY "Users can view own customers"
ON customers FOR SELECT
USING (auth.uid() = user_id);

-- 創建 INSERT 政策（用戶只能插入自己的記錄）
CREATE POLICY "Users can insert own customers"
ON customers FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 創建 UPDATE 政策（用戶只能更新自己的記錄）
CREATE POLICY "Users can update own customers"
ON customers FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 創建 DELETE 政策（用戶只能刪除自己的記錄）
CREATE POLICY "Users can delete own customers"
ON customers FOR DELETE
USING (auth.uid() = user_id);
```

### 範例 2：公開讀取，認證用戶寫入

```sql
-- 啟用 RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 任何人都可以讀取
CREATE POLICY "Anyone can view products"
ON products FOR SELECT
TO public
USING (true);

-- 只有認證用戶可以插入
CREATE POLICY "Authenticated users can insert products"
ON products FOR INSERT
TO authenticated
WITH CHECK (true);

-- 只有所有者可以更新
CREATE POLICY "Users can update own products"
ON products FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);
```

### 範例 3：Storage Bucket 政策

```sql
-- 創建 Storage Bucket 政策
-- 允許認證用戶上傳文件
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'private' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 允許用戶讀取自己的文件
CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'private' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 🔧 檢查和修復 RLS 政策

### 檢查特定表的 RLS 狀態

```sql
-- 檢查表的 RLS 狀態
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'your_table_name';
```

### 檢查表的 RLS 政策

```sql
-- 查看表的所有政策
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'your_table_name';
```

### 啟用 RLS

```sql
-- 啟用表的 RLS
ALTER TABLE your_table_name ENABLE ROW LEVEL SECURITY;
```

### 創建政策

```sql
-- 創建 SELECT 政策
CREATE POLICY "policy_name"
ON your_table_name FOR SELECT
TO authenticated
USING (your_condition);

-- 創建 INSERT 政策
CREATE POLICY "policy_name"
ON your_table_name FOR INSERT
TO authenticated
WITH CHECK (your_condition);

-- 創建 UPDATE 政策
CREATE POLICY "policy_name"
ON your_table_name FOR UPDATE
TO authenticated
USING (your_condition)
WITH CHECK (your_condition);

-- 創建 DELETE 政策
CREATE POLICY "policy_name"
ON your_table_name FOR DELETE
TO authenticated
USING (your_condition);
```

---

## 📋 檢查命令參考

### 使用 Supabase CLI

```bash
# 檢查所有表的 RLS 狀態
npx supabase db execute --query "
  SELECT tablename, rowsecurity 
  FROM pg_tables 
  WHERE schemaname = 'public';
"

# 檢查所有 RLS 政策
npx supabase db execute --query "
  SELECT * FROM pg_policies 
  WHERE schemaname = 'public';
"
```

### 使用 SQL Editor

在 Supabase Dashboard 的 SQL Editor 中執行：

```sql
-- 檢查所有表的 RLS 狀態
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 檢查所有 RLS 政策
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

**報告生成時間**：2025-01-18
