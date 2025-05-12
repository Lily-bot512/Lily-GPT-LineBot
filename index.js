const express = require('express');
const line = require('@line/bot-sdk');
const dotenv = require('dotenv');
const generatePrompt = require('./prompt');

dotenv.config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const app = express();
const client = new line.Client(config);

app.use(express.json()); // 必須啟用 JSON 解析
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events;

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userMessage = event.message.text;
        const replyMessage = await generatePrompt(userMessage); // 從 prompt.js 取得回答

        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: replyMessage,
        });
      }
    }

    res.status(200).end(); // 告訴 LINE：Webhook 收到成功
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).end();
  }
});

// 健康檢查
app.get('/', (req, res) => {
  res.send('Lily GPT LineBot is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Lily GPT LineBot is listening on port ${PORT}`);
});
