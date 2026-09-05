// 新增题库脚本：把「新知识来源.txt + MODEL.png/RAG.png」整理的新题并入 questions.json
// 来源标记：yd=有道云笔记课件；note=用户 txt 笔记 + 图片解读
// 用法：node tools/add-new.cjs
const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const QFILE = path.join(BASE, 'questions.json');

// ============================================================
// 一、新题数据（分类 / 星级 / 来源）
// ============================================================
const NEW = [
  // ---------- 缓存与Redis（DB 前缀，扩充） ----------
  {
    category: '缓存与Redis', star: 5, source: 'yd',
    question: 'Redis 的 5 大数据类型分别是什么？各自适用什么场景？',
    answer: '**5 大数据类型（核心必会）：**\n\n| 类型 | 结构 | 典型场景 |\n|---|---|---|\n| String 字符串 | 键值对 | 缓存、计数器、分布式锁、验证码 |\n| Hash 哈希 | 字段-值 | 存对象(用户信息)、购物车 |\n| List 列表 | 有序队列 | 消息队列、最新消息 |\n| Set 集合 | 去重无序 | 共同好友、去重、抽奖 |\n| ZSet 有序集合 | 带分值 | 排行榜、延迟队列 |\n\n**String 最常用，命令：** set/get 存取值；setnx(key 不存在才设置，抢锁)；mset/mget 批量；incr/decr/incrby 数字自增(原子)；expire/ttl 过期。\n\n**命名习惯：** key 用冒号分层级，如 `article:100:views`（类型:ID:属性）。',
    extend: '**易错：** 命令不区分大小写，但 key 区分大小写。\n**追问：** INCR 是原子操作，100 人同时点也不会加错——这是数据库字段自增做不到的，天然适合高并发计数。'
  },
  {
    category: '缓存与Redis', star: 4, source: 'yd',
    question: 'Redis 键过期机制如何实现？setex / expire / ttl / persist 的区别？',
    answer: '**键过期：** 给 key 设置存活时间，到期自动删除，是缓存的核心机制。\n\n**常用命令：**\n| 命令 | 作用 |\n|---|---|\n| `set key val ex 300` | 存值时直接设 300 秒过期 |\n| `setex key 300 val` | 等价写法，一个命令搞定 |\n| `expire key 60` | 给已有 key 设 60 秒过期 |\n| `ttl key` | 查剩余秒数：-1=永不过期，-2=已不存在 |\n| `persist key` | 取消过期时间 |\n\n**典型：登录验证码** `setex sms:13812345678 300 789123` —— 手机号 + 5 分钟有效。\n\n**口诀：** 所有缓存类数据都要先想清楚"过期时间多长"，这是写缓存代码的第一步。',
    extend: '**追问：** 过期时间的底层实现——惰性删除(访问时检查) + 定期删除(随机抽样)，两者配合避免内存堆积。'
  },
  {
    category: '缓存与Redis', star: 5, source: 'yd',
    question: 'Redis 如何实现分布式锁（秒杀防超卖）？为什么必须一条命令完成？',
    answer: '**问题：** 多台服务器同时处理同一任务时，普通代码锁只对单机有效，跨机器必须用分布式锁。\n\n**一条命令实现：**\n```\nSET lock:goods:1 抢锁人 NX EX 30\n# NX：key 不存在才设置成功(=抢到锁)\n# EX 30：30 秒自动释放(防死锁)\n```\n\n**Python 异步版（FastAPI 场景）：**\n```python\nok = await r.set(f"lock:goods:{id}", "userA", nx=True, ex=30)\nif ok:\n    return f"恭喜你抢到订单{id}"\nelse:\n    return f"手速慢了订单{id}已被抢走"\n```\n\n**关键：** setnx + expire 必须合并成一条 set(NX EX)，保证"抢锁 + 设过期"原子完成。若分开两步，抢到锁后程序崩溃，锁永远不释放，大家全卡死。',
    extend: '**易错：** 锁一定要设过期时间(EX)，否则拿到锁的程序崩了会死锁。\n**追问：** 生产级分布式锁还需考虑锁续期(看门狗)、锁误删(用唯一值校验)、RedLock 等，可用 Redisson 等成熟方案。'
  },
  {
    category: '缓存与Redis', star: 4, source: 'yd',
    question: '如何在 FastAPI 异步接口中集成 Redis 缓存？标准三步模板是什么？',
    answer: '**异步客户端：** `import redis.asyncio as redis`，连接加 `decode_responses=True` 返回字符串。异步版 = 同步版方法名 + `await`。\n\n**加缓存三步模板：查缓存 → 没有就查库 → 查完写缓存(带过期)：**\n```python\n@app.get("/goods/{goods_id}")\nasync def get_goods(goods_id: int):\n    cache_key = f"goods:{goods_id}"\n    cached = await r.get(cache_key)          # 1. 先查缓存\n    if cached:\n        return {"source": "redis缓存", "data": cached}\n    goods = fake_db.get(goods_id)            # 2. 查"数据库"\n    if goods is None:\n        await r.set(cache_key, "null_value", 30)  # 3a. 缓存空值防穿透\n        return {"source": "数据库", "data": None}\n    await r.set(cache_key, str(goods), 300)       # 3b. 查到写缓存\n    return {"source": "数据库", "data": goods}\n```\n\n**为什么要异步？** `await` 会"让出"事件循环，等 Redis 返回期间还能处理其他请求；同步版会卡住整个线程，FastAPI 高并发场景撑不住。',
    extend: '**易错：** 接口要改成 `async def`，所有 Redis 命令加 `await`；应用退出前建议 `await r.aclose()` 释放连接池。\n**追问：** 查不到缓存空值、查到带过期，都是防穿透/防脏数据的标准做法。'
  },
  {
    category: '缓存与Redis', star: 4, source: 'yd',
    question: 'Redis 和 MySQL 有什么区别？两者如何配合使用？',
    answer: '**对比：**\n| 对比项 | Redis | MySQL |\n|---|---|---|\n| 存储位置 | 内存 | 磁盘 |\n| 读写速度 | 微秒级 | 毫秒级 |\n| 持久化 | 靠配置(可能丢一点) | 默认可靠 |\n| 主要用途 | 缓存加速 | 核心业务数据存储 |\n\n**结论：** 两个是**配合关系**，不是替代关系——高频热点数据放 Redis（快、扛并发），完整业务数据放 MySQL（可靠、持久）。\n\n**典型架构：** 请求先打 Redis → 命中直接返回 → 未命中查 MySQL → 回写 Redis → 返回。',
    extend: '**追问：** Redis 持久化有 RDB(快照)和 AOF(追加日志)两种，可单独或混合开启；默认是"可能丢一点"的弱持久化，正是它快的原因之一。'
  },

  // ---------- Nginx（NG 前缀，全新分类） ----------
  {
    category: 'Nginx', star: 5, source: 'yd',
    question: 'Nginx 是什么？核心特点和应用场景有哪些？',
    answer: '**Nginx：** 一个网页服务器，负责"接收浏览器请求，把网页、图片、数据返回给浏览器"。目前全世界使用率最高的 Web 服务器之一，每 3 个网站约 1 个在用。\n\n**四个字：快、稳、轻、省**\n- 快：异步事件驱动，单进程服务成千上万请求，单台扛几万并发\n- 稳：后端崩了也能兜住，返回友好页面而非白屏\n- 轻：安装包几 MB，内存占用极低\n- 省：免费开源，配置简单\n\n**应用场景：** 静态资源服务器、反向代理、负载均衡、HTTPS 网关、限流/防盗链/动静分离。',
    extend: '**追问：** Nginx 高并发靠"异步非阻塞 + 事件驱动"，一个 worker 进程可同时处理大量连接，区别于 Apache 的"一个连接一个进程"。'
  },
  {
    category: 'Nginx', star: 4, source: 'yd',
    question: 'Nginx 与 Apache、Tomcat、IIS 有什么区别？',
    answer: '| 服务器 | 定位 | 特点 |\n|---|---|---|\n| Nginx | Web 服务器/反向代理/负载均衡 | 轻量高性能，最主流 |\n| Apache | Web 服务器 | 功能全模块多，高并发不如 Nginx |\n| Tomcat | 应用服务器(Java) | 专门跑 Java 程序，处理动态逻辑 |\n| IIS | Web 服务器(Windows) | 微软出品，跑 ASP.NET |\n\n**一句话：** Nginx 负责"接待和转发"，Tomcat / 后端程序负责"干活"，两者搭配使用。',
    extend: '**追问：** Nginx 是"反向代理 + 静态资源"层，业务逻辑由后端应用服务器(FastAPI/Spring Boot)承担，这是标准的动静分离架构。'
  },
  {
    category: 'Nginx', star: 5, source: 'yd',
    question: '什么是反向代理？和正向代理有什么区别？',
    answer: '**反向代理：** Nginx 收到用户请求后自己不处理，转交给后端程序处理，再把结果拿回给用户。\n\n**三大好处：**\n1. 隐藏后端：用户只跟 Nginx 打交道，不知道后端真实地址，更安全\n2. 统一入口：不管后端是 FastAPI 还是 Java，前端只认 Nginx 一个地址\n3. 为负载均衡铺路：多后端时统一调度\n\n**正向 vs 反向：**\n| 类型 | 代理对象 | 方向 |\n|---|---|---|\n| 正向代理 | 代理客户端 | 替你访问别人(翻墙/VPN) |\n| 反向代理 | 代理服务端 | 替别人接待你(Nginx) |\n\n**一句话：** 正向代理代理客户端；反向代理代理服务端。',
    extend: '**口诀：** 正向代理"替你上网"，反向代理"替你接待"。结构：用户→代理→目标(正向)；用户→Nginx→后端(反向)。'
  },
  {
    category: 'Nginx', star: 4, source: 'yd',
    question: 'Nginx 反向代理如何配置？proxy_pass 和 proxy_set_header 的作用？',
    answer: '**核心就一个 proxy_pass：**\n```nginx\nserver {\n    listen 8080;\n    server_name localhost;\n    location / {\n        proxy_pass http://127.0.0.1:8000;   # 转给本地 8000 端口\n        proxy_set_header Host $host;                    # 原域名\n        proxy_set_header X-Real-IP $remote_addr;        # 用户真实 IP\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; # 代理链路\n    }\n}\n```\n\n**proxy_pass：** 把请求转发到目标后端地址。\n**proxy_set_header：** 把真实信息传给后端（否则后端只能看到 Nginx 的 IP）。\n- `$host`、`$remote_addr` 是 Nginx 内置变量\n- `$remote_addr` = 用户真实 IP，日志、限流都用得上\n- `X-Forwarded-For` 记录整条代理链路，追溯真实用户 IP',
    extend: '**易错：** 忘记配 proxy_set_header 会导致后端拿到的 IP 全是 127.0.0.1，日志无法追溯真实用户。'
  },
  {
    category: 'Nginx', star: 5, source: 'yd',
    question: 'Nginx 如何实现负载均衡？有哪几种分配策略？',
    answer: '**负载均衡：** 流量大时多开几台后端，Nginx 当"叫号机"把请求均匀分配。\n\n**配置：** 先定义后端组 upstream，再 proxy_pass 转发给整个组：\n```nginx\nhttp {\n    upstream backend {\n        server 127.0.0.1:8001;\n        server 127.0.0.1:8002;\n        server 127.0.0.1:8003;\n    }\n    server {\n        listen 80;\n        location / {\n            proxy_pass http://backend;\n        }\n    }\n}\n```\n\n**4 种策略：**\n| 策略 | 配置 | 说明 |\n|---|---|---|\n| 轮询(默认) | 不写 | 顺序轮流，机会均等 |\n| 权重 | `server ... weight=3;` | 配置好的多分担 |\n| ip_hash | `ip_hash;` | 同一 IP 固定一台(会话保持) |\n| 最少连接 | `least_conn;` | 谁连接少分给谁 |\n\n**健康检查：** 某台后端失败，Nginx 自动摘除，恢复后再加回。',
    extend: '**追问：** ip_hash 解决 session 共享问题(同一用户固定后端)；生产环境常配第三方健康检查模块(nginx_upstream_check_module)。'
  },
  {
    category: 'Nginx', star: 4, source: 'yd',
    question: 'Nginx 配置文件分哪几大块？最小可用配置长什么样？',
    answer: '**三大块：**\n- main 全局块：作用于整个 Nginx(worker_processes、user 等)\n- events 事件块：连接处理方式(worker_connections)\n- http 块：所有网站服务配置，内含 server(虚拟主机) 和 location(路径匹配)\n\n**配置语法三条铁律：** 每条以分号 `;` 结尾；花括号 `{}` 表示配置块；`#` 开头是注释。\n\n**最小可用配置：**\n```nginx\nworker_processes 1;                 # 工作进程数 = CPU 核心数\nevents {\n    worker_connections 1024;        # 每个进程最多连接数\n}\nhttp {\n    include mime.types;\n    default_type application/octet-stream;\n    server {\n        listen 80;                  # 监听 80 端口\n        server_name localhost;\n        location / {\n            root html;              # 网页根目录\n            index index.html;       # 默认首页\n        }\n    }\n}\n```',
    extend: '**追问：** 一个 server = 一个网站；虚拟主机可用端口或域名(server_name)区分，一个 Nginx 跑多个网站。'
  },
  {
    category: 'Nginx', star: 3, source: 'yd',
    question: 'nginx -s reload 和 nginx -s stop 有什么区别？常用命令有哪些？',
    answer: '**常用命令：**\n| 命令 | 说明 |\n|---|---|\n| nginx | 启动 |\n| nginx -v | 查看版本 |\n| nginx -t | 检查配置文件语法(改配置后必查) |\n| nginx -s reload | 平滑重载配置(改完热生效，不用重启) |\n| nginx -s stop | 快速停止 |\n| nginx -s quit | 优雅停止(处理完当前请求再停) |\n\n**reload vs stop：** reload 是"热重载"，读取新配置并平滑切换，不停服务；stop 是直接停掉。\n\n**最佳实践：** 改完配置先执行 `nginx -t` 检查语法，提示 `syntax is ok` 再 reload，可避免 90% 的配置错误。',
    extend: '**追问：** reload 原理——Nginx 启动新 worker 处理新请求，旧 worker 处理完存量请求后退出，实现零停机更新。'
  },
  {
    category: 'Nginx', star: 5, source: 'yd',
    question: '前后端分离项目如何用 Nginx 部署？（静态页面 + API 代理）',
    answer: '**思路：** 前端页面 Nginx 管，后端接口 Nginx 代理过去，一个 80 端口全搞定。\n\n**配置：**\n```nginx\nserver {\n    listen 80;\n    server_name localhost;\n    # 静态页面：/ 下的请求返回前端网页\n    location / {\n        root myweb;\n        index index.html;\n    }\n    # 动态接口：/api 开头的请求转发给 FastAPI\n    location /api/ {\n        proxy_pass http://127.0.0.1:8000;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n    }\n    # FastAPI 文档路由也要代理\n    location /docs      { proxy_pass http://127.0.0.1:8000; }\n    location /openapi.json { proxy_pass http://127.0.0.1:8000; }\n}\n```\n\n**验证：** `http://localhost/` 显示静态网页；`http://localhost/api/users` 返回 FastAPI 的 JSON。',
    extend: '**易错：** 前后端分离要同时代理 /api、/docs、/openapi.json 等路由，漏了 /docs 会导致 Swagger 文档打不开。\n**追问：** 前端开发用 Vite(5173 端口)，生产由 Nginx 托管打包后的静态文件即可。'
  },

  // ---------- HTTP协议（HTTP 前缀，全新分类） ----------
  {
    category: 'HTTP协议', star: 5, source: 'yd',
    question: 'HTTP 报文结构是什么？请求报文和响应报文各分几部分？',
    answer: '**一句话记忆："行-头-空-体"四段式。**\n\n**请求报文（客户端→服务器）：**\n```\nGET /index.html HTTP/1.1        ← 请求行(方法+路径+版本)\nHost: www.example.com           ← 请求头\nUser-Agent: Chrome/120\n\n                                ← 空行(分隔头部和体)\nusername=alice&password=123     ← 请求体(仅 POST/PUT 有)\n```\n\n**响应报文（服务器→客户端）：**\n```\nHTTP/1.1 200 OK                 ← 状态行(版本+状态码+描述)\nContent-Type: text/html         ← 响应头\n\n                                ← 空行\n<html>...</html>                ← 响应体(真正的数据)\n```\n\n**四部分：** ①行(请求行/状态行) ②头(元信息) ③空行(分隔) ④体(数据)。',
    extend: '**追问：** 空行是必须的，用来分隔头部和体，没有空行接收方无法区分头部在哪结束。'
  },
  {
    category: 'HTTP协议', star: 5, source: 'yd',
    question: 'GET / POST / PUT / PATCH / DELETE 的区别？什么是幂等性？',
    answer: '| 方法 | 含义 | 典型场景 | 请求体 | 幂等 |\n|---|---|---|---|---|\n| GET | 查询/获取 | 搜索、查看详情 | ❌ 无 | ✅ |\n| POST | 新增/提交 | 登录注册、发评论、上传 | ✅ 有 | ❌ |\n| PUT | 整体更新 | 修改全部资料 | ✅ 有 | ✅ |\n| PATCH | 局部更新 | 只改头像、昵称 | ✅ 有 | ❌ |\n| DELETE | 删除 | 删除订单、评论 | ❌ 通常无 | ✅ |\n\n**幂等性：** 无论调用多少次，结果都一样。\n- GET 查一百次，数据不变 → 幂等\n- DELETE 删一次和删一百次结果一样(第二次返回 404) → 幂等\n- POST 发两次评论生成两条 → 不幂等\n\n**GET vs POST：** GET 参数在 URL 上(能收藏/缓存，不能传敏感数据)；POST 数据在 body 里(适合登录、上传)。',
    extend: '**易错：** PUT 是"整体替换"，PATCH 是"局部修改"，这是两者最常被问的区别。\n**追问：** GET 有长度限制(受 URL 长度限制)且参数暴露在地址栏，敏感信息必须用 POST。'
  },
  {
    category: 'HTTP协议', star: 5, source: 'yd',
    question: 'HTTP 状态码如何分类？常见状态码分别代表什么？',
    answer: '**看第一位数字就知道是哪类问题：**\n| 分类 | 范围 | 含义 |\n|---|---|---|\n| 1xx | 100-199 | 信息类，服务器还在处理 |\n| 2xx | 200-299 | 成功 |\n| 3xx | 300-399 | 重定向 |\n| 4xx | 400-499 | 客户端错误(你的问题) |\n| 5xx | 500-599 | 服务端错误(后端的问题) |\n\n**常见状态码：**\n- 200 OK 成功；201 Created 创建成功\n- 301 永久重定向(http→https)；302 临时重定向(未登录跳登录页)；304 用缓存\n- 400 请求格式错；401 未认证；403 无权限；404 资源不存在；405 方法不允许；429 请求太频繁\n- 500 服务器内部错误；502 网关错误(Nginx 连不上后端)；503 服务不可用；504 网关超时\n\n**趣味记忆：** 2xx 开心、3xx 转向、4xx 你错了、5xx 我错了。',
    extend: '**追问：** 401 vs 403——401 是"未登录(没认证)"，403 是"登录了但没权限"。\n**易错：** 502 常见于反向代理后端挂了，504 是后端响应超时。'
  },
  {
    category: 'HTTP协议', star: 4, source: 'yd',
    question: 'HTTP 和 HTTPS 有什么区别？',
    answer: '| 对比 | HTTP | HTTPS |\n|---|---|---|\n| 全称 | 超文本传输协议 | 超文本传输安全协议 |\n| 端口 | 80 | 443 |\n| 加密 | 无(明文) | SSL/TLS 加密 |\n| 安全 | 可被窃听篡改 | 防窃听、防篡改、防劫持 |\n| 证书 | 不需要 | 需 CA 证书 |\n| 速度 | 稍快 | 稍慢(加解密开销，差异已很小) |\n\n**一句话：** HTTP 是裸聊，HTTPS 是加密聊天。\n\n**判断：** 网址前有锁图标 + https:// → 安全；浏览器提示"不安全" → 用的是 HTTP，不要输入密码。',
    extend: '**追问：** HTTPS = HTTP + SSL/TLS 层，握手时用非对称加密交换密钥，之后用对称加密传输数据，兼顾安全与性能。'
  },
  {
    category: 'HTTP协议', star: 5, source: 'yd',
    question: '什么是跨域 CORS？为什么浏览器要限制？如何用 FastAPI 解决？',
    answer: '**跨域：** 页面上的 JS 请求另一个"源"(协议+域名+端口三者任一不同)的资源。\n\n**同源判断：** 协议、域名、端口完全一致才叫同源，否则就是跨域。\n\n**为什么限制（同源策略）：** 安全机制。若没有它，打开恶意网站 evil.com 时，其 JS 可偷偷请求 bank.com 的 API 读取你的转账记录。\n\n**典型场景：** 前端 Vue(3000 端口) 请求后端 FastAPI(8000 端口) → 端口不同 → 跨域被拦。\n\n**FastAPI 解决（CORSMiddleware）：**\n```python\nfrom fastapi.middleware.cors import CORSMiddleware\napp.add_middleware(\n    CORSMiddleware,\n    allow_origins=["*"],      # 允许的来源\n    allow_credentials=True,   # 允许携带 cookie/token\n    allow_methods=["*"],      # 允许的 HTTP 方法\n    allow_headers=["*"],      # 允许的请求头\n)\n```\n\n**本质：** 浏览器发现跨域先问服务器"你允许吗"，服务器响应头说"允许"，浏览器才把数据交给前端。',
    extend: '**易错：** 生产环境 allow_origins 不要用 `*`(尤其配 allow_credentials=True 时)，应列出具体域名。\n**追问：** 预检请求(OPTIONS)是浏览器在跨域+非简单请求时先发的探测请求。'
  },
  {
    category: 'HTTP协议', star: 4, source: 'yd',
    question: 'TCP 三次握手和四次挥手的过程是什么？',
    answer: '**三次握手（建立连接）：**\n```\n客户端 ── 1. SYN(我能连你吗?) ──▶ 服务器\n客户端 ◀─ 2. SYN+ACK(好的我收到) ── 服务器\n客户端 ── 3. ACK(好的开始发数据) ─▶ 服务器\n=== 连接建立，开始发 HTTP ===\n```\n\n**大白话：** 像打电话——"喂？""哎，能听见吗？""听见了，你说吧！"\n\n**为什么三次：** 两次无法确认双方收发都正常，三次能确认"你能收我也能收"。\n\n**四次挥手（断开连接）：** 数据传输完毕，客户端和服务端各发一次 FIN + ACK，礼貌地说再见，比三次多一次(因为断开时可能还有数据没发完，需要分两步确认)。',
    extend: '**追问：** HTTP/1.1 支持长连接(keep-alive)，连接保持一段时间，多个请求复用同一条连接，避免频繁握手，大幅提速。'
  },
  {
    category: 'HTTP协议', star: 4, source: 'yd',
    question: '从输入 URL 到页面显示，中间发生了什么？（6 步）',
    answer: '**6 步流程：**\n\n1. **DNS 解析** —— "查电话本"：输入 www.baidu.com，DNS 查出对应 IP 地址\n2. **TCP 三次握手** —— "打电话前确认"：建立稳定连接\n3. **发送 HTTP 请求** —— "点菜"：浏览器发 `GET / HTTP/1.1`\n4. **服务器处理并返回响应** —— "上菜"：返回 `200 OK` + HTML\n5. **浏览器解析渲染** —— "摆盘"：解析 HTML、加载 CSS/JS、下载图片\n6. **四次挥手断开(或保持长连接)** —— "挂电话"\n\n**细节：** 若页面有额外图片/CSS/JS，浏览器会再次发出 GET 请求去获取，直到页面完整呈现。',
    extend: '**追问：** DNS 有缓存(浏览器/系统/路由器/运营商多层)；这是前端面试超高频的"浏览器输入网址发生了什么"的完整版答案。'
  },

  // ---------- 大模型应用（LLM 前缀，全新分类） ----------
  {
    category: '大模型应用', star: 4, source: 'note',
    question: '什么是低代码平台？AI 应用开发有哪些低代码平台？',
    answer: '**低代码平台：** 通过可视化拖拽、配置的方式搭建应用，大幅减少手写代码，降低开发门槛、提升交付速度。\n\n**为什么要用：** 让不懂深度编程的人也能快速搭建应用；企业级应用开发更高效，把精力集中在业务逻辑而非重复代码。\n\n**AI 应用开发主流低代码平台：**\n| 平台 | 厂商 | 特点 |\n|---|---|---|\n| Dify | 苏州语灵 | 国际化做得好，企业级应用开发 |\n| Coze(扣子) | 字节跳动 | 自媒体、小团队 |\n| 商道 | — | 语音方向、政府场景 |\n\n**能做什么：** RAG 知识库、Agent、工作流编排等大模型应用核心能力，均可用可视化方式搭建。',
    extend: '**追问：** 低代码 ≠ 无代码——复杂逻辑仍需写代码(如自定义节点)，低代码是"可视化 + 代码扩展"结合。'
  },
  {
    category: '大模型应用', star: 5, source: 'note',
    question: '什么是 RAG？为什么要用 RAG 知识库？',
    answer: '**RAG(Retrieval-Augmented Generation，检索增强生成)：** 大模型外挂知识库的核心方案——先从外部知识库检索相关内容，再把它拼进提示词交给大模型生成，让答案"有据可依"。\n\n**为什么用知识库（解决大模型两大痛点）：**\n1. **知识过时：** 模型训练数据有截止时间，不知道最新信息\n2. **幻觉问题：** 模型会一本正经地编造不存在的内容\n\n**核心价值：** 不重新训练模型，就能让模型回答"私有/最新/专业"的数据；答案可溯源，减少幻觉。\n\n**典型场景：** 企业内部知识库问答、客服机器人、文档助手。',
    extend: '**追问：** RAG 和微调的区别——RAG 是"外挂知识"不改模型，微调是"把知识学进模型"；两者可结合。'
  },
  {
    category: '大模型应用', star: 5, source: 'note',
    question: 'RAG 知识库的完整工作原理是什么？（两大阶段）',
    answer: '**整体分两大阶段：知识更新(离线建库) + 知识检索(在线问答)。**\n\n**一、知识更新（离线索引阶段）：**\n1. **文档加载解析** —— 把 PDF/文档/网页等非结构化数据解析为标准格式，清洗补全\n2. **文件分块(chunking)** —— 把长文本拆成短块，避免向量化丢失细节\n3. **向量化(Embedding)** —— 用嵌入模型把每个文本块转成高维语义向量\n4. **写入向量数据库** —— 向量 + 原始文本一起存，用于相似度检索\n\n**二、知识检索（在线问答阶段）：**\n5. **Query 提问** —— 用户输入问题\n6. **知识检索** —— 问题同样过 Embedding 转向量，在向量库算相似度召回最相关的 chunks\n7. **重排序(Rerank)** —— 对召回候选做二次精排，筛出最匹配内容\n8. **增强(Prompt 拼接)** —— 把相关知识块 + 用户问题拼成"带外部知识的增强 Prompt"\n9. **生成** —— 输入 LLM，基于提示中的知识生成有依据的答案',
    extend: '**追问：** 检索质量决定 RAG 上限——"垃圾进垃圾出"，分块、向量化、重排序每一步都影响最终效果。'
  },
  {
    category: '大模型应用', star: 4, source: 'note',
    question: 'RAG 中文档加载解析如何实现？如何体现代码的可扩展性？',
    answer: '**文档解析的挑战：** 多种格式(PDF/docx/md/html)，其中 PDF 又分纯文本、图片(需 OCR)、表格(需结构化解析)。\n\n**技术实现：**\n- 纯文本 PDF：直接提取文本层\n- 图片型 PDF：OCR 识别\n- 表格：专门的表格解析，保留行列结构\n\n**如何介绍（面试话术模板）：** 采用什么技术实现哪些功能的开发——"在我的项目中实现了 8 种格式、500 篇文档的解析，覆盖 10 种业务场景。"\n\n**可扩展性（继承 + 多态）：** 定义统一的文档解析接口，每种格式实现一个解析器类，新增格式只需新增一个子类、不改动已有代码——这是典型的多态 + 开闭原则。\n\n**解析后：** 还需清洗(去乱码/去页眉页脚)和补全(补缺失元数据)。',
    extend: '**追问：** 面试时结合"继承、多态"讲可扩展性，是这道题最大的加分点。'
  },
  {
    category: '大模型应用', star: 5, source: 'note',
    question: 'RAG 中为什么要分块(chunking)？如何分块？',
    answer: '**为什么要分块：**\n- 长文本直接向量化会丢失细节，检索粒度太粗\n- 切成小块后，向量能更精准地表达局部语义，检索更准\n\n**三种分块方式：**\n1. **固定长度 + 重叠窗口** —— 按固定字符数切，块间保留重叠，避免语义被切断\n2. **特殊字符分块** —— 按段落/标题/标点等结构化标记切\n3. **语义分割** —— 用模型判断语义边界，按完整语义切(最准但成本高)\n\n**为什么这么分（面试回答要点）：** 平衡"语义完整性"和"检索精度"——块太大丢细节，块太小丢上下文，通常 300~500 token + 少量重叠是常用起点。',
    extend: '**追问：** 重叠窗口(chunk overlap)保证相邻块共享边界内容，避免一句话被从中间切断导致检索不到。'
  },
  {
    category: '大模型应用', star: 4, source: 'note',
    question: 'RAG 中向量模型如何选择？向量数据库如何对比？',
    answer: '**向量模型选择三要素：**\n1. **对中文的支持** —— 中文语义理解能力是否好\n2. **费用** —— API 调用成本 / 开源模型部署成本\n3. **数据安全(私有化部署)** —— 能否本地部署，敏感数据不出内网\n\n**选择流程：** 对比多个向量模型(如 BGE、M3E、text-embedding 系列等)，从上述三要素权衡，最终选一个结论。\n\n**向量数据库对比维度：**\n- 数据量(规模)\n- 检索性能(QPS、召回率)\n- 各指标对比(是否支持过滤、混合检索、多模态)\n\n**主流向量库：** Milvus、Chroma、FAISS、Qdrant、pgvector 等，小项目用轻量(Chroma/FAISS)，生产用分布式(Milvus)。',
    extend: '**追问：** 向量数据库专门做高维向量的"相似度匹配 + 快速检索"，普通关系型数据库做不到。'
  },
  {
    category: '大模型应用', star: 5, source: 'note',
    question: '什么是重排序(Rerank)？混合检索如何实现？',
    answer: '**重排序(精排)：** 初次向量召回得到一批候选 chunks 后，用重排序模型做二次精排，筛出匹配度最高的内容，提升检索精准度。\n\n**为什么要重排：** 向量相似度是粗排，只能保证"大概相关"；重排模型更精细地算相关性，让最准的排在前面。\n\n**混合检索：** 结合"语义相似(向量检索) + 文本相似度(关键词检索，如 BM25)"，再做**数据融合**(如 RRF 倒数排名融合)，兼顾"语义相关"和"精确关键词命中"。\n\n**举例：** 检索"中国人"和"我是中国人"——ES 用 IK 分词器，按最小粒度拆分(我/是/我是/中国/中国人)，能精确命中；纯向量检索可能只命中语义近似词。\n\n**结论：** 向量检索擅长语义，关键词检索擅长精确，混合检索 + 重排取长补短。',
    extend: '**追问：** RRF(Reciprocal Rank Fusion)是常见的融合算法，把多个检索结果的倒数排名相加排序。'
  },
  {
    category: '大模型应用', star: 5, source: 'note',
    question: '怎么解决大模型幻觉问题？',
    answer: '**幻觉：** 大模型一本正经地编造不存在的事实、数据、引用。\n\n**解决方案：**\n1. **RAG 检索增强** —— 给模型提供外部知识，让它基于真实资料回答(最主流)\n2. **提示词约束** —— 明确要求"不知道就说不知道"，禁止编造\n3. **降低温度(temperature)** —— 调低随机性，输出更保守\n4. **微调(领域数据)** —— 用高质量领域数据训练，减少瞎编\n5. **输出校验** —— 关键结论要求模型给出出处，二次校验\n6. **Few-shot 示例** —— 提供"知道/不知道"的示例引导\n\n**核心：** 幻觉本质是模型"缺乏知识但强答"，RAG 给它补上知识来源是根本解法。',
    extend: '**追问：** 面试常问"RAG 和微调谁更能解决幻觉"——RAG 更快见效、可溯源；微调治本但成本高。'
  },
  {
    category: '大模型应用', star: 4, source: 'note',
    question: '什么是 Agent？Agent 和工作流(Workflow)有什么区别？',
    answer: '**Agent(智能体)：** 让大模型具备"规划 + 调用工具 + 自主决策"的能力，能拆解任务、选择工具、多步执行。\n\n**核心组成：** LLM(大脑) + 工具(执行) + 记忆 + 规划。\n\n**Agent vs 工作流：**\n| 对比 | 工作流(Workflow) | Agent |\n|---|---|---|\n| 路径 | 预先固定 | 动态自主决策 |\n| 灵活性 | 低(流程写死) | 高(模型自己决定下一步) |\n| 可控性 | 高 | 低(可能跑偏) |\n| 适用 | 稳定重复的业务 | 复杂开放的任务 |\n\n**趋势：** 简单稳定用工作流，复杂多变用 Agent；实践中常"工作流 + 局部 Agent"混合。',
    extend: '**追问：** Agent 常用框架 LangChain / LangGraph，核心是 ReAct(推理+行动)循环——思考→行动→观察→再思考。'
  },
  {
    category: '大模型应用', star: 5, source: 'yd',
    question: '什么是 LoRA？它的原理和核心优势是什么？',
    answer: '**LoRA(Low-Rank Adaptation，低秩适配)：** 微软 2021 年提出的参数高效微调技术，当前大模型微调最广泛使用的方案。\n\n**原理（核心公式）：**\n- 全参微调把原始权重 W0 更新为 W，变化量 ΔW = W - W0\n- LoRA 的关键发现：微调的增量矩阵 ΔW 天生是**低秩**的\n- 低秩矩阵可拆成两个小矩阵相乘：ΔW ≈ A × B\n- 最终：**W_new = W0 + A×B**（冻结 W0 不动，只训练 A、B 两个小矩阵）\n\n**算账：** 4096×4096 的矩阵全参微调需更新约 1670 万参数；LoRA 用秩 r=8，A(4096×8)+B(8×4096) 共 65536 参数，**只更新 0.4% 参数，效果却媲美全参微调**。\n\n**优势：** 训练成本低、显存占用小、不易过拟合(小数据尤其重要)、推理无额外开销。',
    extend: '**追问：** "秩"的理解——矩阵真正独立、不冗余的有效信息量；低秩 = 信息集中在少数维度。\n**易错：** LoRA 冻结的是原始权重 W0，训练的是旁路矩阵 A、B，不是改原模型。'
  },
  {
    category: '大模型应用', star: 4, source: 'yd',
    question: 'LoRA 的训练和推理流程分别是怎样的？',
    answer: '**训练阶段：**\n- 冻结原始模型全部权重 W0，一个字都不动\n- 旁边新增两个极小矩阵 A、B，只训练它们\n- 因需更新和存储的参数量极小，显存占用极低\n- 只更新少量参数 → 不易过拟合(小数据集尤其重要)\n\n**推理阶段：**\n- 框架自动把 A×B 的结果**合并回**原始权重矩阵，形成完整模型\n- 合并是一次性的，之后推理和原生模型完全一样\n- **没有任何额外计算开销**，推理速度与原生一致\n\n**关键点：** 训练省资源(只训 A、B)，推理零开销(合并后无差别)，这是 LoRA 被广泛采用的根本原因。',
    extend: '**追问：** LoRA 保存的适配器目录通常只有 adapter_config.json + adapter_model.bin，不包含 tokenizer 文件。'
  },
  {
    category: '大模型应用', star: 4, source: 'yd',
    question: 'LLaMA-Factory 是什么？如何用它做模型微调？',
    answer: '**LLaMA-Factory：** 一个"标准化的模型改装厂"——统一的 LLM 训练与微调平台，无需写代码即可本地微调上百种模型。\n\n**解决三大痛点：**\n1. 统一接口：LLaMA/Qwen/ChatGLM 等 100+ 模型用同一套流程\n2. 极致省料：内置 LoRA 等轻量方案，消费级显卡就能微调\n3. 流水线作业：数据准备→训练→评估→部署全流程可视化\n\n**微调流程：**\n1. 安装 + 启动 WebUI(`llamafactory-cli webui`)\n2. 准备模型(如 ModelScope 下载 Qwen3-0.6B)\n3. 准备数据集：整理成 alpaca/sharegpt 格式，注册到 dataset_info.json\n4. 配置微调：选 LoRA、设训练轮数、最大样本数、对话模板\n5. 训练 + 测试(加载检查点对比效果)\n6. 导出合并：把 LoRA 适配器 + 基座模型合并导出为完整模型',
    extend: '**追问：** 检查点(checkpoint)用于断点续训，防止训练中途出错重头再来。\n**易错：** 数据集格式必须符合 sharegpt 的 messages 结构(user/assistant 角色)。'
  },
  {
    category: '大模型应用', star: 5, source: 'yd',
    question: 'vLLM 是什么？为什么它的吞吐量能比传统推理库高一个数量级？',
    answer: '**vLLM：** 面向大模型推理的高性能推理框架，专为大规模并发请求优化，兼容 OpenAI API 接口。\n\n**为什么快（四大特性）：**\n1. **PagedAttention 算法** —— 核心：高效管理显存(KV cache)，减少内存浪费，像操作系统的分页一样管理注意力缓存\n2. **高级 GPU 优化** —— 利用 CUDA + PyTorch 最大化 GPU 利用率\n3. **连续批处理(Continuous Batching)** —— 动态批处理 + 异步，提高并发吞吐\n4. **安全 + 易用** —— 内置 API 密钥校验，兼容 OpenAI API 服务器\n\n**启动：**\n```bash\nvllm serve /path/to/model \\\n  --served-model-name my-model \\\n  --tokenizer /path/to/base \\\n  --max-model-len 32768 \\\n  --gpu-memory-utilization 0.7\n```\n\n**调用：** 兼容 OpenAI 接口，用 `openai` 库设 `base_url` 即可调用 `/v1/chat/completions`。',
    extend: '**易错：** --tokenizer 通常指向基座模型(不是微调后目录)——因为 LoRA 微调不改变词表，微调目录往往没有完整的 tokenizer 文件。'
  },
  {
    category: '大模型应用', star: 4, source: 'yd',
    question: '为什么"模型 + 分词器"总是成对出现？分词器有哪些常用接口？',
    answer: '**为什么成对：** 模型不认文字、只认整数编号。分词器(Tokenizer)负责把"一句话"翻译成"一串数字"，所以模型和分词器必须配套——找不到"只用模型、不用分词器"的场景。\n\n**分词器的工序：** 拆解(子词) → 编号(input_ids) → 加标记([CLS]/[SEP]) → 整理长度(截断/补齐) → 配 attention_mask。\n\n**六个常用接口：**\n| 接口 | 作用 |\n|---|---|\n| tokenize | 文本拆成子词 |\n| convert_tokens_to_ids | 子词转编号 |\n| convert_ids_to_tokens | 编号转回子词 |\n| encode | 拆词+编号一步到位(自动加[CLS][SEP]) |\n| decode | 编号还原文字 |\n| tokenizer()(即 __call__) | 一次性完成全部工序，返回模型输入字典(最常用) |\n\n**加载：** `AutoTokenizer.from_pretrained("bert-base-chinese")` 在线/离线加载。',
    extend: '**追问：** 中文 BERT 的 tokenize 拆出来大多是一个个"字"；encode 会在首尾加 101([CLS])、102([SEP])。'
  },
  {
    category: '大模型应用', star: 5, source: 'yd',
    question: 'BERT 的输入和输出结构是什么？二分类和多分类分别取哪个输出？',
    answer: '**输入（三个张量，分词器自动生成）：**\n| 字段 | 作用 |\n|---|---|\n| input_ids | 分词编码后的 token ID 序列 |\n| attention_mask | 标记有效 token(1 有效，0 为 padding) |\n| token_type_ids | 区分句子对的两句(单句可省) |\n\n**输出（最常用两个字段）：**\n| 字段 | 说明 |\n|---|---|\n| last_hidden_state | 每个 token 的隐藏状态 (batch, seq_len, hidden) |\n| pooler_output | 整句级表示 (batch, hidden) |\n\n**分类任务取法：**\n- **二分类：** 取 pooler_output → 线性层输出 1 个 logit → Sigmoid 转概率，用 BCEWithLogitsLoss\n- **多分类：** 取 pooler_output → 线性层输出 K 个 logit → Softmax 归一化，用 CrossEntropyLoss\n\n**小结：** 整句分类(二/多分类)优先取 pooler_output；逐 token 任务(如 NER)取 last_hidden_state。',
    extend: '**追问：** pooler_output 就是 [CLS] 位置的输出再过一个全连接层，代表整句语义。'
  },
  {
    category: '大模型应用', star: 4, source: 'yd',
    question: 'HuggingFace Datasets 的 load_dataset 怎么用？常用预处理有哪些？',
    answer: '**load_dataset 统一接口：** 本地 CSV/JSON/parquet、云端开源数据集都能加载。\n```python\nfrom datasets import load_dataset\n# 单文件\nds = load_dataset("csv", data_files="./data.csv")["train"]\n# 多文件(train/test)\nds_dict = load_dataset("csv", data_files={"train": "./train.csv", "test": "./test.csv"})\n```\n\n**常用预处理：**\n| 操作 | 方法 |\n|---|---|\n| 删字段 | remove_columns(["name"]) |\n| 过滤样本 | filter(lambda x: x["label"] in [0,1]) |\n| 标签编码 | class_encode_column("name") |\n| 划分验证集 | train_test_split(test_size=0.2) |\n| 批量编码 | map(function, batched=True) |\n\n**保存：** save_to_disk()(推荐 Arrow 格式)、to_csv()/to_json()。\n**交给模型：** set_format(type="torch") 后可直接进 DataLoader。',
    extend: '**追问：** map(batched=True) 时函数收到的是"样本列表"，要处理 batch 结构；class_encode_column 把字符串标签映射为数字，可用 int2str/str2int 反查。'
  }
];

