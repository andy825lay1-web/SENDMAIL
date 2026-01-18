const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;

// 中間件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// 資料檔案路徑
const DATA_FILE = path.join(__dirname, 'data', 'customers.json');
const STATS_FILE = path.join(__dirname, 'data', 'send-stats.json');

// 發送進度追蹤（使用 Map 存儲）
const sendingProgress = new Map();

// ==================== Gmail 限制配置 ====================
// 根據 Gmail 官方限制設定（保守值，確保安全）
const GMAIL_LIMITS = {
  // 免費 Gmail 帳號限制（保守值）
  FREE_DAILY_LIMIT: 450,           // 每日郵件限制（保留 50 封緩衝）
  FREE_HOURLY_LIMIT: 50,            // 每小時限制（保守值）
  FREE_PER_MINUTE_LIMIT: 10,       // 每分鐘限制（保守值）
  
  // Workspace 帳號限制（如果用戶有 Workspace）
  WORKSPACE_DAILY_LIMIT: 1900,     // 每日郵件限制（保留 100 封緩衝）
  WORKSPACE_HOURLY_LIMIT: 200,      // 每小時限制
  WORKSPACE_PER_MINUTE_LIMIT: 20,  // 每分鐘限制
  
  // 通用設定
  ROLLING_WINDOW_HOURS: 24,        // 滾動窗口（24 小時）
  MIN_RETRY_DELAY: 2000,           // 最小重試延遲（毫秒）
  MAX_RETRY_DELAY: 60000,          // 最大重試延遲（毫秒）
  MAX_RETRIES: 3                   // 最大重試次數
};

// 批次發送設定（根據限制動態調整）
let BATCH_SIZE = 30;                // 每批發送 30 封（更保守）
let BATCH_DELAY = 15000;            // 批次之間延遲 15 秒
let EMAIL_DELAY = 600;              // 每封郵件之間延遲 600ms（約每分鐘 100 封）

// ==================== 發送統計管理 ====================
// 發送記錄（用於追蹤滾動 24 小時窗口）
let sendStats = {
  records: [],  // [{ timestamp, email, count }]
  lastReset: Date.now()
};

// 載入發送統計
async function loadSendStats() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(STATS_FILE, 'utf8');
    const stats = JSON.parse(data);
    // 清理過期記錄（超過 24 小時）
    const now = Date.now();
    const windowMs = GMAIL_LIMITS.ROLLING_WINDOW_HOURS * 60 * 60 * 1000;
    stats.records = stats.records.filter(r => (now - r.timestamp) < windowMs);
    return stats;
  } catch (error) {
    return { records: [], lastReset: Date.now() };
  }
}

// 儲存發送統計
async function saveSendStats() {
  await ensureDataDir();
  await fs.writeFile(STATS_FILE, JSON.stringify(sendStats, null, 2), 'utf8');
}

// 初始化統計
(async () => {
  sendStats = await loadSendStats();
})();

// 記錄發送
async function recordSend(email) {
  const now = Date.now();
  sendStats.records.push({
    timestamp: now,
    email: email,
    count: 1
  });
  
  // 清理超過 24 小時的記錄
  const windowMs = GMAIL_LIMITS.ROLLING_WINDOW_HOURS * 60 * 60 * 1000;
  sendStats.records = sendStats.records.filter(r => (now - r.timestamp) < windowMs);
  
  // 定期儲存（每 10 筆記錄）
  if (sendStats.records.length % 10 === 0) {
    await saveSendStats();
  }
}

// 獲取發送統計（滾動 24 小時窗口）
function getSendStats(senderEmail) {
  const now = Date.now();
  const windowMs = GMAIL_LIMITS.ROLLING_WINDOW_HOURS * 60 * 60 * 1000;
  
  // 過濾出 24 小時內的記錄
  const recentRecords = sendStats.records.filter(r => (now - r.timestamp) < windowMs);
  
  // 按發送者 email 分組統計
  const byEmail = {};
  recentRecords.forEach(r => {
    if (!byEmail[r.email]) {
      byEmail[r.email] = { total: 0, hourly: {}, minute: {} };
    }
    byEmail[r.email].total += r.count;
    
    // 按小時統計
    const hourKey = Math.floor(r.timestamp / (60 * 60 * 1000));
    byEmail[r.email].hourly[hourKey] = (byEmail[r.email].hourly[hourKey] || 0) + r.count;
    
    // 按分鐘統計
    const minuteKey = Math.floor(r.timestamp / (60 * 1000));
    byEmail[r.email].minute[minuteKey] = (byEmail[r.email].minute[minuteKey] || 0) + r.count;
  });
  
  return byEmail[senderEmail] || { total: 0, hourly: {}, minute: {} };
}

