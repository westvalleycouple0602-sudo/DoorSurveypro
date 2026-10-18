/**
 * Import Sample Door Openings Dataset
 * 
 * This script imports sample door opening data from the JSON file
 * and creates them in a demo project for testing and demonstration purposes.
 */

import { db } from "./db";
import { projects, doorOpenings } from "@shared/schema";
import { readFile } from "fs/promises";
import { join } from "path";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";

interface SampleOpening {
  id: string;
  type: string;
  door: {
    space_type: string;
    is_fire_door: string;
    is_accessible_route: boolean;
    is_interior: boolean;
    is_egress_required: boolean;
    location_zone: string;
  };
  geometry: {
    clear_width_in: number;
    leaf_height_in: number;
    undercut_in: number;
    edge_gap_in: number;
  };
  threshold: {
    height_in: number;
    beveled: boolean;
    bevel_slope_ratio: number;
  };
  hardware: {
    role: string;
    category: string;
    height_aff: number;
    features: string[];
    closer_present: boolean;
    positive_latch: boolean;
  };
  labels_docs: {
    ul_markings: string;
  };
  electrical: {
    device_type: string;
    fire_alarm_interface: boolean;
  };
  finish: {
    lock: string;
    hinge: string;
    plate: string;
    closer: string;
    exit_device: string;
  };
  notes: string;
}

// Map JSON hardware categories to our database format
function mapHardwareCategory(category: string): string {
  const mapping: Record<string, string> = {
    'exit_device': 'panic bar',
    'lever': 'lever handle',
    'pull': 'pull handle',
  };
  return mapping[category] || category;
}

// Map JSON fire door values to our fire rating format
// Note: Sample data only indicates if door is fire-rated (interior/exterior),
// not the actual rating duration. Return null to let users specify accurate ratings.
function mapFireRating(fireRating: string): string | null {
  // If specific ratings like "20-min", "60-min", "90-min" exist in data, map them
  if (fireRating && fireRating.includes('-min')) {
    return fireRating;
  }
  // For generic "interior" or "exterior" indicators, return null (more accurate than assuming)
  return null;
}

// Map space type to room name
function mapSpaceTypeToRoomName(spaceType: string): string {
  const mapping: Record<string, string> = {
    'A': 'Assembly',
    'B': 'Business',
    'E': 'Educational',
    'F': 'Factory/Industrial',
    'H': 'High Hazard',
    'I': 'Institutional',
    'M': 'Mercantile',
    'R': 'Residential',
    'S': 'Storage',
    'U': 'Utility',
  };
  return mapping[spaceType] || spaceType;
}

// Map electrical device type
function mapElectricalDevice(deviceType: string, fireAlarmInterface: boolean): string | null {
  if (deviceType === 'maglock') {
    return fireAlarmInterface ? 'Electromagnetic Lock with Fire Alarm Release' : 'Electromagnetic Lock';
  }
  if (deviceType === 'none') {
    return null;
  }
  return deviceType;
}

