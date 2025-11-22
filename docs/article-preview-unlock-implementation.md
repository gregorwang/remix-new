# 文章预览+登录解锁功能 - 技术实现文档（AI开发指南）

> **文档版本**: v1.0
> **最后更新**: 2025-11-22
> **适用项目**: Remix个人作品集网站
> **目标读者**: AI开发助手、开发工程师

---

## 📋 目录

1. [功能概述](#功能概述)
2. [需求分析](#需求分析)
3. [安全性设计原则](#安全性设计原则)
4. [技术架构](#技术架构)
5. [数据库设计](#数据库设计)
6. [API设计](#api设计)
7. [前端组件设计](#前端组件设计)
8. [详细实现步骤](#详细实现步骤)
9. [测试验证](#测试验证)
10. [部署清单](#部署清单)

---

## 🎯 功能概述

### 业务目标
实现商业级的文章内容保护机制，允许未登录用户预览部分内容，完整内容需要登录后解锁。

### 核心特性
- ✅ **内容分级访问**：未登录用户只能阅读前N个字符（可配置，默认2000字）
- ✅ **视觉提示**：剩余内容使用高斯模糊+渐变遮罩
- ✅ **安全保护**：服务端控制内容输出，前端无法绕过
- ✅ **用户体验**：流畅的登录引导和解锁动画
- ✅ **SEO友好**：支持搜索引擎爬虫索引预览内容

### 用户流程
```mermaid
graph TD
    A[访问文章页] --> B{是否登录?}
    B -->|是| C[显示完整内容]
    B -->|否| D[显示预览内容]
    D --> E[剩余内容模糊遮罩]
    E --> F[点击"登录解锁"按钮]
    F --> G[跳转登录页]
    G --> H[登录成功]
    H --> I[重定向回文章页]
    I --> C
```

---

## 📊 需求分析

### 功能需求

| 需求ID | 描述 | 优先级 | 涉及模块 |
|--------|------|--------|----------|
| FR-01 | 未登录用户查看文章列表 | P0 | 路由、API |
| FR-02 | 未登录用户阅读预览内容（前2000字） | P0 | API、组件 |
| FR-03 | 剩余内容高斯模糊+渐变遮罩 | P0 | UI组件 |
| FR-04 | "登录解锁"按钮跳转登录页 | P0 | 路由 |
| FR-05 | 登录后自动重定向回原文章 | P0 | 认证流程 |
| FR-06 | 已登录用户查看完整内容 | P0 | API、认证 |
| FR-07 | 管理员创建/编辑/删除文章 | P1 | 管理界面 |
| FR-08 | 文章支持Markdown渲染 | P1 | 前端渲染 |
| FR-09 | 文章标签和分类 | P2 | 数据模型 |
| FR-10 | 文章搜索功能 | P2 | API |

### 非功能需求

| 需求ID | 描述 | 目标指标 |
|--------|------|----------|
| NFR-01 | 页面加载性能 | LCP < 2.5s |
| NFR-02 | API响应时间 | P95 < 200ms |
| NFR-03 | 安全性等级 | 防止前端绕过、API重放攻击 |
| NFR-04 | SEO支持 | 预览内容可被搜索引擎索引 |
| NFR-05 | 移动端适配 | 支持所有主流移动设备 |
| NFR-06 | 可维护性 | 代码模块化、注释完整 |

---

## 🔒 安全性设计原则

### 1. **服务端内容控制（核心原则）**

**问题场景**：如果前端直接获取完整文章内容，用户可以通过以下方式绕过限制：
- 打开浏览器开发工具查看React组件状态
- 删除CSS模糊样式
- 使用浏览器扩展修改DOM
- 禁用JavaScript

**解决方案**：
```typescript
// ❌ 错误做法：前端获取完整内容再裁剪
export const loader = async () => {
  const article = await db.get("SELECT * FROM articles WHERE id = ?", id);
  return json({ article }); // 完整内容暴露给前端！
};

// ✅ 正确做法：服务端根据登录状态返回不同内容
export const loader = async ({ request, params }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  const article = await db.get("SELECT * FROM articles WHERE id = ?", params.id);

  if (!session?.user) {
    // 未登录用户只返回预览内容
    return json({
      article: {
        ...article,
        content: article.content.slice(0, PREVIEW_LENGTH),
        isPreview: true,
      }
    });
  }

  // 已登录用户返回完整内容
  return json({ article: { ...article, isPreview: false } });
};
```

### 2. **多层防御机制**

```
┌─────────────────────────────────────┐
│  Layer 1: Session验证               │
│  检查用户是否已登录                  │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  Layer 2: 数据库查询优化            │
│  未登录用户SQL只查询预览字段         │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  Layer 3: API响应过滤               │
│  确保响应中不包含敏感数据            │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  Layer 4: 前端UI渲染                │
│  isPreview标志控制显示逻辑           │
└─────────────────────────────────────┘
```

### 3. **防止枚举攻击**

**问题**：攻击者可能通过遍历文章ID获取所有预览内容。

**解决方案**：
- 使用UUID而非自增ID
- 实施IP限流（单IP每分钟最多20次请求）
- 记录异常访问模式

### 4. **防止缓存泄漏**

```typescript
// 为不同登录状态设置不同的缓存键
const cacheKey = session?.user
  ? `article:${id}:full`
  : `article:${id}:preview`;
```

---

## 🏗️ 技术架构

### 系统架构图

```
┌─────────────────────────────────────────────────────────┐
│                     Client Browser                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Article List │  │Article Detail│  │  Auth Page   │  │
│  │    Route     │  │    Route     │  │   (Exists)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└───────────────┬──────────────┬────────────────┬─────────┘
                │              │                │
                ▼              ▼                ▼
┌─────────────────────────────────────────────────────────┐
│                    Remix Server                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Route Loaders & Actions                         │   │
│  │  - /articles (list)                              │   │
│  │  - /articles/:slug (detail)                      │   │
│  │  - /admin/articles (CRUD)                        │   │
│  └────────────┬─────────────────────────────────────┘   │
│               ▼                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Business Logic Layer                            │   │
│  │  - ArticleService (CRUD操作)                     │   │
│  │  - ContentFilterService (内容过滤)               │   │
│  │  - AuthService (已存在)                          │   │
│  └────────────┬─────────────────────────────────────┘   │
│               ▼                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Data Access Layer                               │   │
│  │  - SQLite (articles表)                           │   │
│  │  - Redis Cache (文章缓存)                        │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 技术栈选型

| 层次 | 技术选型 | 理由 |
|------|----------|------|
| **前端框架** | React 18 + Remix 2.16 | 项目现有技术栈 |
| **样式方案** | Tailwind CSS 4.1 | 已集成，支持高斯模糊效果 |
| **数据库** | SQLite (better-sqlite3) | 轻量、已集成 |
| **缓存** | Redis + 内存缓存 | 已有缓存基础设施 |
| **认证** | Better Auth | 已实现Magic Link + Google OAuth |
| **Markdown渲染** | `remark` + `rehype` | 行业标准 |
| **代码高亮** | `rehype-highlight` | 技术文章需求 |

---

## 💾 数据库设计

### 表结构设计

#### articles表（主表）

```sql
CREATE TABLE articles (
  -- 主键和标识
  id TEXT PRIMARY KEY,                    -- UUID格式，防止枚举
  slug TEXT UNIQUE NOT NULL,              -- URL友好的唯一标识（如：remix-introduction）

  -- 内容字段
  title TEXT NOT NULL,                    -- 文章标题
  description TEXT,                       -- 摘要/描述（用于SEO和列表预览）
  content TEXT NOT NULL,                  -- Markdown格式的文章正文
  preview_length INTEGER DEFAULT 2000,   -- 预览字符数（可单独配置）

  -- 元数据
  author_id TEXT NOT NULL,                -- 作者ID，关联user表
  cover_image TEXT,                       -- 封面图URL
  tags TEXT,                              -- JSON数组格式的标签 ["tech", "remix"]
  category TEXT,                          -- 分类（如：tech, life, tutorial）

  -- 访问控制
  is_published INTEGER DEFAULT 0,         -- 0=草稿 1=已发布
  require_auth INTEGER DEFAULT 1,         -- 0=公开 1=需登录

  -- SEO和统计
  view_count INTEGER DEFAULT 0,           -- 阅读次数
  seo_keywords TEXT,                      -- SEO关键词

  -- 时间戳
  created_at INTEGER NOT NULL,            -- Unix时间戳
  updated_at INTEGER NOT NULL,            -- Unix时间戳
  published_at INTEGER,                   -- 发布时间

  -- 外键约束
  FOREIGN KEY (author_id) REFERENCES user(id) ON DELETE CASCADE
);

-- 索引优化
CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_published ON articles(is_published, published_at DESC);
CREATE INDEX idx_articles_category ON articles(category, published_at DESC);
CREATE INDEX idx_articles_author ON articles(author_id, created_at DESC);
CREATE INDEX idx_articles_tags ON articles(tags); -- 用于JSON查询
```

#### article_views表（阅读统计）

```sql
CREATE TABLE article_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id TEXT NOT NULL,
  user_id TEXT,                           -- NULL表示未登录用户
  ip_address TEXT,                        -- 记录IP用于去重
  user_agent TEXT,                        -- 浏览器标识
  viewed_at INTEGER NOT NULL,

  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_article_views_article ON article_views(article_id, viewed_at DESC);
CREATE INDEX idx_article_views_user ON article_views(user_id, viewed_at DESC);
```

### 示例数据

```sql
INSERT INTO articles (
  id,
  slug,
  title,
  description,
  content,
  preview_length,
  author_id,
  category,
  tags,
  is_published,
  require_auth,
  created_at,
  updated_at,
  published_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'remix-full-stack-guide',
  'Remix全栈开发完整指南',
  '深入探讨Remix框架的核心概念、最佳实践和性能优化技巧',
  '# Remix全栈开发完整指南\n\n## 引言\n\nRemix是一个现代化的全栈Web框架...\n\n[此处省略8000字内容]\n\n## 总结\n\n通过本文，你应该掌握了Remix的核心概念...',
  2000,
  'user-uuid-from-user-table',
  'tech',
  '["remix", "react", "fullstack", "web"]',
  1,
  1,
  1700000000,
  1700000000,
  1700000000
);
```

---

## 🔌 API设计

### API端点规划

#### 1. 获取文章列表
```
GET /articles
```

**Query参数**：
```typescript
{
  page?: number;        // 页码，默认1
  limit?: number;       // 每页数量，默认10
  category?: string;    // 分类过滤
  tag?: string;         // 标签过滤
  search?: string;      // 搜索关键词
}
```

**响应示例**：
```json
{
  "articles": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "slug": "remix-full-stack-guide",
      "title": "Remix全栈开发完整指南",
      "description": "深入探讨Remix框架的核心概念...",
      "cover_image": "/images/remix-cover.jpg",
      "category": "tech",
      "tags": ["remix", "react", "fullstack"],
      "author": {
        "name": "汪家俊",
        "avatar": "/avatar.jpg"
      },
      "view_count": 1234,
      "created_at": 1700000000,
      "published_at": 1700000000,
      "require_auth": true
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "total_pages": 5
  }
}
```

#### 2. 获取文章详情
```
GET /articles/:slug
```

**响应示例（未登录）**：
```json
{
  "article": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "slug": "remix-full-stack-guide",
    "title": "Remix全栈开发完整指南",
    "description": "深入探讨Remix框架的核心概念...",
    "content": "# Remix全栈开发完整指南\n\n## 引言\n\nRemix是一个现代化的全栈Web框架...[前2000字]",
    "isPreview": true,
    "previewLength": 2000,
    "totalLength": 10000,
    "cover_image": "/images/remix-cover.jpg",
    "category": "tech",
    "tags": ["remix", "react", "fullstack"],
    "author": {
      "name": "汪家俊",
      "avatar": "/avatar.jpg"
    },
    "created_at": 1700000000,
    "published_at": 1700000000
  }
}
```

**响应示例（已登录）**：
```json
{
  "article": {
    // ... 同上基本信息
    "content": "# Remix全栈开发完整指南\n\n## 引言\n\n[完整10000字内容]",
    "isPreview": false,
    "previewLength": null,
    "totalLength": 10000
  }
}
```

#### 3. 管理员API

```
POST   /admin/articles          创建文章
PUT    /admin/articles/:id      更新文章
DELETE /admin/articles/:id      删除文章
PATCH  /admin/articles/:id/publish  发布/取消发布
```

---

## 🎨 前端组件设计

### 组件层次结构

```
app/routes/
├── articles._index.tsx          # 文章列表页
└── articles.$slug.tsx           # 文章详情页

app/components/articles/
├── ArticleCard.tsx              # 文章卡片（列表项）
├── ArticleDetail.tsx            # 文章详情容器
├── ArticleContent.tsx           # 文章内容渲染器
├── ArticlePreview.tsx           # 预览组件（带模糊遮罩）
├── UnlockPrompt.tsx             # 登录解锁提示
├── ArticleHeader.tsx            # 文章头部（标题、作者、日期）
├── ArticleMeta.tsx              # 文章元信息（标签、分类）
└── RelatedArticles.tsx          # 相关文章推荐

app/components/admin/
├── ArticleEditor.tsx            # Markdown编辑器
└── ArticleManager.tsx           # 文章管理列表
```

### 核心组件详细设计

#### ArticlePreview.tsx
```typescript
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "@remix-run/react";

interface ArticlePreviewProps {
  content: string;           // 预览内容（已在服务端截断）
  isPreview: boolean;        // 是否为预览模式
  previewLength: number;     // 预览字符数
  totalLength: number;       // 总字符数
  slug: string;              // 文章slug
}

export function ArticlePreview({
  content,
  isPreview,
  previewLength,
  totalLength,
  slug
}: ArticlePreviewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // 监听滚动进度（用于触发解锁提示动画）
  useEffect(() => {
    if (!isPreview) return;

    const handleScroll = () => {
      if (!contentRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      const progress = scrollTop / (scrollHeight - clientHeight);
      setScrollProgress(progress);
    };

    const element = contentRef.current;
    element?.addEventListener("scroll", handleScroll);
    return () => element?.removeEventListener("scroll", handleScroll);
  }, [isPreview]);

  if (!isPreview) {
    // 已登录用户：直接显示完整内容
    return (
      <div className="prose prose-lg max-w-none">
        <MarkdownRenderer content={content} />
      </div>
    );
  }

  // 未登录用户：显示预览+模糊遮罩
  return (
    <div className="relative">
      {/* 预览内容容器 */}
      <div
        ref={contentRef}
        className="prose prose-lg max-w-none"
      >
        <MarkdownRenderer content={content} />
      </div>

      {/* 渐变模糊遮罩 */}
      <div className="relative mt-8">
        {/* 模糊的占位内容（用于视觉效果） */}
        <div className="pointer-events-none select-none blur-md opacity-50">
          <div className="prose prose-lg max-w-none">
            <p>后续内容需要登录后查看...</p>
            <p>Lorem ipsum dolor sit amet...</p>
            <p>更多精彩内容等你解锁...</p>
          </div>
        </div>

        {/* 渐变遮罩层 */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-white"
          style={{
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)"
          }}
        />

        {/* 解锁提示卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <UnlockPrompt
            remainingLength={totalLength - previewLength}
            slug={slug}
          />
        </motion.div>
      </div>

      {/* 进度提示 */}
      <div className="mt-4 text-center text-sm text-gray-500">
        已阅读 {previewLength} / {totalLength} 字
        ({Math.round((previewLength / totalLength) * 100)}%)
      </div>
    </div>
  );
}
```

#### UnlockPrompt.tsx
```typescript
import { motion } from "framer-motion";
import { Link } from "@remix-run/react";
import { LockClosedIcon, ArrowRightIcon } from "@heroicons/react/24/outline";

interface UnlockPromptProps {
  remainingLength: number;
  slug: string;
}

export function UnlockPrompt({ remainingLength, slug }: UnlockPromptProps) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 border border-gray-200"
    >
      {/* 图标 */}
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 bg-accent-DEFAULT/10 rounded-full flex items-center justify-center">
          <LockClosedIcon className="w-8 h-8 text-accent-DEFAULT" />
        </div>
      </div>

      {/* 标题 */}
      <h3 className="text-2xl font-bold text-center mb-3">
        解锁完整内容
      </h3>

      {/* 描述 */}
      <p className="text-gray-600 text-center mb-6">
        还有 <span className="font-semibold text-accent-DEFAULT">
          {remainingLength}
        </span> 字精彩内容等你探索
      </p>

      {/* 登录按钮 */}
      <Link
        to={`/auth?redirectTo=/articles/${slug}`}
        className="block w-full"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-accent-DEFAULT hover:bg-accent-DEFAULT/90 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          立即登录解锁
          <ArrowRightIcon className="w-5 h-5" />
        </motion.button>
      </Link>

      {/* 提示文字 */}
      <p className="text-xs text-gray-500 text-center mt-4">
        登录后即可阅读全部内容，完全免费
      </p>
    </motion.div>
  );
}
```

### 样式设计规范

#### 高斯模糊效果
```css
/* app/styles/articles.css */

/* 渐变模糊遮罩 */
.article-preview-mask {
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.8) 50%,
    rgba(255, 255, 255, 1) 100%
  );
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* 模糊内容 */
.article-preview-blurred {
  filter: blur(4px);
  user-select: none;
  pointer-events: none;
}

/* 暗色模式适配 */
@media (prefers-color-scheme: dark) {
  .article-preview-mask {
    background: linear-gradient(
      to bottom,
      rgba(17, 24, 39, 0) 0%,
      rgba(17, 24, 39, 0.9) 50%,
      rgba(17, 24, 39, 1) 100%
    );
  }
}
```

---

## 🛠️ 详细实现步骤

### Phase 1: 数据库和模型层（预计1-2小时）

#### Step 1.1: 创建数据库迁移文件
```bash
# 文件位置：app/lib/migrations/001_create_articles.sql
```

```sql
-- app/lib/migrations/001_create_articles.sql

-- 文章表
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  preview_length INTEGER DEFAULT 2000,
  author_id TEXT NOT NULL,
  cover_image TEXT,
  tags TEXT,
  category TEXT,
  is_published INTEGER DEFAULT 0,
  require_auth INTEGER DEFAULT 1,
  view_count INTEGER DEFAULT 0,
  seo_keywords TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER,
  FOREIGN KEY (author_id) REFERENCES user(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author_id, created_at DESC);

-- 阅读统计表
CREATE TABLE IF NOT EXISTS article_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id TEXT NOT NULL,
  user_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  viewed_at INTEGER NOT NULL,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_article_views_article ON article_views(article_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_article_views_user ON article_views(user_id, viewed_at DESC);
```

#### Step 1.2: 更新数据库初始化代码
```typescript
// app/lib/db.server.ts

import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { join } from "path";

// ... 现有代码 ...

export function initializeDatabase(db: Database.Database) {
  // 启用外键约束
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");

  // ... 现有表初始化代码 ...

  // 执行文章表迁移
  const migrationPath = join(process.cwd(), "app/lib/migrations/001_create_articles.sql");
  const migrationSQL = readFileSync(migrationPath, "utf-8");
  db.exec(migrationSQL);

  console.log("✅ Articles tables initialized");
}
```

#### Step 1.3: 创建TypeScript类型定义
```typescript
// app/lib/types/article.ts

export interface Article {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content: string;
  preview_length: number;
  author_id: string;
  cover_image: string | null;
  tags: string | null; // JSON string
  category: string | null;
  is_published: number; // SQLite boolean (0 or 1)
  require_auth: number; // SQLite boolean
  view_count: number;
  seo_keywords: string | null;
  created_at: number;
  updated_at: number;
  published_at: number | null;
}

export interface ArticleWithAuthor extends Article {
  author: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export interface ArticleListItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  category: string | null;
  tags: string[];
  author: {
    name: string;
    avatar: string | null;
  };
  view_count: number;
  created_at: number;
  published_at: number;
  require_auth: boolean;
}

export interface ArticleDetail extends ArticleListItem {
  content: string;
  isPreview: boolean;
  previewLength: number | null;
  totalLength: number;
  seo_keywords: string | null;
}

export interface CreateArticleInput {
  title: string;
  slug: string;
  description?: string;
  content: string;
  preview_length?: number;
  author_id: string;
  cover_image?: string;
  tags?: string[];
  category?: string;
  is_published?: boolean;
  require_auth?: boolean;
  seo_keywords?: string;
}

export interface UpdateArticleInput extends Partial<CreateArticleInput> {
  id: string;
}

export interface ArticleFilters {
  category?: string;
  tag?: string;
  search?: string;
  author_id?: string;
  is_published?: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedArticles {
  articles: ArticleListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}
```

---

### Phase 2: 业务逻辑层（预计2-3小时）

#### Step 2.1: 创建ArticleService
```typescript
// app/lib/services/article.service.ts

import { db } from "~/lib/db.server";
import type {
  Article,
  ArticleWithAuthor,
  ArticleListItem,
  ArticleDetail,
  CreateArticleInput,
  UpdateArticleInput,
  ArticleFilters,
  PaginationParams,
  PaginatedArticles,
} from "~/lib/types/article";
import { v4 as uuidv4 } from "uuid";

export class ArticleService {
  /**
   * 获取文章列表（分页）
   */
  static async getArticles(
    filters: ArticleFilters = {},
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<PaginatedArticles> {
    const { category, tag, search, author_id, is_published = true } = filters;
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    // 构建SQL查询
    let whereConditions: string[] = ["a.is_published = ?"];
    let params: any[] = [is_published ? 1 : 0];

    if (category) {
      whereConditions.push("a.category = ?");
      params.push(category);
    }

    if (tag) {
      whereConditions.push("a.tags LIKE ?");
      params.push(`%"${tag}"%`);
    }

    if (search) {
      whereConditions.push("(a.title LIKE ? OR a.description LIKE ? OR a.content LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (author_id) {
      whereConditions.push("a.author_id = ?");
      params.push(author_id);
    }

    const whereClause = whereConditions.join(" AND ");

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM articles a
      WHERE ${whereClause}
    `;
    const { total } = db.prepare(countQuery).get(...params) as { total: number };

    // 查询文章列表
    const articlesQuery = `
      SELECT
        a.id,
        a.slug,
        a.title,
        a.description,
        a.cover_image,
        a.category,
        a.tags,
        a.view_count,
        a.created_at,
        a.published_at,
        a.require_auth,
        u.name as author_name,
        u.image as author_avatar
      FROM articles a
      LEFT JOIN user u ON a.author_id = u.id
      WHERE ${whereClause}
      ORDER BY a.published_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = db.prepare(articlesQuery).all(...params, limit, offset) as any[];

    const articles: ArticleListItem[] = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      cover_image: row.cover_image,
      category: row.category,
      tags: row.tags ? JSON.parse(row.tags) : [],
      author: {
        name: row.author_name || "Anonymous",
        avatar: row.author_avatar,
      },
      view_count: row.view_count,
      created_at: row.created_at,
      published_at: row.published_at,
      require_auth: row.require_auth === 1,
    }));

    return {
      articles,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 根据slug获取文章详情
   * @param slug 文章slug
   * @param userId 当前用户ID（用于判断是否返回完整内容）
   */
  static async getArticleBySlug(
    slug: string,
    userId?: string
  ): Promise<ArticleDetail | null> {
    const query = `
      SELECT
        a.*,
        u.name as author_name,
        u.image as author_avatar
      FROM articles a
      LEFT JOIN user u ON a.author_id = u.id
      WHERE a.slug = ? AND a.is_published = 1
    `;

    const row = db.prepare(query).get(slug) as any;

    if (!row) return null;

    const isAuthenticated = !!userId;
    const requireAuth = row.require_auth === 1;
    const shouldShowPreview = requireAuth && !isAuthenticated;

    const totalLength = row.content.length;
    const previewLength = row.preview_length;

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      content: shouldShowPreview
        ? row.content.slice(0, previewLength)
        : row.content,
      isPreview: shouldShowPreview,
      previewLength: shouldShowPreview ? previewLength : null,
      totalLength,
      cover_image: row.cover_image,
      category: row.category,
      tags: row.tags ? JSON.parse(row.tags) : [],
      author: {
        name: row.author_name || "Anonymous",
        avatar: row.author_avatar,
      },
      view_count: row.view_count,
      created_at: row.created_at,
      published_at: row.published_at,
      require_auth: requireAuth,
      seo_keywords: row.seo_keywords,
    };
  }

  /**
   * 创建文章
   */
  static async createArticle(input: CreateArticleInput): Promise<Article> {
    const id = uuidv4();
    const now = Date.now();

    const article: Article = {
      id,
      slug: input.slug,
      title: input.title,
      description: input.description || null,
      content: input.content,
      preview_length: input.preview_length || 2000,
      author_id: input.author_id,
      cover_image: input.cover_image || null,
      tags: input.tags ? JSON.stringify(input.tags) : null,
      category: input.category || null,
      is_published: input.is_published ? 1 : 0,
      require_auth: input.require_auth !== false ? 1 : 0,
      view_count: 0,
      seo_keywords: input.seo_keywords || null,
      created_at: now,
      updated_at: now,
      published_at: input.is_published ? now : null,
    };

    const query = `
      INSERT INTO articles (
        id, slug, title, description, content, preview_length,
        author_id, cover_image, tags, category, is_published,
        require_auth, view_count, seo_keywords, created_at,
        updated_at, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.prepare(query).run(
      article.id,
      article.slug,
      article.title,
      article.description,
      article.content,
      article.preview_length,
      article.author_id,
      article.cover_image,
      article.tags,
      article.category,
      article.is_published,
      article.require_auth,
      article.view_count,
      article.seo_keywords,
      article.created_at,
      article.updated_at,
      article.published_at
    );

    return article;
  }

  /**
   * 更新文章
   */
  static async updateArticle(input: UpdateArticleInput): Promise<void> {
    const updates: string[] = [];
    const params: any[] = [];

    // 动态构建更新字段
    if (input.title !== undefined) {
      updates.push("title = ?");
      params.push(input.title);
    }
    if (input.slug !== undefined) {
      updates.push("slug = ?");
      params.push(input.slug);
    }
    if (input.description !== undefined) {
      updates.push("description = ?");
      params.push(input.description);
    }
    if (input.content !== undefined) {
      updates.push("content = ?");
      params.push(input.content);
    }
    if (input.preview_length !== undefined) {
      updates.push("preview_length = ?");
      params.push(input.preview_length);
    }
    if (input.cover_image !== undefined) {
      updates.push("cover_image = ?");
      params.push(input.cover_image);
    }
    if (input.tags !== undefined) {
      updates.push("tags = ?");
      params.push(JSON.stringify(input.tags));
    }
    if (input.category !== undefined) {
      updates.push("category = ?");
      params.push(input.category);
    }
    if (input.is_published !== undefined) {
      updates.push("is_published = ?");
      params.push(input.is_published ? 1 : 0);
      if (input.is_published) {
        updates.push("published_at = ?");
        params.push(Date.now());
      }
    }
    if (input.require_auth !== undefined) {
      updates.push("require_auth = ?");
      params.push(input.require_auth ? 1 : 0);
    }
    if (input.seo_keywords !== undefined) {
      updates.push("seo_keywords = ?");
      params.push(input.seo_keywords);
    }

    updates.push("updated_at = ?");
    params.push(Date.now());

    params.push(input.id);

    const query = `
      UPDATE articles
      SET ${updates.join(", ")}
      WHERE id = ?
    `;

    db.prepare(query).run(...params);
  }

  /**
   * 删除文章
   */
  static async deleteArticle(id: string): Promise<void> {
    db.prepare("DELETE FROM articles WHERE id = ?").run(id);
  }

  /**
   * 记录文章浏览
   */
  static async recordView(
    articleId: string,
    userId: string | null,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    // 检查是否已经记录过（同一用户/IP 1小时内不重复计数）
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    const existingView = db
      .prepare(
        `SELECT id FROM article_views
         WHERE article_id = ?
         AND (user_id = ? OR ip_address = ?)
         AND viewed_at > ?`
      )
      .get(articleId, userId, ipAddress, oneHourAgo);

    if (existingView) return; // 已记录，跳过

    // 插入浏览记录
    db.prepare(
      `INSERT INTO article_views (article_id, user_id, ip_address, user_agent, viewed_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(articleId, userId, ipAddress, userAgent, Date.now());

    // 更新文章浏览计数
    db.prepare("UPDATE articles SET view_count = view_count + 1 WHERE id = ?").run(
      articleId
    );
  }

  /**
   * 获取相关文章（同分类或同标签）
   */
  static async getRelatedArticles(
    articleId: string,
    limit: number = 5
  ): Promise<ArticleListItem[]> {
    const article = db
      .prepare("SELECT category, tags FROM articles WHERE id = ?")
      .get(articleId) as { category: string | null; tags: string | null } | undefined;

    if (!article) return [];

    const query = `
      SELECT
        a.id, a.slug, a.title, a.description, a.cover_image,
        a.category, a.tags, a.view_count, a.created_at, a.published_at,
        a.require_auth, u.name as author_name, u.image as author_avatar
      FROM articles a
      LEFT JOIN user u ON a.author_id = u.id
      WHERE a.id != ?
        AND a.is_published = 1
        AND (a.category = ? OR a.tags LIKE ?)
      ORDER BY a.published_at DESC
      LIMIT ?
    `;

    const rows = db
      .prepare(query)
      .all(articleId, article.category, `%${article.tags}%`, limit) as any[];

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      cover_image: row.cover_image,
      category: row.category,
      tags: row.tags ? JSON.parse(row.tags) : [],
      author: {
        name: row.author_name || "Anonymous",
        avatar: row.author_avatar,
      },
      view_count: row.view_count,
      created_at: row.created_at,
      published_at: row.published_at,
      require_auth: row.require_auth === 1,
    }));
  }
}
```

#### Step 2.2: 安装依赖包
```bash
npm install uuid
npm install --save-dev @types/uuid

# Markdown渲染相关
npm install remark remark-html remark-gfm rehype-highlight rehype-stringify unified
```

---

### Phase 3: 路由实现（预计2-3小时）

#### Step 3.1: 文章列表路由
```typescript
// app/routes/articles._index.tsx

import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link, useSearchParams } from "@remix-run/react";
import { ArticleService } from "~/lib/services/article.service";
import { ArticleCard } from "~/components/articles/ArticleCard";
import { serverCache } from "~/lib/server-cache";

export const meta: MetaFunction = () => {
  return [
    { title: "文章列表 - 汪家俊的网站" },
    { name: "description", content: "浏览所有技术文章和博客内容" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const category = url.searchParams.get("category") || undefined;
  const tag = url.searchParams.get("tag") || undefined;
  const search = url.searchParams.get("search") || undefined;

  // 缓存键
  const cacheKey = `articles:list:${page}:${category}:${tag}:${search}`;

  // 尝试从缓存获取
  const cachedData = await serverCache.get(cacheKey);
  if (cachedData) {
    return json(cachedData, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=600",
      },
    });
  }

  // 查询数据库
  const data = await ArticleService.getArticles(
    { category, tag, search, is_published: true },
    { page, limit: 10 }
  );

  // 存入缓存（5分钟）
  await serverCache.set(cacheKey, data, 5 * 60 * 1000);

  return json(data, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=600",
    },
  });
}

export default function ArticlesIndex() {
  const { articles, pagination } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">文章列表</h1>
          <p className="text-lg text-gray-600">
            探索技术、设计和生活的点滴思考
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-4 mb-8">
          {/* 搜索框 */}
          <input
            type="text"
            placeholder="搜索文章..."
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-DEFAULT focus:border-transparent"
            defaultValue={searchParams.get("search") || ""}
            onChange={(e) => {
              const value = e.target.value;
              setSearchParams((prev) => {
                if (value) {
                  prev.set("search", value);
                } else {
                  prev.delete("search");
                }
                prev.set("page", "1");
                return prev;
              });
            }}
          />

          {/* 分类筛选 */}
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-DEFAULT"
            value={searchParams.get("category") || ""}
            onChange={(e) => {
              setSearchParams((prev) => {
                if (e.target.value) {
                  prev.set("category", e.target.value);
                } else {
                  prev.delete("category");
                }
                prev.set("page", "1");
                return prev;
              });
            }}
          >
            <option value="">所有分类</option>
            <option value="tech">技术</option>
            <option value="design">设计</option>
            <option value="life">生活</option>
            <option value="tutorial">教程</option>
          </select>
        </div>

        {/* Articles Grid */}
        {articles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">暂无文章</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="mt-12 flex justify-center gap-2">
            {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map(
              (pageNum) => (
                <Link
                  key={pageNum}
                  to={`?page=${pageNum}${
                    searchParams.get("category")
                      ? `&category=${searchParams.get("category")}`
                      : ""
                  }${
                    searchParams.get("tag")
                      ? `&tag=${searchParams.get("tag")}`
                      : ""
                  }`}
                  className={`px-4 py-2 rounded-lg ${
                    pageNum === pagination.page
                      ? "bg-accent-DEFAULT text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {pageNum}
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

#### Step 3.2: 文章详情路由（核心功能）
```typescript
// app/routes/articles.$slug.tsx

import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { ArticleService } from "~/lib/services/article.service";
import { auth } from "~/lib/auth.server";
import { ArticleDetail } from "~/components/articles/ArticleDetail";
import { ArticlePreview } from "~/components/articles/ArticlePreview";
import { ArticleHeader } from "~/components/articles/ArticleHeader";
import { RelatedArticles } from "~/components/articles/RelatedArticles";
import { serverCache } from "~/lib/server-cache";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) {
    return [{ title: "文章未找到" }];
  }

  return [
    { title: `${data.article.title} - 汪家俊的网站` },
    { name: "description", content: data.article.description || "" },
    { name: "keywords", content: data.article.seo_keywords || "" },
    { property: "og:title", content: data.article.title },
    { property: "og:description", content: data.article.description || "" },
    {
      property: "og:image",
      content: data.article.cover_image || "/default-og-image.jpg",
    },
    { property: "og:type", content: "article" },
  ];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { slug } = params;
  if (!slug) {
    throw new Response("文章不存在", { status: 404 });
  }

  // 获取当前用户session
  const session = await auth.api.getSession({ headers: request.headers });
  const userId = session?.user?.id;

  // 构建缓存键（区分登录状态）
  const cacheKey = userId
    ? `article:${slug}:full`
    : `article:${slug}:preview`;

  // 尝试从缓存获取
  let article = await serverCache.get(cacheKey);

  if (!article) {
    // 查询数据库
    article = await ArticleService.getArticleBySlug(slug, userId);

    if (!article) {
      throw new Response("文章不存在", { status: 404 });
    }

    // 存入缓存（10分钟）
    await serverCache.set(cacheKey, article, 10 * 60 * 1000);
  }

  // 记录浏览（异步，不阻塞响应）
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  // 不等待记录完成
  ArticleService.recordView(
    article.id,
    userId || null,
    ipAddress,
    userAgent
  ).catch((err) => console.error("Failed to record view:", err));

  // 获取相关文章
  const relatedArticles = await ArticleService.getRelatedArticles(article.id, 3);

  return json(
    { article, relatedArticles },
    {
      headers: {
        // 预览内容可以缓存更久
        "Cache-Control": article.isPreview
          ? "public, max-age=600, s-maxage=1800"
          : "public, max-age=300, s-maxage=900",
      },
    }
  );
}

export default function ArticleDetailRoute() {
  const { article, relatedArticles } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Article Header */}
      <ArticleHeader article={article} />

      {/* Article Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <ArticlePreview
          content={article.content}
          isPreview={article.isPreview}
          previewLength={article.previewLength || 0}
          totalLength={article.totalLength}
          slug={article.slug}
        />

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="mt-16 pt-16 border-t border-gray-200">
            <RelatedArticles articles={relatedArticles} />
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### Phase 4: UI组件实现（预计3-4小时）

由于篇幅限制，这里仅提供核心组件的完整代码。其他组件（ArticleCard、ArticleHeader等）请参考上面的设计章节自行实现。

#### 核心组件已在"前端组件设计"章节提供完整代码

---

### Phase 5: 管理界面（预计2-3小时）

#### Step 5.1: 文章管理路由
```typescript
// app/routes/admin.articles._index.tsx

import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form, Link } from "@remix-run/react";
import { ArticleService } from "~/lib/services/article.service";
import { requireAdmin } from "~/lib/auth.server";
import { serverCache } from "~/lib/server-cache";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");

  // 管理员可以看到未发布的文章
  const data = await ArticleService.getArticles(
    { is_published: undefined }, // 不过滤发布状态
    { page, limit: 20 }
  );

  return json(data);
}

export async function action({ request }: ActionFunctionArgs) {
  await requireAdmin(request);

  const formData = await request.formData();
  const action = formData.get("action");
  const articleId = formData.get("articleId") as string;

  if (action === "delete") {
    await ArticleService.deleteArticle(articleId);
    // 清除缓存
    await serverCache.deletePattern("article:*");
    await serverCache.deletePattern("articles:*");
    return json({ success: true });
  }

  if (action === "toggle-publish") {
    const article = await ArticleService.getArticleBySlug(articleId);
    if (article) {
      await ArticleService.updateArticle({
        id: articleId,
        is_published: !article.is_published,
      });
      await serverCache.deletePattern("article:*");
      await serverCache.deletePattern("articles:*");
    }
    return json({ success: true });
  }

  return json({ success: false });
}

export default function AdminArticles() {
  const { articles, pagination } = useLoaderData<typeof loader>();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">文章管理</h1>
        <Link
          to="/admin/articles/new"
          className="bg-accent-DEFAULT text-white px-6 py-2 rounded-lg hover:bg-accent-DEFAULT/90"
        >
          创建新文章
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                标题
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                分类
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                状态
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                浏览量
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
            {articles.map((article) => (
              <tr key={article.id}>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {article.title}
                  </div>
                  <div className="text-sm text-gray-500">{article.slug}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {article.category}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      article.is_published
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {article.is_published ? "已发布" : "草稿"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {article.view_count}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(article.created_at).toLocaleDateString("zh-CN")}
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                  <Link
                    to={`/admin/articles/${article.id}/edit`}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    编辑
                  </Link>
                  <Form method="post" className="inline">
                    <input type="hidden" name="articleId" value={article.id} />
                    <button
                      type="submit"
                      name="action"
                      value="toggle-publish"
                      className="text-blue-600 hover:text-blue-900"
                    >
                      {article.is_published ? "取消发布" : "发布"}
                    </button>
                  </Form>
                  <Form
                    method="post"
                    className="inline"
                    onSubmit={(e) => {
                      if (!confirm("确定要删除这篇文章吗？")) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="articleId" value={article.id} />
                    <button
                      type="submit"
                      name="action"
                      value="delete"
                      className="text-red-600 hover:text-red-900"
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

#### Step 5.2: Markdown编辑器组件（简化版）
```typescript
// app/components/admin/ArticleEditor.tsx

import { useState } from "react";
import { Form } from "@remix-run/react";
import type { Article } from "~/lib/types/article";

interface ArticleEditorProps {
  article?: Partial<Article>;
  isNew?: boolean;
}

export function ArticleEditor({ article, isNew = false }: ArticleEditorProps) {
  const [content, setContent] = useState(article?.content || "");
  const [previewMode, setPreviewMode] = useState(false);

  return (
    <Form method="post" className="space-y-6">
      {/* 标题 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          标题
        </label>
        <input
          type="text"
          name="title"
          defaultValue={article?.title}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-DEFAULT"
        />
      </div>

      {/* Slug */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          URL Slug
        </label>
        <input
          type="text"
          name="slug"
          defaultValue={article?.slug}
          required
          pattern="^[a-z0-9-]+$"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-DEFAULT"
        />
        <p className="text-xs text-gray-500 mt-1">
          只能包含小写字母、数字和连字符
        </p>
      </div>

      {/* 摘要 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          摘要
        </label>
        <textarea
          name="description"
          defaultValue={article?.description || ""}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-DEFAULT"
        />
      </div>

      {/* 内容 */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            内容（Markdown）
          </label>
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className="text-sm text-accent-DEFAULT hover:underline"
          >
            {previewMode ? "编辑" : "预览"}
          </button>
        </div>
        {previewMode ? (
          <div className="w-full min-h-[400px] px-4 py-2 border border-gray-300 rounded-lg prose prose-sm max-w-none">
            {/* 这里需要Markdown渲染器 */}
            <p>预览功能待实现</p>
          </div>
        ) : (
          <textarea
            name="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-DEFAULT font-mono text-sm"
          />
        )}
      </div>

      {/* 分类和标签 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            分类
          </label>
          <select
            name="category"
            defaultValue={article?.category || ""}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-DEFAULT"
          >
            <option value="">无分类</option>
            <option value="tech">技术</option>
            <option value="design">设计</option>
            <option value="life">生活</option>
            <option value="tutorial">教程</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            标签（逗号分隔）
          </label>
          <input
            type="text"
            name="tags"
            defaultValue={
              article?.tags ? JSON.parse(article.tags).join(", ") : ""
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-DEFAULT"
          />
        </div>
      </div>

      {/* 预览长度 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          预览字符数
        </label>
        <input
          type="number"
          name="preview_length"
          defaultValue={article?.preview_length || 2000}
          min="500"
          max="10000"
          step="100"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-DEFAULT"
        />
      </div>

      {/* 选项 */}
      <div className="space-y-2">
        <label className="flex items-center">
          <input
            type="checkbox"
            name="require_auth"
            defaultChecked={article?.require_auth !== 0}
            className="mr-2"
          />
          <span className="text-sm text-gray-700">需要登录才能查看</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            name="is_published"
            defaultChecked={article?.is_published === 1}
            className="mr-2"
          />
          <span className="text-sm text-gray-700">立即发布</span>
        </label>
      </div>

      {/* 提交按钮 */}
      <div className="flex gap-4">
        <button
          type="submit"
          className="bg-accent-DEFAULT text-white px-6 py-2 rounded-lg hover:bg-accent-DEFAULT/90"
        >
          {isNew ? "创建文章" : "保存更改"}
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

---

## ✅ 测试验证

### 功能测试清单

| 测试项 | 测试步骤 | 预期结果 |
|--------|----------|----------|
| **未登录预览** | 1. 访问文章详情页<br>2. 不登录 | 只显示前2000字，剩余内容模糊 |
| **登录解锁** | 1. 点击"登录解锁"按钮<br>2. 完成登录<br>3. 重定向回文章页 | 显示完整内容 |
| **缓存验证** | 1. 访问文章<br>2. 刷新页面 | 响应时间< 100ms |
| **管理员CRUD** | 1. 创建文章<br>2. 编辑<br>3. 发布<br>4. 删除 | 所有操作成功 |
| **安全性测试** | 1. 打开开发者工具<br>2. 检查Network<br>3. 查看API响应 | 未登录用户API响应不包含完整内容 |
| **SEO测试** | 1. 使用curl访问<br>2. 检查meta标签 | 正确的title/description/keywords |

### 安全测试清单

```bash
# 1. 测试未登录用户无法获取完整内容
curl -s http://localhost:3000/articles/test-article | grep -o "content" | wc -l
# 预期：content字段长度 ≤ 2000

# 2. 测试已登录用户可以获取完整内容
curl -s -H "Cookie: session_token=..." http://localhost:3000/articles/test-article | jq '.article.content' | wc -c
# 预期：完整长度（如10000+）

# 3. 测试DOM操作无法绕过
# 在浏览器控制台执行：document.querySelector('.blur-md').remove()
# 预期：删除模糊层后依然看不到内容（因为服务端未发送）
```

---

## 🚀 部署清单

### 环境变量
无需新增环境变量，使用现有的认证系统。

### 数据库迁移
```bash
# 生产环境部署前执行
npm run db:migrate
```

### 缓存预热
```bash
# 可选：预热热门文章缓存
curl http://your-domain.com/articles/popular-article-1
curl http://your-domain.com/articles/popular-article-2
```

### 监控指标
- 文章页面加载时间（P95 < 500ms）
- API响应时间（P95 < 200ms）
- 缓存命中率（> 80%）
- 每日新增浏览量

---

## 📚 后续优化建议

1. **Markdown编辑器增强**
   - 集成所见即所得编辑器（如TipTap、ProseMirror）
   - 支持图片拖拽上传
   - 实时预览

2. **内容推荐系统**
   - 基于协同过滤的文章推荐
   - 阅读历史记录
   - 个性化推荐

3. **评论系统**
   - 允许已登录用户评论
   - 管理员审核机制
   - 回复和点赞功能

4. **RSS订阅**
   - 生成RSS feed
   - 支持邮件订阅

5. **阅读进度保存**
   - 记录用户阅读位置
   - 跨设备同步

---

## 🔗 相关资源

- [Remix官方文档](https://remix.run/docs)
- [Better Auth文档](https://better-auth.com)
- [Tailwind CSS文档](https://tailwindcss.com/docs)
- [Remark Markdown处理器](https://github.com/remarkjs/remark)

---

**文档结束**

如有疑问或需要进一步说明，请联系开发团队。
