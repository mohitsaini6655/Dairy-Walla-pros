import { parseOrderMessage } from './orderParser';
import { sendWhatsAppMessage } from './baileysService';

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Helper function to send message to WhatsApp AND Web Notification Box
 */
async function notifyUserAndWA(phone: string, userId: string | undefined, message: string, type: string = 'default') {
  try {
    // 1. Send WhatsApp message
    await sendWhatsAppMessage(phone, message);

    // 2. Create Web Notification (if user is registered)
    if (userId) {
      await prisma.notification.create({
        data: { userId, type, message, read: false }
      });
    }
  } catch (err) {
    console.error('[WhatsAppBridge] Error sending notifications:', err);
  }
}

/**
 * Processes an incoming WhatsApp message asynchronously.
 * Implements the logic from Requirement 9.
 *
 * @param senderPhone The sender's phone number (e.g., '919876543210')
 * @param messageBody The text of the message.
 */
export async function processIncomingMessage(senderPhone: string, messageBody: string): Promise<void> {
  console.log(`[WhatsAppBridge] Received message from ${senderPhone}: "${messageBody}"`);

  // Requirement 9.5: Associate message with a registered Shopkeeper with an active connection.
  const findShopkeeper = async (phone: string) => {
    // Normalize phone to the last 10 digits to match the database format
    const normalizedPhone = phone.replace(/[^\d]/g, '').slice(-10);
    if (!normalizedPhone || normalizedPhone.length < 10) return null;

    // 1. Find the user profile by phone
    const profile = await prisma.profile.findFirst({
      where: {
        phone: {
          contains: normalizedPhone,
        },
      },
      select: { id: true, name: true }
    });

    if (!profile) return null;

    // 2. Find the shopkeeper profile
    const shopkeeper = await prisma.shopkeeperProfile.findUnique({
      where: { userId: profile.id },
      select: { id: true, shopName: true }
    });
    if (!shopkeeper) return null;

    // 3. Find their active connection to get the distributorId
    const connection = await prisma.connection.findFirst({
      where: {
        shopkeeperId: shopkeeper.id,
        status: 'active',
      },
      select: { distributorId: true }
    });

    if (!connection || !connection.distributorId) {
      console.log(`[WhatsAppBridge] Shopkeeper ${normalizedPhone} has no active connections.`);
      return null;
    }

    return {
      id: shopkeeper.id,
      shopName: shopkeeper.shopName,
      shopkeeperName: profile.name || 'Shopkeeper',
      distributorId: connection.distributorId,
      userId: profile.id
    };
  };

  const shopkeeper = await findShopkeeper(senderPhone);

  if (!shopkeeper) {
    // Requirement 9.6: Handle unknown sender.
    console.log(`[WhatsAppBridge] Sender ${senderPhone} is not a registered shopkeeper.`);
    await notifyUserAndWA(senderPhone, undefined, "Welcome to DairySetu! Please register on our app to place orders.", "system");
    return;
  }

  // Requirement 9.1: Parse the message to extract products and quantities.
  const parsedItems = await parseOrderMessage(messageBody, shopkeeper.distributorId);

  if (!parsedItems || parsedItems.length === 0) {
    // Requirement 9.3: Handle unparseable message.
    console.log(`[WhatsAppBridge] Could not parse order from message: "${messageBody}"`);
    await notifyUserAndWA(senderPhone, shopkeeper.userId, "Sorry, I could not understand your order. Please use format: Product Quantity, Product Quantity (e.g., Amul Milk 10, Paneer 2)", "order_reminder");
    return;
  }

  // Requirement 9.2: Create the order using your existing order service.
  console.log(`[WhatsAppBridge] Parsed ${parsedItems.length} items. Creating order...`);

  const dp = await prisma.distributorProfile.findUnique({
    where: { id: shopkeeper.distributorId },
    select: { orderWindowCutoff: true, userId: true }
  });

  let isLate = false;
  if (dp && dp.orderWindowCutoff) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const [cutoffHour, cutoffMin] = dp.orderWindowCutoff.split(':').map(Number);
    if (currentHour > cutoffHour || (currentHour === cutoffHour && currentMin >= cutoffMin)) {
      isLate = true;
    }
  }

  const total = parsedItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    const order = await prisma.order.create({
      data: {
        shopkeeperId: shopkeeper.id,
        shopkeeperName: shopkeeper.shopkeeperName,
        shopName: shopkeeper.shopName,
        distributorId: shopkeeper.distributorId,
        type: isLate ? 'late' : 'normal',
        status: isLate ? 'pending' : 'accepted',
        source: 'whatsapp',
        deliveryDate: new Date(todayStr),
        total,
        items: {
          create: parsedItems.map(item => ({
            productId: item.productId,
            productName: item.productName,
            brand: item.brand,
            unit: item.unit,
            unitPrice: item.unitPrice,
            quantity: item.quantity
          }))
        }
      }
    });

    console.log(`[WhatsAppBridge] Order ${order.id} created successfully for ${senderPhone}.`);
    
    // Send confirmation to Shopkeeper on WhatsApp
    const confirmationMessage = isLate
      ? `Aapka order mil gaya hai (Late Order). Items: ${parsedItems.length}, Total: Rs ${total.toLocaleString()}. Distributor ke approval ka wait karein.`
      : `Order Confirmed! Items: ${parsedItems.length}, Total: Rs ${total.toLocaleString()}. Kal delivery ho jayegi.`;

    await notifyUserAndWA(senderPhone, shopkeeper.userId, confirmationMessage, "order_accepted");

    // Send Web Notification to Distributor
    if (dp?.userId) {
      await prisma.notification.create({
        data: {
          userId: dp.userId,
          type: isLate ? 'late_order' : 'order_placed',
          message: `WhatsApp order from ${shopkeeper.shopName} (${parsedItems.length} items)`,
          read: false
        }
      });
    }

  } catch (error) {
    console.error('[WhatsAppBridge] DB Insert Error:', error);
    await notifyUserAndWA(senderPhone, shopkeeper.userId, "Sorry, order save karne mein internal error aayi. Kripya baad mein try karein.", "system");
  }
}