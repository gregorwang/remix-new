# React Hooks 设计原则：为什么要专门写一个懒加载 Hook？

## 问题背景

在查看 `app/hooks/useLazyLoad.client.tsx` 时，你可能会产生这样的疑问：

- **这不就是个懒加载吗？** 为什么要专门写一个 Hook？
- **直接在 useMediaToken 里写不行吗？** 为什么要单独拆出来？
- **这符合 Hook 的使用逻辑吗？** 还是过度设计了？

这是非常好的问题！让我们深入分析这个设计决策。

---

## 一、useLazyLoad.client.tsx 做了什么？

### 1.1 代码结构概览

```typescript
// app/hooks/useLazyLoad.client.tsx

export function useLazyLoad(options: LazyLoadOptions = {}) {
  const visibleItemsRef = useRef<Set<string>>(new Set());

  // 1. 通用懒加载观察器创建函数
  const createObserver = useCallback((onLoad, dataAttribute) => {
    // 使用 Intersection Observer API
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // 元素可见时执行回调
          onLoad(element, itemId, itemSrc);
          observer.unobserve(element);
        }
      });
    }, { rootMargin, threshold });

    return observer;
  }, [rootMargin, threshold]);

  // 2. 专门用于媒体（图片/视频）的懒加载观察器
  const createMediaObserver = useCallback((onTokenUrlReady) => {
    return createObserver(async (element, itemId, itemSrc) => {
      const tokenUrl = await onTokenUrlReady(itemSrc, itemId);
      element.src = tokenUrl;  // 更新媒体 src
    }, 'data-media-id');
  }, [createObserver]);

  // 3. 重置功能
  const resetVisibleItems = useCallback(() => {
    visibleItemsRef.current.clear();
  }, []);

  return { createObserver, createMediaObserver, resetVisibleItems };
}
```

**核心功能**：
1. 封装了 **Intersection Observer API**（浏览器原生懒加载 API）
2. 提供了**通用懒加载逻辑**（可用于任何元素）
3. 提供了**媒体专用懒加载**（图片/视频）
4. 管理了**已加载项的状态**（避免重复加载）

---

## 二、为什么要专门写一个 Hook？

### 2.1 原因一：从 useMediaToken 中拆分出来（关注点分离）

#### 查看 useMediaToken 的使用

```typescript
// app/hooks/useMediaToken.client.tsx (第 47 行)

export const useMediaToken = (type: MediaType = 'image') => {
  // 使用独立的懒加载Hook
  const { createMediaObserver: createLazyLoadObserver } = useLazyLoad();

  // ... 其他逻辑
  const createMediaObserver = useCallback((items, setItems) => {
    return createLazyLoadObserver(
      async (src, itemId) => {
        const tokenUrl = await getMediaWithToken(src);
        // 更新状态...
        return tokenUrl;
      },
      `data-${type}-id`,
      type
    );
  }, [type, getMediaWithToken, createLazyLoadObserver]);

  return { createMediaObserver, ... };
};
```

#### 如果不拆分会怎样？

```typescript
// ❌ 所有逻辑混在一起（坏设计）
export const useMediaToken = () => {
  // Token 管理逻辑
  const tokensCache = new Map();
  const loadingStates = new Map();

  // 懒加载逻辑
  const visibleItemsRef = useRef(new Set());
  const createObserver = useCallback(() => {
    const observer = new IntersectionObserver(...);
    // ... 复杂的懒加载逻辑
  }, []);

  // Token 获取逻辑
  const getMediaWithToken = async (url) => { ... };

  // 错误处理逻辑
  const handleMediaError = () => { ... };

  // 缓存管理逻辑
  const clearCache = () => { ... };

  // ... 几百行代码混在一起！
};
```

**问题**：
1. **职责混乱**：Token 管理、懒加载、缓存管理混在一起
2. **难以维护**：修改懒加载逻辑可能影响 Token 管理
3. **无法复用**：懒加载逻辑被绑定在 useMediaToken 中，其他地方无法使用
4. **测试困难**：无法单独测试懒加载逻辑

