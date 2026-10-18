import { db } from "./db";
import * as schema from "../shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Demo Seeding System
 * Creates a complete demo organization with realistic sample data for sales demos
 */

export const DEMO_ORG_SLUG = "demo-doorsurvey";
export const DEMO_USER_EMAIL = "demo@doorsurvey.com";

export async function seedDemoData() {
  console.log("🎬 Starting demo data seeding...");

  try {
    // 1. Create or find demo organization
    let demoOrg = await db.query.organizations.findFirst({
      where: eq(schema.organizations.slug, DEMO_ORG_SLUG),
    });

    if (!demoOrg) {
      [demoOrg] = await db.insert(schema.organizations).values({
        name: "DoorSurvey Demo Company",
        slug: DEMO_ORG_SLUG,
        subscriptionTier: "enterprise",
        subscriptionStatus: "active",
        isDemo: "yes",
        projectLimit: null, // Unlimited for demo
        userLimit: null,
        signatureName: "Sarah Johnson",
        signatureTitle: "Senior Project Manager",
        signaturePhone: "(555) 123-4567",
        signatureEmail: "sarah@doorsurvey.com",
        brandingColor: "#2563eb",
      }).returning();
      console.log("✅ Created demo organization");
    } else {
      console.log("✅ Found existing demo organization");
    }

    // 2. Create or find demo user
    let demoUser = await db.query.users.findFirst({
      where: eq(schema.users.email, DEMO_USER_EMAIL),
    });

    if (!demoUser) {
      [demoUser] = await db.insert(schema.users).values({
        email: DEMO_USER_EMAIL,
        firstName: "Demo",
        lastName: "User",
        role: "admin",
      }).returning();
      console.log("✅ Created demo user");
    } else {
      console.log("✅ Found existing demo user");
    }

    // 3. Create membership if doesn't exist
    const existingMembership = await db.query.memberships.findFirst({
      where: and(
        eq(schema.memberships.userId, demoUser.id),
        eq(schema.memberships.organizationId, demoOrg.id)
      ),
    });

    if (!existingMembership) {
      await db.insert(schema.memberships).values({
        userId: demoUser.id,
        organizationId: demoOrg.id,
        role: "owner",
      });
      console.log("✅ Created demo membership");
    }

    // 4. Create demo customers
    const customers = await seedCustomers(demoOrg.id);
    console.log(`✅ Created ${customers.length} demo customers`);

    // 5. Create demo projects
    const projects = await seedProjects(demoOrg.id, customers);
    console.log(`✅ Created ${projects.length} demo projects`);

    // 6. Create demo manufacturer contacts
    const mfgContacts = await seedManufacturerContacts(demoOrg.id);
    console.log(`✅ Created ${mfgContacts.length} demo manufacturer contacts`);

    // 7. Create demo openings for each project
    for (const project of projects) {
      const openings = await seedOpenings(project.id, demoOrg.id);
      console.log(`✅ Created ${openings.length} openings for project ${project.name}`);

      // 8. Create demo hardware for first few openings
      const sampleOpenings = openings.slice(0, 3);
      for (const opening of sampleOpenings) {
        const hardware = await seedHardware(opening.id, demoOrg.id);
        console.log(`  ✅ Created ${hardware.length} hardware items for opening ${opening.openingNumber}`);
      }
    }

    // 9. Create demo manufacturer quotes at various stages
    const quotes = await seedManufacturerQuotes(projects[0].id, mfgContacts[0].id, demoOrg.id);
    console.log(`✅ Created ${quotes.length} demo manufacturer quotes`);

    // 10. Create demo purchase orders
    const pos = await seedPurchaseOrders(projects[0].id, demoOrg.id, mfgContacts[0].id);
    console.log(`✅ Created ${pos.length} demo purchase orders`);

    // 11. Create demo sales leads
    const leads = await seedSalesLeads(demoOrg.id);
    console.log(`✅ Created ${leads.length} demo sales leads`);

    // 12. Create demo catalog items (showcasing hardware catalog)
    const catalogItems = await seedCatalogItems(demoOrg.id);
    console.log(`✅ Created ${catalogItems.length} demo catalog items`);

    // 13. Create demo marketing campaigns (showcasing sales features)
    const campaigns = await seedMarketingCampaigns(demoOrg.id);
    console.log(`✅ Created ${campaigns.length} demo marketing campaigns`);

    console.log("🎉 Demo data seeding complete!");
    return { demoOrg, demoUser };
  } catch (error) {
    console.error("❌ Error seeding demo data:", error);
    throw error;
  }
}

