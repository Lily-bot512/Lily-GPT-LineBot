const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const generatePrompt = require('./prompt.js');

const app = express();
const port = process.env.PORT || 10000;

app.use(bodyParser.json());

// LINE Webhook 路由
app.post('/webhook', async (req, res) => {
  try {
    const events = req.body.events;

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userMessage = event.message.text;

        const reply = await generatePrompt(userMessage);

        await axios.post(
          'https://api.line.me/v2/bot/message/reply',
          {
            replyToken: event.replyToken,
            messages: [
              {
                type: 'text',
                text: reply,
              },
            ],
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
            },
          }
        );
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Render 健康檢查用
app.get('/', (req, res) => {
  res.send('Lily GPT-LineBot is live.');
});

app.listen(port, () => {
  console.log(`Lily GPT-LineBot is listening on port ${port}`);
});
