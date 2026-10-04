const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const DEFAULT_CHANNEL_ID = 'dairywalla-updates';
const EXPO_CHUNK_SIZE = 100;
const EXPO_RECEIPT_DELAY_MS = 30_000;
const INVALID_TOKEN_ERRORS = new Set(['DeviceNotRegistered', 'InvalidCredentials']);

type PushTokenRecord = {
  id: string;
  userId: string;
  token: string;
  platform?: string | null;
  channelId?: string | null;
};

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badgeCount?: number;
};

type SendOptions = {
  eventType?: string;
};

type PushStats = {
  requestedUsers: number;
  tokenCount: number;
  sentCount: number;
  failureCount: number;
  disabledCount: number;
};

type PushPrismaClient = {
  pushToken: {
    findMany(args: unknown): Promise<PushTokenRecord[]>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  notification: {
    count(args: unknown): Promise<number>;
  };
};

type PushTokenRegistrationPrisma = {
  pushToken: {
    findUnique(args: unknown): Promise<PushTokenRecord | null>;
    update(args: unknown): Promise<PushTokenRecord>;
    create(args: unknown): Promise<PushTokenRecord>;
  };
};

type Logger = Pick<Console, 'log' | 'warn' | 'error'>;
type FetchLike = typeof fetch;

function isExpoPushToken(token: string | null | undefined): token is string {
  return typeof token === 'string' && /^Expo(nent)?PushToken\[.+\]$/.test(token);
}

class PushTokenRegistrationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'PushTokenRegistrationError';
    this.status = status;
  }
}

