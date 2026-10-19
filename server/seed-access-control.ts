import { db } from "./db";
import { accessControlComponents } from "@shared/schema";

export async function seedAccessControlComponents() {
  const existingComponents = await db.select().from(accessControlComponents);
  
  if (existingComponents.length > 0) {
    console.log("Access control components already seeded, skipping...");
    return;
  }

  const components = [
    // Card Readers
    {
      componentType: "card-reader",
      manufacturer: "HID",
      model: "iCLASS SE R40",
      displayName: "Card Reader",
      description: "Proximity card reader with Wiegand output",
      iconType: "reader",
      width: 60,
      height: 80,
      color: "#3b82f6",
      voltage: "5-16VDC",
      currentDraw: "85mA",
      wireType: "22/6",
      terminals: [
        { name: "V+", type: "power", description: "Power positive" },
        { name: "GND", type: "power", description: "Ground" },
        { name: "D0", type: "signal", description: "Wiegand data 0" },
        { name: "D1", type: "signal", description: "Wiegand data 1" },
        { name: "LED", type: "signal", description: "LED control" },
        { name: "BZR", type: "signal", description: "Beeper control" }
      ],
      isSystemDefault: "yes",
    },
    
    // Access Control Controllers
    {
      componentType: "controller",
      manufacturer: "Software House",
      model: "iSTAR Ultra",
      displayName: "Access Controller",
      description: "Two-door IP-based access control controller",
      iconType: "controller",
      width: 100,
      height: 80,
      color: "#8b5cf6",
      voltage: "12VDC",
      currentDraw: "350mA",
      wireType: "Cat6",
      terminals: [
        { name: "12V", type: "power", description: "Power input" },
        { name: "GND", type: "power", description: "Ground" },
        { name: "D0_1", type: "signal", description: "Reader 1 - D0" },
        { name: "D1_1", type: "signal", description: "Reader 1 - D1" },
        { name: "D0_2", type: "signal", description: "Reader 2 - D0" },
        { name: "D1_2", type: "signal", description: "Reader 2 - D1" },
        { name: "LOCK1", type: "output", description: "Lock relay 1" },
        { name: "LOCK2", type: "output", description: "Lock relay 2" },
        { name: "REX1", type: "input", description: "Request to exit 1" },
        { name: "REX2", type: "input", description: "Request to exit 2" },
        { name: "DPS1", type: "input", description: "Door position switch 1" },
        { name: "DPS2", type: "input", description: "Door position switch 2" }
      ],
      isSystemDefault: "yes",
    },
    
    // Power Supplies
    {
      componentType: "power-supply",
      manufacturer: "Altronix",
      model: "AL400ULX",
      displayName: "Power Supply 12/24VDC",
      description: "12VDC or 24VDC power supply, 4A continuous",
      iconType: "power",
      width: 100,
      height: 60,
      color: "#ef4444",
      voltage: "120VAC input",
      currentDraw: "4A output",
      wireType: "18/2",
      terminals: [
        { name: "L", type: "input", description: "120VAC hot" },
        { name: "N", type: "input", description: "120VAC neutral" },
        { name: "GND", type: "input", description: "Ground" },
        { name: "+12/24V", type: "output", description: "DC positive output" },
        { name: "COM", type: "output", description: "DC common/negative" }
      ],
      isSystemDefault: "yes",
    },
    
    // Mag Locks
    {
      componentType: "mag-lock",
      manufacturer: "Securitron",
      model: "M62",
      displayName: "Electromagnetic Lock (1200lb)",
      description: "Surface mount electromagnetic lock, 1200lb holding force",
      iconType: "lock",
      width: 80,
      height: 40,
      color: "#059669",
      voltage: "12/24VDC",
      currentDraw: "500mA @ 12V",
      wireType: "18/2",
      terminals: [
        { name: "+", type: "power", description: "Positive" },
        { name: "-", type: "power", description: "Negative/Common" }
      ],
      isSystemDefault: "yes",
    },
    
    // Electric Strikes
    {
      componentType: "electric-strike",
      manufacturer: "HES",
      model: "1006-12D",
      displayName: "Electric Strike",
      description: "Fail-secure electric strike for cylindrical locks",
      iconType: "lock",
      width: 50,
      height: 70,
      color: "#059669",
      voltage: "12VDC",
      currentDraw: "330mA",
      wireType: "18/2",
      terminals: [
        { name: "+", type: "power", description: "Positive" },
        { name: "-", type: "power", description: "Negative/Common" }
      ],
      isSystemDefault: "yes",
    },
    
    // Automatic Door Operators
    {
      componentType: "automatic-operator",
      manufacturer: "Besam",
      model: "SW200i",
      displayName: "Automatic Swing Door Operator",
      description: "Low energy swing door operator with built-in controller",
      iconType: "operator",
      width: 120,
      height: 60,
      color: "#f59e0b",
      voltage: "120VAC",
      currentDraw: "2A",
      wireType: "18/4",
      terminals: [
        { name: "L", type: "input", description: "Hot" },
        { name: "N", type: "input", description: "Neutral" },
        { name: "GND", type: "input", description: "Ground" },
        { name: "OPEN", type: "input", description: "Push button input" },
        { name: "ACCESS", type: "input", description: "Access control input" },
        { name: "REX", type: "input", description: "Request to exit" },
        { name: "SAFE", type: "input", description: "Safety sensor" }
      ],
      isSystemDefault: "yes",
    },
    
    // Request to Exit Devices
    {
      componentType: "rex-device",
      manufacturer: "BEA",
      model: "Eagle Scan",
      displayName: "Motion Sensor (REX)",
      description: "Touchless infrared motion sensor for request to exit",
      iconType: "rex",
      width: 60,
      height: 60,
      color: "#6366f1",
      voltage: "12-24VDC",
      currentDraw: "35mA",
      wireType: "22/4",
      terminals: [
        { name: "V+", type: "power", description: "Power positive" },
        { name: "GND", type: "power", description: "Ground" },
        { name: "NO", type: "output", description: "Normally open contact" },
        { name: "COM", type: "output", description: "Common" }
      ],
      isSystemDefault: "yes",
    },
    
    // Push Buttons
    {
      componentType: "push-button",
      manufacturer: "Securitron",
      model: "PB2N",
      displayName: "Push Button",
      description: "Momentary push button, SPDT contacts",
      iconType: "button",
      width: 50,
      height: 50,
      color: "#14b8a6",
      voltage: "N/A",
      currentDraw: "N/A",
      wireType: "22/2",
      terminals: [
        { name: "NO", type: "output", description: "Normally open" },
        { name: "NC", type: "output", description: "Normally closed" },
        { name: "COM", type: "output", description: "Common" }
      ],
      isSystemDefault: "yes",
    },
    
    // Door Position Switches
    {
      componentType: "door-contact",
      manufacturer: "GRI",
      model: "2100",
      displayName: "Door Contact Switch",
      description: "Surface mount magnetic door position switch",
      iconType: "sensor",
      width: 40,
      height: 40,
      color: "#84cc16",
      voltage: "N/A",
      currentDraw: "N/A",
      wireType: "22/2",
      terminals: [
        { name: "NO", type: "output", description: "Normally open" },
        { name: "NC", type: "output", description: "Normally closed" },
        { name: "COM", type: "output", description: "Common" }
      ],
      isSystemDefault: "yes",
    },
    
    // Keypads
    {
      componentType: "keypad",
      manufacturer: "Alarm Lock",
      model: "PDK3000",
      displayName: "Keypad",
      description: "Standalone digital keypad with 1000 user codes",
      iconType: "keypad",
      width: 70,
      height: 80,
      color: "#737373",
      voltage: "9-16VDC",
      currentDraw: "150mA",
      wireType: "22/4",
      terminals: [
        { name: "V+", type: "power", description: "Power positive" },
        { name: "GND", type: "power", description: "Ground" },
        { name: "NO", type: "output", description: "Relay NO" },
        { name: "COM", type: "output", description: "Relay common" }
      ],
      isSystemDefault: "yes",
    },
  ];

  await db.insert(accessControlComponents).values(components);
  console.log(`✓ Seeded ${components.length} access control components`);
}
