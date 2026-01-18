// API 基礎 URL
const API_BASE = 'http://localhost:3000/api';

// 載入發送統計
async function loadSendStats(email) {
    if (!email) return null;
    
    try {
        const response = await fetch(`${API_BASE}/send-stats?email=${encodeURIComponent(email)}`);
        const result = await response.json();
        
        if (result.success) {
            return result.stats;
        }
    } catch (error) {
        console.error('載入發送統計失敗：', error);
    }
    
    return null;
}

// 更新發送限制顯示
async function updateSendLimitDisplay(email) {
    const limitInfo = document.getElementById('send-limit-info');
    const limitStats = document.getElementById('limit-stats');
    
    if (!email || !email.includes('@')) {
        limitInfo.style.display = 'none';
        return;
    }
    
    const stats = await loadSendStats(email);
    
    if (stats) {
        limitInfo.style.display = 'block';
        
        const percentage = Math.round((stats.dailyUsed / stats.dailyLimit) * 100);
        const color = percentage >= 90 ? '#f44336' : percentage >= 70 ? '#ff9800' : '#4caf50';
        
        limitStats.innerHTML = `
            <span style="color: ${color}; font-weight: bold;">
                已發送：${stats.dailyUsed} / ${stats.dailyLimit} 封 (${percentage}%)
            </span>
            <br>
            <span style="color: #666;">
                剩餘配額：<strong>${stats.remaining}</strong> 封
            </span>
            ${stats.remaining < 50 ? '<br><span style="color: #ff9800;">⚠️ 剩餘配額較少，建議分批發送</span>' : ''}
        `;
        
        // 如果無法發送，顯示警告
        if (!stats.canSend) {
            limitStats.innerHTML += '<br><span style="color: #f44336;">❌ 已達今日發送限制，請明天再試</span>';
        }
    } else {
        limitInfo.style.display = 'none';
    }
}

// 標籤頁切換
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        // 移除所有活動狀態
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // 添加活動狀態
        btn.classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // 如果切換到管理標籤頁，重新載入客戶列表
        if (tabName === 'manage') {
            loadCustomers();
        }
    });
});

// 載入客戶列表
async function loadCustomers() {
    try {
        const response = await fetch(`${API_BASE}/customers`);
        const result = await response.json();
        
        if (result.success) {
            displayCustomers(result.data);
            updateRecipientSelect(result.data);
        } else {
            showResult('manage-result', 'error', '載入客戶資料失敗');
        }
    } catch (error) {
        showResult('manage-result', 'error', `錯誤：${error.message}`);
    }
}