#### 拆分后的优势

```typescript
// ✅ 职责清晰（好设计）

// useLazyLoad: 专注于懒加载逻辑
export function useLazyLoad() {
  // 只处理 Intersection Observer 相关逻辑
  const createObserver = ...;
  return { createObserver };
}

// useMediaToken: 专注于 Token 管理
export const useMediaToken = () => {
  const { createObserver } = useLazyLoad();  // 复用懒加载逻辑
  const getMediaWithToken = ...;  // 专注于 Token
  return { getMediaWithToken, createObserver };
};
```

**优势**：
- ✅ 每个 Hook 职责单一
- ✅ 懒加载逻辑可以在其他地方复用
- ✅ 易于测试和维护

---

### 2.2 原因二：代码复用（DRY 原则）

#### 场景 1：图片懒加载

```typescript
// app/routes/gallery.tsx
const { createMediaObserver } = useLazyLoad();

const observer = createMediaObserver(
  async (src, itemId) => {
    const url = await getImageUrl(src);
    return url;
  },
  'data-image-id'
);
```

#### 场景 2：视频懒加载

```typescript
// app/routes/videos.tsx
const { createMediaObserver } = useLazyLoad();

const observer = createMediaObserver(
  async (src, itemId) => {
    const url = await getVideoUrl(src);
    return url;
  },
  'data-video-id'
);
```

#### 场景 3：评论懒加载

```typescript
// app/routes/comments.tsx
const { createObserver } = useLazyLoad();

const observer = createObserver(
  async (element, itemId) => {
    // 当评论区可见时才加载评论
    const comments = await fetchComments(itemId);
    renderComments(comments);
  },
  'data-comment-id'
);
```

#### 场景 4：音乐封面懒加载

```typescript
// app/routes/music.tsx
const { createMediaObserver } = useLazyLoad();

const observer = createMediaObserver(
  async (src, itemId) => {
    const tokenUrl = await getMediaWithToken(src);
    return tokenUrl;
  },
  'data-album-id'
);
```

**核心价值**：
- 一次编写，多处使用
- 所有懒加载场景共享同一套逻辑
- 修复 bug 或优化性能时，只需改一处

---

### 2.3 原因三：符合 React Hooks 设计理念

#### React Hooks 的核心思想

React Hooks 设计的目的是：**提取和复用有状态的逻辑**。

```
传统方式：逻辑分散在生命周期方法中
    ↓
Hooks 方式：按功能划分，逻辑内聚
```

#### useLazyLoad 符合 Hooks 的特征

**特征 1：封装有状态的逻辑**

```typescript
export function useLazyLoad() {
  // 状态：记录已加载的项
  const visibleItemsRef = useRef<Set<string>>(new Set());

  // 逻辑：创建观察器
  const createObserver = useCallback(() => {
    // ... 懒加载逻辑
  }, []);

  return { createObserver };
}
```

**特征 2：使用了 React 的内置 Hooks**

```typescript
// 使用 useRef 管理状态
const visibleItemsRef = useRef(new Set());

// 使用 useCallback 优化性能
const createObserver = useCallback((onLoad) => {
  // ...
}, [rootMargin, threshold]);
```

**特征 3：可组合性（Composability）**

```typescript
// Hook 可以组合使用
export const useMediaToken = () => {
  const { createObserver } = useLazyLoad();  // 组合使用
  const getMediaWithToken = ...;

  return { createObserver, getMediaWithToken };
};
```

---

### 2.4 原因四：降低复杂度（认知负担）

#### 对比：混在一起 vs 拆分

**混在一起（认知负担高）**：

```typescript
// ❌ 需要同时理解 3 种逻辑
export const useMediaToken = () => {
  // 看到这里，你需要理解：
  // 1. Intersection Observer API
  // 2. Token 获取逻辑
  // 3. 缓存管理
  // 4. 错误处理
  // ... 300+ 行代码
};
```

