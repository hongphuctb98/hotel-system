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
  await prisma.user.upsert({
    where: { email: "admin@hotel.com" },
    update: {},
    create: {
      email: "admin@hotel.com",
      passwordHash,
      name: "Admin User",
      role: "ADMIN",
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
    { code: "STD", name: "Standard", capacity: 2, defaultPrice: 800000 },
    { code: "DLX", name: "Deluxe", capacity: 2, defaultPrice: 1200000 },
    { code: "SUT", name: "Suite", capacity: 4, defaultPrice: 2500000 },
    { code: "FAM", name: "Family", capacity: 4, defaultPrice: 1800000 },
  ];
  for (const rt of roomTypes) {
    await prisma.roomType.upsert({ where: { code: rt.code }, update: {}, create: rt });
  }

  // Room Statuses
  const roomStatuses = [
    { code: "AVAILABLE", name: "Available", color: "#52c41a", isSellable: true },
    { code: "OCCUPIED", name: "Occupied", color: "#1677ff", isSellable: false },
    { code: "RESERVED", name: "Reserved", color: "#722ed1", isSellable: false },
    { code: "CLEANING", name: "Cleaning", color: "#fa8c16", isSellable: false },
    { code: "MAINTENANCE", name: "Maintenance", color: "#f5222d", isSellable: false },
    { code: "OUT_OF_SERVICE", name: "Out of Service", color: "#8c8c8c", isSellable: false },
  ];
  for (const rs of roomStatuses) {
    await prisma.roomStatus.upsert({ where: { code: rs.code }, update: {}, create: rs });
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
  const [rsAVAIL, rsOCCUPIED, rsRESERVED, rsCLEANING, rsMOINT] = await Promise.all([
    prisma.roomStatus.findUnique({ where: { code: "AVAILABLE" } }),
    prisma.roomStatus.findUnique({ where: { code: "OCCUPIED" } }),
    prisma.roomStatus.findUnique({ where: { code: "RESERVED" } }),
    prisma.roomStatus.findUnique({ where: { code: "CLEANING" } }),
    prisma.roomStatus.findUnique({ where: { code: "MAINTENANCE" } }),
  ]);
  const [gtNORMAL, gtVIP, gtCORPORATE] = await Promise.all([
    prisma.guestType.findUnique({ where: { code: "NORMAL" } }),
    prisma.guestType.findUnique({ where: { code: "VIP" } }),
    prisma.guestType.findUnique({ where: { code: "CORPORATE" } }),
  ]);
  const [bsPENDING, bsCONFIRMED, bsCHECKED_IN, bsCHECKED_OUT, bsCANCELLED] = await Promise.all([
    prisma.bookingStatus.findUnique({ where: { code: "PENDING" } }),
    prisma.bookingStatus.findUnique({ where: { code: "CONFIRMED" } }),
    prisma.bookingStatus.findUnique({ where: { code: "CHECKED_IN" } }),
    prisma.bookingStatus.findUnique({ where: { code: "CHECKED_OUT" } }),
    prisma.bookingStatus.findUnique({ where: { code: "CANCELLED" } }),
  ]);
  const [pmCASH, pmCREDIT] = await Promise.all([
    prisma.paymentMethod.findUnique({ where: { code: "CASH" } }),
    prisma.paymentMethod.findUnique({ where: { code: "CREDIT_CARD" } }),
  ]);
  const [siBREAKFAST, siLAUNDRY, siSPA] = await Promise.all([
    prisma.serviceItem.findUnique({ where: { code: "BREAKFAST" } }),
    prisma.serviceItem.findUnique({ where: { code: "LAUNDRY" } }),
    prisma.serviceItem.findUnique({ where: { code: "SPA" } }),
  ]);

  // Rooms
  const roomDefs = [
    { number: "101", floorId: f1!.id, roomTypeId: rtSTD!.id, roomStatusId: rsAVAIL!.id },
    { number: "102", floorId: f1!.id, roomTypeId: rtSTD!.id, roomStatusId: rsAVAIL!.id },
    { number: "103", floorId: f1!.id, roomTypeId: rtSTD!.id, roomStatusId: rsCLEANING!.id },
    { number: "104", floorId: f1!.id, roomTypeId: rtSTD!.id, roomStatusId: rsMOINT!.id },
    { number: "201", floorId: f2!.id, roomTypeId: rtSTD!.id, roomStatusId: rsAVAIL!.id },
    { number: "202", floorId: f2!.id, roomTypeId: rtSTD!.id, roomStatusId: rsOCCUPIED!.id },
    { number: "203", floorId: f2!.id, roomTypeId: rtDLX!.id, roomStatusId: rsOCCUPIED!.id },
    { number: "204", floorId: f2!.id, roomTypeId: rtDLX!.id, roomStatusId: rsAVAIL!.id },
    { number: "301", floorId: f3!.id, roomTypeId: rtDLX!.id, roomStatusId: rsOCCUPIED!.id },
    { number: "302", floorId: f3!.id, roomTypeId: rtDLX!.id, roomStatusId: rsRESERVED!.id },
    { number: "303", floorId: f3!.id, roomTypeId: rtFAM!.id, roomStatusId: rsAVAIL!.id },
    { number: "304", floorId: f3!.id, roomTypeId: rtFAM!.id, roomStatusId: rsAVAIL!.id },
    { number: "401", floorId: f4!.id, roomTypeId: rtSUT!.id, roomStatusId: rsOCCUPIED!.id },
    { number: "402", floorId: f4!.id, roomTypeId: rtSUT!.id, roomStatusId: rsAVAIL!.id },
    { number: "403", floorId: f4!.id, roomTypeId: rtDLX!.id, roomStatusId: rsRESERVED!.id },
    { number: "404", floorId: f4!.id, roomTypeId: rtDLX!.id, roomStatusId: rsAVAIL!.id },
  ];
  for (const r of roomDefs) {
    await prisma.room.upsert({ where: { number: r.number }, update: {}, create: r });
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

  // Rooms lookup for bookings
  const rooms = await prisma.room.findMany({ where: { number: { in: ["202", "203", "301", "401", "302", "403"] } } });
  const roomByNumber = Object.fromEntries(rooms.map((r) => [r.number, r]));

  // Bookings (today = 2026-04-01)
  const bookingDefs = [
    // Đang ở (CHECKED_IN)
    {
      bookingNumber: "BK-2026-0001",
      guestId: guests[0].id,
      roomId: roomByNumber["202"].id,
      bookingStatusId: bsCHECKED_IN!.id,
      checkInDate: new Date("2026-03-29"),
      checkOutDate: new Date("2026-04-03"),
      actualCheckIn: new Date("2026-03-29T14:00:00"),
      adults: 2, children: 0,
      ratePerNight: 800000,
      totalAmount: 800000 * 5,
      depositAmount: 800000,
      source: "Direct",
    },
    {
      bookingNumber: "BK-2026-0002",
      guestId: guests[2].id,
      roomId: roomByNumber["203"].id,
      bookingStatusId: bsCHECKED_IN!.id,
      checkInDate: new Date("2026-03-31"),
      checkOutDate: new Date("2026-04-04"),
      actualCheckIn: new Date("2026-03-31T15:30:00"),
      adults: 2, children: 0,
      ratePerNight: 1200000,
      totalAmount: 1200000 * 4,
      depositAmount: 1200000,
      source: "Booking.com",
    },
    {
      bookingNumber: "BK-2026-0003",
      guestId: guests[7].id,
      roomId: roomByNumber["401"].id,
      bookingStatusId: bsCHECKED_IN!.id,
      checkInDate: new Date("2026-03-30"),
      checkOutDate: new Date("2026-04-05"),
      actualCheckIn: new Date("2026-03-30T13:00:00"),
      adults: 2, children: 1,
      ratePerNight: 2500000,
      totalAmount: 2500000 * 6,
      depositAmount: 2500000,
      source: "Agoda",
    },
    {
      bookingNumber: "BK-2026-0004",
      guestId: guests[4].id,
      roomId: roomByNumber["301"].id,
      bookingStatusId: bsCHECKED_IN!.id,
      checkInDate: new Date("2026-04-01"),
      checkOutDate: new Date("2026-04-03"),
      actualCheckIn: new Date("2026-04-01T10:00:00"),
      adults: 1, children: 0,
      ratePerNight: 1200000,
      totalAmount: 1200000 * 2,
      depositAmount: 0,
      source: "Corporate",
    },
    // Đã đặt (CONFIRMED - chưa check-in)
    {
      bookingNumber: "BK-2026-0005",
      guestId: guests[1].id,
      roomId: roomByNumber["302"].id,
      bookingStatusId: bsCONFIRMED!.id,
      checkInDate: new Date("2026-04-05"),
      checkOutDate: new Date("2026-04-08"),
      adults: 2, children: 0,
      ratePerNight: 1200000,
      totalAmount: 1200000 * 3,
      depositAmount: 600000,
      source: "Direct",
    },
    {
      bookingNumber: "BK-2026-0006",
      guestId: guests[8].id,
      roomId: roomByNumber["403"].id,
      bookingStatusId: bsCONFIRMED!.id,
      checkInDate: new Date("2026-04-10"),
      checkOutDate: new Date("2026-04-15"),
      adults: 2, children: 2,
      ratePerNight: 1200000,
      totalAmount: 1200000 * 5,
      depositAmount: 1200000,
      source: "Booking.com",
    },
    // Đã trả phòng (CHECKED_OUT)
    {
      bookingNumber: "BK-2026-0007",
      guestId: guests[3].id,
      roomId: roomByNumber["202"].id,
      bookingStatusId: bsCHECKED_OUT!.id,
      checkInDate: new Date("2026-03-20"),
      checkOutDate: new Date("2026-03-25"),
      actualCheckIn: new Date("2026-03-20T14:00:00"),
      actualCheckOut: new Date("2026-03-25T11:00:00"),
      adults: 2, children: 0,
      ratePerNight: 800000,
      totalAmount: 800000 * 5,
      depositAmount: 800000,
      source: "Direct",
    },
    {
      bookingNumber: "BK-2026-0008",
      guestId: guests[5].id,
      roomId: roomByNumber["203"].id,
      bookingStatusId: bsCHECKED_OUT!.id,
      checkInDate: new Date("2026-03-22"),
      checkOutDate: new Date("2026-03-28"),
      actualCheckIn: new Date("2026-03-22T15:00:00"),
      actualCheckOut: new Date("2026-03-28T10:30:00"),
      adults: 1, children: 0,
      ratePerNight: 1200000,
      totalAmount: 1200000 * 6,
      depositAmount: 1200000,
      source: "Agoda",
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
  const bk1 = await prisma.booking.findUnique({ where: { bookingNumber: "BK-2026-0001" } });
  const bk3 = await prisma.booking.findUnique({ where: { bookingNumber: "BK-2026-0003" } });
  const bk7 = await prisma.booking.findUnique({ where: { bookingNumber: "BK-2026-0007" } });

  if (bk1) {
    await prisma.bookingService.createMany({
      data: [
        { bookingId: bk1.id, serviceItemId: siBREAKFAST!.id, quantity: 4, unitPrice: 120000, totalPrice: 480000, serviceDate: new Date("2026-03-30") },
        { bookingId: bk1.id, serviceItemId: siLAUNDRY!.id, quantity: 1, unitPrice: 50000, totalPrice: 50000, serviceDate: new Date("2026-03-31") },
      ],
      skipDuplicates: true,
    });
  }
  if (bk3) {
    await prisma.bookingService.createMany({
      data: [
        { bookingId: bk3.id, serviceItemId: siSPA!.id, quantity: 2, unitPrice: 350000, totalPrice: 700000, serviceDate: new Date("2026-03-31") },
        { bookingId: bk3.id, serviceItemId: siBREAKFAST!.id, quantity: 6, unitPrice: 120000, totalPrice: 720000, serviceDate: new Date("2026-04-01") },
      ],
      skipDuplicates: true,
    });
  }

  // Invoice + payment cho booking đã checkout
  if (bk7) {
    const existingInvoice = await prisma.invoice.findFirst({ where: { bookingId: bk7.id } });
    if (!existingInvoice) {
      const invoice = await prisma.invoice.create({
        data: {
          bookingId: bk7.id,
          subtotal: 4000000,
          taxAmount: 400000,
          discountAmount: 0,
          totalAmount: 4400000,
          isPaid: true,
          issuedAt: new Date("2026-03-25"),
        },
      });
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          paymentMethodId: pmCASH!.id,
          amount: 4400000,
          paidAt: new Date("2026-03-25T10:30:00"),
        },
      });
    }
  }

  console.log("✅ Seed complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