async function seedCustomers(organizationId: string) {
  const customerData = [
    {
      name: "Mercy Hospital System",
      type: "hospital-chain",
      contactName: "Dr. Michael Chen",
      contactEmail: "mchen@mercyhospital.com",
      contactPhone: "(555) 234-5678",
      preferredManufacturers: ["Assa Abloy", "Allegion", "Dormakaba"],
      notes: "Requires ADA and FGI compliance on all projects",
    },
    {
      name: "Grand Plaza Hotels",
      type: "hotel-chain",
      contactName: "Jennifer Martinez",
      contactEmail: "jmartinez@grandplaza.com",
      contactPhone: "(555) 345-6789",
      preferredManufacturers: ["Allegion", "Sargent"],
      notes: "Premium finishes preferred, quick turnaround needed",
    },
    {
      name: "StateWide Property Management",
      type: "property-management",
      contactName: "Robert Thompson",
      contactEmail: "rthompson@statewide.com",
      contactPhone: "(555) 456-7890",
      preferredManufacturers: ["Assa Abloy"],
      notes: "Cost-conscious, manages 50+ commercial buildings",
    },
  ];

  const customers = [];
  for (const data of customerData) {
    const [customer] = await db.insert(schema.customers).values({
      organizationId,
      ...data,
    }).returning();
    customers.push(customer);

    // Add locations for each customer
    await db.insert(schema.customerLocations).values([
      {
        customerId: customer.id,
        locationName: `${customer.name} - Main Campus`,
        address: "1234 Main St",
        city: "Chicago",
        state: "IL",
        zip: "60601",
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
      },
    ]);
  }

  return customers;
}

async function seedProjects(organizationId: string, customers: any[]) {
  const projectData = [
    {
      name: "Mercy Hospital - 3rd Floor Renovation",
      location: "1234 Main St, Chicago, IL 60601",
      buildingType: "hospital",
      applicableStandards: ["ADA", "IBC", "NFPA", "FGI"],
      status: "active",
      customerId: customers[0].id,
      notes: "Patient care area renovation - fire rating and ADA compliance critical",
      scopeOfWork: "Replace all doors and hardware on 3rd floor patient care wing. Install new automatic door operators for accessible entry points. Upgrade fire-rated assemblies to current code.",
      scopePowerByOthers: "yes",
      scopeFireAlarmByOthers: "yes",
    },
    {
      name: "Grand Plaza Hotel - Main Entrance Upgrade",
      location: "5678 Oak Avenue, Los Angeles, CA 90001",
      buildingType: "hotel",
      applicableStandards: ["ADA", "IBC", "ANSI/BHMA"],
      status: "active",
      customerId: customers[1].id,
      notes: "High-traffic entrance requiring durable, premium finishes",
      scopeOfWork: "Complete main entrance renovation including automatic sliding doors, vestibule, and interior lobby doors. All hardware to be premium commercial grade with US32D finish.",
      scopePowerByOthers: "no",
    },
    {
      name: "StateWide - Office Building Core Retrofit",
      location: "9101 Business Park Dr, Houston, TX 77001",
      buildingType: "office",
      applicableStandards: ["ADA", "IBC", "ANSI/SDI"],
      status: "completed",
      customerId: customers[2].id,
      notes: "Budget-conscious retrofit of aging building",
      scopeOfWork: "Replace deteriorated doors and frames in building core. Reuse existing hardware where possible. Update closers and panic devices for current code compliance.",
      scopeDemolitionByOthers: "yes",
      scopePatchingByOthers: "yes",
      scopePaintingByOthers: "yes",
    },
  ];

  const projects = [];
  for (const data of projectData) {
    const [project] = await db.insert(schema.projects).values({
      organizationId,
      ...data,
    }).returning();
    projects.push(project);
  }

  return projects;
}

