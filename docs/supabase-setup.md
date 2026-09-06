# Supabase 云端同步开通指南

> 让「面试背记学习卡」支持**在线登录 + 云端记录数据**，换设备、换浏览器都不丢进度。

## 一、这是什么

项目默认是纯前端 + 本地 `localStorage` 存储（数据只存在当前浏览器里）。开通 Supabase 后：

- 顶部栏出现「🔑 登录」按钮，输入**昵称**即可登录（无需注册密码）
- 学习进度 / 题库档位 / 主题字体 / 编辑后的题库 → 自动保存到云端
- 换电脑、换浏览器、清缓存后，登录同一昵称即可恢复全部数据

**Supabase 免费额度**：500 MB 数据库 + 5 万月活用户，个人使用完全够。

---

## 二、5 分钟开通步骤

### 第 1 步：注册 Supabase

1. 打开 <https://supabase.com>
2. 点右上角 **Start your project** / **Sign up**，用 GitHub 账号或邮箱注册登录

### 第 2 步：创建项目

1. 进入 Dashboard，点 **New project**
2. 填：
   - **Name**：随便填，如 `interview-cards`
   - **Database Password**：设一个强密码（**务必记下来**，以后要登数据库用）
   - **Region**：选离你最近的（如 `Singapore` 或 `Southeast Asia`；国内访问建议选新加坡）
3. 点 **Create new project**，等 1~2 分钟初始化完成

### 第 3 步：执行建表 SQL

1. 进入项目后，左侧菜单点 **SQL Editor**
2. 点 **New query**，把下面「三、建表 SQL」整段粘进去
3. 点 **Run**（或 Ctrl+Enter）执行，看到 `Success. No rows returned` 即成功

### 第 4 步：拿到连接配置

1. 左侧菜单点 **Settings** → **API**（或 Project Settings → API）
2. 记下两个值：
   - **Project URL**：形如 `https://abcdefghijkl.supabase.co`
   - **anon public key**：形如 `eyJhbGciOiJIUzI1NiIs...`（很长一串）

### 第 5 步：填入项目

1. 打开项目里的 `src/js/cloud.js`
2. 顶部两个常量，填上你刚拿到的值：

   ```js
   const SUPABASE_URL = 'https://abcdefghijkl.supabase.co';  // 你的 Project URL
   const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIs...';      // 你的 anon public key
   ```

3. 保存文件

### 第 6 步：重新构建 + 部署

```bash
node build-v25.cjs
```

构建完成后，`dist/` 里的单文件版和 `dist/web/` 分片版就都带上了云端登录功能，重新部署即可。

---

## 三、建表 SQL（完整）

```sql
-- 用户数据表：一行一个昵称，data(jsonb) 存该用户全部状态
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  nickname text not null unique,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 开启行级安全
alter table public.profiles enable row level security;

-- 策略：简单昵称方案，允许匿名(anon)读写
create policy "anon_all_access" on public.profiles
  for all to anon
  using (true)
  with check (true);

-- 授予 anon 角色表权限（PostgREST 通过 anon 角色访问）
grant all on public.profiles to anon, authenticated;
```

> 想改表结构（比如加密码字段、加第三方登录）？改完表后回到这里重新执行对应 SQL 即可，前端 `cloud.js` 相应微调。

---

## 四、安全说明（重要）

本项目采用「**简单昵称**」登录（你选的方案），其安全边界请知悉：

- `anon public key` 是**公开**的（Supabase 设计如此），任何人打开网页都能拿到
- 昵称**没有密码**，因此**任何人输入同一个昵称，都能读取该昵称下的数据**

也就是说：这套方案的数据是「**防丢失**」而不是「**防偷看**」。学习进度本身不敏感，所以够用；但**不要**往题库里放任何敏感/隐私内容。

如果需要「真·私有账号」（邮箱密码、微信/QQ 登录、数据互不可见），需要改用 Supabase Auth + 行级隔离，属于后续升级，可再找我。

---

## 五、常见问题

**Q：不填 key 能用吗？**
能。`cloud.js` 未配置时自动禁用云端，回退为纯本地存储，一切功能照旧。

**Q：离线时数据会丢吗？**
不会。数据始终先写本地 `localStorage`，再异步推云端。断网时本地照常用，联网后自动补推。

**Q：为什么改完进度要等一会儿才上云？**
为了性能做了防抖：停止操作约 0.5 秒后自动推送一次。翻卡时不会频繁请求。

**Q：同步哪些数据？**
学习进度、题库档位、主题/字体、编辑后的题库。**不同步**：编辑器的「存档点 / 操作日志」（本地撤销辅助数据，体积大、价值低）。

**Q：两台设备同时用一个昵称会冲突吗？**
后登录的设备会以云端数据为准覆盖本地（登录时拉取云端覆盖）。建议一次只在一台设备上操作，避免互相覆盖。