// 顯示客戶列表
function displayCustomers(customers) {
    const tbody = document.getElementById('customers-tbody');
    tbody.innerHTML = '';
    
    if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #888;">目前沒有客戶資料</td></tr>';
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    customers.forEach(customer => {
        const tr = document.createElement('tr');
        const isSentToday = customer.lastSentDate === today;
        const sentBadge = isSentToday ? '<span style="color: #4caf50; font-weight: bold;">✅ 已發</span>' : '<span style="color: #999;">未發</span>';
        const sentCount = customer.sentCount || 0;
        
        tr.innerHTML = `
            <td>${customer.name || '-'}</td>
            <td>${customer.email || '-'}</td>
            <td>${customer.phone || '-'}</td>
            <td>
                ${sentBadge}
                ${sentCount > 0 ? `<br><small style="color: #666;">共發送 ${sentCount} 次</small>` : ''}
            </td>
            <td>
                <button class="btn btn-edit" onclick="editCustomer('${customer.id}')">編輯</button>
                <button class="btn btn-danger" onclick="deleteCustomer('${customer.id}')">刪除</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 更新收件人選擇列表
function updateRecipientSelect(customers) {
    const select = document.getElementById('recipient-select');
    // 保留「全部客戶」選項
    select.innerHTML = '<option value="all">全部客戶</option>';
    
    const today = new Date().toISOString().split('T')[0];
    
    customers.forEach(customer => {
        if (customer.email) {
            const option = document.createElement('option');
            const isSentToday = customer.lastSentDate === today;
            const sentBadge = isSentToday ? ' ✅已發' : '';
            option.value = customer.id;
            option.textContent = `${customer.name || '未命名'} (${customer.email})${sentBadge}`;
            if (isSentToday) {
                option.style.color = '#4caf50';
            }
            select.appendChild(option);
        }
    });
    
    // 更新發送狀態統計
    updateSendStatusStats(customers);
}

// 更新發送狀態統計
function updateSendStatusStats(customers) {
    const today = new Date().toISOString().split('T')[0];
    const sentToday = customers.filter(c => c.lastSentDate === today).length;
    const unsentToday = customers.filter(c => !c.lastSentDate || c.lastSentDate !== today).length;
    const total = customers.length;
    
    const statusInfo = document.getElementById('send-status-info');
    const statusStats = document.getElementById('send-status-stats');
    
    if (statusInfo && statusStats) {
        statusInfo.style.display = 'block';
        statusStats.innerHTML = `
            <span style="color: #4caf50;">✅ 今日已發送：<strong>${sentToday}</strong> 位</span>
            <br>
            <span style="color: #2196F3;">📋 今日未發送：<strong>${unsentToday}</strong> 位</span>
            <br>
            <span style="color: #666;">📊 總客戶數：<strong>${total}</strong> 位</span>
        `;
    }
}

// 發送郵件
document.getElementById('email-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 發送前儲存帳號資訊（如果勾選了「記住我」）
    saveCredentials();
    
    const senderEmail = document.getElementById('sender-email').value.trim();
    const senderPassword = document.getElementById('sender-password').value.trim();
    const subject = document.getElementById('email-subject').value.trim();
    const message = document.getElementById('email-message').value.trim();
    const recipientSelect = document.getElementById('recipient-select');
    
    if (!senderEmail || !senderPassword || !subject || !message) {
        showResult('send-result', 'error', '請填寫所有必填欄位');
        return;
    }
    
    // 檢查發送限制（發送前檢查）
    const stats = await loadSendStats(senderEmail);
    if (stats && !stats.canSend) {
        showResult('send-result', 'error', `無法發送：已達今日發送限制（${stats.dailyUsed}/${stats.dailyLimit} 封）。請明天再試或減少發送數量。`);
        return;
    }
    
    // 獲取選中的客戶 ID
    const selectedOptions = Array.from(recipientSelect.selectedOptions);
    const customerIds = selectedOptions
        .filter(opt => opt.value !== 'all')
        .map(opt => opt.value);
    
    // 如果選擇了「全部客戶」，則不傳遞 customerIds
    const hasAllSelected = selectedOptions.some(opt => opt.value === 'all');
    
    // 檢查是否只發送未發送的
    const sendOnlyUnsent = document.getElementById('send-only-unsent').checked;
    
    // 獲取要發送的客戶數量
    let recipientCount = 0;
    if (hasAllSelected) {
        try {
            const customersResponse = await fetch(`${API_BASE}/customers`);
            const customersResult = await customersResponse.json();
            if (customersResult.success) {
                if (sendOnlyUnsent) {
                    recipientCount = customersResult.stats.unsentToday;
                } else {
                    recipientCount = customersResult.data.length;
                }
            }
        } catch (error) {
            console.error('無法獲取客戶數量：', error);
        }
    } else {
        recipientCount = selectedOptions.length;
    }
    
    // 檢查是否有足夠的配額
    if (stats && recipientCount > stats.remaining) {
        const confirmMsg = `您要發送 ${recipientCount} 封郵件，但今日剩餘配額只有 ${stats.remaining} 封。\n\n是否只發送前 ${stats.remaining} 封？`;
        if (!confirm(confirmMsg)) {
            return;
        }
    }
    
    // 處理應用程式密碼（移除空格）
    const cleanPassword = senderPassword.replace(/\s+/g, '');
    
    // 隱藏結果區域，顯示進度區域
    document.getElementById('send-result').style.display = 'none';
    document.getElementById('progress-container').style.display = 'block';
    
    // 初始化進度顯示
    updateProgress(0, 0, 0, '準備發送郵件...', '等待開始...');
    
    // 禁用發送按鈕，防止重複提交
    const submitBtn = document.querySelector('#email-form button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳</span> 發送中...';
    
    let taskId = null;
    let progressInterval = null;
    
    try {
        // 發送郵件請求（立即返回 taskId）
        const response = await fetch(`${API_BASE}/send-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                senderEmail,
                senderPassword: cleanPassword,
                subject,
                message,
                customerIds: hasAllSelected ? [] : customerIds,
                sendOnlyUnsent: sendOnlyUnsent
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`伺服器錯誤 (${response.status}): ${errorText}`);
        }
        
        const result = await response.json();
        
        if (!result.success || !result.taskId) {
            throw new Error(result.error || '無法獲取發送任務 ID');
        }
        
        taskId = result.taskId;
        
        // 開始輪詢進度
        progressInterval = setInterval(async () => {
            try {
                const progressResponse = await fetch(`${API_BASE}/send-progress/${taskId}`);
                if (!progressResponse.ok) {
                    return;
                }
                
                const progressResult = await progressResponse.json();
                if (progressResult.success && progressResult.progress) {
                    const progress = progressResult.progress;
                    
                    // 更新進度顯示
                    updateProgress(
                        progress.current || 0,
                        progress.total || 0,
                        progress.percentage || 0,
                        progress.message || '發送中...',
                        `成功: ${progress.sent || 0}, 失敗: ${progress.failed || 0}`
                    );
                    
                    // 如果完成或失敗，停止輪詢
                    if (progress.status === 'completed' || progress.status === 'failed') {
                        clearInterval(progressInterval);
                        
                        // 恢復按鈕
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalBtnText;
                        
                        // 顯示最終結果
                        if (progress.status === 'completed') {
                            let message = `✅ 發送完成！成功 ${progress.sent} 封郵件`;
                            if (progress.failed > 0) {
                                message += `，失敗 ${progress.failed} 封`;
                            }
                            showResult('send-result', 'success', message);
                            
                            // 如果有失敗的，顯示詳細資訊
                            if (progress.results && progress.results.failed && progress.results.failed.length > 0) {
                                const failedList = progress.results.failed.slice(0, 10).map(f => 
                                    `${f.customer}: ${f.error}`
                                ).join('<br>');
                                const moreFailed = progress.results.failed.length > 10 
                                    ? `<br>...還有 ${progress.results.failed.length - 10} 封失敗的郵件`
                                    : '';
                                showResult('send-result', 'error', `失敗的郵件：<br>${failedList}${moreFailed}`);
                            }
                        } else {
                            let errorMsg = `發送失敗：${progress.message}`;
                            
                            // 如果是登入嘗試過多，提供詳細說明
                            if (progress.message && progress.message.includes('Too many login attempts')) {
                                errorMsg = `發送失敗：登入嘗試過多<br><br>
                                <strong>Gmail 暫時封鎖了您的帳號</strong><br><br>
                                <strong>解決方法：</strong><br>
                                1. 等待 15-30 分鐘後再試<br>
                                2. 或減少發送數量（每次發送 50-100 封）<br>
                                3. 分批發送，批次之間等待更長時間<br>
                                4. 檢查是否有其他程式在使用同一 Gmail 帳號發送郵件<br><br>
                                <strong>建議：</strong><br>
                                • 使用較小的批次（50 封/批）<br>
                                • 批次之間等待 10 秒以上<br>
                                • 每天發送不超過 500 封<br><br>
                                目前進度：已發送 ${progress.sent || 0} 封，失敗 ${progress.failed || 0} 封`;
                            }
                            
                            showResult('send-result', 'error', errorMsg);
                        }
                        
                        // 隱藏進度條
                        setTimeout(() => {
                            document.getElementById('progress-container').style.display = 'none';
                        }, 5000);
                    }
                }
            } catch (error) {
                console.error('查詢進度失敗：', error);
            }
        }, 1000); // 每秒查詢一次進度
        
        // 設置超時（30分鐘）
        setTimeout(() => {
            if (progressInterval) {
                clearInterval(progressInterval);
                showResult('send-result', 'error', '查詢進度超時，請重新整理頁面查看結果');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        }, 30 * 60 * 1000);
        
    } catch (error) {
        console.error('發送郵件錯誤：', error);
        
        // 停止進度查詢
        if (progressInterval) {
            clearInterval(progressInterval);
        }
        
        // 隱藏進度條
        document.getElementById('progress-container').style.display = 'none';
        
        let errorMessage = `錯誤：${error.message}`;
        
        // 提供更詳細的錯誤提示
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
            errorMessage = '無法連接到伺服器，請確認伺服器是否正常運行<br>如果伺服器在運行，請重新整理頁面';
        } else if (error.message.includes('超時') || error.message.includes('timeout')) {
            errorMessage = '發送超時，可能是網路問題或發送數量過多<br>請嘗試分批發送或稍後再試';
        } else if (error.message.includes('Invalid login') || error.message.includes('EAUTH')) {
            errorMessage = `認證失敗：${error.message}<br><br>
            <strong>請檢查：</strong><br>
            1. Gmail 地址是否正確<br>
            2. 應用程式密碼是否正確<br>
            3. 是否啟用了兩步驟驗證<br><br>
            <a href="https://myaccount.google.com/apppasswords" target="_blank">重新產生應用程式密碼</a>`;
        } else if (error.message.includes('ERR_EMPTY_RESPONSE')) {
            errorMessage = '伺服器無回應，請檢查伺服器是否正常運行<br>如果伺服器在運行，請重新整理頁面';
        }
        
        showResult('send-result', 'error', errorMessage);
        
        // 恢復按鈕狀態
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    }
});

