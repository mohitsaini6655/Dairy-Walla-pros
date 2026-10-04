import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { processIncomingMessage } from './whatsappService';
import qrcode from 'qrcode-terminal';
import pino from 'pino';

let waSocket: ReturnType<typeof makeWASocket> | null = null;

export async function connectToWhatsApp() {
  // यह आपके WhatsApp सेशन को 'baileys_auth_info' फोल्डर में सेव करेगा
  // ताकि आपको बार-बार QR कोड स्कैन न करना पड़े
  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // हम कस्टम QR कोड दिखाएंगे
    logger: pino({ level: 'silent' }) as any
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n==================================================');
      console.log('[WhatsApp] Please scan the QR code below with your WhatsApp:');
      qrcode.generate(qr, { small: true });
      console.log('==================================================\n');
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('[WhatsApp] Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('[WhatsApp] Connected successfully! Bridge is now active.');
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    if (m.type === 'notify') {
      for (const msg of m.messages) {
        // सिर्फ दूसरों के भेजे हुए मैसेजेस को प्रोसेस करें
        if (!msg.key.fromMe && msg.message) {
          const senderPhone = msg.key.remoteJid?.split('@')[0];
          const messageBody = msg.message.conversation || msg.message.extendedTextMessage?.text;

          if (senderPhone && messageBody && senderPhone !== 'status') {
            await processIncomingMessage(senderPhone, messageBody);
          }
        }
      }
    }
  });

  waSocket = sock;
}

export async function sendWhatsAppMessage(phone: string, text: string) {
  if (!waSocket) {
    console.error('[WhatsApp] Socket not initialized. Cannot send message.');
    return;
  }
  const jid = `${phone}@s.whatsapp.net`;
  await waSocket.sendMessage(jid, { text });
}