**拆分后（认知负担低）**：

```typescript
// ✅ useLazyLoad: 只需理解懒加载
export function useLazyLoad() {
  // 只关注 Intersection Observer
  // 120 行代码
}

// ✅ useMediaToken: 只需理解 Token 管理
export const useMediaToken = () => {
  const { createObserver } = useLazyLoad();  // 复用现成的
  // 只关注 Token 获取和缓存
  // 250 行代码
};
```

**认知负担对比**：
- **混在一起**：需要同时理解 400+ 行代码的 4 种逻辑
- **拆分后**：每次只需理解一个 Hook 的单一职责

---

### 2.5 原因五：便于测试

#### 分离后可以独立测试

```typescript
// ✅ 测试 useLazyLoad
describe('useLazyLoad', () => {
  it('应该在元素可见时触发回调', () => {
    const { createObserver } = useLazyLoad();
    const mockCallback = jest.fn();

    const observer = createObserver(mockCallback);
    // 模拟元素可见
    mockIntersectionObserver(true);

    expect(mockCallback).toHaveBeenCalled();
  });

  it('应该避免重复加载同一元素', () => {
    const { createObserver } = useLazyLoad();
    const mockCallback = jest.fn();

    const observer = createObserver(mockCallback);
    // 模拟元素多次可见
    mockIntersectionObserver(true);
    mockIntersectionObserver(true);

    expect(mockCallback).toHaveBeenCalledTimes(1); // 只调用一次
  });
});

// ✅ 测试 useMediaToken（不需要关心懒加载细节）
describe('useMediaToken', () => {
  it('应该正确获取 token', async () => {
    const { getMediaWithToken } = useMediaToken('image');
    const result = await getMediaWithToken('test.jpg');

    expect(result).toContain('token=');
  });
});
```

**如果混在一起**：
```typescript
// ❌ 测试 useMediaToken 时必须同时测试懒加载逻辑
describe('useMediaToken', () => {
  it('应该正确获取 token 并懒加载', async () => {
    // 需要同时 mock Intersection Observer 和 fetch
    mockIntersectionObserver();
    mockFetch();

    // 测试代码变得复杂...
  });
});
```

---

## 三、这是不是过度设计？

### 3.1 判断标准：复杂度 vs 收益

#### 复杂度分析

**不拆分**：
- 代码行数：400+ 行在一个文件
- 职责数量：4 种职责混在一起
- 复杂度：O(n²) - 修改一处可能影响多处

**拆分后**：
- 代码行数：120 行 (useLazyLoad) + 250 行 (useMediaToken)
- 职责数量：每个文件 1 种职责
- 复杂度：O(n) - 修改一处只影响自己

**结论**：拆分后总代码量可能略多，但**复杂度大幅降低**。

---

#### 收益分析

| 收益维度 | 不拆分 | 拆分后 |
|---------|--------|--------|
| **可复用性** | ❌ 只能在 useMediaToken 中使用 | ✅ 可在任何地方使用 |
| **可测试性** | ❌ 必须同时测试多个逻辑 | ✅ 独立测试 |
| **可维护性** | ❌ 修改风险高 | ✅ 修改风险低 |
| **可读性** | ❌ 需要理解多个概念 | ✅ 每次理解一个概念 |
| **性能优化** | ❌ 难以独立优化 | ✅ 可单独优化懒加载 |

**结论**：收益远大于复杂度增加。

---

### 3.2 什么情况下不需要拆分？

#### 不需要拆分的情况

**情况 1：逻辑非常简单且只用一次**

