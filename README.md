# 線上簽到系統重新部署版 v2

## 本版滿足
1. 管理者登入驗證
2. 查看簽到名單不用驗證
3. 簽到者 QR Code 有 30 秒期限
4. 簽到者 GPS 依場次半徑嚴格驗證
5. 名單頁支援即時刷新與 Excel 匯出
6. 手機端簽到頁不再內嵌相機預覽，避免黑屏

## 手機使用方式
- 用手機內建相機掃管理頁 QR Code
- 會直接開啟 `checkin.html?token=...`
- 輸入姓名後按「送出簽到」
- 這版不會在簽到頁再啟動相機，所以不會黑屏

## 部署
1. 到 Supabase SQL Editor 執行 `supabase/schema.sql`
2. `npm install`
3. `npm run hash -- admin1234`
4. 把產生的 hash 寫入 users 表
5. GitHub + Netlify 重新部署
6. 設定環境變數：
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - APP_SECRET
   - QR_SECRET
