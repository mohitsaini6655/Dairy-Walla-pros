import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting DairyWalla dummy data seeding...');

  // 1. Create Dummy Distributor Profile & Account
  const distributorEmail = 'distributor@dairywalla.com';
  let distUser = await prisma.profile.findUnique({ where: { email: distributorEmail } });

  if (!distUser) {
    distUser = await prisma.profile.create({
      data: {
        email: distributorEmail,
        name: 'Rajesh Sharma',
        phone: '9876543210',
        role: 'distributor',
      },
    });
  }

  let distProfile = await prisma.distributorProfile.findUnique({ where: { userId: distUser.id } });
  if (!distProfile) {
    distProfile = await prisma.distributorProfile.create({
      data: {
        userId: distUser.id,
        businessName: 'Sharma Dairy & Ice Cream Distributors',
        distributorType: 'dual',
        connectionCode: 'DAIRY100',
        ownerName: 'Rajesh Sharma',
        company: 'Sharma Dairy Logistics',
        address: 'Plot 45, Dairy Market, Malviya Nagar',
        city: 'Jaipur',
        deliveryAreas: 'Malviya Nagar, Gopalpura, Mansarovar',
        gst: '08AAAAA0000A1Z5',
        profileComplete: true,
      },
    });
  }

  // 2. Create Dummy Shopkeeper Profile & Account
  const shopkeeperEmail = 'shopkeeper@dairywalla.com';
  let shopUser = await prisma.profile.findUnique({ where: { email: shopkeeperEmail } });

  if (!shopUser) {
    shopUser = await prisma.profile.create({
      data: {
        email: shopkeeperEmail,
        name: 'Suresh Gupta',
        phone: '9876543211',
        role: 'shopkeeper',
      },
    });
  }

  let shopProfile = await prisma.shopkeeperProfile.findUnique({ where: { userId: shopUser.id } });
  if (!shopProfile) {
    shopProfile = await prisma.shopkeeperProfile.create({
      data: {
        userId: shopUser.id,
        shopName: 'Gupta Kirana & Dairy Store',
        ownerName: 'Suresh Gupta',
        address: 'Shop 12, Main Market, Gopalpura bypass',
        city: 'Jaipur',
        deliveryTiming: 'Morning 6 AM - 8 AM',
        profileComplete: true,
      },
    });
  }

  // 3. Create Delivery Group
  let deliveryGroup = await prisma.deliveryGroup.findFirst({
    where: { distributorId: distProfile.id },
  });

  if (!deliveryGroup) {
    deliveryGroup = await prisma.deliveryGroup.create({
      data: {
        distributorId: distProfile.id,
        name: 'Gopalpura & Tonk Road Route',
      },
    });
  }

  // 4. Create Active Connection between Shopkeeper and Distributor
  let connection = await prisma.connection.findFirst({
    where: {
      shopkeeperId: shopProfile.id,
      distributorId: distProfile.id,
    },
  });

  if (!connection) {
    connection = await prisma.connection.create({
      data: {
        shopkeeperId: shopProfile.id,
        shopkeeperName: 'Suresh Gupta',
        shopName: 'Gupta Kirana & Dairy Store',
        distributorId: distProfile.id,
        distributorName: 'Rajesh Sharma',
        businessName: 'Sharma Dairy & Ice Cream Distributors',
        status: 'accepted',
        deliveryGroupId: deliveryGroup.id,
        deliveryGroupName: deliveryGroup.name,
        shopkeeperPhone: '9876543211',
      },
    });
  }

  // 5. Seed Dummy Products
  const dummyProducts = [
    {
      name: 'Amul Taaza Toned Milk 500ml',
      brand: 'Amul',
      category: 'milk',
      businessLine: 'dairy',
      unit: '500ml Pouch',
      price: 27.0,
      stockQuantity: 200,
      showStock: true,
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Amul Gold Full Cream Milk 500ml',
      brand: 'Amul',
      category: 'milk',
      businessLine: 'dairy',
      unit: '500ml Pouch',
      price: 33.0,
      stockQuantity: 150,
      showStock: true,
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Fresh Paneer 200g',
      brand: 'Amul',
      category: 'paneer',
      businessLine: 'dairy',
      unit: '200g Pack',
      price: 95.0,
      stockQuantity: 50,
      showStock: true,
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Fresh Curd 400g Cup',
      brand: 'Amul',
      category: 'curd',
      businessLine: 'dairy',
      unit: '400g Cup',
      price: 40.0,
      stockQuantity: 80,
      showStock: true,
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Amul Salted Butter 100g',
      brand: 'Amul',
      category: 'butter',
      businessLine: 'dairy',
      unit: '100g Pack',
      price: 58.0,
      stockQuantity: 100,
      showStock: true,
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Choco Crunch Ice Cream Cone',
      brand: 'Kwalitz',
      category: 'icecream',
      businessLine: 'icecream',
      unit: '120ml Cone',
      price: 45.0,
      stockQuantity: 120,
      showStock: true,
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Royal Vanilla Ice Cream Cup',
      brand: 'Kwalitz',
      category: 'icecream',
      businessLine: 'icecream',
      unit: '100ml Cup',
      price: 30.0,
      stockQuantity: 90,
      showStock: true,
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1560008515-1a8230509a25?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Desi Mango Kulfi Stick',
      brand: 'Kwalitz',
      category: 'icecream',
      businessLine: 'icecream',
      unit: '80ml Stick',
      price: 35.0,
      stockQuantity: 110,
      showStock: true,
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=400&q=80',
    },
  ];

  const createdProducts = [];
  for (const prod of dummyProducts) {
    let existing = await prisma.product.findFirst({
      where: {
        distributorId: distProfile.id,
        name: prod.name,
      },
    });

    if (!existing) {
      existing = await prisma.product.create({
        data: {
          ...prod,
          distributorId: distProfile.id,
        },
      });
    }
    createdProducts.push(existing);
  }

  // 6. Seed a Sample Completed Order
  const existingOrders = await prisma.order.count({ where: { distributorId: distProfile.id } });

  if (existingOrders === 0 && createdProducts.length >= 2) {
    const item1 = createdProducts[0];
    const item2 = createdProducts[2];
    const total = (item1.price * 10) + (item2.price * 2);

    const newOrder = await prisma.order.create({
      data: {
        shopkeeperId: shopProfile.id,
        shopkeeperName: 'Suresh Gupta',
        shopName: 'Gupta Kirana & Dairy Store',
        distributorId: distProfile.id,
        businessLine: 'dairy',
        type: 'normal',
        status: 'delivered',
        paymentStatus: 'paid',
        source: 'web',
        total: total,
        deliveryGroupName: 'Gopalpura & Tonk Road Route',
        placedAt: new Date(),
        items: {
          create: [
            {
              productId: item1.id,
              productName: item1.name,
              brand: item1.brand,
              category: item1.category,
              businessLine: item1.businessLine,
              unit: item1.unit,
              unitPrice: item1.price,
              quantity: 10,
            },
            {
              productId: item2.id,
              productName: item2.name,
              brand: item2.brand,
              category: item2.category,
              businessLine: item2.businessLine,
              unit: item2.unit,
              unitPrice: item2.price,
              quantity: 2,
            },
          ],
        },
      },
    });

    await prisma.invoice.create({
      data: {
        orderId: newOrder.id,
        totalAmount: total,
      },
    });
  }

  console.log('✅ Dummy Seeding completed successfully!');
  console.log('----------------------------------------------------');
  console.log('📌 DISTRIBUTOR ACCOUNT:');
  console.log('   Email: distributor@dairywalla.com');
  console.log('   Role: distributor');
  console.log('   Connection Code: DAIRY100');
  console.log('----------------------------------------------------');
  console.log('📌 SHOPKEEPER ACCOUNT:');
  console.log('   Email: shopkeeper@dairywalla.com');
  console.log('   Role: shopkeeper');
  console.log('----------------------------------------------------');
  console.log(`📦 Created ${createdProducts.length} dummy products & active connection!`);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
