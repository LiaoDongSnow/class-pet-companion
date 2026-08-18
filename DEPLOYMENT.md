# 部署指南

## 免费部署方案：Vercel

### 1. 准备工作

1. 将代码推送到 GitHub：
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

2. 确保 `.gitignore` 文件包含：
```
node_modules
.next
.env
.env.local
dist
```

### 2. 配置环境变量

在 Vercel 项目设置中添加以下环境变量：

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 匿名密钥
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 服务角色密钥（用于后端 API）

### 3. 部署到 Vercel

1. 访问 [vercel.com](https://vercel.com) 并登录
2. 点击 "Add New Project"
3. 导入你的 GitHub 仓库
4. Vercel 会自动检测 Next.js 项目
5. 点击 "Deploy"

### 4. 数据库初始化

部署完成后，需要在 Supabase 中创建以下表：

```sql
-- 学生表
CREATE TABLE students (
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
CREATE TABLE pets (
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
CREATE TABLE student_pets (
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
CREATE TABLE point_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT,
  type VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 成就表
CREATE TABLE achievements (
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
CREATE TABLE student_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, achievement_id)
);

-- 宠物互动表
CREATE TABLE pet_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_pet_id UUID NOT NULL REFERENCES student_pets(id) ON DELETE CASCADE,
  guest_pet_id UUID NOT NULL REFERENCES student_pets(id) ON DELETE CASCADE,
  played_at TIMESTAMPTZ DEFAULT NOW(),
  happiness_gained INTEGER DEFAULT 5
);
```

### 5. 访问你的网站

部署完成后，Vercel 会提供一个免费的域名，格式为：`your-project.vercel.app`

你也可以绑定自定义域名。

## 其他免费部署选项

### Netlify
- 访问 [netlify.com](https://netlify.com)
- 导入 GitHub 仓库
- 设置构建命令：`pnpm run vercel-build`
- 设置发布目录：`.next`

### Cloudflare Pages
- 访问 [pages.cloudflare.com](https://pages.cloudflare.com)
- 导入 GitHub 仓库
- 框架预设选择 Next.js
- 部署

## 注意事项

1. **数据库**：项目使用 Supabase 作为数据库，需要在 [supabase.com](https://supabase.com) 创建免费项目
2. **环境变量**：确保在部署平台正确配置所有环境变量
3. **免费额度**：
   - Vercel：每月 100GB 流量，足够小型应用使用
   - Supabase：500MB 数据库，2GB 带宽
   - 对于教学场景完全够用

## 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```
