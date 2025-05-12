import express from 'express';
import dotenv from 'dotenv';
import { Configuration, OpenAIApi } from 'openai';
import { middleware, Client } from '@line/bot-sdk';
import { generatePrompt } from './prompt.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// LINE 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new Client(config);
app.use(middleware(config));
app.use(express.json());

// LINE Webhook 接收端點
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

// 處理單一事件
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userInput = event.message.text;
  const prompt = generatePrompt(userInput, 'zh-TW');

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
      text: '莉莉目前無法回覆你，但我會一直在，請稍後再試。'
    });
  }
}

app.listen(port, () => {
  console.log(`Lily GPT-LineBot is listening on port ${port}`);
});
