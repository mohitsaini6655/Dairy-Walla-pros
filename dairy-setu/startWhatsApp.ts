import { connectToWhatsApp } from './baileysService';

console.log('Starting WhatsApp Bridge...');
connectToWhatsApp().catch(err => console.error('Failed to start WhatsApp Bridge:', err));