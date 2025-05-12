import express from 'express';
import { middleware, Client } from '@line/bot-sdk';
import { generatePrompt } from './prompt.js';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const app = express();
const client = new Client(config);

app.post('/webhook', middleware(config), async (req, res) => {
  try {
    const events = req.body.events;

    await Promise.all(events.map(async (event) => {
      if (event.type === 'message' && event.message.type === 'text') {
        const reply = await generatePrompt(event.message.text);
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: reply,
        });
      }
    }));

    res.status(200).end(); // 告訴 LINE 伺服器「我處理好了」
  } catch (error) {
    console.error('[Webhook Error]', error);
    res.status(500).end();
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Lily GPT-LineBot is running on port ${PORT}`);
});
