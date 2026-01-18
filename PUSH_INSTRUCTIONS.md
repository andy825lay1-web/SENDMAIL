# GitHub 推送指南

## 方法 1：使用 Personal Access Token（推薦，不影響其他專案）

這個方法只為這個專案設置認證，不會影響其他專案的 Git 操作。

### 步驟 1：生成 Personal Access Token

1. 前往：https://github.com/settings/tokens
2. 點擊 "Generate new token (classic)"
3. 填寫以下資訊：
   - **Note**: `SENDMAIL 專案專用`
   - **Expiration**: 選擇合適的過期時間（建議 90 天或 No expiration）
   - **Select scopes**: 勾選 `repo`（完整倉庫權限）
4. 點擊 "Generate token"
5. **重要**：立即複製生成的 Token（格式：`ghp_xxxxxxxxxxxxx`），只會顯示一次

### 步驟 2：使用 Token 推送

在終端執行：

```bash
cd "/Users/caijunchang/Desktop/程式專案資料夾/冠軍區/郵件發送系統"
git push -u origin main
```

當提示輸入時：
- **Username**: `andy825lay1-web`
- **Password**: 貼上剛才生成的 Personal Access Token（不是 GitHub 密碼）

**注意**：Token 會保存在本地，下次推送時不需要再次輸入。

---

## 方法 2：使用 GitHub CLI 多帳號（不影響全局設置）

這個方法允許同時管理多個 GitHub 帳號。

### 步驟 1：添加第二個 GitHub 帳號

```bash
gh auth login --hostname github.com --web
```

然後選擇：
1. `GitHub.com`
2. `HTTPS`
3. `Login with a web browser`
4. 使用 `andy825lay1-web` 帳號登入

### 步驟 2：為此專案設置特定的帳號

```bash
cd "/Users/caijunchang/Desktop/程式專案資料夾/冠軍區/郵件發送系統"
gh auth switch --hostname github.com --user andy825lay1-web
```

或者使用 HTTP 認證助手：

```bash
git config --local credential.helper "!gh auth git-credential"
```

### 步驟 3：推送

```bash
git push -u origin main
```

---

## 方法 3：使用 SSH 金鑰（最靈活）

這個方法為不同帳號設置不同的 SSH 金鑰，完全互不影響。

### 步驟 1：生成新的 SSH 金鑰

```bash
ssh-keygen -t ed25519 -C "andy825lay1@gmail.com" -f ~/.ssh/id_ed25519_andy825lay1
```

### 步驟 2：添加 SSH 金鑰到 GitHub

1. 複製公鑰：
```bash
cat ~/.ssh/id_ed25519_andy825lay1.pub | pbcopy
```

2. 前往：https://github.com/settings/keys
3. 點擊 "New SSH key"
4. 貼上公鑰並保存

### 步驟 3：配置 SSH 使用特定金鑰

創建或編輯 `~/.ssh/config`：

```
# 其他專案使用預設金鑰
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_rsa

# SENDMAIL 專案使用 andy825lay1-web 帳號
Host github-andy825lay1
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_andy825lay1
```

### 步驟 4：更新遠程倉庫地址

```bash
cd "/Users/caijunchang/Desktop/程式專案資料夾/冠軍區/郵件發送系統"
git remote set-url origin git@github-andy825lay1:andy825lay1-web/SENDMAIL.git
```

### 步驟 5：推送

```bash
git push -u origin main
```

---

## 推薦方法

**建議使用方法 1（Personal Access Token）**，因為：
- ✅ 不需要切換全局帳號
- ✅ 不影響其他專案的 Git 操作
- ✅ 設置簡單快速
- ✅ Token 保存在本地，只需輸入一次

---

## 注意事項

- 本專案已設置本地 Git 配置（`--local`），不會影響全局設置
- 其他專案的 Git 操作不受影響
- 如果使用 Personal Access Token，請妥善保管，不要分享給他人
