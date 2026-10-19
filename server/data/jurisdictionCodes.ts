export interface AHJInfo {
  name: string;
  type: "Building Department" | "Fire Marshal" | "Code Enforcement" | "Planning & Development" | "Construction Services";
  phone: string;
  website: string;
  address?: string;
}

export interface JurisdictionProfile {
  state: string;
  stateName: string;
  adoptedCodes: { standard: string; edition: string; notes?: string }[];
  localAmendments: string[];
  jurisdictionCode: string;
  ibcEdition: string;
  ifcEdition: string;
  adaApplies: boolean;
  nfpaApplies: boolean;
  localCodeName?: string;
  ahj: AHJInfo;
  cityOverrides?: Record<string, Partial<JurisdictionProfile> & { ahj?: AHJInfo }>;
}

export type BuildingCodeStandard = "ADA" | "IBC" | "NFPA" | "ANSI_SDI" | "LOCAL" | "DIV08" | "DIV28";

export const STATE_JURISDICTION_MAP: Record<string, JurisdictionProfile> = {
  AL: {
    state: "AL",
    stateName: "Alabama",
    adoptedCodes: [
      { standard: "IBC", edition: "2021" },
      { standard: "IFC", edition: "2021" },
      { standard: "NFPA 101", edition: "2021" },
    ],
    localAmendments: [],
    jurisdictionCode: "US-AL",
    ibcEdition: "2021",
    ifcEdition: "2021",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "Alabama Building Commission", type: "Building Department", phone: "(334) 242-4082", website: "https://bc.alabama.gov" },
  },
  AK: {
    state: "AK",
    stateName: "Alaska",
    adoptedCodes: [
      { standard: "IBC", edition: "2021" },
      { standard: "IFC", edition: "2021" },
    ],
    localAmendments: ["State fire marshal amendments for cold-climate vestibule requirements"],
    jurisdictionCode: "US-AK",
    ibcEdition: "2021",
    ifcEdition: "2021",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "Alaska Division of Fire & Life Safety", type: "Fire Marshal", phone: "(907) 269-5491", website: "https://dps.alaska.gov/FLS" },
  },
  AZ: {
    state: "AZ",
    stateName: "Arizona",
    adoptedCodes: [
      { standard: "IBC", edition: "2018" },
      { standard: "IFC", edition: "2018" },
    ],
    localAmendments: ["Code adoption varies by jurisdiction; no mandatory statewide code"],
    jurisdictionCode: "US-AZ",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "Arizona Office of Manufactured Housing", type: "Building Department", phone: "(602) 364-1003", website: "https://housing.az.gov" },
  },
  AR: {
    state: "AR",
    stateName: "Arkansas",
    adoptedCodes: [
      { standard: "IBC", edition: "2021" },
      { standard: "IFC", edition: "2021" },
    ],
    localAmendments: [],
    jurisdictionCode: "US-AR",
    ibcEdition: "2021",
    ifcEdition: "2021",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "Arkansas Fire Prevention Commission", type: "Fire Marshal", phone: "(501) 324-9750", website: "https://www.arfirecommission.com" },
  },
  CA: {
    state: "CA",
    stateName: "California",
    adoptedCodes: [
      { standard: "CBC", edition: "2022", notes: "California Building Code based on 2021 IBC" },
      { standard: "CFC", edition: "2022", notes: "California Fire Code based on 2021 IFC" },
      { standard: "IBC", edition: "2021", notes: "Base code with California amendments" },
      { standard: "Title 24", edition: "2022", notes: "California Energy Code" },
    ],
    localAmendments: [
      "Maximum hardware height reduced to 44 inches AFF (vs 48 inches IBC standard)",
      "Title 24 energy code applies to all door assemblies",
      "California accessibility standards (CBC Chapter 11B) exceed ADA minimums",
      "Seismic bracing requirements for overhead door hardware",
      "California Office of Statewide Health Planning oversees healthcare facilities",
    ],
    jurisdictionCode: "US-CA",
    ibcEdition: "2021",
    ifcEdition: "2021",
    adaApplies: true,
    nfpaApplies: true,
    localCodeName: "California Building Code",
    ahj: { name: "California Building Standards Commission", type: "Building Department", phone: "(916) 263-0916", website: "https://www.dgs.ca.gov/BSC" },
    cityOverrides: {
      "Los Angeles": {
        localAmendments: [
          "LAMC amendments to CBC for high-rise door hardware",
          "Los Angeles Department of Building and Safety local modifications",
          "Maximum hardware height reduced to 44 inches AFF",
        ],
        ahj: { name: "Los Angeles Dept. of Building & Safety", type: "Building Department", phone: "(213) 482-0000", website: "https://www.ladbs.org" },
      },
      "San Francisco": {
        localAmendments: [
          "San Francisco Building Code amendments for seismic zones",
          "Additional accessibility provisions beyond CBC Chapter 11B",
          "Maximum hardware height reduced to 44 inches AFF",
        ],
        ahj: { name: "San Francisco Dept. of Building Inspection", type: "Building Department", phone: "(415) 558-6088", website: "https://sfdbi.org" },
      },
    },
  },
  CO: {
    state: "CO",
    stateName: "Colorado",
    adoptedCodes: [
      { standard: "IBC", edition: "2021" },
      { standard: "IFC", edition: "2021" },
    ],
    localAmendments: ["Local jurisdictions may adopt additional amendments"],
    jurisdictionCode: "US-CO",
    ibcEdition: "2021",
    ifcEdition: "2021",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "Colorado Division of Fire Prevention & Control", type: "Fire Marshal", phone: "(303) 239-4100", website: "https://dfpc.colorado.gov" },
  },
  CT: {
    state: "CT",
    stateName: "Connecticut",
    adoptedCodes: [
      { standard: "IBC", edition: "2021", notes: "Connecticut State Building Code" },
      { standard: "IFC", edition: "2021" },
    ],
    localAmendments: ["State amendments for public building accessibility"],
    jurisdictionCode: "US-CT",
    ibcEdition: "2021",
    ifcEdition: "2021",
    adaApplies: true,
    nfpaApplies: true,
    localCodeName: "Connecticut State Building Code",
    ahj: { name: "Connecticut Office of State Building Inspector", type: "Building Department", phone: "(860) 713-5700", website: "https://portal.ct.gov/DAS/Office-of-State-Building-Inspector" },
  },
  DE: {
    state: "DE",
    stateName: "Delaware",
    adoptedCodes: [
      { standard: "IBC", edition: "2018" },
      { standard: "IFC", edition: "2018" },
    ],
    localAmendments: [],
    jurisdictionCode: "US-DE",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "Delaware State Fire Marshal's Office", type: "Fire Marshal", phone: "(302) 323-5365", website: "https://statefiremarshal.delaware.gov" },
  },
  DC: {
    state: "DC",
    stateName: "District of Columbia",
    adoptedCodes: [
      { standard: "IBC", edition: "2021", notes: "DC Construction Code" },
      { standard: "IFC", edition: "2021" },
    ],
    localAmendments: [
      "DC Construction Code supplements with local amendments",
      "Federal building requirements may supersede local code",
    ],
    jurisdictionCode: "US-DC",
    ibcEdition: "2021",
    ifcEdition: "2021",
    adaApplies: true,
    nfpaApplies: true,
    localCodeName: "DC Construction Code",
    ahj: { name: "DC Dept. of Buildings", type: "Building Department", phone: "(202) 442-4400", website: "https://dob.dc.gov" },
  },
  FL: {
    state: "FL",
    stateName: "Florida",
    adoptedCodes: [
      { standard: "FBC", edition: "2023", notes: "Florida Building Code 8th Edition based on 2021 IBC" },
      { standard: "FFC", edition: "2023", notes: "Florida Fire Prevention Code" },
      { standard: "IBC", edition: "2021", notes: "Base code with Florida amendments" },
    ],
    localAmendments: [
      "High-velocity hurricane zone (HVHZ) requirements for Miami-Dade and Broward counties",
      "Impact-rated door assemblies required in wind-borne debris regions",
      "Florida-specific product approval required for all door hardware",
      "Enhanced wind-load requirements for exterior door assemblies",
      "Florida Accessibility Code for Building Construction",
    ],
    jurisdictionCode: "US-FL",
    ibcEdition: "2021",
    ifcEdition: "2021",
    adaApplies: true,
    nfpaApplies: true,
    localCodeName: "Florida Building Code",
    ahj: { name: "Florida Building Commission", type: "Building Department", phone: "(850) 487-1824", website: "https://floridabuilding.org" },
    cityOverrides: {
      Miami: {
        localAmendments: [
          "Miami-Dade HVHZ requirements for all door assemblies",
          "Impact-rated glazing and hardware required",
          "Miami-Dade NOA (Notice of Acceptance) required for products",
        ],
        ahj: { name: "Miami-Dade County Building Dept.", type: "Building Department", phone: "(786) 315-2000", website: "https://www.miamidade.gov/building" },
      },
    },
  },
  GA: {
    state: "GA",
    stateName: "Georgia",
    adoptedCodes: [
      { standard: "IBC", edition: "2018", notes: "Georgia State Amendments" },
      { standard: "IFC", edition: "2018" },
    ],
    localAmendments: [
      "Georgia Department of Community Affairs amendments",
      "State accessibility code amendments to IBC Chapter 11",
      "Georgia energy code amendments affecting door assemblies",
    ],
    jurisdictionCode: "US-GA",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    localCodeName: "Georgia State Building Code",
    ahj: { name: "Georgia Dept. of Community Affairs", type: "Building Department", phone: "(404) 679-4940", website: "https://www.dca.ga.gov" },
    cityOverrides: {
      Atlanta: {
        localAmendments: [
          "City of Atlanta amendments to state-adopted IBC",
          "Atlanta Fire Rescue Department local fire code amendments",
        ],
        ahj: { name: "City of Atlanta Dept. of Buildings", type: "Building Department", phone: "(404) 330-6070", website: "https://www.atlantaga.gov/government/departments/buildings" },
      },
    },
  },
  HI: {
    state: "HI",
    stateName: "Hawaii",
    adoptedCodes: [
      { standard: "IBC", edition: "2018" },
      { standard: "IFC", edition: "2018" },
    ],
    localAmendments: ["County-level adoption with local amendments for hurricane resistance"],
    jurisdictionCode: "US-HI",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "Hawaii Dept. of Accounting & General Services", type: "Building Department", phone: "(808) 586-0480", website: "https://ags.hawaii.gov" },
  },
  ID: {
    state: "ID",
    stateName: "Idaho",
    adoptedCodes: [
      { standard: "IBC", edition: "2018" },
      { standard: "IFC", edition: "2018" },
    ],
    localAmendments: [],
    jurisdictionCode: "US-ID",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "Idaho Division of Building Safety", type: "Building Department", phone: "(208) 334-3950", website: "https://dbs.idaho.gov" },
  },
  IL: {
    state: "IL",
    stateName: "Illinois",
    adoptedCodes: [
      { standard: "IBC", edition: "2021" },
      { standard: "IFC", edition: "2021" },
    ],
    localAmendments: [
      "Illinois Accessibility Code supplements federal ADA requirements",
      "State fire marshal amendments for assembly occupancies",
    ],
    jurisdictionCode: "US-IL",
    ibcEdition: "2021",
    ifcEdition: "2021",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "Illinois Capital Development Board", type: "Building Department", phone: "(217) 782-2864", website: "https://www2.illinois.gov/cdb" },
    cityOverrides: {
      Chicago: {
        adoptedCodes: [
          { standard: "Chicago Building Code", edition: "2022", notes: "Municipal Code of Chicago Title 14" },
          { standard: "Chicago Fire Prevention Code", edition: "2022" },
        ],
        localAmendments: [
          "Chicago Municipal Code Title 14 replaces IBC entirely",
          "Chicago fire prevention ordinances differ from IFC",
          "Unique occupancy classifications and egress requirements",
          "Chicago-specific door hardware testing and approval requirements",
        ],
        localCodeName: "Chicago Building Code",
        ahj: { name: "Chicago Dept. of Buildings", type: "Building Department", phone: "(312) 744-3449", website: "https://www.chicago.gov/city/en/depts/bldgs.html" },
      },
    },
  },
  IN: {
    state: "IN",
    stateName: "Indiana",
    adoptedCodes: [
      { standard: "IBC", edition: "2018" },
      { standard: "IFC", edition: "2018" },
    ],
    localAmendments: ["Indiana Fire Prevention and Building Safety Commission amendments"],
    jurisdictionCode: "US-IN",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "Indiana Dept. of Homeland Security", type: "Fire Marshal", phone: "(317) 232-2222", website: "https://www.in.gov/dhs" },
  },
  IA: {
    state: "IA",
    stateName: "Iowa",
    adoptedCodes: [
      { standard: "IBC", edition: "2018" },
      { standard: "IFC", edition: "2018" },
    ],
    localAmendments: ["State fire marshal amendments"],
    jurisdictionCode: "US-IA",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "Iowa State Fire Marshal Division", type: "Fire Marshal", phone: "(515) 725-6145", website: "https://dps.iowa.gov/divisions/state-fire-marshal" },
  },
  KS: {
    state: "KS",
    stateName: "Kansas",
    adoptedCodes: [
      { standard: "IBC", edition: "2018" },
      { standard: "IFC", edition: "2018" },
    ],
    localAmendments: ["No mandatory statewide code; local jurisdictions adopt independently"],
    jurisdictionCode: "US-KS",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "Kansas State Fire Marshal", type: "Fire Marshal", phone: "(785) 296-3401", website: "https://firemarshal.ks.gov" },
  },
  KY: {
    state: "KY",
    stateName: "Kentucky",
    adoptedCodes: [
      { standard: "IBC", edition: "2018", notes: "Kentucky Building Code" },
      { standard: "IFC", edition: "2018" },
    ],
    localAmendments: ["Kentucky Department of Housing amendments"],
    jurisdictionCode: "US-KY",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    localCodeName: "Kentucky Building Code",
    ahj: { name: "Kentucky Dept. of Housing, Buildings & Construction", type: "Building Department", phone: "(502) 573-0365", website: "https://dhbc.ky.gov" },
  },
  LA: {
    state: "LA",
    stateName: "Louisiana",
    adoptedCodes: [
      { standard: "IBC", edition: "2021" },
      { standard: "IFC", edition: "2021" },
    ],
    localAmendments: [
      "Louisiana State Uniform Construction Code amendments",
      "Hurricane-resistant construction requirements for coastal parishes",
    ],
    jurisdictionCode: "US-LA",
    ibcEdition: "2021",
    ifcEdition: "2021",
    adaApplies: true,
    nfpaApplies: true,
    localCodeName: "Louisiana State Uniform Construction Code",
    ahj: { name: "Louisiana State Fire Marshal", type: "Fire Marshal", phone: "(225) 925-4911", website: "https://lasfm.org" },
  },
  ME: {
    state: "ME",
    stateName: "Maine",
    adoptedCodes: [
      { standard: "IBC", edition: "2015" },
      { standard: "IFC", edition: "2015" },
      { standard: "NFPA 101", edition: "2018" },
    ],
    localAmendments: ["Maine Uniform Building and Energy Code (MUBEC) amendments"],
    jurisdictionCode: "US-ME",
    ibcEdition: "2015",
    ifcEdition: "2015",
    adaApplies: true,
    nfpaApplies: true,
    localCodeName: "Maine Uniform Building and Energy Code",
    ahj: { name: "Maine Office of the State Fire Marshal", type: "Fire Marshal", phone: "(207) 626-3870", website: "https://www.maine.gov/dps/fmo" },
  },
  MD: {
    state: "MD",
    stateName: "Maryland",
    adoptedCodes: [
      { standard: "IBC", edition: "2021" },
      { standard: "IFC", edition: "2021" },
    ],
    localAmendments: [
      "Maryland Building Performance Standards amendments",
      "Maryland Accessibility Code supplements ADA",
    ],
    jurisdictionCode: "US-MD",
    ibcEdition: "2021",
    ifcEdition: "2021",
    adaApplies: true,
    nfpaApplies: true,
    localCodeName: "Maryland Building Performance Standards",
    ahj: { name: "Maryland Dept. of Labor – Codes Administration", type: "Code Enforcement", phone: "(410) 230-6231", website: "https://www.dllr.state.md.us/labor/build" },
  },
  MA: {
    state: "MA",
    stateName: "Massachusetts",
    adoptedCodes: [
      { standard: "IBC", edition: "2021", notes: "Massachusetts State Building Code 10th Edition" },
      { standard: "IFC", edition: "2021" },
      { standard: "CMR 780", edition: "2021", notes: "Massachusetts Amendments to IBC" },
    ],
    localAmendments: [
      "Massachusetts Architectural Access Board (MAAB) regulations (521 CMR)",
      "MAAB requirements exceed ADA for public buildings",
      "State-specific door hardware requirements for educational occupancies",
      "Massachusetts energy code amendments affecting door assemblies",
    ],
    jurisdictionCode: "US-MA",
    ibcEdition: "2021",
    ifcEdition: "2021",
    adaApplies: true,
    nfpaApplies: true,
    localCodeName: "Massachusetts State Building Code",
    ahj: { name: "Massachusetts Board of Building Regulations & Standards", type: "Building Department", phone: "(617) 727-3200", website: "https://www.mass.gov/orgs/board-of-building-regulations-and-standards" },
    cityOverrides: {
      Boston: {
        localAmendments: [
          "Boston Fire Department local amendments",
          "Boston Inspectional Services Department requirements",
          "MAAB regulations apply statewide including Boston",
        ],
        ahj: { name: "Boston Inspectional Services Dept.", type: "Building Department", phone: "(617) 635-5300", website: "https://www.boston.gov/departments/inspectional-services" },
      },
    },
  },
  MI: {
    state: "MI",
    stateName: "Michigan",
    adoptedCodes: [
      { standard: "IBC", edition: "2021", notes: "Michigan Building Code" },
      { standard: "IFC", edition: "2021" },
    ],
    localAmendments: [
      "Michigan Bureau of Construction Codes amendments",
      "Michigan Barrier Free Design requirements",
    ],
    jurisdictionCode: "US-MI",
    ibcEdition: "2021",
    ifcEdition: "2021",
    adaApplies: true,
    nfpaApplies: true,
    localCodeName: "Michigan Building Code",
    ahj: { name: "Michigan Bureau of Construction Codes", type: "Code Enforcement", phone: "(517) 241-9302", website: "https://www.michigan.gov/lara/bureau-list/bcc" },
  },
  MN: {
    state: "MN",
    stateName: "Minnesota",
    adoptedCodes: [
      { standard: "IBC", edition: "2018", notes: "Minnesota State Building Code" },
      { standard: "IFC", edition: "2018" },
    ],
    localAmendments: [
      "Minnesota State Building Code amendments",
      "Minnesota accessibility code (Chapter 1341) supplements ADA",
    ],
    jurisdictionCode: "US-MN",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    localCodeName: "Minnesota State Building Code",
    ahj: { name: "Minnesota Dept. of Labor & Industry – Construction Codes", type: "Building Department", phone: "(651) 284-5012", website: "https://www.dli.mn.gov/business/codes-and-laws" },
  },
  MS: {
    state: "MS",
    stateName: "Mississippi",
    adoptedCodes: [
      { standard: "IBC", edition: "2018" },
      { standard: "IFC", edition: "2018" },
    ],
    localAmendments: ["Wind-resistant construction requirements for coastal counties"],
    jurisdictionCode: "US-MS",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "Mississippi State Fire Marshal's Office", type: "Fire Marshal", phone: "(601) 359-1061", website: "https://www.mid.ms.gov/fire-marshal" },
  },
  MO: {
    state: "MO",
    stateName: "Missouri",
    adoptedCodes: [
      { standard: "IBC", edition: "2018" },
      { standard: "IFC", edition: "2018" },
    ],
    localAmendments: ["No mandatory statewide code; local jurisdictions adopt independently"],
    jurisdictionCode: "US-MO",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "Missouri Division of Fire Safety", type: "Fire Marshal", phone: "(573) 751-2930", website: "https://dfs.dps.mo.gov" },
  },
  MT: {
    state: "MT",
    stateName: "Montana",
    adoptedCodes: [
      { standard: "IBC", edition: "2018" },
      { standard: "IFC", edition: "2018" },
    ],
    localAmendments: ["Montana Building Codes Bureau amendments"],
    jurisdictionCode: "US-MT",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "Montana Building Codes Bureau", type: "Building Department", phone: "(406) 841-2050", website: "https://mtrevenue.gov" },
  },
  NE: {
    state: "NE",
    stateName: "Nebraska",
    adoptedCodes: [
      { standard: "IBC", edition: "2018" },
      { standard: "IFC", edition: "2018" },
    ],
    localAmendments: [],
    jurisdictionCode: "US-NE",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "Nebraska State Fire Marshal", type: "Fire Marshal", phone: "(402) 471-2027", website: "https://sfm.nebraska.gov" },
  },
  NV: {
    state: "NV",
    stateName: "Nevada",
    adoptedCodes: [
      { standard: "IBC", edition: "2018" },
      { standard: "IFC", edition: "2018" },
    ],
    localAmendments: ["Clark County (Las Vegas) local amendments for hospitality occupancies"],
    jurisdictionCode: "US-NV",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "Nevada State Fire Marshal Division", type: "Fire Marshal", phone: "(775) 684-7500", website: "https://fire.nv.gov" },
    cityOverrides: {
      "Las Vegas": {
        localAmendments: [
          "Clark County amendments for high-rise and hospitality occupancies",
          "Enhanced fire protection requirements for casino/hotel occupancies",
        ],
        ahj: { name: "Clark County Dept. of Building & Fire Prevention", type: "Building Department", phone: "(702) 455-8000", website: "https://www.clarkcountynv.gov/government/departments/building___fire_prevention" },
      },
    },
  },
  NH: {
    state: "NH",
    stateName: "New Hampshire",
    adoptedCodes: [
      { standard: "IBC", edition: "2018", notes: "New Hampshire State Building Code" },
      { standard: "IFC", edition: "2018" },
    ],
    localAmendments: ["New Hampshire State Building Code amendments"],
    jurisdictionCode: "US-NH",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    localCodeName: "New Hampshire State Building Code",
    ahj: { name: "New Hampshire State Fire Marshal's Office", type: "Fire Marshal", phone: "(603) 223-4289", website: "https://www.nh.gov/safety/divisions/firesafety" },
  },
  NJ: {
    state: "NJ",
    stateName: "New Jersey",
    adoptedCodes: [
      { standard: "IBC", edition: "2021", notes: "New Jersey Uniform Construction Code" },
      { standard: "IFC", edition: "2021" },
    ],
    localAmendments: [
      "New Jersey Uniform Construction Code (NJUCC) amendments",
      "New Jersey barrier-free subcode supplements ADA",
    ],
    jurisdictionCode: "US-NJ",
    ibcEdition: "2021",
    ifcEdition: "2021",
    adaApplies: true,
    nfpaApplies: true,
    localCodeName: "New Jersey Uniform Construction Code",
    ahj: { name: "New Jersey Dept. of Community Affairs – Codes & Standards", type: "Code Enforcement", phone: "(609) 984-7609", website: "https://www.nj.gov/dca/codes" },
  },
  NM: {
    state: "NM",
    stateName: "New Mexico",
    adoptedCodes: [
      { standard: "IBC", edition: "2018" },
      { standard: "IFC", edition: "2018" },
    ],
    localAmendments: ["New Mexico Construction Industries Division amendments"],
    jurisdictionCode: "US-NM",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "New Mexico Construction Industries Division", type: "Building Department", phone: "(505) 476-4700", website: "https://www.rld.nm.gov/construction-industries" },
  },
  NY: {
    state: "NY",
    stateName: "New York",
    adoptedCodes: [
      { standard: "IBC", edition: "2020", notes: "New York State Uniform Fire Prevention and Building Code" },
      { standard: "IFC", edition: "2020" },
      { standard: "NFPA 101", edition: "2018" },
    ],
    localAmendments: [
      "New York State Uniform Fire Prevention and Building Code amendments",
      "New York State accessibility requirements supplement ADA",
      "Energy Conservation Construction Code of New York State",
    ],
    jurisdictionCode: "US-NY",
    ibcEdition: "2020",
    ifcEdition: "2020",
    adaApplies: true,
    nfpaApplies: true,
    localCodeName: "New York State Building Code",
    ahj: { name: "New York Dept. of State – Building Standards & Codes", type: "Building Department", phone: "(518) 474-4073", website: "https://dos.ny.gov/building-standards-and-codes" },
    cityOverrides: {
      "New York City": {
        adoptedCodes: [
          { standard: "NYC Building Code", edition: "2022", notes: "NYC Administrative Code Title 28" },
          { standard: "NYC Fire Code", edition: "2022" },
          { standard: "NYC Mechanical Code", edition: "2022" },
        ],
        localAmendments: [
          "NYC Building Code is independently developed, not based on IBC",
          "NYC Department of Buildings unique filing and approval requirements",
          "NYC-specific occupancy groups and egress calculations",
          "NYC Local Law 58 accessibility requirements exceed ADA",
          "NYC-specific fire door and hardware approval process",
          "NYC-specific elevator interlock requirements for door hardware",
        ],
        localCodeName: "NYC Building Code",
        ibcEdition: "2014",
        ifcEdition: "2014",
        ahj: { name: "NYC Dept. of Buildings", type: "Building Department", phone: "(212) 393-2550", website: "https://www.nyc.gov/buildings" },
      },
    },
  },
  NC: {
    state: "NC",
    stateName: "North Carolina",
    adoptedCodes: [
      { standard: "IBC", edition: "2018", notes: "North Carolina State Building Code" },
      { standard: "IFC", edition: "2018" },
    ],
    localAmendments: [
      "North Carolina Building Code Council amendments",
      "North Carolina Accessibility Code supplements ADA",
    ],
    jurisdictionCode: "US-NC",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    localCodeName: "North Carolina State Building Code",
    ahj: { name: "North Carolina Dept. of Insurance – Engineering Division", type: "Code Enforcement", phone: "(919) 647-0000", website: "https://www.ncdoi.gov/osfm/engineering-and-codes" },
  },
  ND: {
    state: "ND",
    stateName: "North Dakota",
    adoptedCodes: [
      { standard: "IBC", edition: "2021" },
      { standard: "IFC", edition: "2021" },
    ],
    localAmendments: [],
    jurisdictionCode: "US-ND",
    ibcEdition: "2021",
    ifcEdition: "2021",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "North Dakota Office of State Fire Marshal", type: "Fire Marshal", phone: "(701) 328-5555", website: "https://www.nd.gov/ndins/fire-marshal" },
  },
  OH: {
    state: "OH",
    stateName: "Ohio",
    adoptedCodes: [
      { standard: "IBC", edition: "2021", notes: "Ohio Building Code" },
      { standard: "IFC", edition: "2021" },
    ],
    localAmendments: [
      "Ohio Board of Building Standards amendments",
      "Ohio accessibility requirements (OBC Chapter 11)",
    ],
    jurisdictionCode: "US-OH",
    ibcEdition: "2021",
    ifcEdition: "2021",
    adaApplies: true,
    nfpaApplies: true,
    localCodeName: "Ohio Building Code",
    ahj: { name: "Ohio Board of Building Standards", type: "Building Department", phone: "(614) 644-2613", website: "https://com.ohio.gov/divisions-and-programs/industrial-compliance/boards/board-of-building-standards" },
  },
  OK: {
    state: "OK",
    stateName: "Oklahoma",
    adoptedCodes: [
      { standard: "IBC", edition: "2018" },
      { standard: "IFC", edition: "2018" },
    ],
    localAmendments: ["Oklahoma Uniform Building Code Commission amendments"],
    jurisdictionCode: "US-OK",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "Oklahoma Uniform Building Code Commission", type: "Building Department", phone: "(405) 521-6550", website: "https://oubcc.ok.gov" },
  },
  OR: {
    state: "OR",
    stateName: "Oregon",
    adoptedCodes: [
      { standard: "OSSC", edition: "2022", notes: "Oregon Structural Specialty Code based on 2021 IBC" },
      { standard: "OFC", edition: "2022", notes: "Oregon Fire Code based on 2021 IFC" },
      { standard: "IBC", edition: "2021", notes: "Base code with Oregon amendments" },
    ],
    localAmendments: [
      "Oregon Structural Specialty Code replaces IBC with significant amendments",
      "Oregon accessibility requirements administered by Building Codes Division",
      "Oregon-specific seismic provisions for door hardware anchorage",
      "Oregon energy code requirements for door assemblies",
    ],
    jurisdictionCode: "US-OR",
    ibcEdition: "2021",
    ifcEdition: "2021",
    adaApplies: true,
    nfpaApplies: true,
    localCodeName: "Oregon Structural Specialty Code",
    ahj: { name: "Oregon Building Codes Division", type: "Building Department", phone: "(503) 378-4133", website: "https://www.oregon.gov/bcd" },
    cityOverrides: {
      Portland: {
        localAmendments: [
          "City of Portland amendments to OSSC",
          "Portland-specific seismic upgrade requirements for existing buildings",
        ],
      },
    },
  },
  PA: {
    state: "PA",
    stateName: "Pennsylvania",
    adoptedCodes: [
      { standard: "IBC", edition: "2018", notes: "Pennsylvania Uniform Construction Code" },
      { standard: "IFC", edition: "2018" },
    ],
    localAmendments: [
      "Pennsylvania Uniform Construction Code (UCC) amendments",
      "Pennsylvania accessibility provisions supplement ADA",
    ],
    jurisdictionCode: "US-PA",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    localCodeName: "Pennsylvania Uniform Construction Code",
    ahj: { name: "Pennsylvania Dept. of Labor & Industry – UCC", type: "Code Enforcement", phone: "(717) 787-3323", website: "https://www.dli.pa.gov" },
    cityOverrides: {
      Philadelphia: {
        localAmendments: [
          "Philadelphia Building Construction and Occupancy Code amendments",
          "Philadelphia Fire Prevention Code local amendments",
        ],
      },
    },
  },
  RI: {
    state: "RI",
    stateName: "Rhode Island",
    adoptedCodes: [
      { standard: "IBC", edition: "2021", notes: "Rhode Island State Building Code" },
      { standard: "IFC", edition: "2021" },
    ],
    localAmendments: ["Rhode Island Building Code Standards Committee amendments"],
    jurisdictionCode: "US-RI",
    ibcEdition: "2021",
    ifcEdition: "2021",
    adaApplies: true,
    nfpaApplies: true,
    localCodeName: "Rhode Island State Building Code",
    ahj: { name: "Rhode Island State Building Commissioner", type: "Building Department", phone: "(401) 889-5550", website: "https://dbr.ri.gov" },
  },
  SC: {
    state: "SC",
    stateName: "South Carolina",
    adoptedCodes: [
      { standard: "IBC", edition: "2018" },
      { standard: "IFC", edition: "2018" },
    ],
    localAmendments: [
      "South Carolina Building Codes Council amendments",
      "Coastal construction requirements for wind resistance",
    ],
    jurisdictionCode: "US-SC",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "South Carolina Building Codes Council", type: "Building Department", phone: "(803) 896-4688", website: "https://llr.sc.gov/bcc" },
  },
  SD: {
    state: "SD",
    stateName: "South Dakota",
    adoptedCodes: [
      { standard: "IBC", edition: "2018" },
      { standard: "IFC", edition: "2018" },
    ],
    localAmendments: ["No mandatory statewide code; local jurisdictions adopt independently"],
    jurisdictionCode: "US-SD",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "South Dakota State Fire Marshal", type: "Fire Marshal", phone: "(605) 773-3562", website: "https://dps.sd.gov/emergency-services/state-fire-marshal" },
  },
  TN: {
    state: "TN",
    stateName: "Tennessee",
    adoptedCodes: [
      { standard: "IBC", edition: "2021" },
      { standard: "IFC", edition: "2021" },
    ],
    localAmendments: ["Tennessee State Fire Marshal Office amendments"],
    jurisdictionCode: "US-TN",
    ibcEdition: "2021",
    ifcEdition: "2021",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "Tennessee State Fire Marshal's Office", type: "Fire Marshal", phone: "(615) 741-7160", website: "https://www.tn.gov/commerce/fire" },
  },
  TX: {
    state: "TX",
    stateName: "Texas",
    adoptedCodes: [
      { standard: "IBC", edition: "2021", notes: "Texas adopted with amendments" },
      { standard: "IFC", edition: "2021" },
      { standard: "Texas Accessibility Standards", edition: "2012", notes: "TDLR-administered" },
    ],
    localAmendments: [
      "No statewide mandatory residential building code",
      "Texas Department of Licensing and Regulation (TDLR) administers accessibility",
      "Texas Accessibility Standards (TAS) apply alongside ADA",
      "Local jurisdictions may adopt additional amendments",
      "Texas Industrialized Housing and Buildings program requirements",
    ],
    jurisdictionCode: "US-TX",
    ibcEdition: "2021",
    ifcEdition: "2021",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "Texas Dept. of Licensing & Regulation", type: "Building Department", phone: "(512) 463-6599", website: "https://www.tdlr.texas.gov" },
    cityOverrides: {
      Houston: {
        localAmendments: [
          "City of Houston amendments to IBC",
          "Houston Fire Code local amendments",
          "Houston-specific permitting requirements for door hardware modifications",
        ],
      },
      Dallas: {
        localAmendments: [
          "City of Dallas Building Inspection local amendments",
          "Dallas Fire-Rescue local fire code amendments",
        ],
      },
      Austin: {
        localAmendments: [
          "City of Austin local amendments to IBC",
          "Austin energy code requirements for door assemblies",
        ],
      },
    },
  },
  UT: {
    state: "UT",
    stateName: "Utah",
    adoptedCodes: [
      { standard: "IBC", edition: "2021" },
      { standard: "IFC", edition: "2021" },
    ],
    localAmendments: ["Utah State Construction Code amendments"],
    jurisdictionCode: "US-UT",
    ibcEdition: "2021",
    ifcEdition: "2021",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "Utah Division of Occupational & Professional Licensing", type: "Building Department", phone: "(801) 530-6628", website: "https://dopl.utah.gov" },
  },
  VT: {
    state: "VT",
    stateName: "Vermont",
    adoptedCodes: [
      { standard: "IBC", edition: "2018", notes: "Vermont Fire and Building Safety Code" },
      { standard: "IFC", edition: "2018" },
      { standard: "NFPA 101", edition: "2018" },
    ],
    localAmendments: ["Vermont Division of Fire Safety amendments"],
    jurisdictionCode: "US-VT",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    localCodeName: "Vermont Fire and Building Safety Code",
    ahj: { name: "Vermont Division of Fire Safety", type: "Fire Marshal", phone: "(802) 479-7561", website: "https://firesafety.vermont.gov" },
  },
  VA: {
    state: "VA",
    stateName: "Virginia",
    adoptedCodes: [
      { standard: "IBC", edition: "2021", notes: "Virginia Uniform Statewide Building Code" },
      { standard: "IFC", edition: "2021" },
    ],
    localAmendments: [
      "Virginia Uniform Statewide Building Code (USBC) amendments",
      "Virginia accessibility requirements supplement ADA",
    ],
    jurisdictionCode: "US-VA",
    ibcEdition: "2021",
    ifcEdition: "2021",
    adaApplies: true,
    nfpaApplies: true,
    localCodeName: "Virginia Uniform Statewide Building Code",
    ahj: { name: "Virginia Dept. of Housing & Community Development", type: "Building Department", phone: "(804) 371-7000", website: "https://www.dhcd.virginia.gov" },
  },
  WA: {
    state: "WA",
    stateName: "Washington",
    adoptedCodes: [
      { standard: "WSBC", edition: "2021", notes: "Washington State Building Code based on 2021 IBC" },
      { standard: "WFC", edition: "2021", notes: "Washington State Fire Code based on 2021 IFC" },
      { standard: "IBC", edition: "2021", notes: "Base code with Washington amendments" },
    ],
    localAmendments: [
      "Washington State Building Code Council amendments",
      "Washington State energy code requirements for door assemblies",
      "Washington accessibility requirements administered by L&I",
      "Seismic provisions for door hardware in high seismic zones",
    ],
    jurisdictionCode: "US-WA",
    ibcEdition: "2021",
    ifcEdition: "2021",
    adaApplies: true,
    nfpaApplies: true,
    localCodeName: "Washington State Building Code",
    ahj: { name: "Washington State Building Code Council", type: "Building Department", phone: "(360) 407-9277", website: "https://sbcc.wa.gov" },
    cityOverrides: {
      Seattle: {
        localAmendments: [
          "Seattle Building Code amendments to WSBC",
          "Seattle Department of Construction and Inspections local requirements",
          "Seattle energy code amendments for commercial door assemblies",
        ],
      },
    },
  },
  WV: {
    state: "WV",
    stateName: "West Virginia",
    adoptedCodes: [
      { standard: "IBC", edition: "2018", notes: "West Virginia State Building Code" },
      { standard: "IFC", edition: "2018" },
    ],
    localAmendments: ["West Virginia State Fire Marshal amendments"],
    jurisdictionCode: "US-WV",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    localCodeName: "West Virginia State Building Code",
    ahj: { name: "West Virginia State Fire Marshal's Office", type: "Fire Marshal", phone: "(304) 558-2191", website: "https://firemarshal.wv.gov" },
  },
  WI: {
    state: "WI",
    stateName: "Wisconsin",
    adoptedCodes: [
      { standard: "IBC", edition: "2018", notes: "Wisconsin Commercial Building Code" },
      { standard: "IFC", edition: "2018" },
    ],
    localAmendments: [
      "Wisconsin Department of Safety and Professional Services amendments",
      "Wisconsin barrier-free environment requirements",
    ],
    jurisdictionCode: "US-WI",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    localCodeName: "Wisconsin Commercial Building Code",
    ahj: { name: "Wisconsin Dept. of Safety & Professional Services", type: "Building Department", phone: "(608) 266-2112", website: "https://dsps.wi.gov" },
  },
  WY: {
    state: "WY",
    stateName: "Wyoming",
    adoptedCodes: [
      { standard: "IBC", edition: "2018" },
      { standard: "IFC", edition: "2018" },
    ],
    localAmendments: ["No mandatory statewide code; local jurisdictions adopt independently"],
    jurisdictionCode: "US-WY",
    ibcEdition: "2018",
    ifcEdition: "2018",
    adaApplies: true,
    nfpaApplies: true,
    ahj: { name: "Wyoming State Fire Marshal", type: "Fire Marshal", phone: "(307) 777-7288", website: "https://wsfm.wyo.gov" },
  },
};

