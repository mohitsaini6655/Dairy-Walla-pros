generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Profile {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique
  name      String?
  phone     String   @default("")
  role      String
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  distributorProfile DistributorProfile?
  shopkeeperProfile  ShopkeeperProfile?
  notifications      Notification[]
  userRoles          UserRole[]

  @@map("profiles")
}

model DistributorProfile {
  id                 String   @id @default(uuid()) @db.Uuid
  userId             String   @unique @map("user_id") @db.Uuid
  businessName       String   @map("business_name")
  connectionCode     String   @unique @map("connection_code")
  orderWindowStart   String?  @default("18:00") @map("order_window_start")
  orderWindowCutoff  String?  @default("20:00") @map("order_window_cutoff")
  ownerName          String?  @map("owner_name")
  company            String?
  address            String?
  city               String?
  deliveryAreas      String?  @map("delivery_areas")
  gst                String?
  locationName       String?  @map("location_name")
  latitude           Float?
  longitude          Float?
  profileComplete    Boolean? @default(false) @map("profile_complete")
  createdAt          DateTime @default(now()) @map("created_at") @db.Timestamptz

  user               Profile           @relation(fields: [userId], references: [id], onDelete: Cascade)
  connections        Connection[]
  products           Product[]
  deliveryGroups     DeliveryGroup[]
  orders             Order[]

  @@map("distributor_profiles")
}

model ShopkeeperProfile {
  id              String   @id @default(uuid()) @db.Uuid
  userId          String   @unique @map("user_id") @db.Uuid
  shopName        String   @map("shop_name")
  ownerName       String?  @map("owner_name")
  address         String?
  city            String?
  deliveryTiming  String?  @map("delivery_timing")
  locationName    String?  @map("location_name")
  latitude        Float?
  longitude       Float?
  profileComplete Boolean? @default(false) @map("profile_complete")
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz

  user            Profile      @relation(fields: [userId], references: [id], onDelete: Cascade)
  connections     Connection[]
  orders          Order[]

  @@map("shopkeeper_profiles")
}

model Connection {
  id                 String   @id @default(uuid()) @db.Uuid
  shopkeeperId       String?  @map("shopkeeper_id") @db.Uuid
  shopkeeperName     String?  @map("shopkeeper_name")
  shopName           String?  @map("shop_name")
  distributorId      String?  @map("distributor_id") @db.Uuid
  distributorName    String?  @map("distributor_name")
  businessName       String?  @map("business_name")
  status             String?  @default("pending")
  deliveryGroupId    String?  @map("delivery_group_id") @db.Uuid
  deliveryGroupName  String?  @map("delivery_group_name")
  shopkeeperPhone    String?  @map("shopkeeper_phone")
  autoOrderEnabled   Boolean  @default(false) @map("auto_order_enabled")
  createdAt          DateTime @default(now()) @map("created_at") @db.Timestamptz

  shopkeeper         ShopkeeperProfile?  @relation(fields: [shopkeeperId], references: [id], onDelete: Cascade)
  distributor        DistributorProfile? @relation(fields: [distributorId], references: [id], onDelete: Cascade)

  @@map("connections")
}

model DeliveryGroup {
  id             String   @id @default(uuid()) @db.Uuid
  distributorId  String?  @map("distributor_id") @db.Uuid
  name           String
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz

  distributor    DistributorProfile? @relation(fields: [distributorId], references: [id], onDelete: Cascade)

  @@map("delivery_groups")
}

model Product {
  id             String   @id @default(uuid()) @db.Uuid
  distributorId  String?  @map("distributor_id") @db.Uuid
  name           String
  brand          String?
  category       String   @default("other")
  unit           String?
  price          Decimal  @db.Decimal(10, 2)
  available      Boolean? @default(true)
  imageUrl       String?  @map("image_url")
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz

  distributor    DistributorProfile? @relation(fields: [distributorId], references: [id], onDelete: Cascade)
  orderItems     OrderItem[]

  @@map("products")
}

model Order {
  id                String   @id @default(uuid()) @db.Uuid
  shopkeeperId      String?  @map("shopkeeper_id") @db.Uuid
  shopkeeperName    String?  @map("shopkeeper_name")
  shopName          String?  @map("shop_name")
  distributorId     String?  @map("distributor_id") @db.Uuid
  type              String?  @default("normal")
  status            String?  @default("pending")
  paymentStatus     String?  @default("unpaid") @map("payment_status")
  source            String?  @default("web")
  deliveryDate      DateTime? @map("delivery_date") @db.Date
  deliveryGroupName String?  @map("delivery_group_name")
  total             Decimal? @default(0) @db.Decimal(10, 2)
  placedAt          DateTime @default(now()) @map("placed_at") @db.Timestamptz

  shopkeeper        ShopkeeperProfile?  @relation(fields: [shopkeeperId], references: [id], onDelete: Cascade)
  distributor       DistributorProfile? @relation(fields: [distributorId], references: [id], onDelete: Cascade)
  items             OrderItem[]
  invoice           Invoice?

  @@map("orders")
}

model OrderItem {
  id           String   @id @default(uuid()) @db.Uuid
  orderId      String?  @map("order_id") @db.Uuid
  productId    String?  @map("product_id") @db.Uuid
  productName  String?  @map("product_name")
  brand        String?
  category     String?
  unit         String?
  unitPrice    Decimal? @map("unit_price") @db.Decimal(10, 2)
  quantity     Int?

  order        Order?   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product      Product? @relation(fields: [productId], references: [id])

  @@map("order_items")
}

model Invoice {
  id            String   @id @default(uuid()) @db.Uuid
  orderId       String   @unique @map("order_id") @db.Uuid
  outdated      Boolean? @default(false)
  totalAmount   Decimal? @map("total_amount") @db.Decimal(10, 2)
  generatedAt   DateTime @default(now()) @map("generated_at") @db.Timestamptz

  order         Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@map("invoices")
}

model Notification {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String?  @map("user_id") @db.Uuid
  type      String?
  message   String?
  read      Boolean? @default(false)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  user      Profile? @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notifications")
}

model UserRole {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  role      String
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  user      Profile  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, role])
  @@map("user_roles")
}
