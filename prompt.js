import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { middleware, Client } from '@line/bot-sdk';
import { generatePrompt } from './prompt.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// LINE Bot 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// 建立 LINE client 和中介層
const client = new Client(config);
app.use(middleware(config));
app.use(express.json());

// webhook endpoint
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

// OpenAI 初始化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 處理 LINE 文字訊息
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userInput = event.message.text;
  const prompt = generatePrompt(userInput);

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.GPT_MODEL || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    });

    const reply = completion.choices[0]?.message?.content?.trim() || '很抱歉，我暫時無法回覆你。';

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: reply,
    });
  } catch (error) {
    console.error('OpenAI Error:', error?.response?.data || error.message);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '目前系統忙碌中，請稍後再試，謝謝你願意等我。',
    });
  }
}

app.listen(port, () => {
  console.log(`Lily GPT-LineBot is listening on port ${port}`);
});
