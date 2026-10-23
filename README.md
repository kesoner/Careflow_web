# CareFlow｜照護財務管家

[開啟網站](https://kesoner.github.io/Careflow_web/)

CareFlow 個人端概念產品：從照護事件出發，理解保單、照護費用與信託收支，支援動態安養信託規劃。包含可操作的照護方式、費用調整、給付狀態、情境比較、示範授權與送請確認流程。

網站以原創向量圖、真實攝影與程式重建 Crosswalk 啟發的版型及動態：22 分件首頁組裝、捲動文字遮罩、照片條狀轉場、橫向故事與側滑抽屜。主標採粗體，副標加底線；支援手機、鍵盤與減少動態效果偏好。

## 範圍

所有資料均為合成示範。互動以 240 萬元、固定每月收支計算，未計入利息、通膨、投資波動與相關費用；並非完整動態信託模型。未確認給付不計入收入。AI 整理、事件推播與跨機構交換屬提案規劃。本頁不連接真實銀行／保險資料、不送出正式申請、不執行給付或契約變更。

操作狀態僅保留於當次頁面，重新整理即重設。生活照片採 Pexels 真實攝影，來源與授權見 [ASSET_CREDITS.md](ASSET_CREDITS.md)；向量圖為原創素材。Lenis 授權見 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 影片與提案

首頁、導覽列、生活照片段落及頁尾提供 45 秒介紹影片入口，使用原始 MP4 與原片擷取封面。點擊後才載入並播放，關閉立即暫停；支援原生播放控制與手機內嵌播放。影片案例為概念模擬，與互動試算採不同輸入。

頁面移除重複功能預覽，直接進入五步互動產品。FAQ 聚焦競賽提案：照護痛點、銀行價值、AI 與人工分工、六個月／160 萬元試辦、驗收及後續推進。

## 本機啟動

需要 Node.js 18.17 以上，不需安裝套件或建置。

```sh
node server.mjs --port 4190
```

開啟 http://127.0.0.1:4190/。Windows 可使用 `start.cmd`；伺服器只提供 `dist/`。

## GitHub Pages

`.github/workflows/deploy-pages.yml` 會在 `main` 的 `dist/` 或部署工作流程更新時，自動將 `dist/` 發布到 GitHub Pages，也可由 Actions 手動執行。

部署採官方 GitHub Actions，以固定 commit SHA 鎖定版本。Pages 使用 GitHub Actions 模式，發布內容只有靜態網站 `dist/`。

## 檔案

- `dist/index.html`：網頁內容與結構。
- `dist/styles.css`、`layout.css`：版型、粗體標題與副標底線。
- `dist/motion.js`、`motion.css`：分件動畫、遮罩、旋轉及橫向故事。
- `dist/demo.js`、`demo.css`：合成資料試算及五步介面。
- `dist/app.js`、`interactions.css`：抽屜、授權、選單及操作連結。
- `dist/film.js`、`film.css`：按需載入的影片播放器。
- `dist/editorial.css`：精簡版版型與真實攝影配置。
- `dist/assets/`、`dist/vendor/`：本機素材及開源依賴。

執行 `npm run check` 可檢查程式語法。網站以相對資源路徑運作，適用 `/Careflow_web/` 子路徑。