```typescript
// ✅ 不需要拆分
export default function SimpleComponent() {
  const [count, setCount] = useState(0);

  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

**情况 2：逻辑强耦合，无法独立存在**

```typescript
// ✅ 不需要拆分
export const useFormWithValidation = () => {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});

  // 表单值和验证强耦合，拆分没有意义
  const validate = () => { ... };

  return { values, errors, validate };
};
```

#### 需要拆分的情况（useLazyLoad 的情况）

**情况 1：逻辑可以独立复用**

```typescript
// ✅ 懒加载逻辑可以用于图片、视频、评论等多种场景
export function useLazyLoad() { ... }
```

**情况 2：职责可以明确划分**

```typescript
// ✅ 懒加载 vs Token 管理是两个独立的职责
export function useLazyLoad() { ... }  // 职责 1：懒加载
export const useMediaToken = () => { ... };  // 职责 2：Token 管理
```

**情况 3：代码超过 150 行且有多个职责**

```typescript
// ✅ useMediaToken 原本 400+ 行，拆分后更清晰
```

---

## 四、useLazyLoad 的设计亮点

### 4.1 亮点一：高度可配置

```typescript
export interface LazyLoadOptions {
  rootMargin?: string;  // 提前加载距离
  threshold?: number;   // 可见性阈值
}

// 使用
const { createObserver } = useLazyLoad({
  rootMargin: '100px',  // 元素距离视口 100px 时就开始加载
  threshold: 0.5,       // 元素 50% 可见时触发
});
```

**灵活性**：
- 可以根据场景调整触发时机
- 默认值适合大多数场景

---

### 4.2 亮点二：防止重复加载

```typescript
const visibleItemsRef = useRef<Set<string>>(new Set());

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const itemId = element.getAttribute(dataAttribute);

    // 如果已经处理过，跳过
    if (visibleItemsRef.current.has(itemId)) return;

    visibleItemsRef.current.add(itemId);
    await onLoad(element, itemId, itemSrc);
    observer.unobserve(element);  // 停止观察
  });
});
```

**性能优化**：
- 每个元素只加载一次
- 加载后停止观察，释放资源

---

### 4.3 亮点三：提供两种 API

```typescript
return {
  // 1. 通用懒加载（适用于任何元素）
  createObserver,

  // 2. 媒体专用懒加载（适用于图片/视频）
  createMediaObserver,

  // 3. 重置功能（用于重新加载）
  resetVisibleItems,
};
```

**灵活性**：
- `createObserver`：完全自定义回调
- `createMediaObserver`：专门优化媒体加载
- `resetVisibleItems`：支持重新加载场景

---

### 4.4 亮点四：错误处理

```typescript
try {
  await onLoad(element, itemId, itemSrc);
} catch (error) {
  console.warn('Lazy load failed:', error);
}
```

**健壮性**：
- 单个元素加载失败不会影响其他元素
- 错误被捕获并记录

---

## 五、实战场景：如何使用 useLazyLoad？

### 场景 1：图片懒加载

```typescript
// app/routes/gallery.tsx

import { useLazyLoad } from '~/hooks/useLazyLoad.client';

