import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'sk.mohit.saini123@gmail.com';
  console.log(`🌱 Seeding real account data for: ${email}...`);

  // 1. Find or create Profile for sk.mohit.saini123@gmail.com
  let user = await prisma.profile.findUnique({ where: { email } });

  if (!user) {
    user = await prisma.profile.create({
      data: {
        email,
        name: 'Mohit Saini',
        phone: '9876543219',
        role: 'distributor',
      },
    });
    console.log('✅ Created user profile');
  } else {
    console.log(`ℹ️ Existing user profile found with ID: ${user.id}, Role: ${user.role}`);
  }

  // Ensure user is set to distributor role if requested or keep role
  const role = user.role || 'distributor';

  // 2. Ensure Distributor Profile exists
  let distProfile = await prisma.distributorProfile.findUnique({ where: { userId: user.id } });

  if (!distProfile) {
    // Generate a connection code
    const connectionCode = 'MOHIT100';
    distProfile = await prisma.distributorProfile.create({
      data: {
        userId: user.id,
        businessName: 'Mohit Saini Dairy & Ice Cream Express',
        distributorType: 'dual',
        connectionCode,
        ownerName: 'Mohit Saini',
        company: 'Saini Dairy Logistics',
        address: 'Main Market, Jaipur',
        city: 'Jaipur',
        deliveryAreas: 'Jaipur Central, Malviya Nagar, Tonk Road',
        gst: '08BBBPS1234A1Z9',
        profileComplete: true,
      },
    });
    console.log(`✅ Created Distributor Profile with Connection Code: ${connectionCode}`);
  } else {
    console.log(`ℹ️ Existing Distributor Profile found with Code: ${distProfile.connectionCode}`);
  }

  // 3. Ensure Delivery Group exists
  let deliveryGroup = await prisma.deliveryGroup.findFirst({
    where: { distributorId: distProfile.id },
  });

  if (!deliveryGroup) {
    deliveryGroup = await prisma.deliveryGroup.create({
      data: {
        distributorId: distProfile.id,
        name: 'Jaipur Express Delivery Route',
      },
    });
  }

  // 4. Products list to populate
  const mohitProducts = [
    {
      name: 'Amul Taaza Toned Milk 500ml',
      brand: 'Amul',
      category: 'milk',
      businessLine: 'dairy',
      unit: '500ml Pouch',
      price: 27.0,
      stockQuantity: 250,
      showStock: true,
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Amul Gold Full Cream Milk 500ml',
      brand: 'Amul',
      category: 'milk',
      businessLine: 'dairy',
      unit: '500ml Pouch',
      price: 33.0,
      stockQuantity: 300,
      showStock: true,
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Fresh Malai Paneer 200g',
      brand: 'Amul',
      category: 'paneer',
      businessLine: 'dairy',
      unit: '200g Pack',
      price: 95.0,
      stockQuantity: 75,
      showStock: true,
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Amul Masti Dahi 400g Cup',
      brand: 'Amul',
      category: 'curd',
      businessLine: 'dairy',
      unit: '400g Cup',
      price: 40.0,
      stockQuantity: 120,
      showStock: true,
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Amul Pasteurised Butter 100g',
      brand: 'Amul',
      category: 'butter',
      businessLine: 'dairy',
      unit: '100g Pack',
      price: 58.0,
      stockQuantity: 150,
      showStock: true,
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Amul Cow Ghee 1 Litre Tin',
      brand: 'Amul',
      category: 'ghee',
      businessLine: 'dairy',
      unit: '1 Litre Tin',
      price: 650.0,
      stockQuantity: 40,
      showStock: true,
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Choco Crunch Sundae Cone 120ml',
      brand: 'Kwalitz',
      category: 'icecream',
      businessLine: 'icecream',
      unit: '120ml Cone',
      price: 45.0,
      stockQuantity: 180,
      showStock: true,
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Royal Classic Vanilla Cup 100ml',
      brand: 'Kwalitz',
      category: 'icecream',
      businessLine: 'icecream',
      unit: '100ml Cup',
      price: 30.0,
      stockQuantity: 140,
      showStock: true,
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1560008515-1a8230509a25?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Desi Kesar Pista Kulfi Stick',
      brand: 'Kwalitz',
      category: 'icecream',
      businessLine: 'icecream',
      unit: '80ml Stick',
      price: 35.0,
      stockQuantity: 160,
      showStock: true,
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Belgian Dark Chocolate Tub 700ml',
      brand: 'Kwalitz',
      category: 'icecream',
      businessLine: 'icecream',
      unit: '700ml Tub',
      price: 280.0,
      stockQuantity: 35,
      showStock: true,
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1576506295286-5cda482453a2?auto=format&fit=crop&w=600&q=80',
    },
  ];

  let addedCount = 0;
  for (const prod of mohitProducts) {
    const existing = await prisma.product.findFirst({
      where: {
        distributorId: distProfile.id,
        name: prod.name,
      },
    });

    if (!existing) {
      await prisma.product.create({
        data: {
          ...prod,
          distributorId: distProfile.id,
        },
      });
      addedCount++;
    } else {
      // Update image & stock if existing
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          imageUrl: prod.imageUrl,
          price: prod.price,
          available: true,
          showStock: true,
          stockQuantity: prod.stockQuantity,
        },
      });
    }
  }

  console.log(`🎉 Successfully added/updated ${mohitProducts.length} high-resolution products for ${email}!`);
  console.log('----------------------------------------------------');
  console.log('📌 ACCOUNT DETAILS:');
  console.log(`   Email: ${email}`);
  console.log(`   Business Name: ${distProfile.businessName}`);
  console.log(`   Connection Code: ${distProfile.connectionCode}`);
  console.log(`   Total Catalog Products: ${mohitProducts.length}`);
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Error seeding user products:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
