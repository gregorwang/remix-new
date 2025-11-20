# AI 提示词：重构歌曲数据管理架构

> 本文档专为 AI 助手设计，提供清晰的重构指令。人类开发者可参考本文档了解改造步骤。

---

## 🎯 任务目标

将当前的"路由传递数据"模式重构为"配置文件管理"模式，提升代码的封装性和可维护性。

---

## 📋 当前状态分析

### 现有架构

```
app/routes/_index.tsx (loader)
  ↓ props: songs
app/components/tab-showcase.tsx (接收 songs)
```

### 存在的问题

1. 歌曲数据硬编码在路由文件（第30-74行）
2. 路由文件职责过重（数据定义 + 歌词读取 + 页面渲染）
3. 组件依赖外部传入数据，封装性差
4. 数据和业务逻辑分散，维护成本高

---

## 🎨 目标架构

### 重构后架构

```
app/config/songs.ts (数据配置)
  ↓ import
app/routes/_index.tsx (loader 只负责读取歌词)
  ↓ props: songs (带歌词)
app/components/tab-showcase.tsx (接收完整数据)
```

### 架构优势

- 数据集中管理（配置文件）
- 路由职责单一（仅处理歌词文件 I/O）
- 组件保持简洁（专注展示逻辑）
- 类型定义统一（导出 Song 接口）

---

## 🛠️ 重构步骤

### 步骤 1：创建配置文件

**文件路径：** `app/config/songs.ts`

**要求：**

1. 导出 `Song` 接口定义
2. 导出 `SONGS` 常量数组
3. 添加 JSDoc 注释说明
4. 提供工具函数（可选）

**代码模板：**

```typescript
/**
 * 音乐播放器 - 歌曲配置文件
 *
 * @description 管理所有歌曲的元数据和歌词文件路径
 * @module config/songs
 */

/**
 * 歌曲数据结构
 */
export interface Song {
  /** 歌曲唯一标识符（网易云音乐 ID） */
  id: string;
  /** 歌曲标题 */
  title: string;
  /** 艺术家名称 */
  artist: string;
  /** 音频文件 URL */
  url: string;
  /** 歌词文件名（相对于 public 目录） */
  lrcFile: string;
}

/**
 * 歌曲列表配置
 *
 * @description 包含所有可播放的歌曲信息
 * @see public/*.lrc 歌词文件
 */
export const SONGS: Song[] = [
  {
    id: "28921695",
    title: "Nine Point Eight",
    artist: "Mili",
    url: "https://music.163.com/song/media/outer/url?id=28921695.mp3",
    lrcFile: "Nine Point Eight.lrc"
  },
  {
    id: "30841657",
    title: "まっしろな雪",
    artist: "水瀬ましろ",
    url: "https://music.163.com/song/media/outer/url?id=30841657.mp3",
    lrcFile: "まっしろな雪.lrc"
  },
  {
    id: "705331",
    title: "コネクト",
    artist: "ClariS",
    url: "https://whylookthis.wangjiajun.asia/4244581413.mp3",
    lrcFile: "コネクト.lrc"
  },
  {
    id: "729877",
    title: "You're the Shine(Night Butterflies)",
    artist: "FELT",
    url: "https://music.163.com/song/media/outer/url?id=729877.mp3",
    lrcFile: "You're the Shine(Night Butterflies).lrc"
  },
  {
    id: "29848676",
    title: "Moments",
    artist: "FELT",
    url: "https://music.163.com/song/media/outer/url?id=29848676.mp3",
    lrcFile: "Moments.lrc"
  },
  {
    id: "425280603",
    title: "Goodbye",
    artist: "Vivienne",
    url: "https://music.163.com/song/media/outer/url?id=425280603.mp3",
    lrcFile: "Goodbye.lrc"
  }
];

/**
 * 获取歌曲总数
 * @returns 歌曲数量
 */
export const getTotalSongs = (): number => SONGS.length;

/**
 * 根据 ID 查找歌曲
 * @param id 歌曲 ID
 * @returns 匹配的歌曲对象，未找到返回 undefined
 */
export const findSongById = (id: string): Song | undefined => {
  return SONGS.find(song => song.id === id);
};

/**
 * 根据艺术家筛选歌曲
 * @param artist 艺术家名称
 * @returns 该艺术家的所有歌曲
 */
export const getSongsByArtist = (artist: string): Song[] => {
  return SONGS.filter(song => song.artist === artist);
};
```

