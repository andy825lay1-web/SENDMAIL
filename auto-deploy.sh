#!/bin/bash

# 自動部署到 Render 腳本
# 此腳本會協助您完成 Render 部署的準備工作

echo "=========================================="
echo "🚀 Render 後端自動部署準備"
echo "=========================================="
echo ""

# 檢查是否在正確的目錄
if [ ! -f "server.js" ]; then
    echo "❌ 錯誤：請在專案根目錄執行此腳本"
    exit 1
fi

echo "✅ 檢查配置文件..."
echo ""

# 檢查必要的文件
if [ ! -f "render.yaml" ]; then
    echo "⚠️  警告：未找到 render.yaml"
else
    echo "✅ render.yaml 已存在"
fi

if [ ! -f "package.json" ]; then
    echo "❌ 錯誤：未找到 package.json"
    exit 1
else
    echo "✅ package.json 已存在"
fi

if [ ! -f "server.js" ]; then
    echo "❌ 錯誤：未找到 server.js"
    exit 1
else
    echo "✅ server.js 已存在"
fi

echo ""
echo "=========================================="
echo "📋 部署步驟"
echo "=========================================="
echo ""
echo "由於 Render 需要在網站上操作，請按照以下步驟進行："
echo ""
echo "1. 前往 Render 網站："
echo "   https://render.com"
echo ""
echo "2. 註冊/登入（使用 GitHub 帳號更方便）"
echo ""
echo "3. 點擊 'New +' → 'Web Service'"
echo ""
echo "4. 連接 GitHub 倉庫："
echo "   - 搜尋：andy825lay1-web/SENDMAIL"
echo "   - 點擊 'Connect'"
echo ""
echo "5. 配置設置："
echo "   - Name: sendmail-backend"
echo "   - Region: 選擇最近的區域"
echo "   - Branch: main"
echo "   - Root Directory: /"
echo "   - Runtime: Node"
echo "   - Build Command: npm install"
echo "   - Start Command: npm start"
echo "   - Plan: Free"
echo ""
echo "6. 點擊 'Create Web Service'"
echo ""
echo "7. 等待部署完成（通常需要 3-5 分鐘）"
echo ""
echo "8. 複製部署後的 URL（例如：https://sendmail-backend.onrender.com）"
echo ""
echo "9. 更新 public/config.js 中的 BACKEND_URL"
echo ""
echo "10. 提交並推送更改到 GitHub"
echo ""
echo "=========================================="
echo "📝 詳細說明請查看：DEPLOY_RENDER.md"
echo "=========================================="
echo ""

# 嘗試打開 Render 網站
if command -v open &> /dev/null; then
    echo "是否要打開 Render 網站？(y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        open "https://render.com"
    fi
fi