// 更新進度顯示
function updateProgress(current, total, percentage, message, details) {
    const progressBar = document.getElementById('progress-bar');
    const progressPercentage = document.getElementById('progress-percentage');
    const progressMessage = document.getElementById('progress-message');
    const progressDetails = document.getElementById('progress-details');
    
    if (progressBar) {
        const width = Math.max(percentage, 2); // 至少顯示 2% 寬度，讓進度條可見
        progressBar.style.width = `${width}%`;
        
        // 只在進度條足夠寬時顯示百分比文字
        if (percentage >= 10) {
            progressBar.textContent = `${percentage}%`;
        } else {
            progressBar.textContent = '';
        }
    }
    
    if (progressPercentage) {
        progressPercentage.textContent = `${percentage}%`;
    }
    
    if (progressMessage) {
        progressMessage.textContent = message || '發送中...';
    }
    
    if (progressDetails) {
        if (total > 0) {
            progressDetails.textContent = `已發送 ${current}/${total} - ${details}`;
        } else {
            progressDetails.textContent = details || '等待開始...';
        }
    }
}

// 導入資料
document.getElementById('import-btn').addEventListener('click', async () => {
    const jsonData = document.getElementById('import-data').value.trim();
    const csvData = document.getElementById('import-csv').value.trim();
    
    let customers = [];
    
    if (jsonData) {
        try {
            customers = JSON.parse(jsonData);
            if (!Array.isArray(customers)) {
                throw new Error('JSON 格式必須是陣列');
            }
        } catch (error) {
            showResult('import-result', 'error', `JSON 格式錯誤：${error.message}`);
            return;
        }
    } else if (csvData) {
        const lines = csvData.split('\n').filter(line => line.trim());
        customers = lines.map(line => {
            const parts = line.split(',').map(p => p.trim());
            return {
                name: parts[0] || '',
                email: parts[1] || '',
                phone: parts[2] || ''
            };
        });
    } else {
        showResult('import-result', 'error', '請輸入要導入的資料');
        return;
    }
    
    // 為每個客戶生成 ID
    customers = customers.map(customer => ({
        ...customer,
        id: customer.id || generateId()
    }));
    
    showResult('import-result', 'info', '正在導入資料...');
    
    try {
        const response = await fetch(`${API_BASE}/customers/import`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ customers })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showResult('import-result', 'success', 
                `成功導入 ${result.imported} 筆資料，移除 ${result.duplicates} 筆重複資料`);
            document.getElementById('import-data').value = '';
            document.getElementById('import-csv').value = '';
        } else {
            showResult('import-result', 'error', `導入失敗：${result.error}`);
        }
    } catch (error) {
        showResult('import-result', 'error', `錯誤：${error.message}`);
    }
});