async function seedManufacturerContacts(organizationId: string) {
  const contacts = [
    {
      manufacturerName: "Assa Abloy North America",
      contactName: "David Wilson",
      email: "dwilson@assaabloy.com",
      phone: "(555) 111-2222",
      role: "sales",
      notes: "Complete door solutions, electrified hardware",
    },
    {
      manufacturerName: "Allegion Commercial",
      contactName: "Lisa Anderson",
      email: "landerson@allegion.com",
      phone: "(555) 222-3333",
      role: "sales",
      notes: "Von Duprin panic hardware, LCN closers",
    },
    {
      manufacturerName: "Dormakaba USA",
      contactName: "James Rodriguez",
      email: "jrodriguez@dormakaba.com",
      phone: "(555) 333-4444",
      role: "sales",
      notes: "Automatic door operators, access control",
    },
  ];

  const mfgContacts = [];
  for (const data of contacts) {
    const [contact] = await db.insert(schema.manufacturerContacts).values({
      organizationId,
      ...data,
    }).returning();
    mfgContacts.push(contact);
  }

  return mfgContacts;
}

async function seedOpenings(projectId: string, organizationId: string) {
  const openingData = [
    {
      openingNumber: "101",
      location: "Main Lobby Entrance",
      markNumber: "101",
      building: "Main Building",
      floor: "1",
      roomNumber: "101",
      roomName: "Main Lobby Entrance",
      doorType: "pair",
      doorMaterial: "aluminum-glass",
      doorWidth: "36",
      doorHeight: "84",
      doorThickness: "1-3/4",
      frameType: "aluminum",
      frameDepth: "5-1/2",
      fireRating: "none",
      smokeRating: "no",
      existingCondition: "poor",
      isAccessible: "yes",
      swingDirection: "out",
      isAutomated: "yes",
      automationType: "low-energy-operator",
      accessControlType: "card-reader",
    },
    {
      openingNumber: "102",
      location: "Conference Room A",
      markNumber: "102",
      building: "Main Building",
      floor: "1",
      roomNumber: "102",
      roomName: "Conference Room A",
      doorType: "single",
      doorMaterial: "wood",
      doorWidth: "36",
      doorHeight: "84",
      doorThickness: "1-3/4",
      frameType: "hollow-metal",
      frameDepth: "4-7/8",
      fireRating: "60-min",
      smokeRating: "yes",
      existingCondition: "fair",
      isAccessible: "yes",
      swingDirection: "in",
      isAutomated: "no",
    },
    {
      openingNumber: "103",
      location: "Storage Closet",
      markNumber: "103",
      building: "Main Building",
      floor: "1",
      roomNumber: "103",
      roomName: "Storage Closet",
      doorType: "single",
      doorMaterial: "wood",
      doorWidth: "30",
      doorHeight: "84",
      doorThickness: "1-3/8",
      frameType: "hollow-metal",
      frameDepth: "4-7/8",
      fireRating: "none",
      smokeRating: "no",
      existingCondition: "good",
      isAccessible: "no",
      swingDirection: "out",
      isAutomated: "no",
    },
    {
      openingNumber: "201",
      location: "Executive Office",
      markNumber: "201",
      building: "Main Building",
      floor: "2",
      roomNumber: "201",
      roomName: "Executive Office",
      doorType: "single",
      doorMaterial: "wood",
      doorWidth: "36",
      doorHeight: "84",
      doorThickness: "1-3/4",
      frameType: "wood",
      frameDepth: "4-9/16",
      fireRating: "20-min",
      smokeRating: "no",
      existingCondition: "good",
      isAccessible: "yes",
      swingDirection: "in",
      isAutomated: "no",
    },
    {
      openingNumber: "E-1",
      location: "Emergency Exit - East",
      markNumber: "E-1",
      building: "Main Building",
      floor: "1",
      roomNumber: "EXIT",
      roomName: "Emergency Exit - East",
      doorType: "single",
      doorMaterial: "hollow-metal",
      doorWidth: "36",
      doorHeight: "84",
      doorThickness: "1-3/4",
      frameType: "hollow-metal",
      frameDepth: "5-1/2",
      fireRating: "90-min",
      smokeRating: "yes",
      existingCondition: "fair",
      isAccessible: "yes",
      swingDirection: "out",
      isAutomated: "no",
    },
  ];

  const valuesToInsert = openingData.map(data => ({
    projectId,
    organizationId,
    ...data,
  }));

  const openings = await db.insert(schema.doorOpenings).values(valuesToInsert).returning();
  return openings;
}

