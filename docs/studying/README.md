# 安全媒体访问Token系统

基于Remix构建的完整安全媒体访问控制系统，支持图片和视频的HMAC签名验证和时效性控制，遵循React 19和React Router v7迁移准备规范。

## 功能特性

### 🔐 安全特性
- **HMAC-SHA256签名**：使用密钥对token进行签名，防止伪造
- **时效性控制**：token具有明确的过期时间（5-60分钟可配置）
- **Base64URL编码**：安全的URL编码格式，防止特殊字符问题
- **媒体名称绑定**：token与特定媒体文件绑定，防止跨文件使用

### 🚀 性能优化
- **HTTP缓存控制**：智能缓存策略，优化重复请求
- **Remix SSR**：服务端渲染，首屏加载快速
- **渐进增强**：无JavaScript时仍可正常使用
- **Resource预加载**：优化资源加载时序
- **智能缓存系统**：sessionStorage持久化，避免重复请求

### 📱 用户体验
- **响应式设计**：完美适配移动端和桌面端
- **实时反馈**：即时的操作反馈和状态显示
- **错误处理**：完善的错误提示和恢复机制
- **复制功能**：一键复制token和URL
- **批量处理**：支持多媒体文件批量token获取

### 🔄 React 19 & Router v7 准备
- **最小化客户端状态**：为RSC迁移做准备
- **Future Flags启用**：完整的v7迁移配置
- **TypeScript严格模式**：确保类型安全
- **客户端组件分离**：.client.tsx文件模式

## 演示页面

### 💬 Nemesis 聊天室 (`/chat`)
- 基于汪家俊疯狂自我意识的AI对话助手
- 预设问题快速开始对话
- 实时聊天界面和打字动画
- 完整的错误处理和用户反馈

### 🎌 最喜欢的动漫 (`/anime`)
- 沉浸式全屏动漫展示页面
- 背景视频自动播放与音频控制
- 可交互的动漫排行榜侧边栏
- 11部精选动漫作品及评分展示
- 完整的键盘导航和无障碍支持

### 📸 图片Token演示 (`/image-demo`)
- Token生成和验证界面
- 实时操作反馈
- API文档集成

### 🎬 媒体Token演示 (`/media-demo`)
- 图片和视频统一管理
- 缓存状态监控
- 批量处理演示
- 错误恢复展示

### 📋 服务条款 (`/terms`)
- 完整法律条款页面
- 渐进式UI动画
- 响应式设计

### 📷 摄影作品集 (`/photo`)
- 青岛摄影作品展示
- 三大主题画廊：随拍即景、光影留痕、静看时光
- 36张精选图片，响应式网格布局
- 安全图片加载与token验证

### 🎵 音乐年度报告 (`/music`)
- 2024年度音乐统计与回顾
- 历年最爱歌手时间线（2019-2024）
- 交互式DNA音乐可视化
- 季节音乐分布统计
- 情感关键词云展示
- 年度歌曲播放排行榜

### 🌌 音乐星河DNA (`/dnamusic`)
- 沉浸式星空背景与动态星光效果
- 音乐品味DNA可视化（电影原声、中速节奏、动漫治愈）
- 2015-2024年音乐演化史时间线
- 11首代表作品的渐变卡片展示
- 粒子特效与宇宙氛围营造
- 滚动进度星座连线效果

### 📊 音乐统计报告 (`/musicstats`)
- 下午黄金时段听歌分析（14:00-18:00）
- 年度音乐数据统计（387小时听歌时长）
- 动态午后场景可视化（太阳、云朵、山丘）
- 年度音乐关键词云（发现×梦想）
- 歌词弹幕流动效果展示12首经典歌曲
- 专辑封面展示与图片token安全验证

## API端点

### POST /api/chat
Nemesis AI对话接口

**请求参数：**
```json
{
  "message": "你好，汪家俊是谁？"
}
```

**响应格式：**
```json
{
  "choices": [
    {
      "message": {
        "content": "汪家俊是一位充满创造力的开发者...",
        "role": "assistant"
      }
    }
  ]
}
```

### POST /api/image-token
生成安全的媒体访问token（支持图片和视频）

**请求参数：**
```json
{
  "imageName": "example.jpg", // 也支持视频文件
  "expiresInMinutes": 30
}
```

**响应格式：**
```json
{
  "success": true,
  "data": {
    "imageUrl": "https://example.com/secure/example.jpg?token=...",
    "token": "base64url_encoded_token",
    "expiresAt": "2024-01-01T12:30:00.000Z",
    "expires": 1704110400
  }
}
```

### GET /api/verify-token
验证token的有效性

**查询参数：**
- `token`: 要验证的token
- `imageName`: 对应的媒体文件名称

**响应格式：**
```json
{
  "valid": true,
  "imageName": "example.jpg",
  "expiresAt": "2024-01-01T12:30:00.000Z",
  "remainingTime": 1800
}
```

