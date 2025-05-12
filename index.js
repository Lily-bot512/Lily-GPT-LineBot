import express from 'express';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import { middleware, Client } from '@line/bot-sdk';
import { generatePrompt } from './prompt.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// LINE 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new Client(config);

import bodyParser from 'body-parser';

app.post('/webhook', bodyParser.raw({ type: '*/*' }), middleware(config), async (req, res) => {
  // 處理 webhook 的邏輯
});

// Webhook 路由
app.post('/webhook', async (req, res) => {
  try {
    const events = req.body.events;
    const results = await Promise.all(events.map(handleEvent));
    res.status(200).json(results);
  } catch (err) {
    console.error('Webhook Error:', err);
    res.status(500).end();
  }
});

// 處理事件
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userInput = event.message.text;
  const prompt = generatePrompt(userInput);

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: process.env.GPT_MODEL || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    });

    const reply = completion.choices[0].message.content;

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: reply,
    });
  } catch (error) {
    console.error('OpenAI Error:', error);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '抱歉，我現在沒辦法回應，請稍後再試。',
    });
  }
}

app.listen(port, () => {
  console.log(`Lily GPT-LineBot 正在監聽埠口 ${port}`);
});