// ============================================================
// 二、合并逻辑
// ============================================================
const data = JSON.parse(fs.readFileSync(QFILE, 'utf8'));

// 前缀映射（新分类 → 新前缀）
const PREFIX = { 'Nginx': 'NG', 'HTTP协议': 'HTTP', '大模型应用': 'LLM' };

// 计算现有各前缀最大序号
const counters = {};
data.forEach(c => {
  const [p, n] = c.code.split('-');
  counters[p] = Math.max(counters[p] || 0, parseInt(n) || 0);
});

let maxId = Math.max(...data.map(c => c.id));
let added = 0;
const report = [];

for (const item of NEW) {
  // 新分类用新前缀，缓存与Redis 继续用 DB
  const prefix = PREFIX[item.category] || 'DB';
  const n = (counters[prefix] = (counters[prefix] || 0) + 1);
  const code = `${prefix}-${n}`;
  const rec = {
    id: ++maxId,
    code,
    category: item.category,
    question: item.question,
    answer: item.answer,
    extend: item.extend || '',
    source: item.source,
    star: item.star,
  };
  data.push(rec);
  added++;
  report.push({ code, category: item.category, star: item.star, source: item.source, q: item.question.slice(0, 24) });
}

fs.writeFileSync(QFILE, JSON.stringify(data, null, 2), 'utf8');
console.log(`✅ 新增 ${added} 题，总题数 ${data.length}`);
console.log('--- 新增明细 ---');
report.forEach(r => console.log(`  ${r.code} [${r.category}] ${'★'.repeat(r.star)} ${r.source} | ${r.q}`));

// 分类统计
const byCat = {};
data.forEach(c => { byCat[c.category] = (byCat[c.category] || 0) + 1; });
console.log('\n--- 新增后分类分布 ---');
Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
  const flag = v < 5 ? ' ← <5道' : '';
  console.log(`  ${String(v).padStart(3)}  ${k}${flag}`);
});