async function seedHardware(openingId: string, organizationId: string) {
  const hardwareData = [
    {
      itemType: "hinge",
      manufacturer: "McKinney",
      model: "TA2714",
      description: "4-1/2\" x 4-1/2\" ball bearing hinge",
      finish: "US26D",
      quantity: "3",
      condition: "new",
      constructionKeyQty: 0,
      permanentKeyQty: 0,
    },
    {
      itemType: "lock",
      manufacturer: "Schlage",
      model: "ND80PD",
      description: "Heavy duty cylindrical lock, classroom function",
      finish: "US26D",
      quantity: "1",
      condition: "new",
      cylinderType: "SFIC",
      cylinderBrand: "Best",
      constructionKeyQty: 2,
      permanentKeyQty: 3,
      keyingRemarks: "Keyed to master key system A",
    },
    {
      itemType: "closer",
      manufacturer: "LCN",
      model: "4111",
      description: "Surface mounted door closer, regular arm",
      finish: "US26D",
      quantity: "1",
      condition: "new",
      laborHours: 0.5,
    },
    {
      itemType: "exit-device",
      manufacturer: "Von Duprin",
      model: "99-L-06",
      description: "Rim exit device with lever trim",
      finish: "US26D",
      quantity: "1",
      condition: "new",
      listPrice: 485.00,
      discountPercent: 40,
      leadTimeDays: 35,
    },
  ];

  const valuesToInsert = hardwareData.map(data => ({
    openingId,
    organizationId,
    ...data,
  }));

  const hardware = await db.insert(schema.hardwareItems).values(valuesToInsert).returning();
  return hardware;
}

async function seedManufacturerQuotes(projectId: string, manufacturerContactId: string, organizationId: string) {
  const quoteData = [
    {
      reviewStatus: "pending_review",
      responseNotes: "Need pricing for complete 3rd floor renovation including all doors, frames, and hardware",
      submittedForReviewAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      reviewStatus: "approved",
      responseNotes: "Hardware package for main entrance upgrade",
      submittedForReviewAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      reviewedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      reviewedBy: "Engineering Team",
      reviewNotes: "Approved - specifications meet project requirements",
      customerApprovalStatus: "approved",
      customerApprovalTier: "standard",
      paymentStatus: "paid",
      paymentAmount: 12500.00,
    },
    {
      reviewStatus: "needs_revision",
      responseNotes: "Door and frame package for office retrofit",
      submittedForReviewAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      reviewedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      reviewedBy: "Engineering Team",
      reviewNotes: "Fire rating documentation needed for Frame-04",
    },
  ];

  const quotes = [];
  for (const data of quoteData) {
    const [quote] = await db.insert(schema.quoteRequests).values({
      projectId,
      manufacturerContactId,
      ...data,
    }).returning();
    quotes.push(quote);
  }

  return quotes;
}

async function seedPurchaseOrders(projectId: string, organizationId: string, vendorContactId: string) {
  const poData = [
    {
      poNumber: "PO-2025-001",
      totalAmount: 25750.00,
      status: "approved",
      notes: "Main entrance hardware package - expedited delivery requested",
      shipToAddress: "1234 Main St, Chicago, IL 60601",
      subtotal: 23500.00,
      taxAmount: 2250.00,
    },
  ];

  const pos = [];
  for (const data of poData) {
    const [po] = await db.insert(schema.purchaseOrders).values({
      projectId,
      vendorContactId,
      ...data,
    }).returning();
    pos.push(po);
  }

  return pos;
}

