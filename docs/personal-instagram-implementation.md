# 个人Instagram风格内容模块 - 技术实现文档（AI开发指南）

> **文档版本**: v1.0
> **最后更新**: 2025-11-22
> **适用项目**: Remix个人作品集网站
> **目标读者**: AI开发助手、开发工程师

---

## 📋 目录

1. [功能概述](#功能概述)
2. [需求分析](#需求分析)
3. [架构设计](#架构设计)
4. [数据库设计](#数据库设计)
5. [Cloudflare Worker + R2集成](#cloudflare-worker--r2集成)
6. [权限控制系统](#权限控制系统)
7. [访问限制实现](#访问限制实现)
8. [点赞功能实现](#点赞功能实现)
9. [详细实现步骤](#详细实现步骤)
10. [测试验证](#测试验证)
11. [部署清单](#部署清单)

---

## 🎯 功能概述

### 业务目标
实现一个类似个人Instagram的内容展示系统，管理员可以发布图片/视频/文字动态，访客可以浏览和点赞。

### 核心特性
- ✅ **管理员专用发布** - 只有管理员账户可以创建/编辑/删除内容
- ✅ **Cloudflare R2存储** - 媒体文件存储在R2，通过Worker API上传
- ✅ **访问分级控制** - 未登录用户只能看前3条，登录用户看全部
- ✅ **登录点赞** - 只有登录用户可以点赞
- ✅ **时间轴展示** - Instagram风格的瀑布流布局
- ✅ **无需限流** - 管理员账户无需限流保护

### 用户流程

#### 管理员流程
```mermaid
graph TD
    A[登录管理员账户] --> B[访问/admin/logs]
    B --> C[点击"发布新动态"]
    C --> D[填写文字/选择图片视频]
    D --> E[文件自动上传到Cloudflare R2]
    E --> F[提交表单]
    F --> G[保存到数据库]
    G --> H[立即在首页显示]
```

#### 访客流程
```mermaid
graph TD
    A[访问首页/logs] --> B{是否登录?}
    B -->|否| C[只显示前3条动态]
    B -->|是| D[显示所有动态]
    C --> E[点击"登录查看更多"]
    E --> F[登录后看全部]
    D --> G[点击❤️点赞]
    G --> H[点赞数+1]
```

---

## 📊 需求分析

### 功能需求

| 需求ID | 描述 | 优先级 | 涉及模块 |
|--------|------|--------|----------|
| FR-01 | 管理员创建动态（文字+图片+视频） | P0 | 管理界面、Worker API |
| FR-02 | 管理员编辑/删除动态 | P0 | 管理界面、数据库 |
| FR-03 | 未登录用户查看前3条动态 | P0 | 路由、权限控制 |
| FR-04 | 登录用户查看全部动态 | P0 | 路由、认证 |
| FR-05 | 登录用户点赞功能 | P0 | API、数据库 |
| FR-06 | 时间轴瀑布流展示 | P1 | UI组件 |
| FR-07 | 图片/视频预览 | P1 | UI组件 |
| FR-08 | 响应式设计 | P1 | Tailwind CSS |

### 非功能需求

| 需求ID | 描述 | 目标指标 |
|--------|------|----------|
| NFR-01 | 页面加载性能 | LCP < 2.5s |
| NFR-02 | 图片加载优化 | 懒加载、WebP格式 |
| NFR-03 | 安全性等级 | 管理员权限验证、防CSRF |
| NFR-04 | 可维护性 | 代码模块化、注释完整 |
| NFR-05 | 成本控制 | Cloudflare免费额度内 |

---

## 🏗️ 架构设计

### 系统架构图

```
┌─────────────────────────────────────────────────────────┐
│                     Client Browser                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Logs List   │  │ Admin Panel  │  │  Auth Page   │  │
│  │    /logs     │  │/admin/logs   │  │   (Exists)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└───────────────┬──────────────┬────────────────┬─────────┘
                │              │                │
                ▼              ▼                ▼
┌─────────────────────────────────────────────────────────┐
│                    Remix Server                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Route Loaders & Actions                         │   │
│  │  - /logs (公开列表)                              │   │
│  │  - /admin/logs (管理界面)                        │   │
│  │  - /api/logs/:id/like (点赞)                     │   │
│  └────────────┬─────────────────────────────────────┘   │
│               ▼                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Business Logic Layer                            │   │
│  │  - LogService (CRUD操作)                         │   │
│  │  - requireAdmin (权限检查)                       │   │
│  │  - AuthService (已存在)                          │   │
│  └────────────┬─────────────────────────────────────┘   │
│               ▼                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Data Access Layer                               │   │
│  │  - SQLite (logs表 + log_media表 + log_likes表)  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│               Cloudflare Worker + R2                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Worker API (https://worker.your-domain.com)     │   │
│  │  - POST /upload (上传文件到R2)                   │   │
│  │  - GET /media/:key (获取文件)                    │   │
│  └────────────┬─────────────────────────────────────┘   │
│               ▼                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  R2 Storage Bucket                               │   │
│  │  - logs/images/                                  │   │
│  │  - logs/videos/                                  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 技术栈选型

| 层次 | 技术选型 | 理由 |
|------|----------|------|
| **前端框架** | React 18 + Remix 2.16 | 项目现有技术栈 |
| **样式方案** | Tailwind CSS 4.1 | Instagram风格响应式布局 |
| **数据库** | SQLite (better-sqlite3) | 轻量、已集成 |
| **文件存储** | Cloudflare R2 | 低成本、高性能CDN |
| **认证** | Better Auth | 已实现Magic Link + Google OAuth |
| **媒体上传** | Cloudflare Worker | S3兼容API，避免Remix处理大文件 |

---

## 💾 数据库设计

### 表结构设计

#### logs表（主表）

```sql
CREATE TABLE logs (
  -- 主键和标识
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- 内容字段
  content TEXT,                       -- 文字内容（可选，最多5000字符）

  -- 元数据
  author_id TEXT NOT NULL,            -- 管理员ID，关联user表
  author_name TEXT NOT NULL,          -- 作者名称（冗余字段，避免JOIN）

  -- 统计数据
  likes_count INTEGER DEFAULT 0,      -- 点赞总数
  views_count INTEGER DEFAULT 0,      -- 浏览次数（可选）

  -- 时间戳
  created_at INTEGER NOT NULL,        -- Unix时间戳
  updated_at INTEGER NOT NULL,        -- Unix时间戳

  -- 外键约束
  FOREIGN KEY (author_id) REFERENCES user(id) ON DELETE CASCADE
);

-- 索引优化
CREATE INDEX idx_logs_created ON logs(created_at DESC);
CREATE INDEX idx_logs_author ON logs(author_id, created_at DESC);
```

#### log_media表（媒体附件表）

```sql
CREATE TABLE log_media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_id INTEGER NOT NULL,
  media_type TEXT NOT NULL,           -- 'image' 或 'video'
  media_key TEXT NOT NULL,            -- R2存储key（如：logs/images/uuid.jpg）
  media_url TEXT NOT NULL,            -- 完整的CDN URL
  thumbnail_url TEXT,                 -- 视频缩略图URL（可选）
  width INTEGER,                      -- 原始宽度
  height INTEGER,                     -- 原始高度
  file_size INTEGER,                  -- 文件大小（字节）
  duration INTEGER,                   -- 视频时长（秒，仅视频）
  display_order INTEGER DEFAULT 0,   -- 显示顺序（支持多图）
  created_at INTEGER NOT NULL,

  FOREIGN KEY (log_id) REFERENCES logs(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_log_media_log ON log_media(log_id, display_order);
```

#### log_likes表（点赞表）

```sql
CREATE TABLE log_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,              -- 点赞用户ID
  created_at INTEGER NOT NULL,

  UNIQUE(log_id, user_id),            -- 防止重复点赞
  FOREIGN KEY (log_id) REFERENCES logs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_log_likes_log ON log_likes(log_id);
CREATE INDEX idx_log_likes_user ON log_likes(user_id, created_at DESC);
```

### 示例数据

```sql
-- 插入一条动态
INSERT INTO logs (content, author_id, author_name, created_at, updated_at)
VALUES (
  '今天天气不错，去公园拍了几张照片📷',
  'admin-user-id',
  '汪家俊',
  1700000000,
  1700000000
);

-- 插入媒体附件
INSERT INTO log_media (
  log_id,
  media_type,
  media_key,
  media_url,
  width,
  height,
  file_size,
  display_order,
  created_at
) VALUES (
  1,
  'image',
  'logs/images/2024-11-22-uuid123.webp',
  'https://r2.your-domain.com/logs/images/2024-11-22-uuid123.webp',
  1920,
  1080,
  524288,
  0,
  1700000000
);
```

---

## ☁️ Cloudflare Worker + R2集成

### 为什么用Cloudflare Worker？

**对比Remix直接上传的优势**：

| 维度 | Remix上传 | Cloudflare Worker |
|------|-----------|-------------------|
| **性能** | 需要转发文件流（慢） | 直接上传到R2（快） |
| **成本** | 占用Remix服务器带宽 | Cloudflare免费额度大 |
| **扩展性** | 受限于单个服务器 | 全球CDN边缘节点 |
| **复杂度** | 需要在Remix中处理文件 | Worker封装S3 API |
| **安全性** | 暴露R2凭证到Remix | Worker中安全存储 |

### Worker API设计

#### 端点1：上传文件

```
POST https://worker.your-domain.com/upload
Content-Type: multipart/form-data

Headers:
  Authorization: Bearer YOUR_SECRET_TOKEN

Body:
  file: <binary data>
  type: "image" | "video"

Response:
{
  "success": true,
  "data": {
    "key": "logs/images/2024-11-22-abc123.webp",
    "url": "https://r2.your-domain.com/logs/images/2024-11-22-abc123.webp",
    "width": 1920,
    "height": 1080,
    "size": 524288
  }
}
```

#### 端点2：获取文件（可选，如果R2设置为私有）

```
GET https://worker.your-domain.com/media/:key

Response:
  - 直接返回文件流
  - 设置Cache-Control头
```

### Worker代码实现

```javascript
// cloudflare-worker/src/index.js

import { v4 as uuidv4 } from 'uuid';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS处理
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }

    // 路由分发
    if (url.pathname === '/upload' && request.method === 'POST') {
      return handleUpload(request, env);
    }

    if (url.pathname.startsWith('/media/')) {
      return handleGetMedia(request, env);
    }

    return new Response('Not Found', { status: 404 });
  },
};

// 处理上传
async function handleUpload(request, env) {
  try {
    // 1. 验证Authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${env.UPLOAD_SECRET_TOKEN}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 2. 解析FormData
    const formData = await request.formData();
    const file = formData.get('file');
    const type = formData.get('type') || 'image'; // 'image' 或 'video'

    if (!file) {
      return jsonResponse({ error: 'No file provided' }, 400);
    }

    // 3. 验证文件类型
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/webm'];
    const allowedTypes = type === 'video' ? allowedVideoTypes : allowedImageTypes;

    if (!allowedTypes.includes(file.type)) {
      return jsonResponse({ error: 'Invalid file type' }, 400);
    }

    // 4. 验证文件大小
    const maxSize = type === 'video' ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB/10MB
    if (file.size > maxSize) {
      return jsonResponse({ error: 'File too large' }, 400);
    }

    // 5. 生成唯一文件名
    const ext = file.name.split('.').pop();
    const date = new Date().toISOString().split('T')[0]; // 2024-11-22
    const uuid = uuidv4().split('-')[0]; // 简短UUID
    const filename = `${date}-${uuid}.${ext}`;
    const key = `logs/${type}s/${filename}`; // logs/images/ 或 logs/videos/

    // 6. 上传到R2
    await env.R2_BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    // 7. 生成公开URL（如果R2绑定了自定义域名）
    const publicUrl = `https://r2.your-domain.com/${key}`;

    // 8. 获取图片尺寸（仅图片，使用Image Resizing API）
    let width = null;
    let height = null;

    if (type === 'image') {
      try {
        const imageResponse = await fetch(publicUrl);
        const buffer = await imageResponse.arrayBuffer();
        const dimensions = await getImageDimensions(buffer);
        width = dimensions.width;
        height = dimensions.height;
      } catch (err) {
        console.error('Failed to get image dimensions:', err);
      }
    }

    // 9. 返回响应
    return jsonResponse({
      success: true,
      data: {
        key,
        url: publicUrl,
        width,
        height,
        size: file.size,
        type: file.type,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

// 处理媒体获取（如果R2为私有）
async function handleGetMedia(request, env) {
  const url = new URL(request.url);
  const key = url.pathname.replace('/media/', '');

  try {
    const object = await env.R2_BUCKET.get(key);

    if (!object) {
      return new Response('Not Found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'public, max-age=31536000'); // 1年缓存

    return new Response(object.body, { headers });
  } catch (error) {
    return new Response('Internal Server Error', { status: 500 });
  }
}

// CORS处理
function handleCORS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// 辅助函数
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// 获取图片尺寸（简化版，实际可用sharp或image-size库）
async function getImageDimensions(buffer) {
  // 这里需要使用image metadata解析库
  // 简化版：返回null，让前端自己检测
  return { width: null, height: null };
}
```

### R2存储桶配置

#### 创建R2存储桶

```bash
# 使用Wrangler CLI
npx wrangler r2 bucket create your-bucket-name

# 绑定自定义域名（在Cloudflare Dashboard）
# 设置为：r2.your-domain.com
```

#### Worker绑定配置

```toml
# wrangler.toml
name = "log-upload-worker"
main = "src/index.js"
compatibility_date = "2024-11-22"

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "your-bucket-name"

[vars]
UPLOAD_SECRET_TOKEN = "your-secret-token-here"
```

#### 部署Worker

```bash
# 安装依赖
npm install

# 部署到Cloudflare
npx wrangler deploy

# 部署后获得URL：https://log-upload-worker.your-username.workers.dev
```

---

## 🔒 权限控制系统

### 管理员权限检查

#### requireAdmin工具函数

```typescript
// app/lib/auth.server.ts（已存在，需要确认）

import { auth } from "~/lib/auth.server";
import { redirect } from "@remix-run/node";

/**
 * 检查用户是否为管理员
 */
export function isAdmin(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
  return adminEmails.includes(email);
}

/**
 * 要求管理员权限，否则跳转到登录页
 */
export async function requireAdmin(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    throw redirect("/auth?redirectTo=" + new URL(request.url).pathname);
  }

  if (!isAdmin(session.user.email)) {
    throw new Response("Forbidden: 仅管理员可访问", { status: 403 });
  }

  return session.user;
}
```

### 路由权限保护

```typescript
// app/routes/admin.logs._index.tsx

export async function loader({ request }: LoaderFunctionArgs) {
  // 🔒 第一步：检查管理员权限
  await requireAdmin(request);

  // ✅ 通过权限检查，继续处理
  // ...
}

export async function action({ request }: ActionFunctionArgs) {
  // 🔒 同样需要检查
  await requireAdmin(request);

  // ...
}
```

---

## 🚦 访问限制实现

### 核心逻辑：前3条限制

#### Loader实现

```typescript
// app/routes/logs._index.tsx

import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { db } from "~/lib/db.server";
import { auth } from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  // 1. 检查用户登录状态
  const session = await auth.api.getSession({ headers: request.headers });
  const isLoggedIn = !!session?.user;

  // 2. 查询动态列表
  const limit = isLoggedIn ? 50 : 3; // 未登录只返回3条

  const logs = db
    .prepare(
      `
      SELECT
        l.id,
        l.content,
        l.author_name,
        l.likes_count,
        l.created_at,
        GROUP_CONCAT(
          json_object(
            'id', lm.id,
            'type', lm.media_type,
            'url', lm.media_url,
            'thumbnail', lm.thumbnail_url,
            'width', lm.width,
            'height', lm.height,
            'order', lm.display_order
          ),
          '||'
        ) as media
      FROM logs l
      LEFT JOIN log_media lm ON l.id = lm.log_id
      GROUP BY l.id
      ORDER BY l.created_at DESC
      LIMIT ?
    `
    )
    .all(limit) as any[];

  // 3. 解析媒体JSON
  const logsWithMedia = logs.map((log) => ({
    ...log,
    media: log.media
      ? log.media.split("||").map((m: string) => JSON.parse(m))
      : [],
  }));

  // 4. 如果用户已登录，查询其点赞状态
  let userLikes: Set<number> = new Set();
  if (session?.user) {
    const likes = db
      .prepare("SELECT log_id FROM log_likes WHERE user_id = ?")
      .all(session.user.id) as { log_id: number }[];
    userLikes = new Set(likes.map((l) => l.log_id));
  }

  // 5. 添加点赞状态
  const logsWithLikes = logsWithMedia.map((log) => ({
    ...log,
    isLiked: userLikes.has(log.id),
  }));

  return json({
    logs: logsWithLikes,
    isLoggedIn,
    hasMore: !isLoggedIn && logs.length === 3, // 未登录且有3条，说明有更多
  });
}
```

#### 前端UI提示

```typescript
// app/routes/logs._index.tsx（客户端组件）

export default function LogsIndex() {
  const { logs, isLoggedIn, hasMore } = useLoaderData<typeof loader>();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">动态</h1>

      {/* 动态列表 */}
      <div className="space-y-8">
        {logs.map((log) => (
          <LogCard key={log.id} log={log} isLoggedIn={isLoggedIn} />
        ))}
      </div>

      {/* 未登录提示 */}
      {hasMore && !isLoggedIn && (
        <div className="mt-12 text-center">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8">
            <p className="text-gray-600 mb-4">
              登录后查看更多精彩内容
            </p>
            <Link
              to="/auth?redirectTo=/logs"
              className="inline-block bg-accent-DEFAULT text-white px-6 py-3 rounded-lg hover:bg-accent-DEFAULT/90 transition"
            >
              立即登录
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## ❤️ 点赞功能实现

### API路由

```typescript
// app/routes/api.logs.$logId.like.tsx

import { json, type ActionFunctionArgs } from "@remix-run/node";
import { db } from "~/lib/db.server";
import { requireAuth } from "~/lib/auth.server";

export async function action({ request, params }: ActionFunctionArgs) {
  // 1. 要求用户登录
  const user = await requireAuth(request);
  const logId = parseInt(params.logId!);

  if (!logId) {
    return json({ error: "Invalid log ID" }, { status: 400 });
  }

  try {
    // 2. 检查是否已点赞
    const existingLike = db
      .prepare("SELECT id FROM log_likes WHERE log_id = ? AND user_id = ?")
      .get(logId, user.id) as { id: number } | undefined;

    if (existingLike) {
      // 3a. 已点赞 → 取消点赞
      db.prepare("DELETE FROM log_likes WHERE id = ?").run(existingLike.id);
      db.prepare("UPDATE logs SET likes_count = likes_count - 1 WHERE id = ?").run(
        logId
      );

      return json({ success: true, action: "unliked", liked: false });
    } else {
      // 3b. 未点赞 → 添加点赞
      const now = Math.floor(Date.now() / 1000);
      db.prepare(
        "INSERT INTO log_likes (log_id, user_id, created_at) VALUES (?, ?, ?)"
      ).run(logId, user.id, now);
      db.prepare("UPDATE logs SET likes_count = likes_count + 1 WHERE id = ?").run(
        logId
      );

      return json({ success: true, action: "liked", liked: true });
    }
  } catch (error) {
    console.error("Like error:", error);
    return json({ error: "Failed to like/unlike" }, { status: 500 });
  }
}
```

### 前端点赞按钮

```typescript
// app/components/logs/LikeButton.tsx

import { useFetcher } from "@remix-run/react";
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";

interface LikeButtonProps {
  logId: number;
  initialLikes: number;
  isLiked: boolean;
  isLoggedIn: boolean;
}

export function LikeButton({
  logId,
  initialLikes,
  isLiked,
  isLoggedIn,
}: LikeButtonProps) {
  const fetcher = useFetcher();

  // 乐观更新
  const optimisticLikes =
    fetcher.formData !== undefined
      ? isLiked
        ? initialLikes - 1
        : initialLikes + 1
      : initialLikes;

  const optimisticIsLiked =
    fetcher.formData !== undefined ? !isLiked : isLiked;

  function handleClick() {
    if (!isLoggedIn) {
      alert("请先登录后再点赞");
      return;
    }

    fetcher.submit(
      {},
      {
        method: "post",
        action: `/api/logs/${logId}/like`,
      }
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
        optimisticIsLiked
          ? "text-red-500 bg-red-50"
          : "text-gray-600 bg-gray-100 hover:bg-gray-200"
      }`}
      disabled={fetcher.state !== "idle"}
    >
      {optimisticIsLiked ? (
        <HeartSolid className="w-5 h-5" />
      ) : (
        <HeartOutline className="w-5 h-5" />
      )}
      <span className="font-medium">{optimisticLikes}</span>
    </button>
  );
}
```

---

## 🛠️ 详细实现步骤

### Phase 1: 数据库和模型层（预计2-3小时）

#### Step 1.1: 创建数据库迁移脚本

```sql
-- app/lib/migrations/002_create_logs_tables.sql

-- 主动态表
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (author_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_author ON logs(author_id, created_at DESC);

-- 媒体附件表
CREATE TABLE IF NOT EXISTS log_media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_id INTEGER NOT NULL,
  media_type TEXT NOT NULL CHECK(media_type IN ('image', 'video')),
  media_key TEXT NOT NULL,
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  duration INTEGER,
  display_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (log_id) REFERENCES logs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_log_media_log ON log_media(log_id, display_order);

-- 点赞表
CREATE TABLE IF NOT EXISTS log_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(log_id, user_id),
  FOREIGN KEY (log_id) REFERENCES logs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_log_likes_log ON log_likes(log_id);
CREATE INDEX IF NOT EXISTS idx_log_likes_user ON log_likes(user_id, created_at DESC);
```

#### Step 1.2: 更新数据库初始化

```typescript
// app/lib/db.server.ts

import { readFileSync } from "fs";
import { join } from "path";

export function initializeDatabase(db: Database.Database) {
  // ... 现有代码 ...

  // 执行logs表迁移
  const migrationPath = join(
    process.cwd(),
    "app/lib/migrations/002_create_logs_tables.sql"
  );
  const migrationSQL = readFileSync(migrationPath, "utf-8");
  db.exec(migrationSQL);

  console.log("✅ Logs tables initialized");
}
```

#### Step 1.3: TypeScript类型定义

```typescript
// app/lib/types/log.ts

export interface Log {
  id: number;
  content: string | null;
  author_id: string;
  author_name: string;
  likes_count: number;
  views_count: number;
  created_at: number;
  updated_at: number;
}

export interface LogMedia {
  id: number;
  log_id: number;
  media_type: "image" | "video";
  media_key: string;
  media_url: string;
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  file_size: number | null;
  duration: number | null;
  display_order: number;
  created_at: number;
}

export interface LogWithMedia extends Log {
  media: LogMedia[];
  isLiked?: boolean; // 当前用户是否点赞
}

export interface CreateLogInput {
  content?: string;
  author_id: string;
  author_name: string;
  media: Array<{
    type: "image" | "video";
    key: string;
    url: string;
    thumbnail?: string;
    width?: number;
    height?: number;
    size?: number;
    duration?: number;
  }>;
}
```

---

### Phase 2: Cloudflare Worker部署（预计2-3小时）

#### Step 2.1: 初始化Worker项目

```bash
# 在项目根目录外创建Worker项目
cd ..
mkdir log-upload-worker
cd log-upload-worker

# 初始化
npm init -y
npm install wrangler -D
npx wrangler init
```

#### Step 2.2: 编写Worker代码

将上面"Cloudflare Worker + R2集成"章节的代码保存到 `src/index.js`。

#### Step 2.3: 配置wrangler.toml

```toml
name = "log-upload-worker"
main = "src/index.js"
compatibility_date = "2024-11-22"

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "your-logs-bucket"

[vars]
# 开发环境
[env.dev.vars]
UPLOAD_SECRET_TOKEN = "dev-secret-token-123"

# 生产环境
[env.production.vars]
UPLOAD_SECRET_TOKEN = "prod-secret-token-456"
```

#### Step 2.4: 部署Worker

```bash
# 创建R2存储桶
npx wrangler r2 bucket create your-logs-bucket

# 部署到开发环境
npx wrangler deploy --env dev

# 部署到生产环境
npx wrangler deploy --env production
```

#### Step 2.5: 绑定自定义域名

1. 在Cloudflare Dashboard中进入Worker
2. 点击"Settings" → "Triggers" → "Custom Domains"
3. 添加域名：`worker.your-domain.com`
4. 等待DNS生效

---

### Phase 3: 管理员发布界面（预计4-5小时）

#### Step 3.1: 管理员列表路由

```typescript
// app/routes/admin.logs._index.tsx

import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form, Link } from "@remix-run/react";
import { requireAdmin } from "~/lib/auth.server";
import { db } from "~/lib/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);

  // 查询所有动态
  const logs = db
    .prepare(
      `
      SELECT
        l.*,
        COUNT(DISTINCT lm.id) as media_count
      FROM logs l
      LEFT JOIN log_media lm ON l.id = lm.log_id
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `
    )
    .all() as any[];

  return json({ logs });
}

export async function action({ request }: ActionFunctionArgs) {
  await requireAdmin(request);

  const formData = await request.formData();
  const action = formData.get("action");
  const logId = formData.get("logId") as string;

  if (action === "delete") {
    // 删除动态（级联删除media和likes）
    db.prepare("DELETE FROM logs WHERE id = ?").run(parseInt(logId));
    return json({ success: true });
  }

  return json({ success: false });
}

export default function AdminLogsIndex() {
  const { logs } = useLoaderData<typeof loader>();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">动态管理</h1>
        <Link
          to="/admin/logs/new"
          className="bg-accent-DEFAULT text-white px-6 py-2 rounded-lg hover:bg-accent-DEFAULT/90"
        >
          发布新动态
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                内容
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                媒体
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                点赞
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                创建时间
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 line-clamp-2">
                    {log.content || "(仅媒体)"}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {log.media_count} 项
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {log.likes_count}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(log.created_at * 1000).toLocaleDateString("zh-CN")}
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                  <Link
                    to={`/admin/logs/${log.id}/edit`}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    编辑
                  </Link>
                  <Form method="post" className="inline">
                    <input type="hidden" name="logId" value={log.id} />
                    <button
                      type="submit"
                      name="action"
                      value="delete"
                      className="text-red-600 hover:text-red-900"
                      onClick={(e) => {
                        if (!confirm("确定删除这条动态吗？")) {
                          e.preventDefault();
                        }
                      }}
                    >
                      删除
                    </button>
                  </Form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

#### Step 3.2: 发布新动态路由

```typescript
// app/routes/admin.logs.new.tsx

import type { ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useNavigation } from "@remix-run/react";
import { requireAdmin } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { LogEditor } from "~/components/admin/LogEditor";

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireAdmin(request);

  const formData = await request.formData();
  const content = formData.get("content") as string;
  const mediaData = formData.get("mediaData") as string; // JSON string

  // 解析媒体数据
  const media = mediaData ? JSON.parse(mediaData) : [];

  // 插入主记录
  const now = Math.floor(Date.now() / 1000);
  const result = db
    .prepare(
      `
    INSERT INTO logs (content, author_id, author_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `
    )
    .run(content || null, user.id, user.name || user.email, now, now);

  const logId = result.lastInsertRowid as number;

  // 插入媒体附件
  if (media.length > 0) {
    const stmt = db.prepare(`
      INSERT INTO log_media (
        log_id, media_type, media_key, media_url, thumbnail_url,
        width, height, file_size, duration, display_order, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    media.forEach((m: any, index: number) => {
      stmt.run(
        logId,
        m.type,
        m.key,
        m.url,
        m.thumbnail || null,
        m.width || null,
        m.height || null,
        m.size || null,
        m.duration || null,
        index,
        now
      );
    });
  }

  return redirect("/admin/logs");
}

export default function NewLog() {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">发布新动态</h1>
      <LogEditor isSubmitting={isSubmitting} />
    </div>
  );
}
```

#### Step 3.3: LogEditor组件

```typescript
// app/components/admin/LogEditor.tsx

import { useState } from "react";
import { Form } from "@remix-run/react";
import { PhotoIcon, VideoCameraIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface MediaItem {
  type: "image" | "video";
  key: string;
  url: string;
  thumbnail?: string;
  width?: number;
  height?: number;
  size?: number;
  duration?: number;
}

interface LogEditorProps {
  isSubmitting: boolean;
  initialContent?: string;
  initialMedia?: MediaItem[];
}

export function LogEditor({
  isSubmitting,
  initialContent = "",
  initialMedia = [],
}: LogEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  const [uploading, setUploading] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const type = file.type.startsWith("video/") ? "video" : "image";

        // 上传到Cloudflare Worker
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type);

        const response = await fetch("https://worker.your-domain.com/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.UPLOAD_SECRET_TOKEN}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const result = await response.json();

        if (result.success) {
          setMedia((prev) => [...prev, result.data]);
        }
      }
    } catch (error) {
      alert("上传失败：" + (error as Error).message);
    } finally {
      setUploading(false);
      // 清空input
      e.target.value = "";
    }
  }

  function removeMedia(index: number) {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <Form method="post">
      {/* 文字内容 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          内容文字（可选）
        </label>
        <textarea
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="分享你的想法..."
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-DEFAULT focus:border-transparent"
        />
      </div>

      {/* 媒体预览 */}
      {media.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            已上传媒体（{media.length}项）
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {media.map((item, index) => (
              <div key={index} className="relative group">
                {item.type === "image" ? (
                  <img
                    src={item.url}
                    alt=""
                    className="w-full h-32 object-cover rounded-lg"
                  />
                ) : (
                  <video
                    src={item.url}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeMedia(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 文件上传 */}
      <div className="mb-6">
        <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-accent-DEFAULT transition">
          <div className="text-center">
            <div className="flex justify-center gap-4 mb-2">
              <PhotoIcon className="w-8 h-8 text-gray-400" />
              <VideoCameraIcon className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600">
              {uploading ? "上传中..." : "点击上传图片或视频"}
            </p>
          </div>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileUpload}
            disabled={uploading || isSubmitting}
            className="hidden"
          />
        </label>
      </div>

      {/* 隐藏字段：媒体数据 */}
      <input type="hidden" name="mediaData" value={JSON.stringify(media)} />

      {/* 提交按钮 */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={uploading || isSubmitting || (content.trim() === "" && media.length === 0)}
          className="bg-accent-DEFAULT text-white px-6 py-2 rounded-lg hover:bg-accent-DEFAULT/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "发布中..." : "发布动态"}
        </button>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
        >
          取消
        </button>
      </div>
    </Form>
  );
}
```

**注意**: `process.env.UPLOAD_SECRET_TOKEN` 需要在客户端组件中使用时，应该通过loader传递或使用环境变量配置。

---

### Phase 4: 公开展示页面（预计3-4小时）

#### Step 4.1: 公开列表路由（已在"访问限制实现"章节）

参考前面的 `app/routes/logs._index.tsx` 实现。

#### Step 4.2: LogCard组件

```typescript
// app/components/logs/LogCard.tsx

import { Link } from "@remix-run/react";
import { LikeButton } from "~/components/logs/LikeButton";
import type { LogWithMedia } from "~/lib/types/log";

interface LogCardProps {
  log: LogWithMedia;
  isLoggedIn: boolean;
}

export function LogCard({ log, isLoggedIn }: LogCardProps) {
  return (
    <article className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* 头部：作者信息 */}
      <div className="px-6 py-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-accent-DEFAULT rounded-full flex items-center justify-center text-white font-semibold">
          {log.author_name.charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{log.author_name}</p>
          <p className="text-xs text-gray-500">
            {formatRelativeTime(log.created_at)}
          </p>
        </div>
      </div>

      {/* 文字内容 */}
      {log.content && (
        <div className="px-6 py-2">
          <p className="text-gray-800 whitespace-pre-wrap">{log.content}</p>
        </div>
      )}

      {/* 媒体展示 */}
      {log.media.length > 0 && (
        <div className="px-6 py-4">
          <MediaGrid media={log.media} />
        </div>
      )}

      {/* 底部：点赞按钮 */}
      <div className="px-6 py-4 border-t border-gray-100">
        <LikeButton
          logId={log.id}
          initialLikes={log.likes_count}
          isLiked={log.isLiked || false}
          isLoggedIn={isLoggedIn}
        />
      </div>
    </article>
  );
}

// 媒体网格
function MediaGrid({ media }: { media: any[] }) {
  if (media.length === 1) {
    return (
      <div className="w-full">
        {media[0].type === "image" ? (
          <img
            src={media[0].url}
            alt=""
            className="w-full max-h-[600px] object-contain rounded-lg"
            loading="lazy"
          />
        ) : (
          <video
            src={media[0].url}
            controls
            className="w-full max-h-[600px] rounded-lg"
          />
        )}
      </div>
    );
  }

  // 多图网格布局
  return (
    <div className="grid grid-cols-2 gap-2">
      {media.slice(0, 4).map((item, index) => (
        <div key={index} className="relative aspect-square">
          {item.type === "image" ? (
            <img
              src={item.url}
              alt=""
              className="w-full h-full object-cover rounded-lg"
              loading="lazy"
            />
          ) : (
            <video
              src={item.url}
              className="w-full h-full object-cover rounded-lg"
            />
          )}
          {index === 3 && media.length > 4 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-2xl font-bold rounded-lg">
              +{media.length - 4}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// 相对时间格式化
function formatRelativeTime(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;

  return new Date(timestamp * 1000).toLocaleDateString("zh-CN");
}
```

---

## ✅ 测试验证

### 功能测试清单

| 测试项 | 测试步骤 | 预期结果 |
|--------|----------|----------|
| **管理员发布** | 1. 管理员登录<br>2. 访问/admin/logs/new<br>3. 上传图片/视频<br>4. 提交 | 动态成功发布，前台可见 |
| **文件上传** | 1. 选择图片/视频<br>2. 自动上传到R2 | 返回URL，预览正常 |
| **未登录访问** | 1. 退出登录<br>2. 访问/logs | 只显示3条，显示登录提示 |
| **登录后访问** | 1. 登录<br>2. 访问/logs | 显示所有动态 |
| **点赞功能** | 1. 已登录用户点击❤️<br>2. 刷新页面 | 点赞数+1，状态保持 |
| **未登录点赞** | 1. 未登录用户点击❤️ | 提示"请先登录" |

### 安全测试清单

```bash
# 1. 测试非管理员无法访问管理界面
curl -I http://localhost:3000/admin/logs
# 预期：302 Redirect to /auth

# 2. 测试未登录用户只能看3条
curl -s http://localhost:3000/logs | jq '.logs | length'
# 预期：3

# 3. 测试Worker上传需要Token
curl -X POST https://worker.your-domain.com/upload \
  -H "Authorization: Bearer wrong-token" \
  -F "file=@test.jpg"
# 预期：401 Unauthorized

# 4. 测试点赞需要登录
curl -X POST http://localhost:3000/api/logs/1/like
# 预期：302 Redirect to /auth
```

---

## 🚀 部署清单

### 环境变量

```bash
# .env（Remix项目）

# 现有变量（保持不变）
NODE_ENV=production
APP_URL=https://your-domain.com
ADMIN_EMAILS=admin@example.com

# 新增：Cloudflare Worker API
CLOUDFLARE_WORKER_URL=https://worker.your-domain.com
CLOUDFLARE_UPLOAD_TOKEN=your-secret-token-here

# 新增：R2公开URL
R2_PUBLIC_URL=https://r2.your-domain.com
```

### 数据库迁移

```bash
# 生产环境部署前执行
npm run db:migrate

# 或手动执行SQL
sqlite3 data/app.db < app/lib/migrations/002_create_logs_tables.sql
```

### Cloudflare配置

1. **创建R2存储桶**
   ```bash
   npx wrangler r2 bucket create your-logs-bucket
   ```

2. **配置自定义域名**
   - 在Cloudflare Dashboard中绑定 `r2.your-domain.com` 到R2存储桶
   - 设置CORS规则

3. **部署Worker**
   ```bash
   cd log-upload-worker
   npx wrangler deploy --env production
   ```

### 监控指标

- 动态发布成功率（>99%）
- 文件上传成功率（>95%）
- 页面加载时间（P95 < 2s）
- R2存储用量（定期清理）
- 点赞API响应时间（P95 < 100ms）

---

## 📚 后续优化建议

1. **图片优化**
   - 使用Cloudflare Image Resizing
   - 自动生成缩略图
   - 支持WebP格式

2. **视频优化**
   - 视频转码（HLS流）
   - 生成封面图
   - 分辨率自适应

3. **功能增强**
   - 评论功能
   - 标签/话题
   - 搜索功能
   - 分享到社交媒体

4. **性能优化**
   - 无限滚动加载
   - 图片懒加载
   - Service Worker离线缓存

5. **数据分析**
   - 浏览量统计
   - 热门内容排行
   - 用户互动分析

---

## 🔗 相关资源

- [Cloudflare Workers文档](https://developers.cloudflare.com/workers/)
- [Cloudflare R2文档](https://developers.cloudflare.com/r2/)
- [Remix官方文档](https://remix.run/docs)
- [S3 API兼容性](https://developers.cloudflare.com/r2/api/s3/api/)

---

**文档结束**

如有疑问或需要进一步说明，请联系开发团队。