// 去重處理
document.getElementById('deduplicate-btn').addEventListener('click', async () => {
    if (!confirm('確定要進行去重處理嗎？')) {
        return;
    }
    
    showResult('manage-result', 'info', '正在處理...');
    
    try {
        const response = await fetch(`${API_BASE}/customers/deduplicate`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showResult('manage-result', 'success', 
                `去重完成，移除了 ${result.removed} 筆重複資料`);
            loadCustomers();
        } else {
            showResult('manage-result', 'error', `去重失敗：${result.error}`);
        }
    } catch (error) {
        showResult('manage-result', 'error', `錯誤：${error.message}`);
    }
});

// 複製所有信箱
document.getElementById('copy-emails-btn').addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_BASE}/customers`);
        const result = await response.json();
        
        if (!result.success) {
            showResult('manage-result', 'error', '載入客戶資料失敗');
            return;
        }
        
        // 提取所有有效的 email（移除所有空格，包括前後和中間的空格）
        const emails = result.data
            .filter(customer => customer.email && customer.email.trim())
            .map(customer => customer.email.replace(/\s+/g, '').trim())
            .filter(email => email.length > 0); // 過濾掉空字串
        
        if (emails.length === 0) {
            showResult('manage-result', 'error', '沒有可複製的信箱');
            return;
        }
        
        // 格式化為逗號分隔的字串（方便貼到郵件客戶端）
        const emailString = emails.join(', ');
        
        // 複製到剪貼板
        try {
            await navigator.clipboard.writeText(emailString);
            showResult('manage-result', 'success', 
                `✅ 已複製 ${emails.length} 個信箱到剪貼板！<br>格式：逗號分隔，可直接貼到郵件收件人欄位`);
            
            // 3秒後清除訊息
            setTimeout(() => {
                document.getElementById('manage-result').style.display = 'none';
            }, 3000);
        } catch (clipboardError) {
            // 如果 Clipboard API 失敗，使用傳統方法
            const textArea = document.createElement('textarea');
            textArea.value = emailString;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                showResult('manage-result', 'success', 
                    `✅ 已複製 ${emails.length} 個信箱到剪貼板！<br>格式：逗號分隔，可直接貼到郵件收件人欄位`);
                setTimeout(() => {
                    document.getElementById('manage-result').style.display = 'none';
                }, 3000);
            } catch (fallbackError) {
                document.body.removeChild(textArea);
                showResult('manage-result', 'error', '複製失敗，請手動選擇文字複製');
            }
        }
    } catch (error) {
        showResult('manage-result', 'error', `錯誤：${error.message}`);
    }
});

// 重新整理
document.getElementById('refresh-btn').addEventListener('click', () => {
    loadCustomers();
    showResult('manage-result', 'info', '已重新整理');
    setTimeout(() => {
        document.getElementById('manage-result').style.display = 'none';
    }, 2000);
});

// 編輯客戶
async function editCustomer(id) {
    try {
        const response = await fetch(`${API_BASE}/customers`);
        const result = await response.json();
        
        if (result.success) {
            const customer = result.data.find(c => c.id === id);
            if (customer) {
                document.getElementById('edit-id').value = customer.id;
                document.getElementById('edit-name').value = customer.name || '';
                document.getElementById('edit-email').value = customer.email || '';
                document.getElementById('edit-phone').value = customer.phone || '';
                document.getElementById('edit-modal').style.display = 'block';
            }
        }
    } catch (error) {
        alert(`載入客戶資料失敗：${error.message}`);
    }
}

// 儲存編輯
document.getElementById('edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('edit-id').value;
    const name = document.getElementById('edit-name').value;
    const email = document.getElementById('edit-email').value;
    const phone = document.getElementById('edit-phone').value;
    
    try {
        const response = await fetch(`${API_BASE}/customers/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, phone })
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('edit-modal').style.display = 'none';
            loadCustomers();
            showResult('manage-result', 'success', '客戶資料已更新');
        } else {
            alert(`更新失敗：${result.error}`);
        }
    } catch (error) {
        alert(`錯誤：${error.message}`);
    }
});

