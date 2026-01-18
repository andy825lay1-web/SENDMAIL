#!/bin/bash

# 自動啟用 GitHub Pages 腳本
# 使用方法：./enable-github-pages.sh

echo "=========================================="
echo "自動啟用 GitHub Pages"
echo "=========================================="
echo ""

# 檢查是否在正確的目錄
if [ ! -f "server.js" ]; then
    echo "❌ 錯誤：請在專案根目錄執行此腳本"
    exit 1
fi

# 檢查 GitHub CLI 是否可用
if command -v gh &> /dev/null; then
    echo "✅ 檢測到 GitHub CLI"
    
    # 檢查是否已登入
    if gh auth status &> /dev/null; then
        echo "✅ GitHub CLI 已登入"
        echo ""
        echo "正在啟用 GitHub Pages..."
        
        # 方法 1：使用 GitHub CLI API（需要 workflow 權限）
        gh api repos/andy825lay1-web/SENDMAIL/pages \
            -X POST \
            -f source[type]=branch \
            -f source[branch]=main \
            -f source[path]=/public 2>&1
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ GitHub Pages 已啟用！"
            echo ""
            echo "您的網站將在以下地址可用："
            echo "https://andy825lay1-web.github.io/SENDMAIL/"
            echo ""
            echo "注意：部署可能需要幾分鐘時間"
            exit 0
        else
            echo ""
            echo "⚠️ 使用 GitHub CLI API 失敗，改用其他方法..."
        fi
    else
        echo "⚠️ GitHub CLI 未登入，請先執行：gh auth login"
    fi
fi

echo ""
echo "=========================================="
echo "手動啟用 GitHub Pages 步驟"
echo "=========================================="
echo ""
echo "請按照以下步驟手動啟用 GitHub Pages："
echo ""
echo "方法 1：透過 GitHub 網站（推薦）"
echo "1. 前往：https://github.com/andy825lay1-web/SENDMAIL/settings/pages"
echo "2. 在 'Source' 區段："
echo "   - 選擇 'Deploy from a branch'"
echo "   - Branch: 選擇 'main'"
echo "   - Folder: 選擇 '/public'"
echo "3. 點擊 'Save'"
echo "4. 等待幾分鐘，網站將在以下地址可用："
echo "   https://andy825lay1-web.github.io/SENDMAIL/"
echo ""
echo "方法 2：使用 GitHub CLI"
echo "1. 確保已登入：gh auth login"
echo "2. 執行以下命令："
echo "   gh api repos/andy825lay1-web/SENDMAIL/pages \\"
echo "       -X POST \\"
echo "       -f source[type]=branch \\"
echo "       -f source[branch]=main \\"
echo "       -f source[path]=/public"
echo ""
echo "=========================================="
echo ""

# 嘗試打開瀏覽器到設置頁面
if command -v open &> /dev/null; then
    echo "是否要打開 GitHub Pages 設置頁面？(y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        open "https://github.com/andy825lay1-web/SENDMAIL/settings/pages"
    fi
fi