---

### 步骤 2：重构路由文件

**文件路径：** `app/routes/_index.tsx`

**修改内容：**

1. 删除路由文件中的歌曲数组定义（第30-74行）
2. 从配置文件导入 `SONGS`
3. 简化 loader 函数，仅负责读取歌词

**修改前（第27-94行）：**

```typescript
export const loader = async ({ request }: LoaderFunctionArgs) => {
    const session = await auth.api.getSession({ headers: request.headers });

    // ❌ 数据定义在这里（需要删除）
    const songs = [
        {
            id: "28921695",
            title: "Nine Point Eight",
            artist: "Mili",
            url: "https://music.163.com/...",
            lrcFile: "Nine Point Eight.lrc"
        },
        // ... 更多歌曲
    ];

    // 读取歌词文件
    const songsWithLyrics = songs.map(song => {
        const lyricsPath = join(process.cwd(), "public", song.lrcFile);
        const lyricsText = readFileSync(lyricsPath, "utf-8");
        return { ...song, lyrics: lyricsText };
    });

    return json({
        userId: session?.user?.id || null,
        currentUser: session?.user || null,
        songs: songsWithLyrics,
    }, {
        headers: {
            "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
        }
    });
};
```

**修改后：**

```typescript
// ✅ 添加导入
import { SONGS } from "~/config/songs";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const session = await auth.api.getSession({ headers: request.headers });

    // ✅ 从配置文件导入数据，仅处理歌词文件读取
    const songsWithLyrics = SONGS.map(song => {
        const lyricsPath = join(process.cwd(), "public", song.lrcFile);
        const lyricsText = readFileSync(lyricsPath, "utf-8");
        return {
            ...song,
            lyrics: lyricsText
        };
    });

    return json({
        userId: session?.user?.id || null,
        currentUser: session?.user || null,
        songs: songsWithLyrics,
    }, {
        headers: {
            "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
        }
    });
};
```

**关键变化：**

- ❌ 删除：硬编码的 `songs` 数组
- ✅ 新增：`import { SONGS } from "~/config/songs"`
- ✅ 保留：歌词文件读取逻辑（这是服务端职责）

---

### 步骤 3：更新组件类型引用

**文件路径：** `app/components/tab-showcase.tsx`

**修改内容：**

1. 从配置文件导入 `Song` 类型
2. 删除组件内部的 `Song` 接口定义（重复定义）

**修改前（第15-21行）：**

```typescript
// ❌ 组件内部定义类型（重复）
interface Song {
  id: string
  title: string
  artist: string
  url: string
  lyrics: string
}
```

**修改后：**

```typescript
// ✅ 从配置文件导入统一类型
import type { Song } from "~/config/songs";

// 扩展类型以包含歌词（服务端添加的字段）
interface SongWithLyrics extends Song {
  lyrics: string;
}

interface TabShowcaseProps {
  songs: SongWithLyrics[];
}
```

**说明：**

- 配置文件的 `Song` 定义基础结构（不含歌词）
- 组件定义 `SongWithLyrics` 扩展类型（含歌词）
- 这样设计是因为歌词是运行时动态加载的

---

## ✅ 验证清单

完成重构后，请验证以下内容：

### 功能验证

- [ ] 音乐播放器正常显示歌曲列表
- [ ] 点击歌曲可以播放
- [ ] 歌词正常滚动显示
- [ ] 切换歌曲功能正常
- [ ] 播放列表显示正确的歌曲数量

### 代码质量

- [ ] TypeScript 类型检查无错误
- [ ] ESLint 无警告
- [ ] 路由文件减少了约40行代码
- [ ] 配置文件有完整的类型定义和注释

### 架构验证

