import "dotenv/config";
import { PrismaClient } from "./generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Admin user
  const passwordHash = await bcrypt.hash("admin123", 12);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@hotel.com" },
    update: {},
    create: {
      email: "admin@hotel.com",
      passwordHash,
      role: "ADMIN",
    },
  });
  await prisma.staff.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      name: "Admin User",
      contactEmail: "admin@hotel.com",
      position: "System Administrator",
      department: "Management",
      joinedAt: new Date("2024-01-01"),
    },
  });

  // Floors
  const floors = [
    { code: "F1", name: "Floor 1", displayOrder: 1 },
    { code: "F2", name: "Floor 2", displayOrder: 2 },
    { code: "F3", name: "Floor 3", displayOrder: 3 },
    { code: "F4", name: "Floor 4", displayOrder: 4 },
  ];
  for (const f of floors) {
    await prisma.floor.upsert({ where: { code: f.code }, update: {}, create: f });
  }

  // Room Types
  const roomTypes = [
    { code: "STD", name: "Standard", capacity: 2 },
    { code: "DLX", name: "Deluxe",   capacity: 2 },
    { code: "SUT", name: "Suite",    capacity: 4 },
    { code: "FAM", name: "Family",   capacity: 4 },
  ];
  for (const rt of roomTypes) {
    await prisma.roomType.upsert({ where: { code: rt.code }, update: {}, create: rt });
  }

  // Room Type Pricing
  const roomTypePricingData = [
    { code: "STD", nightlyPrice: 800000,  dailyPrice: 400000,  hourlyBlockHours: 3, hourlyBlockPrice: 150000, hourlyExtraPrice: 50000 },
    { code: "DLX", nightlyPrice: 1200000, dailyPrice: 600000,  hourlyBlockHours: 3, hourlyBlockPrice: 220000, hourlyExtraPrice: 70000 },
    { code: "SUT", nightlyPrice: 2500000, dailyPrice: 1200000, hourlyBlockHours: 3, hourlyBlockPrice: 450000, hourlyExtraPrice: 120000 },
    { code: "FAM", nightlyPrice: 1800000, dailyPrice: 900000,  hourlyBlockHours: 3, hourlyBlockPrice: 320000, hourlyExtraPrice: 90000 },
  ];
  for (const p of roomTypePricingData) {
    const roomType = await prisma.roomType.findUnique({ where: { code: p.code } });
    if (!roomType) continue;
    await prisma.roomTypePricing.upsert({
      where: { roomTypeId: roomType.id },
      update: {
        nightlyPrice:     p.nightlyPrice,
        dailyPrice:       p.dailyPrice,
        hourlyBlockHours: p.hourlyBlockHours,
        hourlyBlockPrice: p.hourlyBlockPrice,
        hourlyExtraPrice: p.hourlyExtraPrice,
      },
      create: {
        roomTypeId:       roomType.id,
        nightlyPrice:     p.nightlyPrice,
        dailyPrice:       p.dailyPrice,
        hourlyBlockHours: p.hourlyBlockHours,
        hourlyBlockPrice: p.hourlyBlockPrice,
        hourlyExtraPrice: p.hourlyExtraPrice,
      },
    });
  }

  // Room Statuses
  const roomStatuses = [
    { code: "AVAILABLE", name: "Trống", color: "#52c41a", isSellable: true },
    { code: "OCCUPIED", name: "Đang có khách", color: "#1677ff", isSellable: false },
    { code: "RESERVED", name: "Đã đặt", color: "#722ed1", isSellable: false },
    { code: "CLEANING", name: "Đang dọn phòng", color: "#fa8c16", isSellable: false },
    { code: "MAINTENANCE", name: "Bảo trì", color: "#f5222d", isSellable: false },
    { code: "OUT_OF_SERVICE", name: "Ngưng khai thác", color: "#8c8c8c", isSellable: false },
  ];
  for (const rs of roomStatuses) {
    await prisma.roomStatus.upsert({
      where: { code: rs.code },
      update: { name: rs.name, color: rs.color },
      create: rs,
    });
  }

  // Booking Statuses
  const bookingStatuses = [
    { code: "PENDING", name: "Pending", color: "#fa8c16" },
    { code: "CONFIRMED", name: "Confirmed", color: "#1677ff" },
    { code: "CHECKED_IN", name: "Checked-in", color: "#52c41a" },
    { code: "CHECKED_OUT", name: "Checked-out", color: "#8c8c8c" },
    { code: "CANCELLED", name: "Cancelled", color: "#f5222d" },
    { code: "NO_SHOW", name: "No-show", color: "#d4380d" },
  ];
  for (const bs of bookingStatuses) {
    await prisma.bookingStatus.upsert({ where: { code: bs.code }, update: {}, create: bs });
  }

  // Payment Methods
  const paymentMethods = [
    { code: "CASH", name: "Cash" },
    { code: "CREDIT_CARD", name: "Credit Card" },
    { code: "BANK_TRANSFER", name: "Bank Transfer" },
    { code: "QR_PAYMENT", name: "QR Payment" },
  ];
  for (const pm of paymentMethods) {
    await prisma.paymentMethod.upsert({ where: { code: pm.code }, update: {}, create: pm });
  }

  // Service Items
  const serviceItems = [
    { code: "LAUNDRY", name: "Laundry", unitPrice: 50000, unit: "set" },
    { code: "MINIBAR", name: "Mini-bar", unitPrice: 30000, unit: "item" },
    { code: "SPA", name: "Spa", unitPrice: 350000, unit: "session" },
    { code: "BREAKFAST", name: "Breakfast", unitPrice: 120000, unit: "person" },
    { code: "EXTRA_BED", name: "Extra Bed", unitPrice: 200000, unit: "night" },
    { code: "AIRPORT_TRANSFER", name: "Airport Transfer", unitPrice: 250000, unit: "trip" },
  ];
  for (const si of serviceItems) {
    await prisma.serviceItem.upsert({ where: { code: si.code }, update: {}, create: si });
  }

  // Guest Types
  const guestTypes = [
    { code: "NORMAL", name: "Normal", color: "#1677ff" },
    { code: "VIP", name: "VIP", color: "#722ed1" },
    { code: "CORPORATE", name: "Corporate", color: "#13c2c2" },
    { code: "BLACKLIST", name: "Blacklist", color: "#f5222d" },
  ];
  for (const gt of guestTypes) {
    await prisma.guestType.upsert({ where: { code: gt.code }, update: {}, create: gt });
  }

  // Amenities
  const amenities = [
    { code: "SEA_VIEW", name: "Sea View" },
    { code: "BALCONY", name: "Balcony" },
    { code: "BATHTUB", name: "Bathtub" },
    { code: "SMOKING", name: "Smoking" },
    { code: "NON_SMOKING", name: "Non-smoking" },
    { code: "WIFI", name: "Free WiFi" },
    { code: "POOL_VIEW", name: "Pool View" },
  ];
  for (const a of amenities) {
    await prisma.amenity.upsert({ where: { code: a.code }, update: {}, create: a });
  }

  // ── SAMPLE DATA ────────────────────────────────────────────────────────────
  console.log("🏨 Seeding sample data...");

  // Look up master data IDs
  const [f1, f2, f3, f4] = await Promise.all([
    prisma.floor.findUnique({ where: { code: "F1" } }),
    prisma.floor.findUnique({ where: { code: "F2" } }),
    prisma.floor.findUnique({ where: { code: "F3" } }),
    prisma.floor.findUnique({ where: { code: "F4" } }),
  ]);
  const [rtSTD, rtDLX, rtSUT, rtFAM] = await Promise.all([
    prisma.roomType.findUnique({ where: { code: "STD" } }),
    prisma.roomType.findUnique({ where: { code: "DLX" } }),
    prisma.roomType.findUnique({ where: { code: "SUT" } }),
    prisma.roomType.findUnique({ where: { code: "FAM" } }),
  ]);
  const [rsAVAIL] = await Promise.all([
    prisma.roomStatus.findUnique({ where: { code: "AVAILABLE" } }),
  ]);
  const [gtNORMAL, gtVIP, gtCORPORATE] = await Promise.all([
    prisma.guestType.findUnique({ where: { code: "NORMAL" } }),
    prisma.guestType.findUnique({ where: { code: "VIP" } }),
    prisma.guestType.findUnique({ where: { code: "CORPORATE" } }),
  ]);
  const [bsCONFIRMED, bsCHECKED_IN, bsCHECKED_OUT] = await Promise.all([
    prisma.bookingStatus.findUnique({ where: { code: "CONFIRMED" } }),
    prisma.bookingStatus.findUnique({ where: { code: "CHECKED_IN" } }),
    prisma.bookingStatus.findUnique({ where: { code: "CHECKED_OUT" } }),
  ]);
  const pmCASH = await prisma.paymentMethod.findUnique({ where: { code: "CASH" } });
  const [siBREAKFAST, siLAUNDRY, siSPA] = await Promise.all([
    prisma.serviceItem.findUnique({ where: { code: "BREAKFAST" } }),
    prisma.serviceItem.findUnique({ where: { code: "LAUNDRY" } }),
    prisma.serviceItem.findUnique({ where: { code: "SPA" } }),
  ]);

  // Rooms
  // Occupancy state is derived from Booking records (currentBooking.bookingState).
  // When reseeding/resetting business data, all rooms should return to AVAILABLE
  // so dashboard and room-management views start from a clean baseline.
  const roomDefs = [
    { number: "101", floorId: f1!.id, roomTypeId: rtSTD!.id, roomStatusId: rsAVAIL!.id },
    { number: "102", floorId: f1!.id, roomTypeId: rtSTD!.id, roomStatusId: rsAVAIL!.id },
    { number: "103", floorId: f1!.id, roomTypeId: rtSTD!.id, roomStatusId: rsAVAIL!.id },
    { number: "104", floorId: f1!.id, roomTypeId: rtSTD!.id, roomStatusId: rsAVAIL!.id },
    { number: "201", floorId: f2!.id, roomTypeId: rtSTD!.id, roomStatusId: rsAVAIL!.id },
    { number: "202", floorId: f2!.id, roomTypeId: rtSTD!.id, roomStatusId: rsAVAIL!.id },
    { number: "203", floorId: f2!.id, roomTypeId: rtDLX!.id, roomStatusId: rsAVAIL!.id },
    { number: "204", floorId: f2!.id, roomTypeId: rtDLX!.id, roomStatusId: rsAVAIL!.id },
    { number: "301", floorId: f3!.id, roomTypeId: rtDLX!.id, roomStatusId: rsAVAIL!.id },
    { number: "302", floorId: f3!.id, roomTypeId: rtDLX!.id, roomStatusId: rsAVAIL!.id },
    { number: "303", floorId: f3!.id, roomTypeId: rtFAM!.id, roomStatusId: rsAVAIL!.id },
    { number: "304", floorId: f3!.id, roomTypeId: rtFAM!.id, roomStatusId: rsAVAIL!.id },
    { number: "401", floorId: f4!.id, roomTypeId: rtSUT!.id, roomStatusId: rsAVAIL!.id },
    { number: "402", floorId: f4!.id, roomTypeId: rtSUT!.id, roomStatusId: rsAVAIL!.id },
    { number: "403", floorId: f4!.id, roomTypeId: rtDLX!.id, roomStatusId: rsAVAIL!.id },
    { number: "404", floorId: f4!.id, roomTypeId: rtDLX!.id, roomStatusId: rsAVAIL!.id },
  ];
  for (const r of roomDefs) {
    await prisma.room.upsert({
      where: { number: r.number },
      update: {
        floorId: r.floorId,
        roomTypeId: r.roomTypeId,
        roomStatusId: r.roomStatusId,
        isActive: true,
      },
      create: r,
    });
  }

  // Guests
  const guestDefs = [
    { firstName: "Nguyen", lastName: "Van An", email: "vanan@gmail.com", phone: "0901234567", idNumber: "001090012345", nationality: "Vietnamese", guestTypeId: gtNORMAL!.id },
    { firstName: "Tran", lastName: "Thi Bich", email: "thibich@gmail.com", phone: "0912345678", idNumber: "001090023456", nationality: "Vietnamese", guestTypeId: gtNORMAL!.id },
    { firstName: "Le", lastName: "Hoang Minh", email: "hoangminh@gmail.com", phone: "0923456789", idNumber: "001090034567", nationality: "Vietnamese", guestTypeId: gtVIP!.id },
    { firstName: "Pham", lastName: "Thi Lan", email: "thilan@gmail.com", phone: "0934567890", idNumber: "001090045678", nationality: "Vietnamese", guestTypeId: gtVIP!.id },
    { firstName: "Vo", lastName: "Duc Thanh", email: "ducthanh@gmail.com", phone: "0945678901", idNumber: "001090056789", nationality: "Vietnamese", guestTypeId: gtCORPORATE!.id },
    { firstName: "Hoang", lastName: "Thi Mai", email: "thimhai@gmail.com", phone: "0956789012", idNumber: "001090067890", nationality: "Vietnamese", guestTypeId: gtCORPORATE!.id },
    { firstName: "John", lastName: "Smith", email: "john.smith@email.com", phone: "0967890123", idNumber: "A12345678", nationality: "American", guestTypeId: gtNORMAL!.id },
    { firstName: "Emily", lastName: "Johnson", email: "emily.j@email.com", phone: "0978901234", idNumber: "B23456789", nationality: "British", guestTypeId: gtVIP!.id },
    { firstName: "Zhang", lastName: "Wei", email: "zhangwei@email.com", phone: "0989012345", idNumber: "C34567890", nationality: "Chinese", guestTypeId: gtNORMAL!.id },
    { firstName: "Nguyen", lastName: "Thanh Long", email: "thanhlong@company.vn", phone: "0990123456", idNumber: "001090078901", nationality: "Vietnamese", guestTypeId: gtCORPORATE!.id },
  ];
  const guests: { id: string }[] = [];
  for (const g of guestDefs) {
    const guest = await prisma.guest.upsert({
      where: { idNumber: g.idNumber },
      update: {},
      create: g,
    });
    guests.push(guest);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const atDayOffset = (days: number, hours = 12, minutes = 0) => {
    const value = new Date(today);
    value.setDate(value.getDate() + days);
    value.setHours(hours, minutes, 0, 0);
    return value;
  };

  const rooms = await prisma.room.findMany({
    where: { number: { in: ["102", "201", "202", "204", "303", "401"] } },
  });
  const roomByNumber = Object.fromEntries(rooms.map((r) => [r.number, r]));

  // Bookings for room-map validation (relative to today)
  const bookingDefs = [
    // Room 102: reserved and overlapping today
    {
      bookingNumber: "BK-RMAP-0102",
      guestId: guests[0].id,
      roomId: roomByNumber["102"].id,
      bookingStatusId: bsCONFIRMED!.id,
      checkInDate: atDayOffset(-1, 14),
      checkOutDate: atDayOffset(3, 12),
      adults: 2, children: 0,
      baseRate: 800000,
      totalAmount: 800000 * 4,
      depositAmount: 800000,
      source: "Direct",
      note: "Room-map reserved test\n[META] chargeType=nightly",
    },
    // Room 201: checked in and overlapping today
    {
      bookingNumber: "BK-RMAP-0201",
      guestId: guests[2].id,
      roomId: roomByNumber["201"].id,
      bookingStatusId: bsCHECKED_IN!.id,
      checkInDate: atDayOffset(-2, 14),
      checkOutDate: atDayOffset(2, 12),
      actualCheckIn: atDayOffset(-2, 14),
      adults: 2, children: 0,
      baseRate: 800000,
      totalAmount: 800000 * 4,
      depositAmount: 800000,
      source: "Direct",
      note: "Room-map checked-in test\n[META] chargeType=nightly",
    },
    // Extra occupied room with services
    {
      bookingNumber: "BK-RMAP-0202",
      guestId: guests[6].id,
      roomId: roomByNumber["202"].id,
      bookingStatusId: bsCHECKED_IN!.id,
      checkInDate: atDayOffset(-1, 15),
      checkOutDate: atDayOffset(1, 11),
      actualCheckIn: atDayOffset(-1, 15),
      adults: 2, children: 0,
      baseRate: 800000,
      totalAmount: 800000 * 2,
      depositAmount: 400000,
      source: "Walk-in",
      note: "Extra occupied sample\n[META] chargeType=nightly",
    },
    // Extra occupied suite
    {
      bookingNumber: "BK-RMAP-0401",
      guestId: guests[7].id,
      roomId: roomByNumber["401"].id,
      bookingStatusId: bsCHECKED_IN!.id,
      checkInDate: atDayOffset(-2, 13),
      checkOutDate: atDayOffset(3, 11),
      actualCheckIn: atDayOffset(-2, 13),
      adults: 2, children: 1,
      baseRate: 2500000,
      totalAmount: 2500000 * 5,
      depositAmount: 2500000,
      source: "Agoda",
    },
    // Room 303: future booking, non-overlap for today
    {
      bookingNumber: "BK-RMAP-0303",
      guestId: guests[4].id,
      roomId: roomByNumber["303"].id,
      bookingStatusId: bsCONFIRMED!.id,
      checkInDate: atDayOffset(7, 14),
      checkOutDate: atDayOffset(10, 11),
      adults: 2, children: 1,
      baseRate: 1800000,
      totalAmount: 1800000 * 3,
      depositAmount: 600000,
      source: "Corporate",
      note: "Future reservation test\n[META] chargeType=daily",
    },
    // Room 204: checked out today
    {
      bookingNumber: "BK-RMAP-0204",
      guestId: guests[5].id,
      roomId: roomByNumber["204"].id,
      bookingStatusId: bsCHECKED_OUT!.id,
      checkInDate: atDayOffset(-3, 14),
      checkOutDate: atDayOffset(0, 11),
      actualCheckIn: atDayOffset(-3, 14),
      actualCheckOut: new Date(),
      adults: 1, children: 0,
      baseRate: 1200000,
      totalAmount: 1200000 * 3,
      depositAmount: 1200000,
      source: "Direct",
    },
  ];

  for (const b of bookingDefs) {
    await prisma.booking.upsert({
      where: { bookingNumber: b.bookingNumber },
      update: {},
      create: b,
    });
  }

  // Services cho booking đang ở
  const bk201 = await prisma.booking.findUnique({ where: { bookingNumber: "BK-RMAP-0201" } });
  const bk202 = await prisma.booking.findUnique({ where: { bookingNumber: "BK-RMAP-0202" } });
  const bk204 = await prisma.booking.findUnique({ where: { bookingNumber: "BK-RMAP-0204" } });

  if (bk201) {
    await prisma.bookingService.createMany({
      data: [
        {
          bookingId: bk201.id,
          serviceItemId: siBREAKFAST!.id,
          quantity: 2,
          unitPrice: 120000,
          totalPrice: 240000,
          serviceDate: atDayOffset(-1, 8),
        },
        {
          bookingId: bk201.id,
          serviceItemId: siLAUNDRY!.id,
          quantity: 1,
          unitPrice: 50000,
          totalPrice: 50000,
          serviceDate: atDayOffset(0, 9),
        },
      ],
      skipDuplicates: true,
    });
  }
  if (bk202) {
    await prisma.bookingService.createMany({
      data: [
        {
          bookingId: bk202.id,
          serviceItemId: siSPA!.id,
          quantity: 1,
          unitPrice: 350000,
          totalPrice: 350000,
          serviceDate: atDayOffset(0, 14),
        },
        {
          bookingId: bk202.id,
          serviceItemId: siBREAKFAST!.id,
          quantity: 2,
          unitPrice: 120000,
          totalPrice: 240000,
          serviceDate: atDayOffset(0, 7),
        },
      ],
      skipDuplicates: true,
    });
  }

  // Invoice + payment cho booking đã checkout
  if (bk204) {
    const existingInvoice = await prisma.invoice.findFirst({ where: { bookingId: bk204.id } });
    if (!existingInvoice) {
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: "INV-20260416-0001",
          bookingId: bk204.id,
          subtotal: 3600000,
          taxAmount: 360000,
          discountAmount: 0,
          totalAmount: 3960000,
          isPaid: true,
          issuedAt: atDayOffset(0, 10),
        },
      });
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          paymentMethodId: pmCASH!.id,
          amount: 3960000,
          paidAt: atDayOffset(0, 10, 30),
        },
      });
    }
  }

  // Hotel settings — seed timezone from env, default to Asia/Ho_Chi_Minh
  await prisma.hotelSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      timezone: process.env.HOTEL_TIMEZONE ?? "Asia/Ho_Chi_Minh",
    },
  });

  console.log("✅ Seed complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
