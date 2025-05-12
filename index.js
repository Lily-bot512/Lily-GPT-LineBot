import express from 'express'
import axios from 'axios'
import bodyParser from 'body-parser'
import { config } from 'dotenv'
import { generatePrompt } from './prompt.js'

config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(bodyParser.json())

app.get('/', (req, res) => {
  res.send('Lily GPT LineBot is running.')
})

app.post('/webhook', async (req, res) => {
  const events = req.body.events
  if (!events || events.length === 0) {
    return res.status(200).send('No events')
  }

  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userMessage = event.message.text
      const prompt = generatePrompt(userMessage)

      const replyToken = event.replyToken
      const replyMessage = await sendToOpenAI(prompt)

      await replyToLine(replyToken, replyMessage)
    }
  }

  res.status(200).send('OK')
})

async function sendToOpenAI(prompt) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: process.env.GPT_MODEL || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )
    return response.data.choices[0].message.content.trim()
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message)
    return '抱歉，我暫時無法回答你的問題。'
  }
}

async function replyToLine(replyToken, message) {
  try {
    await axios.post(
      'https://api.line.me/v2/bot/message/reply',
      {
        replyToken,
        messages: [{ type: 'text', text: message }]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    console.error('LINE API error:', error.response?.data || error.message)
  }
}

app.listen(PORT, () => {
  console.log(`Lily GPT-LineBot is listening on port ${PORT}`)
})
