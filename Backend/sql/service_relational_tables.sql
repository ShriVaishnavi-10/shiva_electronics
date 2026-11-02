CREATE TABLE IF NOT EXISTS service_motor_specs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT NOT NULL,
  hp VARCHAR(50) NULL,
  rpm VARCHAR(50) NULL,
  stator_volts VARCHAR(50) NULL,
  rotor_volts VARCHAR(50) NULL,
  stator_amps VARCHAR(50) NULL,
  rotor_amps VARCHAR(50) NULL,
  excitation_volts VARCHAR(50) NULL,
  excitation_amps VARCHAR(50) NULL,
  sl_no VARCHAR(50) NULL,
  frame VARCHAR(50) NULL,
  core_length VARCHAR(50) NULL,
  core_inside VARCHAR(50) NULL,
  core_outside VARCHAR(50) NULL,
  shaft_size VARCHAR(50) NULL,
  no_of_slots VARCHAR(50) NULL,
  pitch VARCHAR(50) NULL,
  swg VARCHAR(50) NULL,
  channels VARCHAR(50) NULL,
  turns VARCHAR(50) NULL,
  half_coil VARCHAR(50) NULL,
  full_coil VARCHAR(50) NULL,
  one_set_wt VARCHAR(50) NULL,
  total_coils VARCHAR(50) NULL,
  total_wt VARCHAR(50) NULL,
  ins_class VARCHAR(50) NULL,
  star_delta VARCHAR(50) NULL,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS service_job_cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT NOT NULL,
  pulley VARCHAR(50) NULL,
  t_plate VARCHAR(50) NULL,
  carbon_brush VARCHAR(50) NULL,
  rotor VARCHAR(50) NULL,
  de_cover VARCHAR(50) NULL,
  nde_cover VARCHAR(50) NULL,
  make VARCHAR(50) NULL,
  c_cover VARCHAR(50) NULL,
  t_cover VARCHAR(50) NULL,
  eye_bolt VARCHAR(50) NULL,
  stator VARCHAR(50) NULL,
  de_shaft VARCHAR(50) NULL,
  nde_shaft VARCHAR(50) NULL,
  name_plate VARCHAR(50) NULL,
  c_fan VARCHAR(50) NULL,
  slip_ring VARCHAR(50) NULL,
  winding VARCHAR(50) NULL,
  bolt_nuts VARCHAR(50) NULL,
  de_bearings VARCHAR(50) NULL,
  nde_bearing VARCHAR(50) NULL,
  paint VARCHAR(50) NULL,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS service_materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT NOT NULL,
  copper VARCHAR(100) NULL,
  insulation VARCHAR(100) NULL,
  varnish VARCHAR(100) NULL,
  sleeves VARCHAR(100) NULL,
  fg_wire VARCHAR(100) NULL,
  wedge VARCHAR(100) NULL,
  bearing VARCHAR(100) NULL,
  t_plate VARCHAR(100) NULL,
  t_cover VARCHAR(100) NULL,
  cooling_fan VARCHAR(100) NULL,
  cooling_cover VARCHAR(100) NULL,
  shaft_welding VARCHAR(100) NULL,
  end_shields VARCHAR(100) NULL,
  bolt_nuts VARCHAR(100) NULL,
  paint_material VARCHAR(100) NULL,
  ins_5f_clause VARCHAR(100) NULL,
  ins_7f_clause VARCHAR(100) NULL,
  ins_5_ssb VARCHAR(100) NULL,
  ins_7_ssb VARCHAR(100) NULL,
  ins_fiber_cloth VARCHAR(100) NULL,
  ins_5_film VARCHAR(100) NULL,
  ins_7_film VARCHAR(100) NULL,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS person_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT NOT NULL,
  stage_name VARCHAR(50) NOT NULL, -- e.g., 'Work Attended By', 'Dismantling', 'Coil Removing', 'Rewinding', 'Fitting', 'Testing'
  step_number INT NOT NULL,        -- e.g., 1 to 5
  inspection_date DATE NULL,
  inspector_name VARCHAR(100) NULL,
  notes TEXT NULL,
  type VARCHAR(20) NULL,
  hours INT NULL DEFAULT 0,
  minutes INT NULL DEFAULT 0,
  amount DECIMAL(10,2) NULL DEFAULT 0.00,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE KEY unique_service_stage_step (service_id, stage_name, step_number)
);

-- We can safely add just the 3 "extra" columns to the services table because 3 columns won't break the row limit.
ALTER TABLE services
  ADD COLUMN extra_scrap_details TEXT NULL,
  ADD COLUMN extra_sample_coil VARCHAR(100) NULL,
  ADD COLUMN extra_total_weight VARCHAR(100) NULL;