export default function Gallery() {
  const [images, setImages] = useState<Image[]>([]);
  const { createMediaObserver } = useLazyLoad({
    rootMargin: '50px',  // 提前 50px 开始加载
  });

  useEffect(() => {
    const observer = createMediaObserver(
      async (src, itemId) => {
        // 获取带 token 的 URL
        const tokenUrl = await getImageWithToken(src);
        return tokenUrl;
      },
      'data-image-id',
      'image'
    );

    // 观察所有图片
    const imgElements = document.querySelectorAll('[data-image-id]');
    imgElements.forEach(img => observer?.observe(img));

    return () => observer?.disconnect();
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4">
      {images.map(image => (
        <img
          key={image.id}
          data-image-id={image.id}
          data-image-src={image.src}
          alt={image.alt}
        />
      ))}
    </div>
  );
}
```

---

### 场景 2：评论懒加载

```typescript
// app/routes/post.$id.tsx

import { useLazyLoad } from '~/hooks/useLazyLoad.client';

export default function Post() {
  const { createObserver } = useLazyLoad();

  useEffect(() => {
    const observer = createObserver(
      async (element, postId) => {
        // 当评论区滚动到可见时才加载评论
        const comments = await fetch(`/api/comments/${postId}`);
        const data = await comments.json();

        // 渲染评论
        element.innerHTML = renderComments(data);
      },
      'data-post-id'
    );

    const commentSection = document.querySelector('[data-post-id]');
    if (commentSection) {
      observer?.observe(commentSection);
    }

    return () => observer?.disconnect();
  }, []);

  return (
    <article>
      <h1>文章标题</h1>
      <div>文章内容...</div>

      {/* 评论区：只有滚动到这里才加载 */}
      <div data-post-id="123" className="mt-8">
        加载中...
      </div>
    </article>
  );
}
```

---

### 场景 3：无限滚动

```typescript
// app/routes/feed.tsx

import { useLazyLoad } from '~/hooks/useLazyLoad.client';

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const { createObserver } = useLazyLoad({
    threshold: 1.0,  // 元素完全可见时触发
  });

  useEffect(() => {
    const observer = createObserver(
      async () => {
        // 加载下一页
        const newPosts = await fetchPosts(page + 1);
        setPosts([...posts, ...newPosts]);
        setPage(page + 1);
      },
      'data-load-more'
    );

    const loadMoreTrigger = document.querySelector('[data-load-more]');
    if (loadMoreTrigger) {
      observer?.observe(loadMoreTrigger);
    }

    return () => observer?.disconnect();
  }, [page]);

  return (
    <div>
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}

      {/* 加载触发器 */}
      <div data-load-more className="h-20 flex items-center justify-center">
        加载更多...
      </div>
    </div>
  );
}
```

---

## 六、Hook 设计原则总结

### 原则 1：单一职责原则（SRP）

```typescript
// ✅ 每个 Hook 只做一件事
export function useLazyLoad() { /* 只处理懒加载 */ }
export const useMediaToken = () => { /* 只处理 Token */ }

// ❌ 一个 Hook 做太多事
export const useEverything = () => { /* 懒加载 + Token + 缓存 + ... */ }
```

---

### 原则 2：DRY 原则（Don't Repeat Yourself）

```typescript
// ✅ 逻辑只写一次，多处复用
export function useLazyLoad() { ... }

// 复用
const hook1 = useLazyLoad();
const hook2 = useLazyLoad();

// ❌ 相同逻辑重复写
const useImageLazyLoad = () => { /* Intersection Observer */ }
const useVideoLazyLoad = () => { /* Intersection Observer */ }
```

---

### 原则 3：组合优于继承（Composition over Inheritance）

```typescript
// ✅ 组合使用多个 Hook
export const useMediaToken = () => {
  const { createObserver } = useLazyLoad();  // 组合
  const getMediaWithToken = ...;

  return { createObserver, getMediaWithToken };
};

// ❌ 继承（React 不推荐）
class MediaToken extends LazyLoad { ... }
```

---

### 原则 4：开放封闭原则（Open-Closed Principle）

```typescript
// ✅ 对扩展开放，对修改封闭
export function useLazyLoad(options: LazyLoadOptions) {
  // 可以通过 options 扩展功能
  const { rootMargin = '50px', threshold = 0.1 } = options;

  // 提供灵活的回调函数
  const createObserver = useCallback((onLoad) => {
    // onLoad 可以自定义任何逻辑
  }, []);
}

// 扩展：无需修改 useLazyLoad 源码
const { createObserver } = useLazyLoad({ rootMargin: '100px' });
```

---

### 原则 5：最小惊讶原则（Principle of Least Astonishment）

```typescript
// ✅ API 设计符合预期
const { createObserver, createMediaObserver, resetVisibleItems } = useLazyLoad();

// 命名清晰：
// - createObserver: 创建观察器
// - createMediaObserver: 创建媒体观察器
// - resetVisibleItems: 重置状态

// ❌ API 设计令人困惑
const { init, setup, clear } = useLazyLoad();  // 不知道干什么
```

---

## 七、给 AI 编程初学者的建议

### 7.1 如何判断是否需要拆分成单独的 Hook？

问自己以下问题：

#### 问题 1：这段逻辑会在多个地方使用吗？

```typescript
// 是 → 拆分成 Hook
// useLazyLoad 被用于图片、视频、评论等多个场景

