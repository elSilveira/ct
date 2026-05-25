CREATE TABLE members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL UNIQUE,
  birth_date DATE NULL,
  role ENUM('member', 'player', 'admin', 'accountant') NOT NULL DEFAULT 'member',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  plays_pool BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE club_tuesdays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  status ENUM('open', 'closed', 'archived') NOT NULL DEFAULT 'open',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  club_tuesday_id INT NOT NULL,
  member_id INT NOT NULL,
  status ENUM('dinner', 'football', 'dinner_and_football', 'not_going') NOT NULL,
  dinner_guests INT NOT NULL DEFAULT 0,
  football_guests INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_attendance_per_member_per_tuesday (club_tuesday_id, member_id),
  FOREIGN KEY (club_tuesday_id) REFERENCES club_tuesdays(id),
  FOREIGN KEY (member_id) REFERENCES members(id),
  CHECK (dinner_guests >= 0),
  CHECK (football_guests >= 0)
);

CREATE TABLE pool_championships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  status ENUM('draft', 'active', 'finished', 'cancelled') NOT NULL DEFAULT 'draft',
  start_date DATE NULL,
  end_date DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE pool_teams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  championship_id INT NOT NULL,
  player_one_id INT NOT NULL,
  player_two_id INT NOT NULL,
  name VARCHAR(180) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (championship_id) REFERENCES pool_championships(id),
  FOREIGN KEY (player_one_id) REFERENCES members(id),
  FOREIGN KEY (player_two_id) REFERENCES members(id)
);

CREATE TABLE pool_matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  championship_id INT NOT NULL,
  club_tuesday_id INT NULL,
  team_a_id INT NOT NULL,
  team_b_id INT NOT NULL,
  team_a_points INT NULL,
  team_b_points INT NULL,
  status ENUM('open', 'pending_approval', 'confirmed', 'rejected', 'cancelled', 'corrected') NOT NULL DEFAULT 'open',
  submitted_by_member_id INT NULL,
  approved_by_member_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (championship_id) REFERENCES pool_championships(id),
  FOREIGN KEY (club_tuesday_id) REFERENCES club_tuesdays(id),
  FOREIGN KEY (team_a_id) REFERENCES pool_teams(id),
  FOREIGN KEY (team_b_id) REFERENCES pool_teams(id),
  FOREIGN KEY (submitted_by_member_id) REFERENCES members(id),
  FOREIGN KEY (approved_by_member_id) REFERENCES members(id),
  CHECK (team_a_points IS NULL OR team_a_points >= 0),
  CHECK (team_b_points IS NULL OR team_b_points >= 0)
);

CREATE TABLE drinks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  club_tuesday_id INT NOT NULL,
  member_id INT NOT NULL,
  drink_type ENUM('water_soda', 'beer') NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  status ENUM('active', 'removed') NOT NULL DEFAULT 'active',
  created_by_member_id INT NOT NULL,
  removed_by_member_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (club_tuesday_id) REFERENCES club_tuesdays(id),
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (created_by_member_id) REFERENCES members(id),
  FOREIGN KEY (removed_by_member_id) REFERENCES members(id),
  CHECK (quantity >= 0)
);

CREATE TABLE drink_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  drink_id INT NULL,
  club_tuesday_id INT NOT NULL,
  member_id INT NOT NULL,
  action ENUM('added', 'removed', 'updated') NOT NULL,
  drink_type ENUM('water_soda', 'beer') NOT NULL,
  old_quantity INT NULL,
  new_quantity INT NULL,
  performed_by_member_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (drink_id) REFERENCES drinks(id),
  FOREIGN KEY (club_tuesday_id) REFERENCES club_tuesdays(id),
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (performed_by_member_id) REFERENCES members(id)
);

CREATE TABLE charges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NULL,
  type ENUM('monthly_fee', 'drinks', 'dinner', 'fine', 'special_event', 'other') NOT NULL DEFAULT 'other',
  status ENUM('pending', 'paid', 'cancelled', 'overdue') NOT NULL DEFAULT 'pending',
  created_by_member_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (created_by_member_id) REFERENCES members(id),
  CHECK (amount > 0)
);

CREATE TABLE dinner_teams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  club_tuesday_id INT NOT NULL UNIQUE,
  notes TEXT NULL,
  created_by_member_id INT NOT NULL,
  updated_by_member_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (club_tuesday_id) REFERENCES club_tuesdays(id),
  FOREIGN KEY (created_by_member_id) REFERENCES members(id),
  FOREIGN KEY (updated_by_member_id) REFERENCES members(id)
);

CREATE TABLE dinner_team_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dinner_team_id INT NOT NULL,
  member_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_member_per_dinner_team (dinner_team_id, member_id),
  FOREIGN KEY (dinner_team_id) REFERENCES dinner_teams(id),
  FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE TABLE notices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  priority ENUM('normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  club_tuesday_id INT NULL,
  starts_at DATETIME NULL,
  expires_at DATETIME NULL,
  created_by_member_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (club_tuesday_id) REFERENCES club_tuesdays(id),
  FOREIGN KEY (created_by_member_id) REFERENCES members(id)
);
