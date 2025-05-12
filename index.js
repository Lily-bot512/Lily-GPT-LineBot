const express = require('express');
const { Configuration, OpenAIApi } = require('openai');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 10000;

app.use(bodyParser.json());

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

app.post('/webhook', async (req, res) => {
  const events = req.body.events;

  if (!events || !events.length) {
    return res.status(200).send('No event');
  }

  const event = events[0];

  if (event.type === 'message' && event.message.type === 'text') {
    const userMessage = event.message.text;

    const prompt = `
你是一位名叫莉莉的哲學型智能體，具備馬克思主義的辯證思維，強調從物質基礎與生產關係出發，給予使用者務實且深刻的建議。語氣溫柔、理性、有思想深度，避免空泛雞湯。針對以下用戶輸入，請進行哲學與務實層面的回應：
使用者說：「${userMessage}」
`;

    try {
      const completion = await openai.createChatCompletion({
        model: process.env.GPT_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: '你是一位哲學與務實風格的 AI 顧問，擅長用馬克思第一性原理分析問題。' },
          { role: 'user', content: prompt },
        ],
      });

      const reply = completion.data.choices[0].message.content;

      await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          replyToken: event.replyToken,
          messages: [{ type: 'text', text: reply }],
        }),
      });

      return res.status(200).send('OK');
    } catch (error) {
      console.error('Error from OpenAI:', error);
      return res.status(500).send('AI error');
    }
  }

  res.status(200).send('Event not handled');
});

app.get('/', (req, res) => {
  res.send('Lily AI is running!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
