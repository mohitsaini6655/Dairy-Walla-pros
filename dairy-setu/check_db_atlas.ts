import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Checking MongoDB Atlas connection and collections status...\n');

  try {
    // 1. Ping the database
    const ping = await prisma.$runCommandRaw({ ping: 1 });
    console.log('✅ Connection to MongoDB Atlas: SUCCESS (ping:', ping, ')');

    // 2. Query collections count
    const [
      profilesCount,
      distributorsCount,
      shopkeepersCount,
      connectionsCount,
      deliveryGroupsCount,
      productsCount,
      ordersCount,
      orderItemsCount,
      invoicesCount,
      notificationsCount,
      blogsCount
    ] = await Promise.all([
      prisma.profile.count(),
      prisma.distributorProfile.count(),
      prisma.shopkeeperProfile.count(),
      prisma.connection.count(),
      prisma.deliveryGroup.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.orderItem.count(),
      prisma.invoice.count(),
      prisma.notification.count(),
      prisma.blog.count()
    ]);

    console.log('\n📊 Database Collections & Document Counts:');
    console.log(`   - profiles: ${profilesCount}`);
    console.log(`   - distributor_profiles: ${distributorsCount}`);
    console.log(`   - shopkeeper_profiles: ${shopkeepersCount}`);
    console.log(`   - connections: ${connectionsCount}`);
    console.log(`   - delivery_groups: ${deliveryGroupsCount}`);
    console.log(`   - products: ${productsCount}`);
    console.log(`   - orders: ${ordersCount}`);
    console.log(`   - order_items: ${orderItemsCount}`);
    console.log(`   - invoices: ${invoicesCount}`);
    console.log(`   - notifications: ${notificationsCount}`);
    console.log(`   - blogs: ${blogsCount}`);

    // 3. Test Write and Read (Save Data Test)
    console.log('\n🧪 Testing data save and retrieval...');
    const testDoc = await prisma.blog.create({
      data: {
        title: 'Atlas Connectivity Check',
        type: 'diagnostic',
        description: `Atlas write verification timestamp: ${new Date().toISOString()}`
      }
    });
    console.log(`✅ Data written successfully! Created test record ID: ${testDoc.id}`);

    // Clean up test document
    await prisma.blog.delete({ where: { id: testDoc.id } });
    console.log('✅ Cleaned up test record.');

    console.log('\n🎉 MongoDB Atlas is properly connected and ready for production data saving!');
  } catch (err: any) {
    console.error('❌ MongoDB Atlas connection error:', err?.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
