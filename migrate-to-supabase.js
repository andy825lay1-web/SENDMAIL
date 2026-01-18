/**
 * 將客戶資料從本地 JSON 遷移到 Supabase
 * 使用方法：node migrate-to-supabase.js
 */

const fs = require('fs').promises;
const path = require('path');

// 讀取 Supabase 配置（如果存在）
let supabaseUrl = process.env.SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_ANON_KEY;

// 如果沒有環境變數，提示用戶
if (!supabaseUrl || !supabaseKey) {
  console.log('⚠️  需要 Supabase 配置');
  console.log('請設置環境變數：');
  console.log('  export SUPABASE_URL="https://your-project.supabase.co"');
  console.log('  export SUPABASE_ANON_KEY="your-anon-key"');
  console.log('');
  console.log('或創建 .env 文件：');
  console.log('  SUPABASE_URL=https://your-project.supabase.co');
  console.log('  SUPABASE_ANON_KEY=your-anon-key');
  process.exit(1);
}

// 動態導入 Supabase 客戶端（如果已安裝）
async function migrateToSupabase() {
  try {
    // 嘗試載入 @supabase/supabase-js
    const { createClient } = require('@supabase/supabase-js');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 讀取本地客戶資料
    const dataFile = path.join(__dirname, 'data', 'customers.json');
    const fileContent = await fs.readFile(dataFile, 'utf8');
    const customers = JSON.parse(fileContent);
    
    console.log(`📊 準備遷移 ${customers.length} 位客戶...`);
    
    // 轉換資料格式
    const supabaseCustomers = customers.map(customer => ({
      customer_id: customer.id || String(Date.now() + Math.random()),
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || null,
      last_sent_date: customer.lastSentDate || null,
      sent_count: customer.sentCount || 0,
      send_history: customer.sendHistory || []
    }));
    
    // 批次插入（每批 100 筆）
    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < supabaseCustomers.length; i += batchSize) {
      const batch = supabaseCustomers.slice(i, i + batchSize);
      
      console.log(`\n📦 正在插入第 ${Math.floor(i / batchSize) + 1} 批（${batch.length} 筆）...`);
      
      const { data, error } = await supabase
        .from('sendmail_customers')
        .upsert(batch, { 
          onConflict: 'customer_id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error(`❌ 批次插入失敗:`, error.message);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        console.log(`✅ 成功插入 ${batch.length} 筆`);
      }
      
      // 避免速率限制，稍作延遲
      if (i + batchSize < supabaseCustomers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n==========================================');
    console.log('✅ 遷移完成！');
    console.log(`   成功：${successCount} 筆`);
    console.log(`   失敗：${errorCount} 筆`);
    console.log(`   總數：${supabaseCustomers.length} 筆`);
    console.log('==========================================');
    
    // 驗證數據
    const { count } = await supabase
      .from('sendmail_customers')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n📊 Supabase 中的客戶總數：${count}`);
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('❌ 錯誤：未安裝 @supabase/supabase-js');
      console.log('請先執行：npm install @supabase/supabase-js');
    } else {
      console.error('❌ 遷移失敗：', error.message);
      console.error(error);
    }
    process.exit(1);
  }
}

// 執行遷移
migrateToSupabase();
