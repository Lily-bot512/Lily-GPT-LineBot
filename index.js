import express from 'express';
import dotenv from 'dotenv';
import { Configuration, OpenAIApi } from 'openai';
import { middleware, Client } from '@line/bot-sdk';
import { generatePrompt } from './prompt.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// LINE Bot 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

// 建立 LINE client 和中介層
const client = new Client(config);
app.use(middleware(config));
app.use(express.json());

// Webhook 路由（LINE 驗證與訊息處理）
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

// 處理 LINE 訊息事件
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userInput = event.message.text;
  const prompt = generatePrompt(userInput);

  try {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY
    });

    const openai = new OpenAIApi(configuration);
    const completion = await openai.createChatCompletion({
      model: process.env.GPT_MODEL || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }]
    });

    const reply = completion.data.choices[0].message.content;
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: reply
    });
  } catch (error) {
    console.error('OpenAI Error:', error.response?.data || error.message);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '抱歉，我目前無法回應，請稍後再試。'
    });
  }
}

app.listen(port, () => {
  console.log(`Lily GPT-LineBot is listening on port ${port}`);
});