async function seedSampleOpenings() {
  console.log("🚀 Starting sample openings import...");
  
  // CRITICAL: Prevent execution in production to avoid cross-tenant data corruption
  if (process.env.NODE_ENV === 'production') {
    throw new Error('❌ Sample data import cannot run in production environment. This script is for development/testing only.');
  }
  
  try {
    // 1. Find or create the sample project
    const orgId = 'dev-org-001'; // Development organization (safe only in dev mode)
    
    logger.info('Sample openings import starting', { 
      environment: process.env.NODE_ENV || 'development',
      organizationId: orgId 
    });
    
    // Check if sample project exists (scoped to dev organization for multi-tenant safety)
    let project = await db.query.projects.findFirst({
      where: and(
        eq(projects.name, "Sample Commercial Building"),
        eq(projects.organizationId, orgId)
      )
    });

    if (!project) {
      console.log("📦 Creating sample project...");
      [project] = await db.insert(projects).values({
        organizationId: orgId,
        name: "Sample Commercial Building",
        location: "123 Main Street, Sample City, SC 12345",
        buildingType: "office",
        status: "active",
        notes: "Sample project with imported door opening data for demonstration and testing",
      }).returning();
      console.log(`✅ Created project: ${project.id}`);
    } else {
      console.log(`✅ Using existing project: ${project.id}`);
    }

    // 2. Read the sample data file
    const filePath = join(process.cwd(), 'attached_assets', 'sample_openings_dataset_1762300646840.json');
    console.log(`📖 Reading sample data from: ${filePath}`);
    
    const fileContent = await readFile(filePath, 'utf-8');
    const sampleData: SampleOpening[] = JSON.parse(fileContent);
    
    console.log(`📊 Found ${sampleData.length} door openings to import`);

    // 3. Check for existing imported data
    const existingOpenings = await db.query.doorOpenings.findMany({
      where: eq(doorOpenings.projectId, project.id)
    });

    if (existingOpenings.length > 0) {
      logger.info(`Found ${existingOpenings.length} existing openings. Deleting them first...`, { projectId: project.id });
      await db.delete(doorOpenings).where(eq(doorOpenings.projectId, project.id));
      logger.info("Cleared existing openings", { projectId: project.id });
    }

    // 4. Import the door openings
    let importCount = 0;
    const batchSize = 50;
    
    for (let i = 0; i < sampleData.length; i += batchSize) {
      const batch = sampleData.slice(i, i + batchSize);
      
      const doorOpeningsToInsert = batch.map((opening) => ({
        projectId: project!.id,
        openingNumber: opening.id,
        location: opening.type,
        
        // Room/Location Information
        roomName: mapSpaceTypeToRoomName(opening.door.space_type),
        roomNumber: opening.id,
        zone: opening.door.location_zone,
        
        // Door Type
        doorType: opening.door.is_interior ? 'interior' : 'exterior',
        
        // Geometry
        doorWidth: opening.geometry.clear_width_in.toString(),
        doorHeight: opening.geometry.leaf_height_in.toString(),
        
        // Fire Rating
        doorFireRating: mapFireRating(opening.door.is_fire_door),
        frameFireRating: mapFireRating(opening.door.is_fire_door),
        hardwareFireRated: opening.door.is_fire_door !== 'none' ? 'yes' : 'no',
        
        // Hardware
        lockType: mapHardwareCategory(opening.hardware.category),
        closerType: opening.hardware.closer_present ? 'Surface Mounted Closer' : null,
        exitDevice: opening.hardware.category === 'exit_device' ? 'Panic Bar Exit Device' : null,
        
        // Accessibility
        adaCompliant: opening.door.is_accessible_route ? 'yes' : 'no',
        
        // Electrical
        electrifiedHardware: opening.electrical.device_type !== 'none' ? 'yes' : 'no',
        accessControlRequired: opening.electrical.device_type !== 'none' ? 'yes' : 'no',
        accessControlType: mapElectricalDevice(opening.electrical.device_type, opening.electrical.fire_alarm_interface),
        
        // Threshold
        thresholdHeight: opening.threshold.height_in.toString(),
        thresholdBeveled: opening.threshold.beveled ? 'yes' : 'no',
        
        // Finish (BHMA codes)
        hardwareFinish: opening.finish.lock || '626', // Default to 626 (satin chrome)
        
        // Notes
        notes: opening.notes,
        
        // Additional fields with defaults
        status: 'pending' as const,
        surveyComplete: 'no' as const,
      }));

      await db.insert(doorOpenings).values(doorOpeningsToInsert);
      importCount += doorOpeningsToInsert.length;
      
      console.log(`✅ Imported batch ${Math.floor(i / batchSize) + 1}: ${doorOpeningsToInsert.length} openings (Total: ${importCount}/${sampleData.length})`);
    }

    console.log(`\n🎉 Successfully imported ${importCount} door openings!`);
    console.log(`📋 Project: "${project.name}" (ID: ${project.id})`);
    console.log(`\n✨ Sample data is ready for testing and demonstration!`);

  } catch (error) {
    console.error("❌ Error importing sample openings:", error);
    throw error;
  }
}

// Run the import
seedSampleOpenings()
  .then(() => {
    console.log("\n✅ Import complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Import failed:", error);
    process.exit(1);
  });