// 否 → 可以不拆分
// 只在一个组件用的逻辑
```

#### 问题 2：这段逻辑是否有独立的职责？

```typescript
// 是 → 拆分成 Hook
// 懒加载 vs Token 管理是两个独立职责

// 否 → 不需要拆分
// 表单值和表单验证强耦合
```

#### 问题 3：拆分后是否降低了复杂度?

```typescript
// 是 → 拆分
// 400 行混在一起 → 120 行 + 250 行

// 否 → 不拆分
// 20 行逻辑拆成 3 个文件，过度设计
```

#### 问题 4：这段逻辑包含了 React 状态或副作用吗？

```typescript
// 是 → 应该考虑拆分成 Hook
// useLazyLoad 使用了 useRef, useCallback

// 否 → 拆分成普通函数即可
// 纯计算逻辑不需要用 Hook
```

---

### 7.2 常见错误：过度拆分 vs 拆分不足

#### 错误 1：过度拆分

```typescript
// ❌ 拆分过度，增加复杂度
export function useIntersectionObserver() { ... }
export function useVisibleItems() { ... }
export function useObserverCallback() { ... }
export function useObserverOptions() { ... }
export function useLazyLoad() {
  // 组合太多小 Hook，难以理解
  const observer = useIntersectionObserver();
  const items = useVisibleItems();
  const callback = useObserverCallback();
  const options = useObserverOptions();
}
```

**问题**：
- 太多层级，难以追踪
- 过度抽象，不利于理解

---

#### 错误 2：拆分不足

```typescript
// ❌ 所有逻辑混在一起
export const useMediaToken = () => {
  // 懒加载逻辑（100 行）
  const visibleItemsRef = useRef(new Set());
  const createObserver = useCallback(() => { ... }, []);

  // Token 管理逻辑（100 行）
  const tokensCache = new Map();
  const getMediaWithToken = async () => { ... };

  // 缓存管理逻辑（100 行）
  const clearCache = () => { ... };

  // 错误处理逻辑（100 行）
  const handleMediaError = () => { ... };

  // 总共 400+ 行，职责混乱
};
```

**问题**：
- 职责不清
- 难以维护
- 无法复用

---

#### 正确的平衡点

```typescript
// ✅ 合理拆分
export function useLazyLoad() {
  // 专注于懒加载（120 行）
  const createObserver = ...;
  return { createObserver };
}

export const useMediaToken = () => {
  // 专注于 Token 管理（250 行）
  const { createObserver } = useLazyLoad();  // 复用懒加载
  const getMediaWithToken = ...;
  return { getMediaWithToken, createObserver };
};
```

**特点**：
- 每个 Hook 100-300 行
- 职责清晰
- 适度复用

---

### 7.3 实战练习

尝试回答以下问题来检验理解：

#### 练习 1

如果要添加"图片预加载"功能（在图片完全可见前就开始加载），应该如何实现？

<details>
<summary>点击查看答案</summary>

```typescript
// ✅ 使用 useLazyLoad 的 options
const { createMediaObserver } = useLazyLoad({
  rootMargin: '200px',  // 距离视口 200px 时就开始加载
  threshold: 0,         // 即使 0% 可见也触发
});

// 无需修改 useLazyLoad 的源码！
```

</details>

---

#### 练习 2

如果要在用户切换页面时重新加载所有图片，应该如何实现？

<details>
<summary>点击查看答案</summary>

```typescript
// ✅ 使用 resetVisibleItems 方法
const { createMediaObserver, resetVisibleItems } = useLazyLoad();

useEffect(() => {
  // 监听路由变化
  return () => {
    resetVisibleItems();  // 清除已加载项记录
  };
}, [pathname]);
```

</details>

---

#### 练习 3

如果要为懒加载添加加载进度统计，应该如何设计？

<details>
<summary>点击查看答案</summary>

```typescript
// 方案 1：在 useLazyLoad 外部统计（推荐）
const { createObserver } = useLazyLoad();
const [loadedCount, setLoadedCount] = useState(0);

