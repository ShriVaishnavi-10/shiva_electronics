const db = require('./config/db');

const defaultSpecs = [
  "HP",
  "RPM",
  "Sl No",
  "Frame",
  "Stator Volts",
  "Rotor Volts",
  "Stator Amps",
  "Rotor Amps",
  "Excitation Volts",
  "Excitation Amps",
  "Core Length",
  "Core Inside",
  "Core Outside",
  "Shaft Size",
  "No of Slots",
  "Pitch",
  "SWG",
  "Channels",
  "Turns",
  "Half Coil",
  "Full Coil",
  "One Set Wt",
  "Total Coils",
  "Total Wt",
  "Ins Class",
  "Star/Delta"
];

async function restore() {
  try {
    for (const label of defaultSpecs) {
      const item_key = label.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
      await db.promise().query(
        'INSERT INTO motor_spec_items (item_key, label, is_active) VALUES (?, ?, ?)',
        [item_key, label, true]
      );
      console.log(`Inserted ${label}`);
    }
    console.log("Successfully restored motor_spec_items.");
    process.exit(0);
  } catch (error) {
    console.error("Error restoring motor_spec_items:", error);
    process.exit(1);
  }
}

restore();
