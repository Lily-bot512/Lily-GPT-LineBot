import express from 'express';
import { middleware, Client } from '@line/bot-sdk';
import dotenv from 'dotenv';
import { generatePrompt } from './prompt.js';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new Client(config);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post('/webhook', middleware(config), async (req, res) => {
  const events = req.body.events;
  const results = await Promise.all(events.map(handleEvent));
  res.json(results);
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const userInput = event.message.text;

  try {
    const messages = generatePrompt(userInput);

    const chatCompletion = await openai.chat.completions.create({
      model: process.env.GPT_MODEL || 'gpt-4',
      messages
    });

    const replyText = chatCompletion.choices[0].message.content;

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: replyText
    });

  } catch (error) {
    console.error('Error processing message:', error);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '對不起，我遇到了一些問題，請稍後再試一次。'
    });
  }
}

app.listen(port, () => {
  console.log(`Lily GPT-LineBot is listening on port ${port}`);
});