// 檢查是否可以發送（根據限制）
function canSend(senderEmail, count = 1, isWorkspace = false) {
  const stats = getSendStats(senderEmail);
  const now = Date.now();
  
  // 判斷帳號類型（簡單判斷：如果包含 @gmail.com 可能是免費帳號）
  // 預設使用免費帳號限制（更保守）
  const limits = isWorkspace ? {
    daily: GMAIL_LIMITS.WORKSPACE_DAILY_LIMIT,
    hourly: GMAIL_LIMITS.WORKSPACE_HOURLY_LIMIT,
    perMinute: GMAIL_LIMITS.WORKSPACE_PER_MINUTE_LIMIT
  } : {
    daily: GMAIL_LIMITS.FREE_DAILY_LIMIT,
    hourly: GMAIL_LIMITS.FREE_HOURLY_LIMIT,
    perMinute: GMAIL_LIMITS.FREE_PER_MINUTE_LIMIT
  };
  
  // 檢查每日限制
  if (stats.total + count > limits.daily) {
    return {
      canSend: false,
      reason: `超過每日發送限制（${limits.daily} 封/天）。已發送 ${stats.total} 封，還可發送 ${Math.max(0, limits.daily - stats.total)} 封。`,
      remaining: Math.max(0, limits.daily - stats.total)
    };
  }
  
  // 檢查每小時限制（最近 1 小時）
  const currentHour = Math.floor(now / (60 * 60 * 1000));
  const lastHour = currentHour - 1;
  const hourlyCount = (stats.hourly[currentHour] || 0) + (stats.hourly[lastHour] || 0);
  
  if (hourlyCount + count > limits.hourly) {
    return {
      canSend: false,
      reason: `超過每小時發送限制（${limits.hourly} 封/小時）。最近 1 小時已發送 ${hourlyCount} 封。`,
      remaining: Math.max(0, limits.hourly - hourlyCount)
    };
  }
  
  // 檢查每分鐘限制（最近 1 分鐘）
  const currentMinute = Math.floor(now / (60 * 1000));
  const lastMinute = currentMinute - 1;
  const minuteCount = (stats.minute[currentMinute] || 0) + (stats.minute[lastMinute] || 0);
  
  if (minuteCount + count > limits.perMinute) {
    return {
      canSend: false,
      reason: `超過每分鐘發送限制（${limits.perMinute} 封/分鐘）。最近 1 分鐘已發送 ${minuteCount} 封。`,
      remaining: Math.max(0, limits.perMinute - minuteCount),
      waitTime: 60000 // 需要等待 1 分鐘
    };
  }
  
  return {
    canSend: true,
    remaining: limits.daily - stats.total - count,
    dailyUsed: stats.total,
    dailyLimit: limits.daily
  };
}

