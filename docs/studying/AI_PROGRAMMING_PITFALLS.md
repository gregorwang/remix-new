# AI 编程常见陷阱与最佳实践

> **案例驱动**：从"返回主页按钮"问题深度剖析 AI 编程的局限性
> **适用人群**：使用 AI 进行编程的非科班开发者
> **核心价值**：理解 AI 的工作方式，学会高效地与 AI 协作

---

## 📋 目录

1. [问题回顾：为什么改了几轮还是没有按钮？](#问题回顾为什么改了几轮还是没有按钮)
2. [问题的真相：返回按钮在哪里？](#问题的真相返回按钮在哪里)
3. [AI 为什么会遗漏？](#ai-为什么会遗漏)
4. [AI 编程的 5 大局限性](#ai-编程的-5-大局限性)
5. [与 AI 协作的 10 条黄金法则](#与-ai-协作的-10-条黄金法则)
6. [实战案例分析](#实战案例分析)
7. [总结与行动清单](#总结与行动清单)

---

## 问题回顾：为什么改了几轮还是没有按钮？

### 用户的困惑

> "我让 Claude Code 和 GPT-5 改了几轮 game 这个子页面，还是没有返回主页的按钮，我没看见。"

这是一个非常典型的 **AI 编程陷阱**。看似简单的需求，却经历了多轮迭代仍未解决。问题出在哪里？

### 典型对话场景（假设）

**用户**："帮我在 game 页面添加一个返回主页的按钮。"

**AI**："好的，我已经在 `app/routes/game._index.tsx` 的第 42 行添加了返回主页的按钮。"

**用户**："我没看到按钮，再检查一下。"

**AI**："我再确认一下，按钮确实在 `game._index.tsx` 的 `<Link to="/">返回主页</Link>` 这里。"

**用户**："还是没有！"（继续循环...）

### 问题的根源

用户和 AI **看到的不是同一个页面**！

---

## 问题的真相：返回按钮在哪里？

### 当前项目的 Game 路由结构

本项目使用了 **Remix 嵌套路由**，有三个不同的 game 相关文件：

```
app/routes/
├── game.tsx                    # 布局文件（旧版，已弃用）
├── game._index.tsx             # /game 索引页面（平台选择页）
└── game.$platform.tsx          # /game/playstation 等具体平台页面
```

### 实际的返回按钮分布

| 文件 | 路由路径 | 返回按钮情况 | 代码位置 |
|------|----------|-------------|----------|
| `game.tsx` | 无（布局） | ✅ 有"返回首页" | line 228-234 |
| `game._index.tsx` | `/game` | ✅ 有"返回主页" | line 42-57 |
| `game.$platform.tsx` | `/game/playstation`<br>`/game/switch`<br>`/game/pc` | ❌ **只有"返回平台选择"** | line 135-146 |

### 关键发现

用户实际访问的路径：
```
用户点击 → /game → 选择 PlayStation → /game/playstation
                                          ↑
                                    这个页面没有"返回首页"按钮！
```

**`game.$platform.tsx` 只有这个按钮**（line 135-146）：
```tsx
<Link to="/game" className="...">
  返回平台选择
</Link>
```

用户需要**点击两次**才能回到首页：
1. `/game/playstation` → 点击"返回平台选择" → `/game`
2. `/game` → 点击"返回主页" → `/`

---

## AI 为什么会遗漏？

### 1. 路由理解偏差

**AI 的思维方式**：
- 用户说"game 页面"→ AI 理解为 `game._index.tsx`（索引页）
- 在索引页添加按钮 ✅
- 任务完成 ✅

**用户的实际情况**：
- 访问的是 `/game/playstation`（具体平台页）
- 对应文件是 `game.$platform.tsx`
- 这个文件没有被修改 ❌

### 2. 缺乏视觉反馈

**AI 无法看到**：
- 浏览器中实际显示的页面
- 用户点击的按钮
- 用户当前所在的 URL

**AI 只能依赖**：
- 代码文件内容
- 文件名推测
- 用户的文字描述

### 3. 沟通不够具体

**模糊的描述**：
- ❌ "game 页面"（有多个 game 相关页面）
- ❌ "没看到按钮"（是哪个页面？浏览器控制台有错误吗？）

**具体的描述**：
- ✅ "访问 `/game/playstation` 时没有返回首页的按钮"
- ✅ "在 `game.$platform.tsx` 文件中添加返回首页按钮"
- ✅ "我附上了截图，这是我看到的页面"

### 4. 验证缺失

**AI 的假设**：
- 添加了代码 → 代码会生效 → 用户能看到

**实际情况**：
- 添加了代码 → 代码在**另一个文件**里 → 用户看不到
- 或者：添加了代码 → **CSS 隐藏了** → 用户看不到
- 或者：添加了代码 → **缓存问题** → 用户看不到

---

## AI 编程的 5 大局限性

### 局限性 1：无法看到真实的浏览器页面

**AI 的"视力"**：
```
AI 看到的：
├── game.tsx (文件内容)
├── game._index.tsx (文件内容)
└── game.$platform.tsx (文件内容)

AI 看不到的：
├── 浏览器中实际渲染的 HTML
├── CSS 样式的实际效果
├── JavaScript 运行时错误
└── 用户的鼠标点击路径
```

**现实案例**：
- 按钮代码存在，但被 `display: none` 隐藏
- 按钮在页面外（`position: absolute; top: -9999px`）
- 按钮颜色和背景色一样（白色按钮 + 白色背景）

### 局限性 2：缺乏上下文感知

**AI 不知道**：
- 用户刚才点击了什么链接
- 用户现在在哪个页面
- 用户的浏览历史

**示例对话**：
```
用户："这个页面没有登录按钮。"
AI：  "哪个页面？"（AI 不知道用户在看哪个页面）

用户："就是这个页面啊！"
AI：  "......"（AI 还是不知道）
```

### 局限性 3：依赖文本描述的模糊性

**同一个描述，不同的理解**：

用户说："给 game 页面加个返回按钮。"

**AI 的 5 种理解**：
1. 在 `game.tsx` 布局文件中添加（影响所有子页面）
2. 在 `game._index.tsx` 中添加（只影响 `/game`）
3. 在 `game.$platform.tsx` 中添加（影响所有平台页）
4. 在 `GamePageClient.client.tsx` 组件中添加（客户端组件）
5. 在 `game.css` 中显示已有的隐藏按钮（CSS 修改）

### 局限性 4：文件系统的复杂性

**Remix 的路由规则**：
```
文件名                    →  路由路径
game._index.tsx          →  /game
game.$platform.tsx       →  /game/:platform（动态路由）
game.playstation.tsx     →  /game/playstation（静态路由）
_game.old.tsx            →  不会生成路由（下划线开头）
```

**AI 可能混淆**：
- `game.tsx` 是布局还是页面？
- `game._index.tsx` 和 `game.tsx` 有什么区别？
- `$platform` 是什么意思？

### 局限性 5：无法进行端到端测试

**AI 不能做的事**：
- ❌ 打开浏览器访问 `http://localhost:3000/game/playstation`
- ❌ 点击"PlayStation"卡片
- ❌ 查看页面上有哪些按钮
- ❌ 点击按钮验证功能
- ❌ 检查浏览器控制台的错误

**开发者可以做的**：
- ✅ 访问页面
- ✅ 点击测试
- ✅ 查看控制台
- ✅ 使用开发者工具检查元素
- ✅ 截图给 AI 看

---

## 与 AI 协作的 10 条黄金法则

### 法则 1：提供具体的 URL 路径

**❌ 错误示例**：
```
"game 页面没有返回按钮。"
```

**✅ 正确示例**：
```
"访问 http://localhost:3000/game/playstation 时，
页面上没有返回首页的按钮。"
```

**为什么**：AI 能准确定位到 `game.$platform.tsx` 文件。

---

### 法则 2：截图胜过千言万语

**❌ 错误示例**：
```
"按钮样式不对。"
```

**✅ 正确示例**：
```
"我附上了截图，按钮应该是蓝色的，但现在显示为灰色。
[screenshot.png]"
```

**工具推荐**：
- macOS：`Cmd + Shift + 4` 截图
- Windows：`Win + Shift + S` 截图
- Chrome DevTools：右键 → 检查元素 → 截图

---

### 法则 3：指明具体的文件位置

**❌ 错误示例**：
```
"在游戏页面添加一个搜索框。"
```

**✅ 正确示例**：
```
"在 app/routes/game.$platform.tsx 文件中，
在第 148 行附近（<GamePageClient> 组件上方）
添加一个搜索框。"
```

**如何找到文件位置**：
```bash
# 使用 grep 搜索关键词
grep -r "返回平台选择" app/

# 输出：
# app/routes/game.$platform.tsx:144:          <span>返回平台选择</span>
```

---

### 法则 4：要求 AI 先分析，再动手

**❌ 错误示例**：
```
"帮我添加一个深色模式切换按钮。"
（AI 直接开始写代码）
```

**✅ 正确示例**：
```
"我想添加一个深色模式切换按钮。
在你动手之前，请先：
1. 列出所有需要修改的文件
2. 说明修改的具体位置（行号）
3. 解释为什么要在这些地方修改"
```

**AI 的回复**：
```
好的，我需要修改以下文件：

1. app/root.tsx (line 45)
   - 原因：在根组件添加深色模式的 Context Provider

2. app/components/ThemeToggle.tsx (新建文件)
   - 原因：创建切换按钮组件

3. tailwind.config.ts (line 12)
   - 原因：配置 dark mode: 'class'

请确认后我再开始修改。
```

---

### 法则 5：使用浏览器开发者工具

**检查元素**：
```
右键点击页面 → 检查（Inspect）

Elements 标签：
- 查看实际渲染的 HTML
- 检查 CSS 样式
- 查看元素的位置、大小

Console 标签：
- 查看 JavaScript 错误
- 查看 console.log 输出
```

**常见问题排查**：
```
问题：按钮没显示

排查步骤：
1. 打开 Elements 标签
2. 搜索按钮的文本（Cmd+F）
3. 如果找到了：
   - 检查是否有 display: none
   - 检查是否在可视区域外
   - 检查透明度（opacity: 0）
4. 如果找不到：
   - 检查 Console 是否有 JavaScript 错误
   - 代码可能没有被执行
```

---

### 法则 6：提供完整的错误信息

**❌ 错误示例**：
```
"报错了。"
```

**✅ 正确示例**：
```markdown
执行 `npm run dev` 后报错：

```
Error: Cannot find module '~/lib/data/gameData'
  at app/routes/game.$platform.tsx:19:34
```

完整的终端输出：
[粘贴完整的错误堆栈]
```

**错误信息的价值**：
- 文件路径：`app/routes/game.$platform.tsx:19:34`
- 错误类型：`Cannot find module`
- 错误原因：找不到模块

---

### 法则 7：一次只改一个地方

**❌ 错误示例**：
```
"帮我同时：
1. 添加返回按钮
2. 修改页面布局
3. 更换背景颜色
4. 优化加载速度
5. 修复那个 bug"
```

**问题**：出错后无法定位是哪个修改导致的。

**✅ 正确示例**：
```
"先帮我添加返回按钮，其他的等这个完成后再说。"
```

**工作流**：
```
1. 添加返回按钮 → 测试 ✅ → Git commit
2. 修改页面布局 → 测试 ✅ → Git commit
3. 更换背景颜色 → 测试 ✅ → Git commit
...

如果出错了，可以轻松回滚：
git reset --hard HEAD~1
```

---

### 法则 8：描述期望的行为，而非实现方式

**❌ 错误示例**：
```
"在第 148 行添加一个 <Link> 组件，
href 设置为 '/'，
className 是 'btn btn-primary'。"
```

**问题**：
- 你已经知道怎么做了，为什么还要 AI？
- AI 只是充当"代码打字机"
- 可能遗漏了更好的实现方式

**✅ 正确示例**：
```
"在 /game/playstation 页面的左上角，
添加一个返回首页的按钮。
按钮样式要和现有的设计系统保持一致。"
```

**AI 的价值**：
- 自动选择合适的组件（Link vs button）
- 自动使用项目的设计规范
- 自动处理响应式布局
- 自动添加无障碍属性（a11y）

---

### 法则 9：验证修改是否生效

**修改代码后的检查清单**：

```markdown
✅ 1. 代码是否保存？
   - VSCode 左上角是否有白色圆点（未保存）

✅ 2. 开发服务器是否重新编译？
   - 终端是否显示 "Rebuilt in XXms"

✅ 3. 浏览器是否刷新？
   - 按 Cmd+R / Ctrl+R 硬刷新
   - 或 Cmd+Shift+R / Ctrl+Shift+R 清除缓存刷新

✅ 4. 访问的 URL 是否正确？
   - 检查地址栏：localhost:3000/game/playstation

✅ 5. 浏览器控制台是否有错误？
   - 打开 Console 标签查看

✅ 6. 元素是否真的存在？
   - 右键 → 检查 → 搜索按钮文本
```

---

### 法则 10：建立反馈循环

**单向沟通**（效率低）：
```
用户："添加返回按钮。"
AI：  （添加代码）
用户："没看到。"
AI：  （再次添加代码）
用户："还是没看到。"
...
```

**双向沟通**（效率高）：
```
用户："添加返回按钮到 /game/playstation 页面。"

AI："好的，我计划在 app/routes/game.$platform.tsx
     的第 135 行附近添加按钮。

     请问：
     1. 按钮应该放在左上角还是右上角？
     2. 文案是'返回首页'还是'← 首页'？
     3. 样式要和现有的'返回平台选择'按钮一致吗？"

用户："左上角，文案'← 返回首页'，样式保持一致。"

AI：  （精确修改）

用户："完美！我看到了。"
```

**关键区别**：
- AI 主动询问细节
- 用户提供明确指示
- 减少来回修改的次数

---

## 实战案例分析

### 案例 1：返回按钮问题（本文主题）

**问题场景**：
```
用户："game 页面没有返回主页的按钮。"
```

**AI 的错误处理**：
```typescript
// AI 在 game._index.tsx 添加了按钮
<Link to="/">返回主页</Link>  // ← 用户访问的不是这个页面！
```

**正确的处理流程**：

**步骤 1：AI 主动询问**
```
AI："请问你访问的是哪个具体页面？
     - /game（平台选择页）
     - /game/playstation（PlayStation 游戏列表）
     - /game/switch（Switch 游戏列表）
     - /game/pc（PC 游戏列表）"
```

**步骤 2：用户明确指出**
```
用户："我访问的是 /game/playstation。"
```

**步骤 3：AI 定位文件**
```
AI："这对应的是 app/routes/game.$platform.tsx 文件。
     我看到第 135 行有一个'返回平台选择'的按钮，
     我计划在它旁边添加一个'返回首页'按钮。"
```

**步骤 4：AI 展示代码**
```tsx
// 修改前（line 135-146）
<Link to="/game" className="...">
  返回平台选择
</Link>

// 修改后
<div className="flex gap-2">
  <Link to="/" className="...">
    返回首页
  </Link>
  <Link to="/game" className="...">
    返回平台选择
  </Link>
</div>
```

**步骤 5：用户验证**
```
用户："完美！现在能看到两个按钮了。"
```

---

### 案例 2：样式不生效

**问题场景**：
```
用户："按钮的背景色改成蓝色，但是没变。"
```

**可能的原因（5 个）**：

**原因 1：CSS 特异性（Specificity）不够**
```css
/* 你的 CSS（优先级低）*/
.button {
  background-color: blue;
}

/* Tailwind 的 CSS（优先级高）*/
.bg-red-500 {
  background-color: rgb(239, 68, 68) !important;
}
```

**解决**：使用 Tailwind 的 class 或增加特异性
```tsx
// 方法 1：使用 Tailwind
<button className="bg-blue-500">按钮</button>

// 方法 2：增加特异性
<button className="my-button" style={{ backgroundColor: 'blue' }}>
  按钮
</button>
```

**原因 2：CSS 文件没有导入**
```tsx
// ❌ 错误：忘记导入 CSS
export default function MyComponent() {
  return <button className="my-button">按钮</button>
}

// ✅ 正确：导入 CSS
import styles from './styles.css?url';
export const links = () => [{ rel: 'stylesheet', href: styles }];
```

**原因 3：浏览器缓存**
```
问题：修改了 CSS，但浏览器显示的还是旧样式。

解决：
1. 硬刷新：Cmd+Shift+R（Mac）/ Ctrl+Shift+R（Windows）
2. 清除缓存：开发者工具 → Network → Disable cache
3. 重启开发服务器
```

**原因 4：条件渲染**
```tsx
// 你以为会渲染蓝色按钮
<button className={isActive ? 'bg-blue-500' : 'bg-gray-500'}>
  按钮
</button>

// 实际上 isActive = false
// 所以渲染的是灰色按钮
```

**原因 5：样式被覆盖**
```tsx
// 第一个 className 被第二个覆盖了
<button className="bg-blue-500" className="bg-red-500">
  按钮
</button>

// 正确写法
<button className="bg-blue-500 hover:bg-blue-600">
  按钮
</button>
```

**排查步骤**：
```
1. 打开浏览器开发者工具
2. 右键点击按钮 → 检查
3. 查看 Styles 面板：
   - 是否有 background-color 属性？
   - 是否被划掉了（表示被覆盖）？
   - 优先级是多少？
4. 查看 Computed 面板：
   - 最终计算出的颜色是什么？
```

---

### 案例 3：路由不工作

**问题场景**：
```
用户："点击链接后页面没有跳转。"
```

**可能的原因**：

**原因 1：使用了 `<a>` 而不是 `<Link>`**
```tsx
// ❌ 错误：会导致整页刷新
<a href="/game">游戏页面</a>

// ✅ 正确：SPA 导航，不刷新页面
import { Link } from "@remix-run/react";
<Link to="/game">游戏页面</Link>
```

**原因 2：路径写错了**
```tsx
// ❌ 错误：多了斜杠
<Link to="//game">游戏页面</Link>

// ❌ 错误：缺少斜杠
<Link to="game">游戏页面</Link>  // 相对路径

// ✅ 正确
<Link to="/game">游戏页面</Link>
```

**原因 3：阻止了默认事件**
```tsx
// ❌ 错误：阻止了链接跳转
<Link
  to="/game"
  onClick={(e) => {
    e.preventDefault();  // ← 这里阻止了跳转！
    console.log('clicked');
  }}
>
  游戏页面
</Link>

// ✅ 正确：不阻止默认行为
<Link
  to="/game"
  onClick={() => {
    console.log('clicked');
    // 不调用 e.preventDefault()
  }}
>
  游戏页面
</Link>
```

**原因 4：路由文件不存在**
```
用户点击：/game/xbox
对应文件：app/routes/game.xbox.tsx（不存在！）

解决：
1. 创建 app/routes/game.xbox.tsx
2. 或使用动态路由 app/routes/game.$platform.tsx
```

---

## 总结与行动清单

### 核心要点

1. **AI 不是魔法师**：AI 看不到你的屏幕，不知道你在哪个页面。
2. **沟通的精确性决定结果**：模糊的描述导致模糊的结果。
3. **验证是关键**：改完代码一定要测试，不要假设它会工作。
4. **截图胜过千言万语**：一张图能解决 90% 的沟通问题。

### 问题解决框架

```
遇到问题时，按照这个顺序排查：

1. 确认问题
   ├─ 我在哪个页面？（URL）
   ├─ 我看到了什么？（截图）
   └─ 我期望看到什么？（具体描述）

2. 提供上下文
   ├─ 我刚才做了什么操作？
   ├─ 浏览器控制台有错误吗？
   └─ 这个问题能复现吗？

3. 与 AI 沟通
   ├─ 提供具体的 URL 路径
   ├─ 提供截图
   ├─ 提供错误信息
   └─ 要求 AI 先分析再动手

4. 验证修改
   ├─ 刷新页面
   ├─ 检查元素
   ├─ 查看控制台
   └─ 测试功能

5. 如果还是不行
   ├─ 提供更多信息
   ├─ 尝试不同的描述方式
   └─ 必要时求助社区
```

### 立即行动清单

**今天就可以做的事**：

- [ ] **学会使用浏览器开发者工具**
  - 右键 → 检查（Inspect）
  - 熟悉 Elements、Console、Network 标签

- [ ] **学会截图**
  - macOS：`Cmd + Shift + 4`
  - Windows：`Win + Shift + S`

- [ ] **学会查看当前 URL**
  - 复制地址栏的完整路径
  - 在描述问题时提供

- [ ] **学会查看错误信息**
  - 打开终端查看编译错误
  - 打开浏览器控制台查看运行时错误
  - 复制完整的错误堆栈

**本周要养成的习惯**：

- [ ] **每次改代码后都要验证**
  - 刷新浏览器
  - 检查功能是否正常
  - 查看控制台是否有错误

- [ ] **提问前先检查**
  - 我在哪个页面？
  - 我期望看到什么？
  - 实际看到了什么？
  - 有错误信息吗？

- [ ] **使用 Git 频繁提交**
  - 每完成一个小功能就提交
  - 出错时可以轻松回滚
  - 提交信息写清楚改了什么

**长期培养的技能**：

- [ ] **学习 Remix 路由规则**
  - 理解嵌套路由
  - 理解动态路由（`$param`）
  - 理解索引路由（`_index`）

- [ ] **学习基础的 CSS 调试**
  - 理解 CSS 特异性（Specificity）
  - 学会使用 Styles 面板
  - 学会使用 Computed 面板

- [ ] **学习阅读错误信息**
  - 识别错误类型（语法错误、运行时错误、逻辑错误）
  - 定位错误位置（文件路径 + 行号）
  - 理解错误原因

---

## 附录：常用工具和命令

### 浏览器开发者工具快捷键

| 功能 | macOS | Windows/Linux |
|------|-------|---------------|
| 打开开发者工具 | `Cmd + Option + I` | `Ctrl + Shift + I` / `F12` |
| 检查元素 | `Cmd + Option + C` | `Ctrl + Shift + C` |
| 刷新页面 | `Cmd + R` | `Ctrl + R` / `F5` |
| 硬刷新（清除缓存） | `Cmd + Shift + R` | `Ctrl + Shift + R` / `Ctrl + F5` |
| 打开控制台 | `Cmd + Option + J` | `Ctrl + Shift + J` |

### 常用 Git 命令

```bash
# 查看当前状态
git status

# 查看修改了什么
git diff

# 添加所有修改
git add -A

# 提交修改
git commit -m "添加返回按钮到 game 平台页面"

# 撤销上一次提交（保留修改）
git reset --soft HEAD~1

# 撤销上一次提交（丢弃修改）
git reset --hard HEAD~1

# 查看提交历史
git log --oneline

# 查看某个文件的修改历史
git log --follow -p -- app/routes/game.tsx
```

### 常用搜索命令

```bash
# 在所有文件中搜索文本
grep -r "返回主页" app/

# 在特定类型文件中搜索
grep -r "返回主页" --include="*.tsx" app/

# 搜索并显示行号
grep -rn "返回主页" app/

# 忽略大小写
grep -ri "返回主页" app/

# 搜索文件名
find app/ -name "*game*"

# 搜索 TypeScript 文件
find app/ -name "*.tsx"
```

### Remix 路由规则速查

| 文件名 | 路由路径 | 说明 |
|--------|----------|------|
| `index.tsx` | `/` | 根路径 |
| `about.tsx` | `/about` | 静态路径 |
| `blog._index.tsx` | `/blog` | 博客索引页 |
| `blog.$slug.tsx` | `/blog/hello-world` | 动态路由 |
| `blog.$slug.edit.tsx` | `/blog/hello-world/edit` | 嵌套动态路由 |
| `_app.tsx` | 不生成路由 | 布局组件 |
| `_app.dashboard.tsx` | `/dashboard` | 使用 _app 布局 |

---

**文档版本**：v1.0
**更新日期**：2025-11-20
**作者**：Claude (AI Assistant)
**适用场景**：AI 辅助编程、Web 开发调试、问题排查
