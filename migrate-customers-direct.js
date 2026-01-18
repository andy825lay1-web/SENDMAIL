/**
 * 直接使用 Supabase MCP 遷移客戶資料
 * 這個腳本會讀取本地 JSON 並使用 Supabase API 插入數據
 */

const fs = require('fs').promises;
const path = require('path');

// Supabase 配置（從 MCP 工具獲取）
const SUPABASE_URL = 'https://sqgrnowrcvspxhuudrqc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw';

async function migrateCustomers() {
  try {
    // 嘗試載入 @supabase/supabase-js
    const { createClient } = require('@supabase/supabase-js');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // 讀取本地客戶資料
    const dataFile = path.join(__dirname, 'data', 'customers.json');
    const fileContent = await fs.readFile(dataFile, 'utf8');
    const customers = JSON.parse(fileContent);
    
    console.log('==========================================');
    console.log('🚀 開始遷移客戶資料到 Supabase');
    console.log('==========================================');
    console.log(`📊 總客戶數：${customers.length} 位`);
    console.log(`📡 Supabase URL：${SUPABASE_URL}`);
    console.log('');
    
    // 轉換資料格式（JSON → Supabase）
    const supabaseCustomers = customers.map((customer, index) => {
      // 確保 customer_id 唯一
      const customerId = customer.id || `customer_${Date.now()}_${index}`;
      
      return {
        customer_id: customerId,
        name: customer.name || '',
        email: (customer.email || '').trim(),
        phone: customer.phone || null,
        last_sent_date: customer.lastSentDate || null,
        sent_count: customer.sentCount || 0,
        send_history: customer.sendHistory || []
      };
    }).filter(c => c.email); // 過濾掉沒有 email 的客戶
    
    console.log(`✅ 有效客戶數：${supabaseCustomers.length} 位（已過濾無 email）`);
    console.log('');
    
    // 批次插入（每批 100 筆）
    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    const totalBatches = Math.ceil(supabaseCustomers.length / batchSize);
    console.log(`📦 將分為 ${totalBatches} 批插入（每批 ${batchSize} 筆）`);
    console.log('');
    
    for (let i = 0; i < supabaseCustomers.length; i += batchSize) {
      const batch = supabaseCustomers.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      
      console.log(`📦 [${batchNum}/${totalBatches}] 正在插入第 ${i + 1}-${Math.min(i + batchSize, supabaseCustomers.length)} 筆...`);
      
      try {
        const { data, error } = await supabase
          .from('sendmail_customers')
          .upsert(batch, { 
            onConflict: 'customer_id',
            ignoreDuplicates: false 
          });
        
        if (error) {
          console.error(`❌ 批次 ${batchNum} 插入失敗:`, error.message);
          errorCount += batch.length;
          errors.push({ batch: batchNum, error: error.message });
        } else {
          successCount += batch.length;
          console.log(`✅ 批次 ${batchNum} 成功插入 ${batch.length} 筆`);
        }
      } catch (err) {
        console.error(`❌ 批次 ${batchNum} 發生錯誤:`, err.message);
        errorCount += batch.length;
        errors.push({ batch: batchNum, error: err.message });
      }
      
      // 避免速率限制，稍作延遲（最後一批不需要延遲）
      if (i + batchSize < supabaseCustomers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('');
    console.log('==========================================');
    console.log('✅ 遷移完成！');
    console.log('==========================================');
    console.log(`✅ 成功：${successCount} 筆`);
    console.log(`❌ 失敗：${errorCount} 筆`);
    console.log(`📊 總數：${supabaseCustomers.length} 筆`);
    console.log('');
    
    // 驗證數據
    console.log('🔍 驗證數據...');
    const { count, error: countError } = await supabase
      .from('sendmail_customers')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ 驗證失敗:', countError.message);
    } else {
      console.log(`📊 Supabase 中的客戶總數：${count} 筆`);
      
      if (count === supabaseCustomers.length) {
        console.log('✅ 數據完整性驗證通過！');
      } else {
        console.log(`⚠️  數據數量不一致（預期：${supabaseCustomers.length}，實際：${count}）`);
      }
    }
    
    // 顯示前 5 筆資料作為驗證
    const { data: sampleData } = await supabase
      .from('sendmail_customers')
      .select('customer_id, name, email')
      .limit(5);
    
    if (sampleData && sampleData.length > 0) {
      console.log('');
      console.log('📋 前 5 筆資料範例：');
      sampleData.forEach((customer, index) => {
        console.log(`  ${index + 1}. ${customer.name} (${customer.email})`);
      });
    }
    
    // 如果有錯誤，顯示錯誤詳情
    if (errors.length > 0) {
      console.log('');
      console.log('⚠️  錯誤詳情：');
      errors.forEach(err => {
        console.log(`  批次 ${err.batch}: ${err.error}`);
      });
    }
    
    console.log('');
    console.log('==========================================');
    console.log('🎉 遷移流程完成！');
    console.log('==========================================');
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('❌ 錯誤：未安裝 @supabase/supabase-js');
      console.error('請先執行：npm install @supabase/supabase-js');
    } else {
      console.error('❌ 遷移失敗：', error.message);
      console.error(error);
    }
    process.exit(1);
  }
}

// 執行遷移
migrateCustomers();