## Hooks系统

### useImageToken (客户端)
```typescript
const {
  getImageWithToken,
  initializeImageUrls,
  handleImageError,
  getCacheStats,
  clearImageErrorStates,
  cacheSize
} = useImageToken();
```

### useVideoToken (客户端)
```typescript
const {
  getVideoWithToken,
  initializeSingleVideoUrl,
  handleVideoError,
  getVideoCacheStats,
  clearVideoErrorStates,
  cacheSize
} = useVideoToken();
```

## 环境变量配置

创建 `.env` 文件并配置以下变量：

```env
# HMAC签名密钥（必需）
AUTH_KEY_SECRET=your-secret-key-here

# 媒体服务器基础URL（可选，默认为当前域名）
IMAGE_BASE_URL=https://your-media-server.com
```

## 项目结构

```
app/
├── routes/
│   ├── _index.tsx              # 首页
│   ├── anime.tsx               # 最喜欢的动漫
│   ├── chat.tsx                # Nemesis聊天室
│   ├── image-demo.tsx          # Token生成演示
│   ├── media-demo.tsx          # 媒体演示页面
│   ├── music.tsx               # 音乐年度报告
│   ├── photo.tsx               # 摄影作品集
│   ├── xiao.tsx                # 哲学思考页面
│   ├── terms.tsx               # 服务条款
│   ├── api.chat.tsx            # 聊天AI接口
│   ├── api.image-token.tsx     # Token生成API
│   └── api.verify-token.tsx    # Token验证API
├── components/
│   ├── DnaMusic.tsx            # DNA音乐可视化组件
│   ├── MusicStats.tsx          # 音乐统计组件
│   ├── common/                 # 通用组件
│   ├── layout/                 # 布局组件
│   └── ui/                     # UI组件
├── hooks/
│   ├── useImageToken.client.tsx # 图片Token Hook
│   └── useVideoToken.client.tsx # 视频Token Hook
├── root.tsx
└── tailwind.css

public/
├── favicon.ico
├── logo-dark.png
└── logo-light.png
```

## Remix架构合规性

本项目严格遵循 `rule.md` 和 `ruler2.md` 规范：

### ✅ 三大性能机制
1. **路由级数据加载**：所有页面使用loader()函数
2. **HTTP缓存控制**：完整的Cache-Control头策略
3. **渐进增强**：Form组件和Link prefetch="intent"

### ✅ React 19/Router v7 准备
1. **Future Flags**：完整启用所有v7标志
2. **最小化客户端状态**：为RSC做准备
3. **TypeScript严格模式**：类型安全保障
4. **客户端组件分离**：.client.tsx模式

### ✅ 架构要求
1. **嵌套路由系统**：清晰的路由结构
2. **ErrorBoundary**：每个路由的错误处理
3. **Links函数**：资源预加载优化
4. **Meta函数**：SEO优化

## 缓存系统

### 智能缓存策略
- **Token缓存**：sessionStorage持久化
- **过期检查**：自动检测和清理过期token
- **并发控制**：限制同时请求数量
- **错误恢复**：智能重试和占位符显示

### 缓存统计
```typescript
const stats = getCacheStats();
// {
//   tokenCacheSize: 10,
//   loadingStatesSize: 2,
//   errorCountsSize: 1,
//   cacheHitRate: 85.5
// }
```

## 安全考虑

1. **密钥管理**：确保 `AUTH_KEY_SECRET` 足够复杂且定期轮换
2. **HTTPS部署**：生产环境必须使用HTTPS
3. **CORS配置**：根据需要配置跨域访问策略
4. **监控日志**：记录token生成和验证的关键操作
5. **速率限制**：建议添加API调用频率限制
6. **客户端缓存**：合理的缓存时间设置

## 开发指南

### 本地开发
```bash
npm install
npm run dev
```

### 构建部署
```bash
npm run build
npm start
```

### 添加新功能
1. 遵循Remix的loader/action模式
2. 确保所有响应包含适当的缓存头
3. 使用TypeScript严格模式
4. 添加相应的错误处理
5. 为RSC迁移做准备

### Future Flags配置
项目已启用所有React Router v7准备标志：
```typescript
future: {
  v3_fetcherPersist: true,
  v3_relativeSplatPath: true,
  v3_throwAbortReason: true,
  v3_singleFetch: true,
  v3_lazyRouteDiscovery: true,
}
```

## 迁移路线图

### 当前状态（Remix v2）
- ✅ 完整Remix架构实现
- ✅ Future flags启用
- ✅ TypeScript严格模式
- ✅ 渐进增强支持

### React Router v7 准备
- ✅ 代码兼容性保证
- ✅ 无破坏性依赖
- ✅ 标准化配置

### 未来RSC支持
- ✅ 最小化客户端状态
- ✅ 组件纯函数化
- ✅ 服务端优先数据流

## 许可证

MIT License