export const DEFAULT_US_JURISDICTION: JurisdictionProfile = {
  state: "US",
  stateName: "United States (Default)",
  adoptedCodes: [
    { standard: "IBC", edition: "2021" },
    { standard: "IFC", edition: "2021" },
    { standard: "NFPA 101", edition: "2021" },
  ],
  localAmendments: [],
  jurisdictionCode: "US",
  ibcEdition: "2021",
  ifcEdition: "2021",
  adaApplies: true,
  nfpaApplies: true,
  ahj: { name: "International Code Council", type: "Building Department", phone: "(888) 422-7233", website: "https://www.iccsafe.org" },
};

export function getJurisdictionByState(stateCode: string): JurisdictionProfile {
  const normalized = stateCode.trim().toUpperCase();
  return STATE_JURISDICTION_MAP[normalized] ?? DEFAULT_US_JURISDICTION;
}

const DIV28_BUILDING_TYPES = new Set([
  "healthcare",
  "hospital",
  "medical",
  "clinic",
  "education",
  "school",
  "university",
  "college",
  "government",
  "federal",
  "municipal",
  "courthouse",
  "high-security",
  "detention",
  "correctional",
  "data-center",
  "laboratory",
]);

export function getApplicableStandards(
  jurisdiction: JurisdictionProfile,
  buildingType?: string,
): BuildingCodeStandard[] {
  const standards: BuildingCodeStandard[] = ["ADA", "IBC", "DIV08"];

  if (jurisdiction.nfpaApplies) {
    standards.push("NFPA");
  }

  standards.push("ANSI_SDI");

  if (jurisdiction.localAmendments.length > 0 || jurisdiction.localCodeName) {
    standards.push("LOCAL");
  }

  if (buildingType) {
    const normalizedType = buildingType.trim().toLowerCase();
    if (DIV28_BUILDING_TYPES.has(normalizedType)) {
      standards.push("DIV28");
    }
  }

  return standards;
}
