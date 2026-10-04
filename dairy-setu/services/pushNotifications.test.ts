import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PushTokenRegistrationError,
  createPushNotificationService,
  registerPushToken,
} from './pushNotifications.ts';

function createLogger() {
  return {
    log() {},
    warn() {},
    error() {},
  };
}

test('registerPushToken creates a new token row', async () => {
  const calls: Array<{ method: string; args: any }> = [];
  const prisma = {
    pushToken: {
      async findUnique(args: any) {
        calls.push({ method: 'findUnique', args });
        return null;
      },
      async update(args: any) {
        calls.push({ method: 'update', args });
        return { id: 'token-id', userId: args.data.userId, token: 'ExpoPushToken[new]', channelId: args.data.channelId };
      },
      async create(args: any) {
        calls.push({ method: 'create', args });
        return { id: 'token-id', userId: args.data.userId, token: args.data.token, channelId: args.data.channelId };
      },
    },
  };

  const result = await registerPushToken(prisma, 'user-1', {
    userId: 'user-1',
    token: 'ExpoPushToken[new]',
    platform: 'android',
    channelId: 'dairywalla-updates',
  });

  assert.equal(result.updated, false);
  assert.equal(result.saved.userId, 'user-1');
  assert.equal(calls.some(call => call.method === 'create'), true);
  assert.equal(calls.some(call => call.method === 'update'), false);
});

test('registerPushToken upserts an existing token row', async () => {
  const calls: Array<{ method: string; args: any }> = [];
  const prisma = {
    pushToken: {
      async findUnique(args: any) {
        calls.push({ method: 'findUnique', args });
        return { id: 'token-id', userId: 'old-user', token: 'ExpoPushToken[existing]', channelId: null };
      },
      async update(args: any) {
        calls.push({ method: 'update', args });
        return { id: 'token-id', userId: args.data.userId, token: 'ExpoPushToken[existing]', channelId: args.data.channelId };
      },
      async create(args: any) {
        calls.push({ method: 'create', args });
        return { id: 'token-id', userId: args.data.userId, token: args.data.token, channelId: args.data.channelId };
      },
    },
  };

  const result = await registerPushToken(prisma, 'user-1', {
    userId: 'user-1',
    token: 'ExpoPushToken[existing]',
    platform: 'ios',
  });

  assert.equal(result.updated, true);
  assert.equal(result.saved.userId, 'user-1');
  assert.equal(result.saved.channelId, 'dairywalla-updates');
  assert.equal(calls.some(call => call.method === 'update'), true);
  assert.equal(calls.some(call => call.method === 'create'), false);
});

test('registerPushToken blocks attaching a token to another user', async () => {
  const prisma = {
    pushToken: {
      async findUnique() { return null; },
      async update() { throw new Error('should not update'); },
      async create() { throw new Error('should not create'); },
    },
  };

  await assert.rejects(
    () => registerPushToken(prisma, 'user-1', { userId: 'user-2', token: 'ExpoPushToken[x]' }),
    (error: unknown) => error instanceof PushTokenRegistrationError && error.status === 403,
  );
});

test('sendToUser sends Expo payload for a valid token with badge count', async () => {
  let requestBody: any[] = [];
  const prisma = {
    pushToken: {
      async findMany() {
        return [{ id: 'token-id', userId: 'user-1', token: 'ExpoPushToken[valid]', channelId: 'dairywalla-updates' }];
      },
      async updateMany() {
        return { count: 0 };
      },
    },
    notification: {
      async count() {
        return 3;
      },
    },
  };
  const service = createPushNotificationService(prisma, {
    logger: createLogger(),
    fetchImpl: async (_url, init) => {
      requestBody = JSON.parse(String(init?.body));
      return Response.json({ data: [{ status: 'ok', id: 'ticket-id' }] });
    },
  });

  const stats = await service.sendToUser('user-1', {
    title: 'Order accepted',
    body: 'Your order was accepted.',
    data: { type: 'order_accepted' },
  });

  assert.equal(stats.sentCount, 1);
  assert.equal(requestBody[0].to, 'ExpoPushToken[valid]');
  assert.equal(requestBody[0].channelId, 'dairywalla-updates');
  assert.equal(requestBody[0].badge, 3);
});

test('sendToUser does not call Expo when no token exists', async () => {
  let fetchCalled = false;
  const prisma = {
    pushToken: {
      async findMany() {
        return [];
      },
      async updateMany() {
        return { count: 0 };
      },
    },
    notification: {
      async count() {
        return 0;
      },
    },
  };
  const service = createPushNotificationService(prisma, {
    logger: createLogger(),
    fetchImpl: async () => {
      fetchCalled = true;
      return Response.json({ data: [] });
    },
  });

  const stats = await service.sendToUser('user-1', { title: 'Title', body: 'Body' });

  assert.equal(fetchCalled, false);
  assert.equal(stats.tokenCount, 0);
});

test('sendToUser disables token when Expo returns DeviceNotRegistered', async () => {
  let disabledIds: string[] = [];
  const prisma = {
    pushToken: {
      async findMany() {
        return [{ id: 'bad-token-id', userId: 'user-1', token: 'ExpoPushToken[bad]', channelId: null }];
      },
      async updateMany(args: any) {
        disabledIds = args.where.id.in;
        return { count: disabledIds.length };
      },
    },
    notification: {
      async count() {
        return 1;
      },
    },
  };
  const service = createPushNotificationService(prisma, {
    logger: createLogger(),
    fetchImpl: async () => Response.json({
      data: [{ status: 'error', details: { error: 'DeviceNotRegistered' } }],
    }),
  });

  const stats = await service.sendToUser('user-1', { title: 'Title', body: 'Body' });

  assert.deepEqual(disabledIds, ['bad-token-id']);
  assert.equal(stats.disabledCount, 1);
  assert.equal(stats.failureCount, 1);
});