// 確保資料目錄存在
async function ensureDataDir() {
  const dataDir = path.join(__dirname, 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// 讀取客戶資料
async function readCustomers() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// 儲存客戶資料
async function saveCustomers(customers) {
  await ensureDataDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(customers, null, 2), 'utf8');
}

// 去重處理（根據 email）
function removeDuplicates(customers) {
  const seen = new Set();
  return customers.filter(customer => {
    if (!customer.email || seen.has(customer.email.toLowerCase())) {
      return false;
    }
    seen.add(customer.email.toLowerCase());
    return true;
  });
}

// ==================== API 路由 ====================

// 獲取所有客戶
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await readCustomers();
    const filter = req.query.filter; // 'all', 'sent', 'unsent'
    const today = new Date().toISOString().split('T')[0];
    
    let filteredCustomers = customers;
    
    if (filter === 'sent') {
      // 只返回今天已發送的客戶
      filteredCustomers = customers.filter(c => c.lastSentDate === today);
    } else if (filter === 'unsent') {
      // 只返回今天未發送的客戶
      filteredCustomers = customers.filter(c => !c.lastSentDate || c.lastSentDate !== today);
    }
    
    // 統計資訊
    const stats = {
      total: customers.length,
      sentToday: customers.filter(c => c.lastSentDate === today).length,
      unsentToday: customers.filter(c => !c.lastSentDate || c.lastSentDate !== today).length
    };
    
    res.json({ 
      success: true, 
      data: filteredCustomers,
      stats: stats
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 獲取發送統計
app.get('/api/send-stats', async (req, res) => {
  try {
    const senderEmail = req.query.email;
    if (!senderEmail) {
      return res.status(400).json({ success: false, error: '請提供發送者 email' });
    }
    
    const stats = getSendStats(senderEmail);
    const check = canSend(senderEmail, 0);
    
    res.json({
      success: true,
      stats: {
        dailyUsed: stats.total,
        dailyLimit: check.dailyLimit || GMAIL_LIMITS.FREE_DAILY_LIMIT,
        remaining: check.remaining || 0,
        canSend: check.canSend
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 新增客戶
app.post('/api/customers', async (req, res) => {
  try {
    const customers = await readCustomers();
    customers.push(req.body);
    const uniqueCustomers = removeDuplicates(customers);
    await saveCustomers(uniqueCustomers);
    res.json({ success: true, data: uniqueCustomers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 批量導入客戶
app.post('/api/customers/import', async (req, res) => {
  try {
    const existingCustomers = await readCustomers();
    const newCustomers = req.body.customers || [];
    
    const merged = [...existingCustomers, ...newCustomers];
    const uniqueCustomers = removeDuplicates(merged);
    
    await saveCustomers(uniqueCustomers);
    res.json({ 
      success: true, 
      data: uniqueCustomers,
      imported: newCustomers.length,
      duplicates: merged.length - uniqueCustomers.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新客戶
app.put('/api/customers/:id', async (req, res) => {
  try {
    const customers = await readCustomers();
    const index = customers.findIndex(c => c.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ success: false, error: '客戶不存在' });
    }
    
    customers[index] = { ...customers[index], ...req.body };
    await saveCustomers(customers);
    res.json({ success: true, data: customers[index] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 刪除客戶
app.delete('/api/customers/:id', async (req, res) => {
  try {
    const customers = await readCustomers();
    const filtered = customers.filter(c => c.id !== req.params.id);
    await saveCustomers(filtered);
    res.json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 去重處理
app.post('/api/customers/deduplicate', async (req, res) => {
  try {
    const customers = await readCustomers();
    const uniqueCustomers = removeDuplicates(customers);
    await saveCustomers(uniqueCustomers);
    res.json({ 
      success: true, 
      data: uniqueCustomers,
      removed: customers.length - uniqueCustomers.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 重置發送記錄（將所有客戶標記為未發送）
app.post('/api/customers/reset-send-history', async (req, res) => {
  try {
    const customers = await readCustomers();
    const resetDate = req.body.date; // 可選：只重置特定日期的記錄
    
    customers.forEach(customer => {
      if (resetDate) {
        // 只重置指定日期的記錄
        if (customer.lastSentDate === resetDate) {
          customer.lastSentDate = null;
          customer.sendHistory = (customer.sendHistory || []).filter(h => h.date !== resetDate);
        }
      } else {
        // 重置所有發送記錄
        customer.lastSentDate = null;
        customer.sendHistory = [];
        customer.sentCount = 0;
      }
    });
    
    await saveCustomers(customers);
    res.json({ 
      success: true, 
      message: resetDate ? `已重置 ${resetDate} 的發送記錄` : '已重置所有發送記錄',
      data: customers
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 獲取發送進度
app.get('/api/send-progress/:taskId', (req, res) => {
  const taskId = req.params.taskId;
  const progress = sendingProgress.get(taskId);
  
  if (!progress) {
    return res.status(404).json({ 
      success: false, 
      error: '找不到發送任務' 
    });
  }
  
  res.json({ 
    success: true, 
    progress: progress 
  });
});

// 發送郵件（批次發送，帶完整限制管理）
app.post('/api/send-email', async (req, res) => {
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // 初始化進度
  sendingProgress.set(taskId, {
    taskId: taskId,
    status: 'starting',
    total: 0,
    sent: 0,
    failed: 0,
    current: 0,
    percentage: 0,
    message: '準備開始發送...',
    results: {
      success: [],
      failed: []
    }
  });
  
  // 立即返回響應
  res.json({ 
    success: true, 
    taskId: taskId,
    message: '發送任務已開始，請查看進度'
  });
  
  // 異步執行發送任務
  (async () => {
    try {
      const { 
        senderEmail, 
        senderPassword, 
        subject, 
        message, 
        customerIds 
      } = req.body;

      if (!senderEmail || !senderPassword || !subject || !message) {
        sendingProgress.set(taskId, {
          ...sendingProgress.get(taskId),
          status: 'failed',
          message: '請填寫所有必填欄位'
        });
        return;
      }

      // 讀取客戶資料
      const allCustomers = await readCustomers();
      
      // 根據篩選條件選擇收件人
      let recipients = customerIds && customerIds.length > 0
        ? allCustomers.filter(c => customerIds.includes(c.id))
        : allCustomers;
      
      // 如果指定只發送未發送的，則過濾
      const sendOnlyUnsent = req.body.sendOnlyUnsent === true;
      if (sendOnlyUnsent) {
        const today = new Date().toISOString().split('T')[0];
        recipients = recipients.filter(c => !c.lastSentDate || c.lastSentDate !== today);
      }

      if (recipients.length === 0) {
        sendingProgress.set(taskId, {
          ...sendingProgress.get(taskId),
          status: 'failed',
          message: '沒有可發送的客戶'
        });
        return;
      }

      // 檢查發送限制（發送前檢查）
      const limitCheck = canSend(senderEmail, recipients.length);
      if (!limitCheck.canSend) {
        sendingProgress.set(taskId, {
          ...sendingProgress.get(taskId),
          status: 'failed',
          message: `無法發送：${limitCheck.reason}`
        });
        return;
      }

      // 如果接近限制，調整批次大小和延遲
      const remaining = limitCheck.remaining;
      if (remaining < 100) {
        BATCH_SIZE = 20;
        BATCH_DELAY = 20000;
        EMAIL_DELAY = 800;
        sendingProgress.set(taskId, {
          ...sendingProgress.get(taskId),
          message: `接近每日限制（剩餘 ${remaining} 封），已調整發送速度以確保安全`
        });
      }

      // 更新進度：開始
      sendingProgress.set(taskId, {
        ...sendingProgress.get(taskId),
        status: 'sending',
        total: recipients.length,
        message: `開始發送，共 ${recipients.length} 個收件人（每日剩餘配額：${remaining} 封）`
      });

      // 清理應用程式密碼
      const cleanPassword = senderPassword.replace(/\s+/g, '');
      
      // 建立郵件傳輸器（優化配置）
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: senderEmail,
          pass: cleanPassword
        },
        pool: true,
        maxConnections: 1,
        maxMessages: 100,
        rateDelta: 60000,  // 1 分鐘窗口
        rateLimit: 10      // 每分鐘最多 10 封（保守值）
      });
      
      console.log('已建立 Gmail 傳輸器，將在發送時進行驗證');

      // 發送結果
      const results = {
        success: [],
        failed: []
      };

      // 批次發送郵件
      const totalRecipients = recipients.length;
      const batches = Math.ceil(totalRecipients / BATCH_SIZE);
      
      console.log(`開始批次發送郵件，共 ${totalRecipients} 個收件人，分 ${batches} 批發送`);
      
      for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
        const batchStart = batchIndex * BATCH_SIZE;
        const batchEnd = Math.min(batchStart + BATCH_SIZE, totalRecipients);
        const batchRecipients = recipients.slice(batchStart, batchEnd);
        
        console.log(`發送第 ${batchIndex + 1}/${batches} 批（${batchStart + 1}-${batchEnd}）`);
        
        // 更新進度：批次開始
        sendingProgress.set(taskId, {
          ...sendingProgress.get(taskId),
          message: `正在發送第 ${batchIndex + 1}/${batches} 批（${batchStart + 1}-${batchEnd}/${totalRecipients}）`
        });
        
        // 發送當前批次
        for (let i = 0; i < batchRecipients.length; i++) {
          const customer = batchRecipients[i];
          const currentIndex = batchStart + i;
          
          // 再次檢查限制（動態檢查）
          const currentCheck = canSend(senderEmail, 1);
          if (!currentCheck.canSend) {
            // 如果需要等待，暫停發送
            if (currentCheck.waitTime) {
              sendingProgress.set(taskId, {
                ...sendingProgress.get(taskId),
                message: `達到速率限制，等待 ${Math.ceil(currentCheck.waitTime / 1000)} 秒後繼續...`
              });
              await new Promise(resolve => setTimeout(resolve, currentCheck.waitTime));
            } else {
              // 超過每日限制，停止發送
              sendingProgress.set(taskId, {
                ...sendingProgress.get(taskId),
                status: 'failed',
                message: `發送已停止：${currentCheck.reason}`
              });
              await saveSendStats();
              return;
            }
          }
          
          if (!customer.email) {
            results.failed.push({
              customer: customer.name || customer.email,
              error: '沒有郵件地址'
            });
            continue;
          }

          // 重試機制（指數退避）
          let retryCount = 0;
          let sent = false;
          
          while (retryCount <= GMAIL_LIMITS.MAX_RETRIES && !sent) {
            try {
              // 清理 email
              const cleanEmail = customer.email.replace(/\s+/g, '').trim();
              
              if (!cleanEmail || !cleanEmail.includes('@')) {
                results.failed.push({
                  customer: customer.email,
                  error: 'Email 格式錯誤'
                });
                break;
              }
              
              const mailOptions = {
                from: senderEmail,
                to: cleanEmail,
                subject: subject,
                html: message.replace(/\{name\}/g, customer.name || '客戶')
              };

              await transporter.sendMail(mailOptions);
              
              // 記錄發送成功
              await recordSend(senderEmail);
              
              // 更新客戶的發送記錄
              const customerIndex = allCustomers.findIndex(c => c.id === customer.id);
              if (customerIndex !== -1) {
                const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                if (!allCustomers[customerIndex].sendHistory) {
                  allCustomers[customerIndex].sendHistory = [];
                }
                // 記錄發送歷史
                allCustomers[customerIndex].sendHistory.push({
                  date: today,
                  timestamp: Date.now(),
                  subject: subject
                });
                // 更新最後發送日期
                allCustomers[customerIndex].lastSentDate = today;
                // 更新發送次數
                allCustomers[customerIndex].sentCount = (allCustomers[customerIndex].sentCount || 0) + 1;
                // 保存客戶資料（每 10 個客戶保存一次，避免頻繁寫入）
                if (results.success.length % 10 === 0) {
                  await saveCustomers(allCustomers);
                }
              }
              
              results.success.push({
                email: cleanEmail,
                customerId: customer.id,
                customerName: customer.name
              });
              sent = true;
              
              // 更新進度
              const progress = sendingProgress.get(taskId);
              const sentCount = results.success.length;
              const failedCount = results.failed.length;
              const current = currentIndex + 1;
              const percentage = Math.round((current / totalRecipients) * 100);
              
              // 獲取當前統計
              const currentStats = getSendStats(senderEmail);
              const remainingToday = GMAIL_LIMITS.FREE_DAILY_LIMIT - currentStats.total;
              
              sendingProgress.set(taskId, {
                ...progress,
                sent: sentCount,
                failed: failedCount,
                current: current,
                percentage: percentage,
                message: `已發送 ${current}/${totalRecipients} (${percentage}%) - 成功: ${sentCount}, 失敗: ${failedCount} | 今日剩餘: ${remainingToday} 封`,
                results: results
              });
              
            } catch (error) {
              console.error(`發送失敗 (${customer.email}, 重試 ${retryCount}/${GMAIL_LIMITS.MAX_RETRIES}):`, error.message);
              
              // 判斷錯誤類型
              const isAuthError = error.message.includes('Invalid login') || 
                                  error.message.includes('EAUTH') || 
                                  error.message.includes('authentication') ||
                                  error.message.includes('Too many login attempts') ||
                                  error.code === 'EAUTH';
              
              const isRateLimit = error.message.includes('rate limit') || 
                                 error.message.includes('quota') ||
                                 error.message.includes('Too many') ||
                                 error.code === 'ETIMEDOUT';
              
              const isTemporary = error.code === 'ECONNRESET' || 
                                  error.code === 'ETIMEDOUT' ||
                                  error.message.includes('timeout');
              
              // 認證錯誤：立即停止
              if (isAuthError) {
                let errorMessage = `Gmail 認證失敗：${error.message}`;
                if (error.message.includes('Too many login attempts')) {
                  errorMessage = `Gmail 暫時封鎖：登入嘗試過多。請等待 30-60 分鐘後再試。`;
                }
                
                sendingProgress.set(taskId, {
                  ...sendingProgress.get(taskId),
                  status: 'failed',
                  message: errorMessage
                });
                await saveSendStats();
                return;
              }
              
              // 速率限制：延遲後重試
              if (isRateLimit) {
                const delay = Math.min(
                  GMAIL_LIMITS.MIN_RETRY_DELAY * Math.pow(2, retryCount),
                  GMAIL_LIMITS.MAX_RETRY_DELAY
                );
                
                sendingProgress.set(taskId, {
                  ...sendingProgress.get(taskId),
                  message: `遇到速率限制，等待 ${Math.ceil(delay / 1000)} 秒後重試...`
                });
                
                await new Promise(resolve => setTimeout(resolve, delay));
                retryCount++;
                continue;
              }
              
              // 臨時錯誤：重試
              if (isTemporary && retryCount < GMAIL_LIMITS.MAX_RETRIES) {
                const delay = Math.min(
                  GMAIL_LIMITS.MIN_RETRY_DELAY * Math.pow(2, retryCount),
                  GMAIL_LIMITS.MAX_RETRY_DELAY
                );
                
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
              }
              
              // 其他錯誤：記錄失敗
              results.failed.push({
                customer: customer.email,
                error: error.message
              });
              break;
            }
          }
          
          // 如果重試後仍失敗，記錄
          if (!sent && retryCount > GMAIL_LIMITS.MAX_RETRIES) {
            results.failed.push({
              customer: customer.email,
              error: '發送失敗（已重試多次）'
            });
          }
          
          // 更新失敗進度
          if (!sent) {
            const progress = sendingProgress.get(taskId);
            const sentCount = results.success.length;
            const failedCount = results.failed.length;
            const current = currentIndex + 1;
            const percentage = Math.round((current / totalRecipients) * 100);
            
            sendingProgress.set(taskId, {
              ...progress,
              sent: sentCount,
              failed: failedCount,
              current: current,
              percentage: percentage,
              message: `已發送 ${current}/${totalRecipients} (${percentage}%) - 成功: ${sentCount}, 失敗: ${failedCount}`,
              results: results
            });
          }
          
          // 每封郵件之間延遲
          if (i < batchRecipients.length - 1) {
            await new Promise(resolve => setTimeout(resolve, EMAIL_DELAY));
          }
        }
        
        // 批次之間延遲（最後一批不需要延遲）
        if (batchIndex < batches - 1) {
          const delaySeconds = BATCH_DELAY / 1000;
          console.log(`第 ${batchIndex + 1} 批完成（成功: ${results.success.length}, 失敗: ${results.failed.length}），等待 ${delaySeconds} 秒後繼續下一批...`);
          
          // 顯示倒數計時
          for (let sec = delaySeconds; sec > 0; sec--) {
            sendingProgress.set(taskId, {
              ...sendingProgress.get(taskId),
              message: `第 ${batchIndex + 1} 批完成，等待 ${sec} 秒後繼續下一批...`
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      // 儲存最終統計和客戶資料
      await saveSendStats();
      await saveCustomers(allCustomers); // 確保所有發送記錄都已保存
      
      console.log(`發送完成：成功 ${results.success.length} 封，失敗 ${results.failed.length} 封`);

      // 更新進度：完成
      sendingProgress.set(taskId, {
        ...sendingProgress.get(taskId),
        status: 'completed',
        message: `發送完成！成功 ${results.success.length} 封，失敗 ${results.failed.length} 封`,
        percentage: 100
      });
      
      // 30 分鐘後清除進度記錄
      setTimeout(() => {
        sendingProgress.delete(taskId);
      }, 30 * 60 * 1000);

    } catch (error) {
      console.error('發送任務錯誤：', error);
      sendingProgress.set(taskId, {
        ...sendingProgress.get(taskId),
        status: 'failed',
        message: `發送失敗：${error.message}`
      });
      await saveSendStats();
    }
  })();
});

// 根路徑返回首頁
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 處理 favicon 請求
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`伺服器運行在 http://localhost:${PORT}`);
  console.log(`請在瀏覽器中訪問：http://localhost:${PORT}`);
  console.log(`\n📊 Gmail 發送限制配置：`);
  console.log(`   每日限制：${GMAIL_LIMITS.FREE_DAILY_LIMIT} 封（免費帳號）`);
  console.log(`   每小時限制：${GMAIL_LIMITS.FREE_HOURLY_LIMIT} 封`);
  console.log(`   每分鐘限制：${GMAIL_LIMITS.FREE_PER_MINUTE_LIMIT} 封`);
  console.log(`   批次大小：${BATCH_SIZE} 封/批`);
  console.log(`   批次延遲：${BATCH_DELAY / 1000} 秒`);
  console.log(`   郵件延遲：${EMAIL_DELAY}ms\n`);
});