const observer = createObserver(async (element, itemId) => {
  await loadImage(itemId);
  setLoadedCount(prev => prev + 1);  // 外部统计
});

// 方案 2：扩展 useLazyLoad（不推荐，违反单一职责）
export function useLazyLoadWithProgress() {
  const [progress, setProgress] = useState(0);
  const { createObserver } = useLazyLoad();

  const createObserverWithProgress = (onLoad) => {
    return createObserver(async (element, itemId) => {
      await onLoad(element, itemId);
      setProgress(prev => prev + 1);
    });
  };

  return { createObserver: createObserverWithProgress, progress };
}
```

**为什么方案 1 更好？**
- 统计逻辑不是懒加载的核心职责
- 保持 useLazyLoad 的职责单一
- 更灵活：可以自定义统计方式

</details>

---

## 八、总结

### 核心要点

1. **useLazyLoad 不是"简单的懒加载"**
   - 它封装了复杂的 Intersection Observer 逻辑
   - 处理了状态管理、错误处理、性能优化

2. **专门写 Hook 的原因**
   - ✅ 代码复用（DRY）
   - ✅ 关注点分离（SoC）
   - ✅ 降低复杂度
   - ✅ 便于测试
   - ✅ 符合 React Hooks 设计理念

3. **这不是过度设计**
   - 拆分后总复杂度降低
   - 收益远大于成本
   - 符合软件工程最佳实践

4. **符合 Hook 使用逻辑**
   - ✅ 封装有状态的逻辑
   - ✅ 使用了 React 内置 Hooks
   - ✅ 可组合使用
   - ✅ API 设计清晰

---

### 设计原则回顾

| 原则 | 说明 | useLazyLoad 的体现 |
|------|------|-------------------|
| **单一职责** | 一个模块只做一件事 | 只处理懒加载逻辑 |
| **DRY** | 不重复自己 | 多场景复用同一套逻辑 |
| **组合优于继承** | 通过组合构建复杂功能 | useMediaToken 组合使用 useLazyLoad |
| **开放封闭** | 对扩展开放，对修改封闭 | 通过 options 和回调函数扩展 |
| **最小惊讶** | API 设计符合直觉 | 命名清晰，行为可预测 |

---

### 什么时候需要拆分成 Hook？

```
判断流程：

是否包含 React 状态/副作用？
  ↓ 是
是否会在多处使用？
  ↓ 是
是否有独立的职责？
  ↓ 是
拆分后是否降低复杂度？
  ↓ 是
✅ 应该拆分成 Hook

如果任何一个问题答案是"否"
  ↓
❌ 不需要拆分
```

---

### 给 AI 编程初学者的最后建议

1. **不要害怕拆分**
   - 拆分是为了降低复杂度，不是增加复杂度
   - 从复用性和可维护性角度思考

2. **不要过度拆分**
   - 10-20 行的简单逻辑不需要拆分
   - 强耦合的逻辑不需要拆分

3. **学习优秀的开源代码**
   - 看 React、Remix 等框架的 Hook 设计
   - 理解为什么这样设计

4. **实践中学习**
   - 先写在一起，发现重复或混乱时再拆分
   - 重构是正常的，不要追求一次完美

---

**记住**：好的设计不是"最少的文件数"，而是"最清晰的职责划分"和"最低的认知负担"。

useLazyLoad 的拆分是一个经典的 **关注点分离** 案例，值得学习和借鉴！

---

**继续学习**：
- [React Hooks 官方文档](https://react.dev/reference/react)
- [Intersection Observer API](https://developer.mozilla.org/zh-CN/docs/Web/API/Intersection_Observer_API)
- [关注点分离原则](https://en.wikipedia.org/wiki/Separation_of_concerns)
- [单一职责原则](https://en.wikipedia.org/wiki/Single-responsibility_principle)
