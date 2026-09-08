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
      prompt = `你是一位少年冒險小說家。請為 ${targetAge} 歲學童創作一部互動式解謎故事。
主角：${mainCharacter}、夥伴：${companion}、場景：${location}、任務：${theme}、教育核心：${moral}。

請務必嚴格輸出合法的 JSON，不得包含 Markdown 標籤，格式如下：
{
  "mode": "interactive",
  "title": "故事標題",
  "chapters": [
    {
      "id": "ch1",
      "title": "第 1 章：謎團開端",
      "content": "正文內容（約 200-300 字，描寫情境與遇到的難題）",
      "choices": [
        { "text": "行動選項 A 的描述", "targetId": "ch2_a" },
        { "text": "行動選項 B 的描述", "targetId": "ch2_b" }
      ]
    },
    {
      "id": "ch2_a",
      "title": "第 2 章：冷靜觀察",
      "content": "承接選項 A 的冒險與最終收尾（約 200 字）",
      "choices": []
    },
    {
      "id": "ch2_b",
      "title": "第 2 章：勇往直前",
      "content": "承接選項 B 的冒險與最終收尾（約 200 字）",
      "choices": []
    }
  ],
  "moralSummary": "給少年的思考啟發"
}`;
    } else {
      prompt = `你是一位專業兒童繪本作家。請為 ${targetAge} 歲幼兒創作一則溫馨繪本。
主角：${mainCharacter}、夥伴：${companion}、場景：${location}、冒險：${theme}、核心：${moral}。

請務必嚴格輸出合法的 JSON，不得包含 Markdown 標籤，格式如下：
{
  "mode": "picture_book",
  "title": "繪本標題",
  "pages": [
    { "pageNumber": 1, "text": "第 1 頁正文（引入角色與情境）", "imagePrompt": "畫面視覺描述" },
    { "pageNumber": 2, "text": "第 2 頁正文（遇到小挑戰）", "imagePrompt": "畫面視覺描述" },
    { "pageNumber": 3, "text": "第 3 頁正文（互相合作解決）", "imagePrompt": "畫面視覺描述" },
    { "pageNumber": 4, "text": "第 4 頁正文（快樂收尾與成長收穫）", "imagePrompt": "畫面視覺描述" }
  ],
  "moralSummary": "親子互動小叮嚀"
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
