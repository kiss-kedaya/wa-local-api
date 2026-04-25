const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();
app.use(express.json());

const API_TOKEN = process.env.API_TOKEN || 'change-me';
const inbox = [];
let isReady = false;

function auth(req, res, next) {
  if (req.get('x-api-key') !== API_TOKEN) return res.sendStatus(401);
  next();
}

const chromeExecutablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'main' }),
  puppeteer: {
    executablePath: chromeExecutablePath,
    headless: true,
    args: ['--no-sandbox']
  }
});

client.on('qr', qr => {
  console.log('Scan this QR with WhatsApp:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  isReady = true;
  console.log('WhatsApp client ready. Login session restored and API is ready.');
});

client.on('message', async msg => {
  if (msg.fromMe) return;

  const contact = await msg.getContact().catch(() => null);

  const item = {
    id: msg.id._serialized,
    from: msg.from,
    to: msg.to,
    author: msg.author || null,
    pushname: contact?.pushname || contact?.name || null,
    body: msg.body,
    type: msg.type,
    timestamp: msg.timestamp,
    hasMedia: msg.hasMedia
  };

  inbox.push(item);
  if (inbox.length > 1000) inbox.shift();

  console.log('[IN]', item);
});

app.get('/status', auth, async (req, res) => {
  res.json({
    api: 'running',
    whatsappReady: isReady,
    whatsappState: await client.getState().catch(() => null),
    inboxSize: inbox.length
  });
});

app.get('/messages', auth, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 500);
  res.json(inbox.slice(-limit));
});

app.get('/chats', auth, async (req, res) => {
  const chats = await client.getChats();
  res.json(chats.map(c => ({
    id: c.id._serialized,
    name: c.name,
    isGroup: c.isGroup,
    unreadCount: c.unreadCount,
    timestamp: c.timestamp
  })));
});

app.get('/chat/:id/messages', auth, async (req, res) => {
  try {
    const chatId = decodeURIComponent(req.params.id);
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const chats = await client.getChats();
    const chat = chats.find(c => c.id._serialized === chatId);

    if (!chat) {
      return res.status(404).json({
        error: 'Chat not found',
        message: 'Use an id returned by GET /chats. URL-encode the id when it contains special characters.'
      });
    }

    const msgs = await chat.fetchMessages({ limit });

    res.json(msgs.map(m => ({
      id: m.id._serialized,
      from: m.from,
      to: m.to,
      author: m.author || null,
      body: m.body,
      type: m.type,
      timestamp: m.timestamp,
      fromMe: m.fromMe,
      hasMedia: m.hasMedia
    })));
  } catch (err) {
    console.error('Failed to fetch chat messages:', err);
    res.status(500).json({
      error: 'Failed to fetch chat messages',
      message: err.message
    });
  }
});

async function shutdown() {
  await client.destroy().catch(() => {});
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

client.initialize();

app.listen(3000, '127.0.0.1', () => {
  console.log('API running: http://127.0.0.1:3000');
});