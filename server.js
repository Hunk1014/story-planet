import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("."));

const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
console.log('載入的金鑰前綴:', apiKey ? apiKey.substring(0, 10) + '...' : '未讀取到金鑰！');

const ai = new GoogleGenAI({ apiKey: apiKey });

// 故事生成端點
app.post('/api/generate-story', async (req, res) => {
  try {
    const { age, mainCharacter, companion, location, theme, moral } = req.body;
    const targetAge = parseInt(age, 10) || 6;
    const isInteractive = targetAge >= 9;

    console.log(`收到生成請求 -> 年齡: ${targetAge}, 主角: ${mainCharacter}, 夥伴: ${companion}`);

    let prompt = '';
    if (isInteractive) {
      prompt = `你是一位專業兒童冒險小說作家。請為 ${targetAge} 歲學童創作一則情節緊湊、懸疑豐富的互動分支小說。
主角：${mainCharacter}、夥伴：${companion}、場景：${location}、任務：${theme}、教育核心：${moral}。

【寫作與字數要求】：
1. 每個章節正文（content）字數嚴格要求在 200 ~ 300 字左右（詳細描繪環境細節、角色心理、對話與現場線索，切勿簡短帶過）。
2. 設計結構完整的分支路線，每個非終點章節提供 2 個具備思維深度的決策選項。

請務必嚴格輸出合法的 JSON，不得包含 Markdown 標籤，格式如下：
{
  "mode": "interactive",
  "title": "故事標題",
  "chapters": [
    {
      "id": "ch1",
      "title": "第 1 章：謎團開端",
      "content": "詳細敘述冒險背景、主角與夥伴的行動、遇到的神祕異象或重大謎團（200-300字）。",
      "choices": [
        { "text": "冷靜觀察尋找破綻", "targetId": "ch2_a" },
        { "text": "勇往直前展開探索", "targetId": "ch2_b" }
      ]
    },
    {
      "id": "ch2_a",
      "title": "第 2 章：冷靜觀察",
      "content": "承接選項 A，詳細描述深入推論、夥伴彼此討論與危機化解的精采歷程（200-300字）。",
      "choices": []
    },
    {
      "id": "ch2_b",
      "title": "第 2 章：勇往直前",
      "content": "承接選項 B，描寫積極行動遭遇的突發考驗、體現教育核心超能力並成功化解危機（200-300字）。",
      "choices": []
    }
  ],
  "moralSummary": "教育核心省思小語（約 50-80 字）"
}`;
    } else {
      prompt = `你是一位專業兒童繪本作家。請為 ${targetAge} 歲幼兒創作一則情節豐富、生動溫馨的兒童繪本。
主角：${mainCharacter}、夥伴：${companion}、場景：${location}、冒險：${theme}、核心：${moral}。

【寫作與字數要求】：
1. 故事分為 5 個完整頁面。
2. 每一頁的 "text" 正文字數嚴格要求在 120 ~ 180 字之間（相較一般繪本增加 0.5 至 1 倍長度，豐富描寫角色對白、表情反應與奇幻環境細節，情節豐富飽滿，不可寥寥數語帶過）。

請務必嚴格輸出合法的 JSON，不得包含 Markdown 標籤，格式如下：
{
  "mode": "picture_book",
  "title": "繪本標題",
  "pages": [
    { "pageNumber": 1, "text": "第 1 頁正文（120-180字：深入介紹主角性格、生活趣事與冒險奇幻起因）", "imagePrompt": "畫面視覺描述" },
    { "pageNumber": 2, "text": "第 2 頁正文（120-180字：夥伴登場的趣味互動，以及兩人在神秘場景中的奇妙見聞）", "imagePrompt": "畫面視覺描述" },
    { "pageNumber": 3, "text": "第 3 頁正文（120-180字：遭遇突如其來的難題考驗，雙方討論對策與生動神態）", "imagePrompt": "畫面視覺描述" },
    { "pageNumber": 4, "text": "第 4 頁正文（120-180字：展現核心能力，同心協力突破難關的高潮情節）", "imagePrompt": "畫面視覺描述" },
    { "pageNumber": 5, "text": "第 5 頁正文（120-180字：歡樂的成果慶祝、獲得珍貴啟發與溫馨的歸途）", "imagePrompt": "畫面視覺描述" }
  ],
  "moralSummary": "親子互動啟發叮嚀（約 50 字）"
}`;
    }

    // 使用正式支援的模型 gemini-3.6-flash
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    let rawText = response.text.trim();
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const storyData = JSON.parse(rawText);
    console.log('✅ 故事生成成功：', storyData.title);
    res.json({ success: true, story: storyData });

  } catch (error) {
    console.error('❌ 後端發生詳細錯誤：', error);
    res.status(500).json({ success: false, message: error.message || '故事生成失敗' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`兒童故事星球伺服器已啟動：http://localhost:${PORT}`);
});
