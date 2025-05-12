import express from 'express';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import { middleware, Client, validateSignature } from '@line/bot-sdk';
import { generatePrompt } from './prompt.js';
import bodyParser from 'body-parser';
import crypto from 'crypto';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// LINE 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new Client(config);

// 先處理 raw body，供簽名驗證使用
app.use('/webhook', bodyParser.raw({ type: '*/*' }));

// Webhook 路由
app.post('/webhook', (req, res, next) => {
  // 驗證簽名
  const signature = req.headers['x-line-signature'];
  const isValid = validateSignature(req.body, config.channelSecret, signature);
  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }

  // 把 raw body 轉為 JSON，供 middleware 使用
  req.body = JSON.parse(req.body.toString('utf-8'));
  middleware(config)(req, res, next);
}, async (req, res) => {
  try {
    const events = req.body.events;
    const results = await Promise.all(events.map(handleEvent));
    res.status(200).json(results);
  } catch (err) {
    console.error('Webhook Error:', err);
    res.status(500).end();
  }
});

// 處理 LINE 訊息
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userInput = event.message.text;
  const prompt = generatePrompt(userInput);

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
