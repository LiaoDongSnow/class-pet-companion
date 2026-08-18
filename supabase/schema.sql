-- 课上小伴 - Supabase 数据库架构

-- 学生表
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  class_name VARCHAR(50) NOT NULL,
  student_no VARCHAR(50),
  avatar_emoji VARCHAR(10) DEFAULT '🎓',
  total_points INTEGER DEFAULT 0,
  cumulative_points INTEGER DEFAULT 0,
  login_streak INTEGER DEFAULT 0,
  last_login_date DATE,
  total_play_times INTEGER DEFAULT 0,
  total_invited_times INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 宠物表
CREATE TABLE IF NOT EXISTS pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  species VARCHAR(50) NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  icon_baby TEXT,
  icon_teen TEXT,
  icon_adult TEXT,
  description TEXT,
  base_health INTEGER DEFAULT 100,
  base_happiness INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 学生宠物表
CREATE TABLE IF NOT EXISTS student_pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  nickname VARCHAR(100),
  health INTEGER DEFAULT 100,
  happiness INTEGER DEFAULT 100,
  hunger INTEGER DEFAULT 0,
  evolution_stage INTEGER DEFAULT 0,
  last_fed_at TIMESTAMPTZ,
  last_swapped_at TIMESTAMPTZ,
  last_rename_at TIMESTAMPTZ,
  consecutive_feed_days INTEGER DEFAULT 0,
  last_feed_date DATE,
  health_perfect_since TIMESTAMPTZ,
  last_update_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id)
);

-- 积分记录表
CREATE TABLE IF NOT EXISTS point_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT,
  type VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 成就表
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(10) NOT NULL,
  category VARCHAR(50) NOT NULL,
  condition_type VARCHAR(50) NOT NULL,
  condition_value INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 学生成就表
CREATE TABLE IF NOT EXISTS student_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, achievement_id)
);

-- 宠物互动表
CREATE TABLE IF NOT EXISTS pet_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_pet_id UUID NOT NULL REFERENCES student_pets(id) ON DELETE CASCADE,
  guest_pet_id UUID NOT NULL REFERENCES student_pets(id) ON DELETE CASCADE,
  played_at TIMESTAMPTZ DEFAULT NOW(),
  happiness_gained INTEGER DEFAULT 5
);

-- 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID,
  operator_name VARCHAR(100),
  operator_role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  target_student_id UUID,
  target_student_name VARCHAR(100),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 设置表
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入初始宠物数据
INSERT INTO pets (name, species, emoji, icon_baby, icon_teen, icon_adult, description, base_health, base_happiness) VALUES
('小猫咪', '猫', '🐱', '🐱', '😺', '😸', '可爱的小猫咪，喜欢玩耍', 100, 100),
('小狗狗', '狗', '🐶', '🐶', '🐕', '🦮', '忠诚的小狗狗，喜欢陪伴', 100, 100),
('小兔子', '兔', '🐰', '🐰', '🐇', '🐇', '温顺的小兔子，喜欢吃胡萝卜', 100, 100),
('小仓鼠', '仓鼠', '🐹', '🐹', '🐹', '🐹', '活泼的小仓鼠，喜欢跑轮', 100, 100),
('小鸟', '鸟', '🐦', '🐤', '🐦', '🦜', '快乐的小鸟，喜欢唱歌', 100, 100)
ON CONFLICT DO NOTHING;

-- 插入初始成就数据
INSERT INTO achievements (name, description, icon, category, condition_type, condition_value) VALUES
('初次见面', '第一次登录系统', '🎉', '特殊', 'first_login', 1),
('积分达人', '累计获得100积分', '⭐', '积分', 'cumulative_points', 100),
('积分大师', '累计获得500积分', '🌟', '积分', 'cumulative_points', 500),
('积分王者', '累计获得1000积分', '💫', '积分', 'cumulative_points', 1000),
('勤劳小主人', '连续7天喂养宠物', '🏆', '养成', 'consecutive_feed_days', 7),
('贴心守护者', '宠物健康值保持100%超过3天', '💖', '养成', 'health_perfect_days', 3),
('养成大师', '宠物进化到成年形态', '👑', '养成', 'evolution_stage', 3),
('社交小能手', '和其他同学的宠物一起玩5次', '🤝', '社交', 'play_times', 5),
('人气王', '宠物被其他同学邀请玩10次', '🎊', '社交', 'invited_times', 10),
('课堂之星', '单节课获得50积分', '✨', '特殊', 'single_session_points', 50)
ON CONFLICT DO NOTHING;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_students_class_name ON students(class_name);
CREATE INDEX IF NOT EXISTS idx_student_pets_student_id ON student_pets(student_id);
CREATE INDEX IF NOT EXISTS idx_point_records_student_id ON point_records(student_id);
CREATE INDEX IF NOT EXISTS idx_student_achievements_student_id ON student_achievements(student_id);
CREATE INDEX IF NOT EXISTS idx_pet_interactions_host ON pet_interactions(host_pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_interactions_guest ON pet_interactions(guest_pet_id);
