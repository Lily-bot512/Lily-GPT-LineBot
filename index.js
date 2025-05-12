import express from 'express';
import { Client, middleware } from '@line/bot-sdk';
import dotenv from 'dotenv';
import { generatePrompt } from './prompt.js';
import fetch from 'node-fetch';

dotenv.config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const openai_api_key = process.env.OPENAI_API_KEY;
const model = process.env.GPT_MODEL || 'gpt-3.5-turbo';

const app = express();
const client = new Client(config);
app.use(middleware(config));
app.use(express.json());

app.post('/webhook', async (req, res) => {
  const events = req.body.events;
  const results = await Promise.all(
    events.map(async (event) => {
      if (event.type === 'message' && event.message.type === 'text') {
        const userMessage = event.message.text;
        const reply = await generateReply(userMessage);
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: reply,
        });
      } else {
        return Promise.resolve(null);
      }
    })
  );
  res.json(results);
});

async function generateReply(userInput) {
  const prompt = generatePrompt(userInput);
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openai_api_key}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '無法取得回應';
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Lily is running on port ${PORT}`);
});