async function seedSalesLeads(organizationId: string) {
  const leadData = [
    {
      companyName: "Riverside Medical Center",
      contactName: "Dr. Emily Roberts",
      email: "eroberts@riversidemedical.com",
      phone: "(555) 987-6543",
      source: "website",
      status: "new",
      estimatedValue: 75000,
      projectDescription: "Emergency department entrance renovation - 8 automatic doors needed",
      notes: "Urgent project - construction starts in 60 days",
    },
    {
      companyName: "Pacific Coast Hotels",
      contactName: "Marcus Johnson",
      email: "mjohnson@pacificcoast.com",
      phone: "(555) 876-5432",
      source: "referral",
      status: "contacted",
      estimatedValue: 45000,
      projectDescription: "Lobby renovation for flagship property",
      notes: "Interested in premium finishes, requested quote by end of week",
    },
    {
      companyName: "Metro School District",
      contactName: "Sarah Williams",
      email: "swilliams@metroschools.edu",
      phone: "(555) 765-4321",
      source: "cold-outreach",
      status: "qualified",
      estimatedValue: 120000,
      projectDescription: "District-wide door and hardware upgrade program - 3 buildings",
      notes: "Budget approved, ready for proposal. ADA compliance is priority.",
    },
    {
      companyName: "Summit Office Park",
      contactName: "Tom Anderson",
      email: "tanderson@summitoffice.com",
      phone: "(555) 654-3210",
      source: "website",
      status: "proposal",
      estimatedValue: 32000,
      projectDescription: "Replace aging entrance doors and access control system",
      notes: "Proposal sent 3 days ago, follow-up scheduled for tomorrow",
    },
  ];

  const leads = [];
  for (const data of leadData) {
    const [lead] = await db.insert(schema.leads).values({
      organizationId,
      ...data,
    }).returning();
    leads.push(lead);
  }

  return leads;
}

async function seedCatalogItems(organizationId: string) {
  const catalogData = [
    {
      category: "hardware",
      manufacturer: "McKinney",
      model: "TA2714",
      specifications: "4-1/2\" x 4-1/2\" ball bearing hinge, ANSI/BHMA A156.1 Grade 1",
      notes: "Heavy-weight hinge for high-traffic commercial applications",
      requiresQuote: "no",
    },
    {
      category: "hardware",
      manufacturer: "Schlage",
      model: "ND80PD",
      specifications: "Heavy duty cylindrical lock, ANSI/BHMA A156.2 Grade 1",
      notes: "Classroom function, compatible with SFIC cores",
      requiresQuote: "no",
    },
    {
      category: "hardware",
      manufacturer: "LCN",
      model: "4111",
      specifications: "Surface mounted closer, ANSI/BHMA A156.4 Grade 1, ADA compliant",
      notes: "Standard commercial closer with adjustable spring",
      requiresQuote: "no",
    },
    {
      category: "hardware",
      manufacturer: "Von Duprin",
      model: "99-L-06",
      specifications: "Rim exit device, ANSI/BHMA A156.3 Grade 1, UL Listed",
      notes: "Fire-rated for 3-hour doors",
      requiresQuote: "yes",
    },
    {
      category: "automation",
      manufacturer: "Dormakaba",
      model: "ED100",
      specifications: "Low energy door operator, ANSI/BHMA A156.19, UL 325 compliant",
      notes: "ADA compliant automatic operator, push side mount",
      requiresQuote: "yes",
    },
  ];

  const catalogItems = [];
  for (const data of catalogData) {
    const [item] = await db.insert(schema.catalogItems).values({
      organizationId,
      ...data,
    }).returning();
    catalogItems.push(item);
  }

  return catalogItems;
}

async function seedMarketingCampaigns(organizationId: string) {
  const campaignData = [
    {
      name: "Hospital Door Solutions 2025",
      type: "email",
      status: "active",
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
      budget: 5000.00,
      leadsGenerated: 48,
      conversions: 23,
      revenue: 67500.00,
      notes: "Focus on ADA compliance and fire safety - performing well with healthcare audience",
    },
    {
      name: "Hotel Entrance Upgrades",
      type: "content-marketing",
      status: "active",
      startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      budget: 3500.00,
      leadsGenerated: 31,
      conversions: 15,
      revenue: 42000.00,
      notes: "Highlighting automatic entrance solutions for hospitality sector",
    },
  ];

  const campaigns = [];
  for (const data of campaignData) {
    const [campaign] = await db.insert(schema.marketingCampaigns).values({
      organizationId,
      ...data,
    }).returning();
    campaigns.push(campaign);
  }

  return campaigns;
}

export async function resetDemoData() {
  console.log("🔄 Resetting demo data...");

  const demoOrg = await db.query.organizations.findFirst({
    where: eq(schema.organizations.slug, DEMO_ORG_SLUG),
  });

  if (!demoOrg) {
    console.log("⚠️  No demo organization found");
    return;
  }

  // Delete all demo data (cascades will handle related records)
  await db.delete(schema.organizations).where(eq(schema.organizations.id, demoOrg.id));
  
  console.log("✅ Demo data deleted");
  
  // Re-seed
  await seedDemoData();
  console.log("✅ Demo data reset complete");
}