- [ ] `app/config/songs.ts` 文件已创建
- [ ] `app/routes/_index.tsx` 不再包含歌曲数组
- [ ] `app/components/tab-showcase.tsx` 使用导入的类型

---

## 🚨 注意事项

### 1. 路径别名

确保 TypeScript 配置支持 `~` 别名：

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "~/*": ["./app/*"]
    }
  }
}
```

### 2. 歌词文件位置

歌词文件应位于 `public/` 目录：

```
public/
├── Nine Point Eight.lrc
├── まっしろな雪.lrc
├── コネクト.lrc
└── ...
```

### 3. 类型一致性

配置文件的 `Song` 类型不包含 `lyrics` 字段（因为歌词是运行时加载的）。如果需要在配置文件中使用完整类型，可以这样定义：

```typescript
// 基础类型（配置文件）
export interface SongConfig {
  id: string;
  title: string;
  artist: string;
  url: string;
  lrcFile: string;
}

// 运行时类型（带歌词）
export interface Song extends SongConfig {
  lyrics: string;
}
```

### 4. 缓存策略

保持路由的缓存配置不变：

```typescript
{
  headers: {
    "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
  }
}
```

---

## 🎯 扩展建议

重构完成后，可以考虑以下扩展：

### 1. 添加歌曲分类

```typescript
// app/config/songs.ts
export enum Genre {
  POP = "流行",
  ROCK = "摇滚",
  ANIME = "动漫",
}

export interface Song {
  // ...
  genre: Genre;
}
```

### 2. 支持歌单功能

```typescript
// app/config/playlists.ts
import { SONGS } from "./songs";

export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
}

export const PLAYLISTS: Playlist[] = [
  {
    id: "favorite",
    name: "我的最爱",
    songIds: ["28921695", "705331"]
  }
];
```

### 3. 配置验证

```typescript
// app/config/songs.ts
import { z } from "zod";

const SongSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  artist: z.string().min(1),
  url: z.string().url(),
  lrcFile: z.string().endsWith(".lrc"),
});

// 运行时验证
SONGS.forEach(song => {
  SongSchema.parse(song);
});
```

---

## 📊 重构效果对比

| 指标 | 重构前 | 重构后 | 改善 |
|-----|-------|-------|-----|
| 路由文件行数 | ~319 行 | ~280 行 | ✅ -12% |
| 代码职责 | 混杂 | 清晰 | ✅ 提升 |
| 类型定义重复 | 2 处 | 1 处 | ✅ 统一 |
| 数据维护位置 | 路由文件 | 配置文件 | ✅ 集中 |
| 组件封装性 | 依赖外部 | 独立配置 | ✅ 改善 |

---

## 🤖 AI 执行指令

如果你是 AI 助手，请按以下顺序执行：

1. **读取现有文件**
   ```
   Read app/routes/_index.tsx (第27-94行)
   Read app/components/tab-showcase.tsx (第15-21行)
   ```

2. **创建配置文件**
   ```
   Write app/config/songs.ts (使用步骤1的模板)
   ```

3. **修改路由文件**
   ```
   Edit app/routes/_index.tsx
   - 在顶部添加 import { SONGS } from "~/config/songs"
   - 删除第30-74行的 songs 数组
   - 修改第77行：const songsWithLyrics = SONGS.map(...)
   ```

4. **修改组件文件**
   ```
   Edit app/components/tab-showcase.tsx
   - 在顶部添加 import type { Song } from "~/config/songs"
   - 删除第15-21行的 Song 接口定义
   - 添加 SongWithLyrics 类型扩展
   ```

5. **验证**
   ```
   Bash: npm run build
   Bash: npm run typecheck
   ```

---

## 📚 参考资料

- [Remix 官方文档 - 数据加载](https://remix.run/docs/en/main/route/loader)
- [TypeScript 模块系统](https://www.typescriptlang.org/docs/handbook/modules.html)
- [关注点分离原则](https://en.wikipedia.org/wiki/Separation_of_concerns)

---

**文档版本：** v1.0
**适用项目：** remix-new
**最后更新：** 2024-01-01
**维护者：** 汪家俊
