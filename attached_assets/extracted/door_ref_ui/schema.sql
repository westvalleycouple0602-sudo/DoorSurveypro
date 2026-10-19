
PRAGMA journal_mode=WAL;

DROP TABLE IF EXISTS door_reference;
CREATE TABLE door_reference (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    illustration TEXT,              -- human-readable label (optional)
    category TEXT,
    subcategory TEXT,
    door_type TEXT,
    material TEXT,
    finish TEXT,
    configuration TEXT,
    operation TEXT,
    frame_type TEXT,
    hardware TEXT,
    glass_type TEXT,
    automation_ready TEXT,
    common_use TEXT,
    notes TEXT,
    image_reference TEXT,          -- filename
    duty_level TEXT,
    core_type TEXT,
    anchor_type TEXT,
    gauge_door TEXT,
    gauge_frame TEXT,
    hardware_prep_type TEXT,
    reinforcement_spec TEXT,
    finish_standard TEXT,
    fire_label TEXT,
    tolerance_guide TEXT,
    wall_type___anchor_compatibility TEXT,
    thermal_rating TEXT,
    construction_type_hmma_810 TEXT,
    edge_profile TEXT,
    meeting_edge___astragal TEXT,
    vision_lite_type TEXT,
    louver_type TEXT,
    hinge_type TEXT,
    closer_type TEXT,
    lock_type TEXT,
    exit_device_type TEXT,
    std_lock_cl_in REAL,
    std_pull_deadlock_cl_in REAL,
    hospital_latch_cl_in REAL,
    standard_clearances TEXT
);

DROP TABLE IF EXISTS options_lookup;
CREATE TABLE options_lookup (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    field TEXT NOT NULL,
    value TEXT NOT NULL
);

DROP TABLE IF EXISTS survey_field_reference;
CREATE TABLE survey_field_reference (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT,
    guidance TEXT
);

DROP TABLE IF EXISTS hardware_location_cheat;
CREATE TABLE hardware_location_cheat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item TEXT,
    recommended_centerline_in TEXT
);

DROP TABLE IF EXISTS edge_lite_types_hmma_810;
CREATE TABLE edge_lite_types_hmma_810 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT,
    examples_or_notes TEXT
);
