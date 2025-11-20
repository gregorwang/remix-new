# 🎓 编程 + AI 傻瓜式自学指南

> **目标读者：** 想要深入理解编程概念，并学会利用 AI 提升开发效率的开发者
> **预计学习时间：** 4-8 周（每天 1-2 小时）
> **难度：** 从零基础到中级

---

## 📚 目录

1. [第一部分：编程核心概念](#第一部分编程核心概念)
2. [第二部分：Web 开发框架对比](#第二部分web-开发框架对比)
3. [第三部分：AI 辅助编程实战](#第三部分ai-辅助编程实战)
4. [第四部分：项目实战练习](#第四部分项目实战练习)

---

## 第一部分：编程核心概念

### 1.1 什么是「服务端渲染」（SSR）？

#### 🍕 用点外卖来理解

**传统客户端渲染（CSR）：**
```
你点了披萨外卖 🍕
1. 外卖员送来一堆原材料（HTML + JS 文件）
2. 你需要自己组装披萨（浏览器执行 JS）
3. 等待时间：3-5 秒 ⏱️
4. 看到完整的披萨 ✅
```

**服务端渲染（SSR）：**
```
你点了披萨外卖 🍕
1. 厨房做好披萨（服务器渲染 HTML）
2. 外卖员直接送来成品披萨（完整 HTML）
3. 等待时间：0.5 秒 ⏱️
4. 立刻吃到披萨 ✅
```

#### 📝 代码示例

**客户端渲染（CSR）：**
```tsx
// 浏览器收到的 HTML：空壳子
<div id="root"></div>
<script src="app.js"></script>

// app.js 中的代码（在浏览器执行）：
function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    // 等待数据加载...
    fetch('/api/data').then(res => setData(res));
  }, []);

  if (!data) return <div>加载中...</div>;
  return <div>{data.title}</div>;
}
```

**服务端渲染（SSR）：**
```tsx
// 服务器生成的 HTML：已经有内容
<div id="root">
  <div>欢迎来到我的网站</div>
</div>
<script src="hydrate.js"></script>

// 服务器端代码（在 Node.js 执行）：
async function App() {
  const data = await fetch('/api/data'); // 服务器直接获取数据
  return <div>{data.title}</div>;
}
```

**关键区别：**
- CSR：用户看到空白页面 → 加载 JS → 获取数据 → 显示内容
- SSR：用户直接看到内容（SEO 友好，首屏快）

---

### 1.2 什么是「路由」（Routing）？

#### 🏠 用房间来理解

想象你的网站是一栋大房子：

```
你的网站（大房子 🏠）
├── / （客厅）              → 首页
├── /about （书房）         → 关于页面
├── /game （游戏室）        → 游戏页面
│   ├── /game/playstation  → PlayStation 房间
│   └── /game/switch       → Switch 房间
└── /api/chat （密室）      → 聊天 API
```

**文件系统路由（Remix）：**
```
app/routes/
├── _index.tsx         → 访问 "/" 时显示
├── about.tsx          → 访问 "/about" 时显示
├── game.tsx           → 访问 "/game" 时显示
├── game.$platform.tsx → 访问 "/game/playstation" 时显示
└── api.chat.tsx       → 访问 "/api/chat" 时执行
```

**文件系统路由（Next.js）：**
```
app/
├── page.tsx                → 访问 "/" 时显示
├── about/page.tsx          → 访问 "/about" 时显示
├── game/
│   ├── page.tsx           → 访问 "/game" 时显示
│   └── [platform]/page.tsx → 访问 "/game/playstation" 时显示
└── api/chat/route.ts       → 访问 "/api/chat" 时执行
```

**理解要点：**
- 路由 = 网址路径 + 对应的页面
- 文件系统路由 = 文件结构自动生成路由
- 动态路由 = 可以处理变化的路径（如 `/game/任意平台名`）

---

### 1.3 什么是「数据获取」（Data Fetching）？

#### 📱 用点外卖 App 来理解

**场景：** 你打开美团点外卖

```
第 1 步：打开 App（访问页面）
第 2 步：App 向服务器请求餐厅列表（数据获取）
第 3 步：服务器返回数据
第 4 步：App 显示餐厅列表（渲染页面）
```

#### 🔄 三种数据获取方式

**1️⃣ 客户端获取（useEffect）：**
```tsx
// 浏览器执行，用户等待
function RestaurantPage() {
  const [restaurants, setRestaurants] = useState([]);

  useEffect(() => {
    // 页面加载后才请求数据
    fetch('/api/restaurants')
      .then(res => res.json())
      .then(data => setRestaurants(data));
  }, []);

  if (!restaurants.length) return <div>加载中...</div>;
  return <div>{restaurants.map(r => <Card {...r} />)}</div>;
}
```
**优点：** 简单易懂
**缺点：** 用户看到「加载中...」，SEO 不友好

---

**2️⃣ 服务端获取（Remix loader）：**
```tsx
// 服务器执行，用户无感知
export const loader = async () => {
  // 服务器获取数据后再返回 HTML
  const restaurants = await db.restaurants.findMany();
  return json({ restaurants });
};

export default function RestaurantPage() {
  const { restaurants } = useLoaderData<typeof loader>();
  return <div>{restaurants.map(r => <Card {...r} />)}</div>;
}
```
**优点：** 首屏快，SEO 友好
**缺点：** 需要理解 loader 概念

---

**3️⃣ React Server Components（Next.js）：**
```tsx
// 服务器执行，代码更简洁
async function RestaurantPage() {
  // 直接在组件内 await 数据！
  const restaurants = await db.restaurants.findMany();
  return <div>{restaurants.map(r => <Card {...r} />)}</div>;
}

export default RestaurantPage;
```
**优点：** 代码简洁，性能最佳
**缺点：** 需要理解 Server Components

---

### 1.4 什么是「客户端组件」vs「服务端组件」？

#### 🎭 用演员和导演来理解

**服务端组件（导演 🎬）：**
```tsx
// 在后台准备道具（服务器执行）
async function MoviePage() {
  const movies = await db.movies.findMany(); // 获取数据
  return (
    <div>
      <h1>电影列表</h1>
      {movies.map(m => <MovieCard movie={m} />)}
    </div>
  );
}
```
- 在服务器执行
- 可以访问数据库、文件系统
- 不能使用 useState、onClick 等交互
- 用户看不到这部分代码

**客户端组件（演员 🎭）：**
```tsx
'use client'; // 标记为客户端组件

// 在舞台上表演（浏览器执行）
function MovieCard({ movie }) {
  const [liked, setLiked] = useState(false);

  return (
    <div>
      <h2>{movie.title}</h2>
      <button onClick={() => setLiked(!liked)}>
        {liked ? '❤️ 已喜欢' : '🤍 喜欢'}
      </button>
    </div>
  );
}
```
- 在浏览器执行
- 可以使用 useState、useEffect
- 可以处理用户交互（onClick、onChange）
- 代码会被发送到用户浏览器

**组合使用：**
```tsx
// 服务端组件
async function MoviesPage() {
  const movies = await db.movies.findMany();

  return (
    <div>
      {movies.map(m => (
        // 嵌入客户端组件处理交互
        <MovieCard key={m.id} movie={m} />
      ))}
    </div>
  );
}
```

**规则速记：**
- 需要交互（按钮、输入框）→ 客户端组件（`'use client'`）
- 只需显示数据 → 服务端组件（默认）
- 需要访问数据库 → 服务端组件
- 需要 useState/useEffect → 客户端组件

---

### 1.5 什么是「缓存」（Caching）？

#### 🍜 用外卖缓存来理解

**没有缓存（每次都重新做）：**
```
用户 A 点牛肉面 → 厨房做 30 分钟 → 送达 🍜
用户 B 点牛肉面 → 厨房做 30 分钟 → 送达 🍜
用户 C 点牛肉面 → 厨房做 30 分钟 → 送达 🍜
```

**有缓存（提前做好）：**
```
厨房提前做好 10 碗牛肉面（缓存 5 分钟）

用户 A 点牛肉面 → 直接取现成的 → 送达 🍜（1 分钟）
用户 B 点牛肉面 → 直接取现成的 → 送达 🍜（1 分钟）
用户 C 点牛肉面 → 直接取现成的 → 送达 🍜（1 分钟）

5 分钟后，缓存过期 → 重新做一批
```

#### 📝 代码示例

**Remix 的缓存：**
```tsx
export const loader = async () => {
  const games = await db.games.findMany();

  return json({ games }, {
    headers: {
      // 浏览器缓存 5 分钟，CDN 缓存 15 分钟
      "Cache-Control": "public, max-age=300, s-maxage=900"
    }
  });
};
```

**Next.js 的缓存：**
```tsx
async function GamesPage() {
  const games = await db.games.findMany();
  return <GamesList games={games} />;
}

// 每 5 分钟重新生成一次
export const revalidate = 300;
```

**缓存策略对比：**

| 策略 | 适用场景 | 示例 |
|-----|----------|------|
| **无缓存** | 实时数据（股票价格） | `Cache-Control: no-store` |
| **短缓存（5分钟）** | 经常更新（新闻列表） | `max-age=300` |
| **长缓存（1天）** | 很少更新（游戏列表） | `max-age=86400` |
| **永久缓存** | 不会更新（静态图片） | `max-age=31536000` |

---

## 第二部分：Web 开发框架对比

### 2.1 Remix vs Next.js：核心思想对比

#### 🚗 用汽车设计来理解

**Remix（手动挡跑车 🏎️）：**
```
特点：
- 给你完全的控制权
- 显式的 loader/action 函数（你知道什么时候获取数据）
- 文件路由简洁（game.$platform.tsx）
- 适合：喜欢掌控细节的开发者

优势：
- 嵌套路由的 loading UI 很优雅
- 表单处理非常直观（Form 组件）
- 文件结构扁平化

劣势：
- 需要手动处理缓存
- 生态系统相对较小
- 部署需要 Node.js 服务器
```

**Next.js（自动挡豪车 🚙）：**
```
特点：
- 自动化程度高
- Server Components 自动优化（框架帮你决定）
- 文件夹嵌套路由（game/[platform]/page.tsx）
- 适合：希望开箱即用的开发者

优势：
- 自动代码分割（服务端/客户端）
- 内置图片优化（<Image> 组件）
- Vercel 一键部署
- 生态系统成熟

劣势：
- 学习曲线陡峭（Server Components 概念）
- "魔法"太多（有时不知道发生了什么）
- 配置复杂（app router vs pages router）
```

#### 🎯 选择建议

**选 Remix 的理由：**
- 你喜欢简洁的文件结构
- 你需要完全掌控数据流
- 你的项目重度依赖表单交互
- 你不想学习太多新概念

**选 Next.js 的理由：**
- 你追求极致性能
- 你需要强大的 SEO
- 你想用 Vercel 部署
- 你愿意学习新范式（Server Components）

---

### 2.2 数据流对比（最重要！）

#### 📊 同一个功能，不同的实现方式

**需求：** 显示游戏列表，支持平台筛选

---

**实现方式 1：Remix**

```tsx
// app/routes/game.tsx
import { json, useLoaderData } from "@remix-run/react";

// 第 1 步：服务器获取数据
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const platform = url.searchParams.get("platform") || "playstation";

  // 从数据库获取游戏
  const games = await db.query.games.findMany({
    where: eq(gamesTable.platform, platform)
  });

  return json({
    games,
    platform
  }, {
    headers: {
      "Cache-Control": "public, max-age=300"
    }
  });
};

// 第 2 步：组件使用数据
export default function GamePage() {
  const { games, platform } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>{platform} 游戏列表</h1>
      {games.map(game => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  );
}
```

**数据流向：**
```
用户访问 /game?platform=switch
      ↓
Remix 调用 loader 函数
      ↓
loader 返回 { games, platform }
      ↓
useLoaderData() 获取数据
      ↓
渲染页面
```

---

**实现方式 2：Next.js（Server Components）**

```tsx
// app/game/page.tsx

// 第 1 步：直接在组件内获取数据
async function GamePage({
  searchParams
}: {
  searchParams: { platform?: string }
}) {
  const platform = searchParams.platform || "playstation";

  // 直接 await 数据！
  const games = await db.query.games.findMany({
    where: eq(gamesTable.platform, platform)
  });

  return (
    <div>
      <h1>{platform} 游戏列表</h1>
      {games.map(game => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  );
}

export default GamePage;

// 第 2 步：配置缓存
export const revalidate = 300; // 5 分钟
```

**数据流向：**
```
用户访问 /game?platform=switch
      ↓
Next.js 执行 GamePage 组件（在服务器）
      ↓
await 获取数据
      ↓
渲染 HTML
      ↓
返回给用户
```

---

**对比总结：**

| 特性 | Remix | Next.js |
|-----|-------|---------|
| **数据获取位置** | loader 函数 | 组件内部 |
| **获取数据方式** | `useLoaderData()` | `await fetchData()` |
| **类型安全** | ✅（typeof loader） | ✅（TypeScript） |
| **代码行数** | 约 30 行 | 约 20 行 |
| **心智负担** | 需要理解 loader 概念 | 需要理解 Server Components |
| **适合场景** | 复杂表单交互 | 数据密集型应用 |

---

### 2.3 表单处理对比

#### 📝 同一个功能：用户登录表单

**实现方式 1：Remix（action 函数）**

```tsx
// app/routes/login.tsx
import { Form, useActionData } from "@remix-run/react";

// 处理表单提交
export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");

  // 验证用户
  const user = await auth.signIn(email, password);

  if (!user) {
    return json({ error: "邮箱或密码错误" });
  }

  // 登录成功，重定向
  return redirect("/dashboard");
};

export default function LoginPage() {
  const actionData = useActionData<typeof action>();

  return (
    <Form method="post">
      <input name="email" type="email" required />
      <input name="password" type="password" required />

      {actionData?.error && (
        <p className="text-red-500">{actionData.error}</p>
      )}

      <button type="submit">登录</button>
    </Form>
  );
}
```

**特点：**
- 使用 `<Form>` 组件（增强的 `<form>`）
- action 函数处理提交
- useActionData 获取返回值
- 自动处理加载状态

---

**实现方式 2：Next.js（Server Actions）**

```tsx
// app/login/page.tsx
import { redirect } from 'next/navigation';

// Server Action（直接在组件内定义）
async function loginAction(formData: FormData) {
  'use server'; // 标记为服务端函数

  const email = formData.get("email");
  const password = formData.get("password");

  // 验证用户
  const user = await auth.signIn(email, password);

  if (!user) {
    return { error: "邮箱或密码错误" };
  }

  // 登录成功，重定向
  redirect("/dashboard");
}

export default function LoginPage() {
  return (
    <form action={loginAction}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit">登录</button>
    </form>
  );
}
```

**特点：**
- 使用原生 `<form>` 标签
- action 直接传递函数
- 更接近 HTML 原生体验
- 支持渐进式增强（无 JS 也能工作）

---

**对比总结：**

| 特性 | Remix | Next.js |
|-----|-------|---------|
| **表单组件** | `<Form>` | `<form>` |
| **处理函数** | action 函数（导出） | Server Action（内联） |
| **错误处理** | useActionData | useFormState |
| **加载状态** | useNavigation | useFormStatus |
| **渐进增强** | ✅ | ✅ |
| **学习曲线** | 中等 | 较陡 |

---

## 第三部分：AI 辅助编程实战

### 3.1 如何用 AI 理解代码？

#### 🔍 提示词技巧

**❌ 差的提问方式：**
```
"这段代码是干什么的？"
```

**✅ 好的提问方式：**
```
请分析这段 Remix loader 函数：

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const platform = url.searchParams.get("platform");
  const games = await db.query.games.findMany({
    where: eq(gamesTable.platform, platform)
  });
  return json({ games });
};

请回答：
1. 这段代码的执行时机？（服务器还是客户端？）
2. 它从哪里获取 platform 参数？
3. 返回的数据格式是什么？
4. 如何在组件中使用这些数据？
5. 如果改成 Next.js 应该怎么写？
```

**AI 会给出详细解释：**
```
1. 执行时机：服务器端（用户访问页面时）
2. 参数来源：URL 查询参数（?platform=switch）
3. 返回格式：{ games: Game[] }
4. 使用方式：const { games } = useLoaderData<typeof loader>()
5. Next.js 版本：
   async function Page({ searchParams }) {
     const games = await db.query.games.findMany({
       where: eq(gamesTable.platform, searchParams.platform)
     });
     return <GameList games={games} />;
   }
```

---

### 3.2 用 AI 进行代码迁移

#### 🚀 实战案例：Remix → Next.js

**步骤 1：提供完整上下文**

```
我有一个 Remix 项目，想迁移到 Next.js App Router。

当前文件：app/routes/game.$platform.tsx

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const platform = params.platform;
  const games = await db.query.games.findMany({
    where: eq(gamesTable.platform, platform)
  });

  const tokenResults = generateImageTokens(
    games.map(g => g.cover),
    30
  );

  return json({ games, tokenResults }, {
    headers: { "Cache-Control": "public, max-age=300" }
  });
};

export default function GamePlatformPage() {
  const { games } = useLoaderData<typeof loader>();

  return (
    <div>
      <GameFilter />
      <GameGrid games={games} />
    </div>
  );
}

请帮我转换为 Next.js App Router 格式，要求：
1. 保留所有功能
2. 使用 Server Components
3. 如果有需要交互的组件，标记为 'use client'
4. 保持相同的缓存策略
5. 生成新的文件路径
```

**AI 输出：**

```tsx
// 新文件路径：app/game/[platform]/page.tsx

import { generateImageTokens } from '@/lib/imageToken';
import { db } from '@/lib/db';
import { eq } from 'kysely';
import { gamesTable } from '@/lib/schema';
import GameFilter from '@/components/GameFilter';
import GameGrid from '@/components/GameGrid';

// Server Component（默认）
async function GamePlatformPage({
  params
}: {
  params: { platform: string }
}) {
  // 直接在组件内获取数据
  const games = await db.query.games.findMany({
    where: eq(gamesTable.platform, params.platform)
  });

  const tokenResults = generateImageTokens(
    games.map(g => g.cover),
    30
  );

  return (
    <div>
      {/* 客户端组件（需要交互） */}
      <GameFilter />

      {/* 服务端组件（仅展示） */}
      <GameGrid games={games} />
    </div>
  );
}

export default GamePlatformPage;

// 缓存配置（等同于 max-age=300）
export const revalidate = 300;

// 元数据
export async function generateMetadata({ params }) {
  return {
    title: `${params.platform} 游戏列表`,
  };
}
```

---

### 3.3 用 AI 学习新概念

#### 🧠 学习 React Server Components

**提示词模板：**

```
我是一个 Remix 开发者，想学习 React Server Components。

请用以下方式讲解：
1. 用比喻解释核心概念（我喜欢用餐厅/外卖的比喻）
2. 对比 Remix loader 和 Server Components 的区别
3. 提供 3 个实际应用场景
4. 给出最佳实践（什么时候用服务端组件，什么时候用客户端组件）
5. 常见错误及解决方案

请一步步讲解，不要跳过基础概念。
```

**AI 会输出：**

```
# React Server Components 傻瓜式讲解

## 1. 核心概念（餐厅比喻）

传统 React 组件：
- 你点了外卖，收到一堆食材和菜谱
- 你需要自己在家做饭（浏览器执行 JS）
- 做饭需要时间（加载 + 执行时间）

React Server Components：
- 你点了外卖，厨房直接做好菜
- 你收到的是成品（已渲染的 HTML）
- 直接吃，无需等待

## 2. 与 Remix loader 的对比

Remix loader：
export const loader = async () => {
  const data = await fetch();
  return json({ data });
};

export default function Page() {
  const { data } = useLoaderData();
  return <div>{data}</div>;
}

Server Components：
async function Page() {
  const data = await fetch(); // 直接 await！
  return <div>{data}</div>;
}

核心区别：
- Remix：数据获取和渲染分离
- RSC：数据获取和渲染合并

## 3. 实际应用场景

场景 1：博客文章列表
async function BlogList() {
  const posts = await db.posts.findMany();
  return posts.map(p => <PostCard {...p} />);
}

场景 2：用户个人资料
async function UserProfile({ userId }) {
  const user = await db.users.findById(userId);
  return <ProfileCard user={user} />;
}

场景 3：数据大屏
async function Dashboard() {
  const [sales, users, revenue] = await Promise.all([
    getSales(),
    getUsers(),
    getRevenue()
  ]);
  return <DashboardLayout {...} />;
}

## 4. 最佳实践

使用服务端组件的场景：
✅ 获取数据（数据库查询、API 调用）
✅ 读取文件系统
✅ 访问环境变量（敏感信息）
✅ 纯展示（无交互）

使用客户端组件的场景：
✅ 交互（onClick、onChange）
✅ 状态管理（useState、useReducer）
✅ 副作用（useEffect）
✅ 浏览器 API（localStorage、window）

## 5. 常见错误

错误 1：在服务端组件使用 useState
❌ async function Page() {
     const [count, setCount] = useState(0);
     ...
   }

✅ 解决：在客户端组件使用
   'use client';
   function Counter() {
     const [count, setCount] = useState(0);
     ...
   }

错误 2：在客户端组件访问数据库
❌ 'use client';
   function Page() {
     const users = await db.users.findMany();
     ...
   }

✅ 解决：在服务端组件获取数据，作为 props 传递
   async function Page() {
     const users = await db.users.findMany();
     return <UserList users={users} />;
   }

   'use client';
   function UserList({ users }) {
     return users.map(u => <UserCard {...u} />);
   }
```

---

### 3.4 用 AI 调试错误

#### 🐛 提示词技巧

**❌ 差的提问方式：**
```
我的代码报错了，怎么办？
```

**✅ 好的提问方式：**
```
我在迁移 Remix 到 Next.js 时遇到错误：

错误信息：
Error: useState cannot be used in Server Components

出错文件：app/game/page.tsx
出错代码：
async function GamePage() {
  const [filter, setFilter] = useState('all');
  const games = await db.games.findMany();
  return ...;
}

我的理解：
- 我想在服务端组件获取数据
- 但又需要客户端交互（筛选功能）

请问：
1. 为什么会报这个错？
2. 如何拆分服务端/客户端组件？
3. 如何在客户端组件中使用服务端数据？
4. 给出修改后的完整代码
```

**AI 会给出详细方案：**

```
## 错误原因
useState 是客户端 hook，只能在客户端组件使用。
async function 是服务端组件的标志，两者冲突。

## 解决方案：拆分组件

方案 1：服务端组件 + 客户端组件
// app/game/page.tsx（服务端）
async function GamePage() {
  const games = await db.games.findMany();
  return <GameList games={games} />;
}

// components/GameList.tsx（客户端）
'use client';
function GameList({ games }) {
  const [filter, setFilter] = useState('all');
  const filtered = games.filter(g =>
    filter === 'all' || g.platform === filter
  );

  return (
    <>
      <FilterButtons filter={filter} onChange={setFilter} />
      <GameGrid games={filtered} />
    </>
  );
}

方案 2：使用 URL 参数（保持服务端）
// app/game/page.tsx
async function GamePage({ searchParams }) {
  const filter = searchParams.filter || 'all';

  const games = await db.games.findMany({
    where: filter === 'all' ? {} : { platform: filter }
  });

  return (
    <>
      <FilterLinks currentFilter={filter} />
      <GameGrid games={games} />
    </>
  );
}

// components/FilterLinks.tsx
function FilterLinks({ currentFilter }) {
  return (
    <div>
      <Link href="/game?filter=all">全部</Link>
      <Link href="/game?filter=ps">PlayStation</Link>
      <Link href="/game?filter=switch">Switch</Link>
    </div>
  );
}

推荐：方案 2（SEO 友好，可分享链接）
```

---

### 3.5 用 AI 生成测试用例

#### 🧪 提示词模板

```
请为以下函数生成测试用例：

export function sortGamesByProgressAndRating(games: Game[]) {
  return games.sort((a, b) => {
    if (a.progress !== b.progress) {
      return (b.progress || 0) - (a.progress || 0);
    }
    return b.rating - a.rating;
  });
}

要求：
1. 使用 Vitest 框架
2. 覆盖边界情况（null progress、相同 progress）
3. 包含测试说明
4. 给出 Mock 数据示例
```

**AI 输出：**

```typescript
// lib/utils/__tests__/gameUtils.test.ts
import { describe, it, expect } from 'vitest';
import { sortGamesByProgressAndRating } from '../gameUtils';

describe('sortGamesByProgressAndRating', () => {
  it('应该按进度降序排列', () => {
    const games = [
      { id: 1, progress: 50, rating: 8 },
      { id: 2, progress: 100, rating: 9 },
      { id: 3, progress: 30, rating: 7 },
    ];

    const sorted = sortGamesByProgressAndRating(games);

    expect(sorted[0].progress).toBe(100);
    expect(sorted[1].progress).toBe(50);
    expect(sorted[2].progress).toBe(30);
  });

  it('相同进度时，应该按评分降序排列', () => {
    const games = [
      { id: 1, progress: 50, rating: 7 },
      { id: 2, progress: 50, rating: 9 },
      { id: 3, progress: 50, rating: 8 },
    ];

    const sorted = sortGamesByProgressAndRating(games);

    expect(sorted[0].rating).toBe(9);
    expect(sorted[1].rating).toBe(8);
    expect(sorted[2].rating).toBe(7);
  });

  it('应该正确处理 null progress', () => {
    const games = [
      { id: 1, progress: 50, rating: 8 },
      { id: 2, progress: null, rating: 9 },
      { id: 3, progress: 100, rating: 7 },
    ];

    const sorted = sortGamesByProgressAndRating(games);

    expect(sorted[0].id).toBe(3); // 100 进度
    expect(sorted[1].id).toBe(1); // 50 进度
    expect(sorted[2].id).toBe(2); // null 进度（视为 0）
  });

  it('应该处理空数组', () => {
    const games = [];
    const sorted = sortGamesByProgressAndRating(games);
    expect(sorted).toEqual([]);
  });
});
```

---

## 第四部分：项目实战练习

### 4.1 练习 1：创建一个简单的博客（Remix）

#### 🎯 目标
理解 Remix 的 loader/action 模式

#### 📝 步骤

**1. 创建路由文件**
```bash
app/routes/
├── blog._index.tsx    # 文章列表
├── blog.$slug.tsx     # 文章详情
└── blog.new.tsx       # 创建文章
```

**2. 实现文章列表（blog._index.tsx）**
```tsx
import { json, useLoaderData, Link } from "@remix-run/react";

export const loader = async () => {
  const posts = await db.posts.findMany({
    orderBy: { createdAt: 'desc' }
  });
  return json({ posts });
};

export default function BlogIndex() {
  const { posts } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>文章列表</h1>
      {posts.map(post => (
        <Link to={`/blog/${post.slug}`} key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </Link>
      ))}
    </div>
  );
}
```

**3. 实现文章详情（blog.$slug.tsx）**
```tsx
export const loader = async ({ params }: LoaderFunctionArgs) => {
  const post = await db.posts.findUnique({
    where: { slug: params.slug }
  });

  if (!post) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ post });
};

export default function BlogPost() {
  const { post } = useLoaderData<typeof loader>();

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}
```

**4. 实现创建文章（blog.new.tsx）**
```tsx
import { Form, redirect } from "@remix-run/react";

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();

  const post = await db.posts.create({
    data: {
      title: formData.get("title"),
      content: formData.get("content"),
      slug: generateSlug(formData.get("title"))
    }
  });

  return redirect(`/blog/${post.slug}`);
};

export default function NewPost() {
  return (
    <Form method="post">
      <input name="title" placeholder="标题" required />
      <textarea name="content" placeholder="内容" required />
      <button type="submit">发布</button>
    </Form>
  );
}
```

---

### 4.2 练习 2：创建相同的博客（Next.js）

#### 🎯 目标
理解 Next.js Server Components 和 Server Actions

#### 📝 步骤

**1. 创建文件结构**
```bash
app/
├── blog/
│   ├── page.tsx              # 文章列表
│   ├── [slug]/page.tsx       # 文章详情
│   └── new/page.tsx          # 创建文章
```

**2. 实现文章列表（blog/page.tsx）**
```tsx
import Link from 'next/link';

async function BlogPage() {
  const posts = await db.posts.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div>
      <h1>文章列表</h1>
      {posts.map(post => (
        <Link href={`/blog/${post.slug}`} key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </Link>
      ))}
    </div>
  );
}

export default BlogPage;

// 缓存配置
export const revalidate = 60;
```

**3. 实现文章详情（blog/[slug]/page.tsx）**
```tsx
import { notFound } from 'next/navigation';

async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await db.posts.findUnique({
    where: { slug: params.slug }
  });

  if (!post) {
    notFound();
  }

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}

export default BlogPost;
```

**4. 实现创建文章（blog/new/page.tsx）**
```tsx
import { redirect } from 'next/navigation';

async function createPost(formData: FormData) {
  'use server';

  const post = await db.posts.create({
    data: {
      title: formData.get("title"),
      content: formData.get("content"),
      slug: generateSlug(formData.get("title"))
    }
  });

  redirect(`/blog/${post.slug}`);
}

export default function NewPost() {
  return (
    <form action={createPost}>
      <input name="title" placeholder="标题" required />
      <textarea name="content" placeholder="内容" required />
      <button type="submit">发布</button>
    </form>
  );
}
```

---

### 4.3 练习 3：用 AI 进行代码 Review

#### 🎯 提示词模板

```
请 review 以下代码，从以下角度分析：

1. 性能优化（有没有不必要的重渲染？）
2. 安全性（有没有 XSS/SQL 注入风险？）
3. 可维护性（代码是否清晰？）
4. 最佳实践（是否符合 Remix/Next.js 最佳实践？）

代码：
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");

  const results = await db.$executeRaw`
    SELECT * FROM posts WHERE title LIKE '%${query}%'
  `;

  return json({ results });
};

请指出问题并给出改进建议。
```

**AI 会输出：**

```
## 代码 Review 结果

### 🚨 严重问题

1. **SQL 注入风险（安全性）**

   问题代码：
   SELECT * FROM posts WHERE title LIKE '%${query}%'

   风险：用户可以输入恶意 SQL 代码
   示例攻击：?q=' OR '1'='1

   修复方案：
   const results = await db.posts.findMany({
     where: {
       title: {
         contains: query
       }
     }
   });

2. **缺少输入验证（安全性）**

   问题：未验证 query 参数

   修复方案：
   if (!query || query.length > 100) {
     return json({ results: [] });
   }

### ⚠️ 性能问题

3. **缺少缓存策略（性能）**

   建议添加：
   return json({ results }, {
     headers: {
       "Cache-Control": "public, max-age=60"
     }
   });

4. **未限制返回数量（性能）**

   建议：
   const results = await db.posts.findMany({
     where: { title: { contains: query } },
     take: 20 // 限制 20 条
   });

### 📝 可维护性建议

5. **提取为独立函数**

   建议：
   // lib/search.ts
   export async function searchPosts(query: string) {
     return db.posts.findMany({
       where: { title: { contains: query } },
       take: 20
     });
   }

   // routes/search.tsx
   export const loader = async ({ request }) => {
     const query = new URL(request.url).searchParams.get("q");
     const results = await searchPosts(query);
     return json({ results }, {
       headers: { "Cache-Control": "public, max-age=60" }
     });
   };

### ✅ 最终优化版本

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");

  // 验证输入
  if (!query || query.length < 2 || query.length > 100) {
    return json({ results: [], error: "请输入 2-100 字符的搜索词" });
  }

  // 安全的数据库查询
  const results = await db.posts.findMany({
    where: {
      title: {
        contains: query,
        mode: 'insensitive' // 不区分大小写
      }
    },
    select: {
      id: true,
      title: true,
      excerpt: true,
      slug: true
    },
    take: 20,
    orderBy: {
      createdAt: 'desc'
    }
  });

  return json({ results }, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300"
    }
  });
};
```

---

## 📚 推荐学习资源

### 官方文档
- [Remix 官方文档](https://remix.run/docs)
- [Next.js 官方文档](https://nextjs.org/docs)
- [React Server Components RFC](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md)

### 视频教程
- [Remix 完整教程（英文）](https://www.youtube.com/watch?v=hsIWJpuxNj0)
- [Next.js 15 新特性（中文）](https://www.bilibili.com/video/BV1xx4y1Y7YZ)
- [React Server Components 深度解析](https://www.youtube.com/watch?v=TQQPAU21ZUw)

### 实战项目
- [Remix Blues Stack](https://github.com/remix-run/blues-stack) - Remix 全栈模板
- [Next.js Commerce](https://github.com/vercel/commerce) - Next.js 电商模板
- [T3 Stack](https://create.t3.gg/) - 全栈 TypeScript 模板

### AI 学习助手
- [Claude](https://claude.ai) - 适合深度代码分析
- [ChatGPT](https://chat.openai.com) - 适合快速答疑
- [GitHub Copilot](https://github.com/features/copilot) - 代码自动补全

---

## 🎯 学习计划（8 周）

### 第 1-2 周：基础概念
- [ ] 理解 SSR vs CSR
- [ ] 理解路由系统
- [ ] 理解数据获取方式
- [ ] 完成练习 1（Remix 博客）

### 第 3-4 周：Remix 深入
- [ ] 学习 loader/action 模式
- [ ] 学习嵌套路由
- [ ] 学习错误处理
- [ ] 学习表单验证

### 第 5-6 周：Next.js 入门
- [ ] 理解 Server Components
- [ ] 理解 Server Actions
- [ ] 完成练习 2（Next.js 博客）
- [ ] 对比两个实现的差异

### 第 7-8 周：实战项目
- [ ] 选择一个框架（Remix 或 Next.js）
- [ ] 构建个人项目（如：游戏收藏、笔记应用）
- [ ] 使用 AI 辅助开发
- [ ] 部署上线

---

## 💡 最后的建议

### 1. 不要急于求成
- 一次只学一个概念
- 通过实际项目巩固知识
- 遇到问题先自己思考 5 分钟，再问 AI

### 2. 善用 AI
- 把 AI 当作导师，不是搜索引擎
- 提供充足的上下文
- 要求 AI 解释原理，而不仅仅是给代码

### 3. 建立知识体系
- 做笔记（推荐使用 Obsidian）
- 写博客（输出是最好的学习）
- 参与社区讨论

### 4. 保持好奇心
- 遇到不懂的概念，深挖原理
- 阅读框架源码
- 关注技术前沿

---

**祝你学习愉快！记住：编程是一门手艺，需要大量练习才能精通。** 🚀
