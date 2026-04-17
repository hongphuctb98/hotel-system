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
  const [bsPENDING, bsCONFIRMED, bsCHECKED_IN, bsCHECKED_OUT, bsCANCELLED, bsNO_SHOW] = await Promise.all([
    prisma.bookingStatus.findUnique({ where: { code: "PENDING" } }),
    prisma.bookingStatus.findUnique({ where: { code: "CONFIRMED" } }),
    prisma.bookingStatus.findUnique({ where: { code: "CHECKED_IN" } }),
    prisma.bookingStatus.findUnique({ where: { code: "CHECKED_OUT" } }),
    prisma.bookingStatus.findUnique({ where: { code: "CANCELLED" } }),
    prisma.bookingStatus.findUnique({ where: { code: "NO_SHOW" } }),
  ]);
  const [pmCASH, pmCARD, pmBANK, pmQR] = await Promise.all([
    prisma.paymentMethod.findUnique({ where: { code: "CASH" } }),
    prisma.paymentMethod.findUnique({ where: { code: "CREDIT_CARD" } }),
    prisma.paymentMethod.findUnique({ where: { code: "BANK_TRANSFER" } }),
    prisma.paymentMethod.findUnique({ where: { code: "QR_PAYMENT" } }),
  ]);
  const [siBREAKFAST, siLAUNDRY, siSPA, siMINIBAR, siEXTRA_BED, siAIRPORT_TRANSFER] = await Promise.all([
    prisma.serviceItem.findUnique({ where: { code: "BREAKFAST" } }),
    prisma.serviceItem.findUnique({ where: { code: "LAUNDRY" } }),
    prisma.serviceItem.findUnique({ where: { code: "SPA" } }),
    prisma.serviceItem.findUnique({ where: { code: "MINIBAR" } }),
    prisma.serviceItem.findUnique({ where: { code: "EXTRA_BED" } }),
    prisma.serviceItem.findUnique({ where: { code: "AIRPORT_TRANSFER" } }),
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
    where: {
      number: {
        in: ["101", "102", "103", "104", "201", "202", "203", "204", "301", "302", "303", "304", "401", "402", "403", "404"],
      },
    },
  });
  const roomByNumber = Object.fromEntries(rooms.map((r) => [r.number, r]));

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
      note: "Room-map reserved test",
      invoice: {
        invoiceNumber: "INV-SMP-0102-01",
        subtotal: 3200000,
        taxAmount: 320000,
        discountAmount: 0,
        totalAmount: 3520000,
        isPaid: false,
        issuedAt: atDayOffset(-1, 15),
        payments: [],
      },
      services: [],
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
      note: "Room-map checked-in test",
      invoice: {
        invoiceNumber: "INV-SMP-0201-01",
        subtotal: 3490000,
        taxAmount: 349000,
        discountAmount: 0,
        totalAmount: 3839000,
        isPaid: false,
        issuedAt: atDayOffset(-2, 15),
        payments: [
          { paymentMethodId: pmCASH!.id, amount: 1500000, paidAt: atDayOffset(-2, 16), note: "Deposit" },
          { paymentMethodId: pmQR!.id, amount: 500000, paidAt: atDayOffset(0, 10), note: "Additional payment" },
        ],
      },
      services: [
        { serviceItemId: siBREAKFAST!.id, quantity: 2, unitPrice: 120000, totalPrice: 240000, serviceDate: atDayOffset(-1, 8) },
        { serviceItemId: siLAUNDRY!.id, quantity: 1, unitPrice: 50000, totalPrice: 50000, serviceDate: atDayOffset(0, 9) },
      ],
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
      note: "Extra occupied sample",
      invoice: {
        invoiceNumber: "INV-SMP-0202-01",
        subtotal: 2190000,
        taxAmount: 219000,
        discountAmount: 0,
        totalAmount: 2409000,
        isPaid: false,
        issuedAt: atDayOffset(-1, 16),
        payments: [
          { paymentMethodId: pmCARD!.id, amount: 1000000, paidAt: atDayOffset(-1, 17), note: "Advance payment" },
        ],
      },
      services: [
        { serviceItemId: siSPA!.id, quantity: 1, unitPrice: 350000, totalPrice: 350000, serviceDate: atDayOffset(0, 14) },
        { serviceItemId: siBREAKFAST!.id, quantity: 2, unitPrice: 120000, totalPrice: 240000, serviceDate: atDayOffset(0, 7) },
      ],
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
      invoice: {
        invoiceNumber: "INV-SMP-0401-01",
        subtotal: 12500000,
        taxAmount: 1250000,
        discountAmount: 0,
        totalAmount: 13750000,
        isPaid: false,
        issuedAt: atDayOffset(-2, 16),
        payments: [
          { paymentMethodId: pmBANK!.id, amount: 7000000, paidAt: atDayOffset(-2, 17), note: "Corporate transfer" },
          { paymentMethodId: pmCARD!.id, amount: 3000000, paidAt: atDayOffset(-1, 19), note: "Card guarantee" },
        ],
      },
      services: [
        { serviceItemId: siAIRPORT_TRANSFER!.id, quantity: 1, unitPrice: 250000, totalPrice: 250000, serviceDate: atDayOffset(-2, 12) },
      ],
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
      note: "Future reservation test",
      invoice: {
        invoiceNumber: "INV-SMP-0303-01",
        subtotal: 5400000,
        taxAmount: 540000,
        discountAmount: 0,
        totalAmount: 5940000,
        isPaid: false,
        issuedAt: atDayOffset(0, 9),
        payments: [],
      },
      services: [],
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
      invoice: {
        invoiceNumber: "INV-SMP-0204-01",
        subtotal: 3600000,
        taxAmount: 360000,
        discountAmount: 0,
        totalAmount: 3960000,
        isPaid: true,
        issuedAt: atDayOffset(0, 10),
        payments: [
          { paymentMethodId: pmCASH!.id, amount: 3960000, paidAt: atDayOffset(0, 10, 30), note: "Checkout settlement" },
        ],
      },
      services: [],
    },
    // Past completed booking
    {
      bookingNumber: "BK-SAMPLE-0101",
      guestId: guests[1].id,
      roomId: roomByNumber["101"].id,
      bookingStatusId: bsCHECKED_OUT!.id,
      checkInDate: atDayOffset(-6, 14),
      checkOutDate: atDayOffset(-4, 11),
      actualCheckIn: atDayOffset(-6, 14),
      actualCheckOut: atDayOffset(-4, 11),
      adults: 2,
      children: 0,
      baseRate: 800000,
      totalAmount: 1600000,
      depositAmount: 500000,
      source: "Booking.com",
      invoice: {
        invoiceNumber: "INV-SMP-0101-01",
        subtotal: 1770000,
        taxAmount: 177000,
        discountAmount: 50000,
        totalAmount: 1897000,
        isPaid: true,
        issuedAt: atDayOffset(-4, 9),
        payments: [
          { paymentMethodId: pmQR!.id, amount: 500000, paidAt: atDayOffset(-6, 15), note: "Deposit" },
          { paymentMethodId: pmCARD!.id, amount: 1397000, paidAt: atDayOffset(-4, 10), note: "Final settlement" },
        ],
      },
      services: [
        { serviceItemId: siBREAKFAST!.id, quantity: 1, unitPrice: 120000, totalPrice: 120000, serviceDate: atDayOffset(-5, 8) },
      ],
    },
    // Future confirmed booking with deposit
    {
      bookingNumber: "BK-SAMPLE-0103",
      guestId: guests[3].id,
      roomId: roomByNumber["103"].id,
      bookingStatusId: bsCONFIRMED!.id,
      checkInDate: atDayOffset(1, 14),
      checkOutDate: atDayOffset(3, 11),
      adults: 2,
      children: 0,
      baseRate: 800000,
      totalAmount: 1600000,
      depositAmount: 400000,
      source: "Website",
      invoice: {
        invoiceNumber: "INV-SMP-0103-01",
        subtotal: 1600000,
        taxAmount: 160000,
        discountAmount: 0,
        totalAmount: 1760000,
        isPaid: false,
        issuedAt: atDayOffset(0, 14),
        payments: [
          { paymentMethodId: pmQR!.id, amount: 400000, paidAt: atDayOffset(0, 14, 30), note: "Deposit" },
        ],
      },
      services: [],
    },
    // Cancelled reservation
    {
      bookingNumber: "BK-SAMPLE-0104",
      guestId: guests[8].id,
      roomId: roomByNumber["104"].id,
      bookingStatusId: bsCANCELLED!.id,
      checkInDate: atDayOffset(2, 14),
      checkOutDate: atDayOffset(4, 11),
      adults: 1,
      children: 0,
      baseRate: 800000,
      totalAmount: 1600000,
      depositAmount: 0,
      source: "Travel Agent",
      note: "Cancelled sample reservation",
      invoice: {
        invoiceNumber: "INV-SMP-0104-01",
        subtotal: 1600000,
        taxAmount: 160000,
        discountAmount: 0,
        totalAmount: 1760000,
        isPaid: false,
        issuedAt: atDayOffset(0, 10),
        payments: [],
      },
      services: [],
    },
    // Today's arrival
    {
      bookingNumber: "BK-SAMPLE-0203",
      guestId: guests[9].id,
      roomId: roomByNumber["203"].id,
      bookingStatusId: bsCONFIRMED!.id,
      checkInDate: atDayOffset(0, 14),
      checkOutDate: atDayOffset(2, 11),
      adults: 2,
      children: 0,
      baseRate: 1200000,
      totalAmount: 2400000,
      depositAmount: 1200000,
      source: "Corporate",
      invoice: {
        invoiceNumber: "INV-SMP-0203-01",
        subtotal: 2400000,
        taxAmount: 240000,
        discountAmount: 0,
        totalAmount: 2640000,
        isPaid: false,
        issuedAt: atDayOffset(0, 8),
        payments: [
          { paymentMethodId: pmBANK!.id, amount: 1200000, paidAt: atDayOffset(0, 9), note: "Deposit" },
        ],
      },
      services: [],
    },
    // In-house deluxe booking
    {
      bookingNumber: "BK-SAMPLE-0301",
      guestId: guests[0].id,
      roomId: roomByNumber["301"].id,
      bookingStatusId: bsCHECKED_IN!.id,
      checkInDate: atDayOffset(-3, 14),
      checkOutDate: atDayOffset(1, 11),
      actualCheckIn: atDayOffset(-3, 14),
      adults: 2,
      children: 1,
      baseRate: 1200000,
      totalAmount: 4800000,
      depositAmount: 1000000,
      source: "Expedia",
      invoice: {
        invoiceNumber: "INV-SMP-0301-01",
        subtotal: 5240000,
        taxAmount: 524000,
        discountAmount: 0,
        totalAmount: 5764000,
        isPaid: false,
        issuedAt: atDayOffset(-3, 15),
        payments: [
          { paymentMethodId: pmCARD!.id, amount: 2000000, paidAt: atDayOffset(-3, 16), note: "Guarantee card" },
        ],
      },
      services: [
        { serviceItemId: siBREAKFAST!.id, quantity: 2, unitPrice: 120000, totalPrice: 240000, serviceDate: atDayOffset(-2, 8) },
        { serviceItemId: siMINIBAR!.id, quantity: 2, unitPrice: 30000, totalPrice: 60000, serviceDate: atDayOffset(-1, 21) },
        { serviceItemId: siEXTRA_BED!.id, quantity: 1, unitPrice: 200000, totalPrice: 200000, serviceDate: atDayOffset(-3, 15) },
      ],
    },
    // Checkout today but not fully paid
    {
      bookingNumber: "BK-SAMPLE-0302",
      guestId: guests[2].id,
      roomId: roomByNumber["302"].id,
      bookingStatusId: bsCHECKED_IN!.id,
      checkInDate: atDayOffset(-1, 14),
      checkOutDate: atDayOffset(0, 11),
      actualCheckIn: atDayOffset(-1, 14),
      adults: 2,
      children: 0,
      baseRate: 1200000,
      totalAmount: 1200000,
      depositAmount: 0,
      source: "Walk-in",
      invoice: {
        invoiceNumber: "INV-SMP-0302-01",
        subtotal: 1290000,
        taxAmount: 129000,
        discountAmount: 0,
        totalAmount: 1419000,
        isPaid: false,
        issuedAt: atDayOffset(-1, 14, 30),
        payments: [],
      },
      services: [
        { serviceItemId: siMINIBAR!.id, quantity: 3, unitPrice: 30000, totalPrice: 90000, serviceDate: atDayOffset(-1, 22) },
      ],
    },
    // Pending future booking
    {
      bookingNumber: "BK-SAMPLE-0304",
      guestId: guests[5].id,
      roomId: roomByNumber["304"].id,
      bookingStatusId: bsPENDING!.id,
      checkInDate: atDayOffset(5, 14),
      checkOutDate: atDayOffset(7, 11),
      adults: 2,
      children: 2,
      baseRate: 1800000,
      totalAmount: 3600000,
      depositAmount: 0,
      source: "Phone",
      invoice: {
        invoiceNumber: "INV-SMP-0304-01",
        subtotal: 3600000,
        taxAmount: 360000,
        discountAmount: 0,
        totalAmount: 3960000,
        isPaid: false,
        issuedAt: atDayOffset(0, 11),
        payments: [],
      },
      services: [],
    },
    // No-show booking
    {
      bookingNumber: "BK-SAMPLE-0402",
      guestId: guests[6].id,
      roomId: roomByNumber["402"].id,
      bookingStatusId: bsNO_SHOW!.id,
      checkInDate: atDayOffset(-1, 14),
      checkOutDate: atDayOffset(1, 11),
      adults: 1,
      children: 0,
      baseRate: 2500000,
      totalAmount: 5000000,
      depositAmount: 0,
      source: "Website",
      note: "No-show sample",
      invoice: {
        invoiceNumber: "INV-SMP-0402-01",
        subtotal: 5000000,
        taxAmount: 500000,
        discountAmount: 0,
        totalAmount: 5500000,
        isPaid: false,
        issuedAt: atDayOffset(-1, 10),
        payments: [],
      },
      services: [],
    },
    // Past completed deluxe booking
    {
      bookingNumber: "BK-SAMPLE-0403",
      guestId: guests[7].id,
      roomId: roomByNumber["403"].id,
      bookingStatusId: bsCHECKED_OUT!.id,
      checkInDate: atDayOffset(-3, 14),
      checkOutDate: atDayOffset(-1, 11),
      actualCheckIn: atDayOffset(-3, 14),
      actualCheckOut: atDayOffset(-1, 11),
      adults: 2,
      children: 0,
      baseRate: 1200000,
      totalAmount: 2400000,
      depositAmount: 500000,
      source: "Agoda",
      invoice: {
        invoiceNumber: "INV-SMP-0403-01",
        subtotal: 2400000,
        taxAmount: 240000,
        discountAmount: 0,
        totalAmount: 2640000,
        isPaid: true,
        issuedAt: atDayOffset(-1, 9),
        payments: [
          { paymentMethodId: pmCASH!.id, amount: 500000, paidAt: atDayOffset(-3, 15), note: "Deposit" },
          { paymentMethodId: pmCARD!.id, amount: 2140000, paidAt: atDayOffset(-1, 9, 30), note: "Final settlement" },
        ],
      },
      services: [],
    },
    // Another future reservation
    {
      bookingNumber: "BK-SAMPLE-0404",
      guestId: guests[4].id,
      roomId: roomByNumber["404"].id,
      bookingStatusId: bsCONFIRMED!.id,
      checkInDate: atDayOffset(2, 14),
      checkOutDate: atDayOffset(4, 11),
      adults: 2,
      children: 0,
      baseRate: 1200000,
      totalAmount: 2400000,
      depositAmount: 500000,
      source: "Direct",
      invoice: {
        invoiceNumber: "INV-SMP-0404-01",
        subtotal: 2400000,
        taxAmount: 240000,
        discountAmount: 0,
        totalAmount: 2640000,
        isPaid: false,
        issuedAt: atDayOffset(0, 13),
        payments: [
          { paymentMethodId: pmCASH!.id, amount: 500000, paidAt: atDayOffset(0, 13, 30), note: "Deposit" },
        ],
      },
      services: [],
    },
  ];

  for (const b of bookingDefs) {
    const { invoice, services, ...bookingData } = b;
    void invoice;
    void services;
    await prisma.booking.upsert({
      where: { bookingNumber: bookingData.bookingNumber },
      update: {
        guestId: bookingData.guestId,
        roomId: bookingData.roomId,
        bookingStatusId: bookingData.bookingStatusId,
        checkInDate: bookingData.checkInDate,
        checkOutDate: bookingData.checkOutDate,
        actualCheckIn: bookingData.actualCheckIn ?? null,
        actualCheckOut: bookingData.actualCheckOut ?? null,
        adults: bookingData.adults,
        children: bookingData.children,
        baseRate: bookingData.baseRate,
        totalAmount: bookingData.totalAmount,
        depositAmount: bookingData.depositAmount,
        source: bookingData.source,
        note: bookingData.note ?? null,
      },
      create: bookingData,
    });
  }
  const seededBookings = await prisma.booking.findMany({
    where: { bookingNumber: { in: bookingDefs.map((b) => b.bookingNumber) } },
    select: { id: true, bookingNumber: true },
  });
  const seededBookingByNumber = Object.fromEntries(seededBookings.map((b) => [b.bookingNumber, b]));

  for (const bookingDef of bookingDefs) {
    const booking = seededBookingByNumber[bookingDef.bookingNumber];
    if (!booking) continue;

    await prisma.bookingService.deleteMany({ where: { bookingId: booking.id } });
    if (bookingDef.services.length > 0) {
      await prisma.bookingService.createMany({
        data: bookingDef.services.map((service) => ({
          bookingId: booking.id,
          ...service,
        })),
      });
    }

    const existingInvoices = await prisma.invoice.findMany({
      where: { bookingId: booking.id },
      select: { id: true },
    });
    if (existingInvoices.length > 0) {
      await prisma.payment.deleteMany({
        where: { invoiceId: { in: existingInvoices.map((invoice) => invoice.id) } },
      });
      await prisma.invoice.deleteMany({ where: { bookingId: booking.id } });
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: bookingDef.invoice.invoiceNumber,
        bookingId: booking.id,
        subtotal: bookingDef.invoice.subtotal,
        taxAmount: bookingDef.invoice.taxAmount,
        discountAmount: bookingDef.invoice.discountAmount,
        totalAmount: bookingDef.invoice.totalAmount,
        isPaid: bookingDef.invoice.isPaid,
        issuedAt: bookingDef.invoice.issuedAt,
      },
    });

    if (bookingDef.invoice.payments.length > 0) {
      await prisma.payment.createMany({
        data: bookingDef.invoice.payments.map((payment) => ({
          invoiceId: invoice.id,
          ...payment,
        })),
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