// 刪除客戶
async function deleteCustomer(id) {
    if (!confirm('確定要刪除此客戶嗎？')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/customers/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            loadCustomers();
            showResult('manage-result', 'success', '客戶已刪除');
        } else {
            showResult('manage-result', 'error', `刪除失敗：${result.error}`);
        }
    } catch (error) {
        showResult('manage-result', 'error', `錯誤：${error.message}`);
    }
}

// 關閉模態框
document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('edit-modal').style.display = 'none';
});

window.onclick = function(event) {
    const modal = document.getElementById('edit-modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// 顯示結果訊息
function showResult(elementId, type, message) {
    const element = document.getElementById(elementId);
    element.className = `result ${type}`;
    element.innerHTML = message;
    element.style.display = 'block';
}

// 生成唯一 ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 載入儲存的帳號資訊
function loadSavedCredentials() {
    try {
        const emailInput = document.getElementById('sender-email');
        const passwordInput = document.getElementById('sender-password');
        
        const savedEmail = localStorage.getItem('senderEmail');
        const savedPassword = localStorage.getItem('senderPassword');
        
        // 優先使用儲存的資訊，如果沒有則使用預設值
        if (savedEmail) {
            emailInput.value = savedEmail;
        } else {
            // 預設填入您的 Gmail
            emailInput.value = 'andy825lay1@gmail.com';
        }
        
        if (savedPassword) {
            passwordInput.value = savedPassword;
        } else {
            // 預設填入您的應用程式密碼（去掉空格）
            passwordInput.value = 'iods dlli ajhv jdwy';
        }
        
        // 檢查是否有儲存「記住我」的設定
        const rememberMe = localStorage.getItem('rememberCredentials');
        if (rememberMe === 'true') {
            document.getElementById('remember-credentials').checked = true;
        } else {
            // 預設勾選「記住我」
            document.getElementById('remember-credentials').checked = true;
            // 自動儲存預設值
            saveCredentials();
        }
        
        // 載入後自動更新發送限制顯示
        if (emailInput.value) {
            updateSendLimitDisplay(emailInput.value);
        }
    } catch (error) {
        console.error('載入儲存的帳號資訊失敗：', error);
        // 如果出錯，至少填入預設值
        try {
            document.getElementById('sender-email').value = 'andy825lay1@gmail.com';
            document.getElementById('sender-password').value = 'iods dlli ajhv jdwy';
            updateSendLimitDisplay('andy825lay1@gmail.com');
        } catch (e) {
            // 忽略錯誤
        }
    }
}

// 儲存帳號資訊
function saveCredentials() {
    const rememberMe = document.getElementById('remember-credentials').checked;
    const email = document.getElementById('sender-email').value;
    const password = document.getElementById('sender-password').value;
    
    if (rememberMe && email && password) {
        try {
            localStorage.setItem('senderEmail', email);
            localStorage.setItem('senderPassword', password);
            localStorage.setItem('rememberCredentials', 'true');
        } catch (error) {
            console.error('儲存帳號資訊失敗：', error);
        }
    } else {
        // 如果不記住，清除儲存的資訊
        try {
            localStorage.removeItem('senderEmail');
            localStorage.removeItem('senderPassword');
            localStorage.removeItem('rememberCredentials');
        } catch (error) {
            console.error('清除儲存的資訊失敗：', error);
        }
    }
}

// 監聽「記住我」選項變化
document.addEventListener('DOMContentLoaded', () => {
    const rememberCheckbox = document.getElementById('remember-credentials');
    if (rememberCheckbox) {
        rememberCheckbox.addEventListener('change', () => {
            saveCredentials();
        });
    }
    
    // 監聽表單輸入變化
    const emailInput = document.getElementById('sender-email');
    const passwordInput = document.getElementById('sender-password');
    
    if (emailInput && passwordInput) {
        emailInput.addEventListener('blur', saveCredentials);
        passwordInput.addEventListener('blur', saveCredentials);
    }
});

// 當 email 輸入框改變時，更新發送限制顯示
document.getElementById('sender-email').addEventListener('blur', (e) => {
    const email = e.target.value.trim();
    if (email && email.includes('@')) {
        updateSendLimitDisplay(email);
    }
});

// 刷新統計按鈕
document.getElementById('refresh-stats-btn').addEventListener('click', () => {
    const email = document.getElementById('sender-email').value.trim();
    if (email && email.includes('@')) {
        updateSendLimitDisplay(email);
    }
});

// 重置發送記錄
async function resetSendHistory() {
    const today = new Date().toISOString().split('T')[0];
    const confirmMsg = `確定要重置「今天 (${today})」的發送記錄嗎？\n\n這會將所有客戶標記為「未發送」，可以重新發送。`;
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/customers/reset-send-history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                date: today
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showResult('manage-result', 'success', result.message);
            loadCustomers(); // 重新載入客戶列表
        } else {
            showResult('manage-result', 'error', `重置失敗：${result.error}`);
        }
    } catch (error) {
        showResult('manage-result', 'error', `錯誤：${error.message}`);
    }
}

// 頁面載入時載入客戶列表和帳號資訊
window.addEventListener('load', () => {
    loadCustomers();
    loadSavedCredentials(); // 載入儲存的帳號資訊
    
    // 預設選擇「全部客戶」
    const recipientSelect = document.getElementById('recipient-select');
    if (recipientSelect) {
        recipientSelect.selectedIndex = 0;
    }
});
