import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching connections...');
  const connections = await prisma.connection.findMany({});
  console.log('Connections count:', connections.length);
  for (const conn of connections) {
    console.log('Connection ID:', conn.id);
    console.log('Shopkeeper ID in connection:', conn.shopkeeperId, typeof conn.shopkeeperId);
    console.log('Distributor ID in connection:', conn.distributorId, typeof conn.distributorId);
    console.log('Status:', conn.status);
    console.log('---');
  }

  console.log('\nFetching shopkeeper profiles...');
  const shopkeepers = await prisma.shopkeeperProfile.findMany({});
  for (const sk of shopkeepers) {
    console.log('Shopkeeper ID:', sk.id, typeof sk.id);
    console.log('User ID:', sk.userId, typeof sk.userId);
    console.log('---');
  }
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