async function registerPushToken(
  prisma: PushTokenRegistrationPrisma,
  requesterUserId: string,
  body: Record<string, unknown>,
) {
  const userId = String(body?.userId ?? '').trim();
  const token = String(body?.token ?? '').trim();
  const platformRaw = String(body?.platform ?? '').trim().toLowerCase();
  const platform = ['android', 'ios', 'web'].includes(platformRaw) ? platformRaw : null;
  const channelId = String(body?.channelId ?? DEFAULT_CHANNEL_ID).trim() || DEFAULT_CHANNEL_ID;
  const lastSeenAt = new Date();

  if (!userId || !token) {
    throw new PushTokenRegistrationError(400, 'userId and token are required.');
  }
  if (userId !== requesterUserId) {
    throw new PushTokenRegistrationError(403, 'Cannot register a push token for another user.');
  }
  if (!isExpoPushToken(token)) {
    throw new PushTokenRegistrationError(400, 'Invalid Expo push token.');
  }

  const existing = await prisma.pushToken.findUnique({ where: { token } });
  const saved = existing
    ? await prisma.pushToken.update({
        where: { token },
        data: { userId: requesterUserId, platform, channelId, lastSeenAt, enabled: true },
      })
    : await prisma.pushToken.create({
        data: { userId: requesterUserId, token, platform, channelId, lastSeenAt, enabled: true },
      });

  return { saved, updated: Boolean(existing) };
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function createInitialStats(requestedUsers: number): PushStats {
  return {
    requestedUsers,
    tokenCount: 0,
    sentCount: 0,
    failureCount: 0,
    disabledCount: 0,
  };
}

export function createPushNotificationService(
  prisma: PushPrismaClient,
  options: { fetchImpl?: FetchLike; logger?: Logger } = {},
) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const logger = options.logger ?? console;

  async function getUnreadBadgeCounts(userIds: string[], explicitBadgeCount?: number) {
    const counts = new Map<string, number>();
    if (typeof explicitBadgeCount === 'number' && Number.isFinite(explicitBadgeCount)) {
      userIds.forEach(userId => counts.set(userId, Math.max(0, Math.floor(explicitBadgeCount))));
      return counts;
    }

    await Promise.all(userIds.map(async userId => {
      try {
        const count = await prisma.notification.count({ where: { userId, read: false } });
        counts.set(userId, count);
      } catch (error) {
        logger.warn('[push] badge count failed', { userId, error });
      }
    }));

    return counts;
  }

  async function disableInvalidTokens(tokenIds: string[], eventType?: string) {
    const uniqueIds = Array.from(new Set(tokenIds));
    if (uniqueIds.length === 0) return 0;

    try {
      const result = await prisma.pushToken.updateMany({
        where: { id: { in: uniqueIds } },
        data: { enabled: false },
      });
      logger.warn('[push] disabled invalid tokens', { eventType, disabledCount: result.count });
      return result.count;
    } catch (error) {
      logger.error('[push] invalid token cleanup failed', { eventType, tokenCount: uniqueIds.length, error });
      return 0;
    }
  }

  async function checkReceipts(receipts: Array<{ receiptId: string; tokenId: string }>, eventType?: string) {
    const tokenIdsToDisable: string[] = [];

    try {
      for (const chunk of chunks(receipts, EXPO_CHUNK_SIZE)) {
        const response = await fetchImpl(EXPO_RECEIPTS_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids: chunk.map(item => item.receiptId) }),
        });
        const result = await response.json().catch(() => null);
        const receiptMap = result?.data && typeof result.data === 'object' ? result.data : {};

        chunk.forEach(item => {
          const receipt = receiptMap[item.receiptId];
          if (!receipt || receipt.status === 'ok') return;

          const expoError = receipt?.details?.error;
          logger.warn('[push] receipt error', {
            eventType,
            receiptId: item.receiptId,
            error: expoError || receipt?.message || 'Unknown Expo receipt error',
          });
          if (INVALID_TOKEN_ERRORS.has(expoError)) {
            tokenIdsToDisable.push(item.tokenId);
          }
        });

        if (!response.ok) {
          logger.warn('[push] receipt request failed', { eventType, status: response.status, result });
        }
      }

      await disableInvalidTokens(tokenIdsToDisable, eventType);
    } catch (error) {
      logger.error('[push] receipt check failed', { eventType, receiptCount: receipts.length, error });
    }
  }

  function queueReceiptCheck(receipts: Array<{ receiptId: string; tokenId: string }>, eventType?: string) {
    if (receipts.length === 0) return;
    const timer = setTimeout(() => {
      void checkReceipts(receipts, eventType);
    }, EXPO_RECEIPT_DELAY_MS);
    timer.unref?.();
  }

  async function sendToManyUsers(userIds: string[], payload: PushPayload, sendOptions: SendOptions = {}) {
    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
    const stats = createInitialStats(uniqueUserIds.length);
    if (uniqueUserIds.length === 0) return stats;

    try {
      const tokenRows = await prisma.pushToken.findMany({
        where: { userId: { in: uniqueUserIds }, enabled: true },
        select: { id: true, userId: true, token: true, channelId: true },
      });
      const validTokens = tokenRows.filter(row => isExpoPushToken(row.token));
      const invalidTokenIds = tokenRows.filter(row => !isExpoPushToken(row.token)).map(row => row.id);
      stats.disabledCount += await disableInvalidTokens(invalidTokenIds, sendOptions.eventType);
      stats.tokenCount = validTokens.length;

      if (validTokens.length === 0) {
        logger.log('[push] no valid tokens', { eventType: sendOptions.eventType, requestedUsers: uniqueUserIds.length });
        return stats;
      }

      const badgeCounts = await getUnreadBadgeCounts(uniqueUserIds, payload.badgeCount);
      const messages = validTokens.map(row => {
        const badge = badgeCounts.get(row.userId);
        return {
          tokenId: row.id,
          message: {
            to: row.token,
            sound: 'default',
            title: payload.title,
            body: payload.body,
            data: payload.data ?? {},
            priority: 'high',
            channelId: row.channelId || DEFAULT_CHANNEL_ID,
            ...(typeof badge === 'number' ? { badge } : {}),
          },
        };
      });

      const tokenIdsToDisable: string[] = [];
      const receiptRefs: Array<{ receiptId: string; tokenId: string }> = [];
      for (const chunk of chunks(messages, EXPO_CHUNK_SIZE)) {
        const response = await fetchImpl(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk.map(item => item.message)),
        });
        const result = await response.json().catch(() => null);
        const tickets = Array.isArray(result?.data) ? result.data : [];

        tickets.forEach((ticket: any, index: number) => {
          if (ticket?.status === 'ok') {
            stats.sentCount += 1;
            if (ticket.id && chunk[index]) {
              receiptRefs.push({ receiptId: ticket.id, tokenId: chunk[index].tokenId });
            }
            return;
          }

          stats.failureCount += 1;
          const expoError = ticket?.details?.error;
          logger.warn('[push] ticket error', {
            eventType: sendOptions.eventType,
            error: expoError || ticket?.message || 'Unknown Expo error',
          });
          if (INVALID_TOKEN_ERRORS.has(expoError) && chunk[index]) {
            tokenIdsToDisable.push(chunk[index].tokenId);
          }
        });

        if (tickets.length === 0 && !response.ok) {
          stats.failureCount += chunk.length;
          logger.warn('[push] expo request failed', { eventType: sendOptions.eventType, status: response.status, result });
        }
      }

      stats.disabledCount += await disableInvalidTokens(tokenIdsToDisable, sendOptions.eventType);
      queueReceiptCheck(receiptRefs, sendOptions.eventType);
      logger.log('[push] sent', { eventType: sendOptions.eventType, ...stats });
      return stats;
    } catch (error) {
      logger.error('[push] send failed', { eventType: sendOptions.eventType, requestedUsers: uniqueUserIds.length, error });
      return stats;
    }
  }

  async function sendToUser(userId: string | null | undefined, payload: PushPayload, sendOptions: SendOptions = {}) {
    if (!userId) return createInitialStats(0);
    return sendToManyUsers([userId], payload, sendOptions);
  }

  return {
    sendToUser,
    sendToManyUsers,
    isExpoPushToken,
  };
}

export { registerPushToken, PushTokenRegistrationError };
export type { PushPayload, PushStats };
