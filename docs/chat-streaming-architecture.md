# 聊天流式传输完整教学文档

## 目录
1. [流式传输核心概念](#1-流式传输核心概念)
2. [本地数据流式传输实现](#2-本地数据流式传输实现)
3. [HTTP流式传输实现](#3-http流式传输实现)
4. [架构演进路径](#4-架构演进路径)
5. [完整代码示例](#5-完整代码示例)
6. [最佳实践与注意事项](#6-最佳实践与注意事项)

---

## 1. 流式传输核心概念

### 1.1 什么是流式传输？

**流式传输（Streaming）** 是指数据以连续的小块（chunks）形式逐步传输，而不是一次性传输全部数据。

#### 传统方式 vs 流式传输

```
传统方式：
用户 ──发送请求──> 服务器
     <─等待2秒─
     <─完整响应─ "你好，这是一个完整的回答"

流式传输：
用户 ──发送请求──> 服务器
     <─200ms─ "你"
     <─200ms─ "好"
     <─200ms─ "，"
     <─200ms─ "这"
     <─200ms─ "是"
     <─200ms─ "一"
     <─200ms─ "个"
     <─200ms─ "完"
     <─200ms─ "整"
     <─200ms─ "的"
     <─200ms─ "回"
     <─200ms─ "答"
```

### 1.2 问题1：流式传输必须HTTP请求吗？

**答案：不是！**

流式传输是一个**概念**，不是一个特定的技术。它可以通过多种方式实现：

| 实现方式 | 是否需要网络 | 适用场景 | 复杂度 |
|---------|------------|---------|--------|
| **本地定时器模拟** | ❌ 不需要 | 开发调试、Demo演示 | ⭐ 简单 |
| **Web Workers** | ❌ 不需要 | 大数据处理、避免UI阻塞 | ⭐⭐ 中等 |
| **HTTP SSE** | ✅ 需要 | 服务器推送、实时通知 | ⭐⭐⭐ 较复杂 |
| **HTTP Fetch Stream** | ✅ 需要 | API调用、文件下载 | ⭐⭐⭐ 较复杂 |
| **WebSocket** | ✅ 需要 | 双向通信、游戏、聊天 | ⭐⭐⭐⭐ 复杂 |

**关键理解：**
- 流式传输是**效果**，不是**实现方式**
- 本地可以用定时器、生成器函数等模拟
- HTTP只是实现流式传输的一种**传输通道**

---

## 2. 本地数据流式传输实现

### 2.1 问题2：本地数据能实现流式传输吗？

**答案：完全可以！**

本地流式传输的核心思想：
1. 把完整数据分成小块
2. 用定时器逐步释放数据
3. 每次释放时更新UI状态

### 2.2 实现方式1：定时器 + 字符串切片

#### 基础版本（按字符流式）

```typescript
// 本地流式传输 - 基础版
async function streamLocalMessage(
  fullMessage: string,
  onChunk: (chunk: string) => void,
  onComplete: () => void
) {
  const charsPerChunk = 1; // 每次显示1个字符
  const delayMs = 50; // 每50ms显示一个字符

  for (let i = 0; i < fullMessage.length; i += charsPerChunk) {
    const chunk = fullMessage.slice(i, i + charsPerChunk);
    onChunk(chunk);

    // 等待指定时间
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  onComplete();
}

// 使用示例
const message = "你好，这是流式传输的回答！";
let displayedText = "";

streamLocalMessage(
  message,
  (chunk) => {
    displayedText += chunk;
    console.log(displayedText); // 实时更新显示
  },
  () => {
    console.log("流式传输完成！");
  }
);
```

**输出过程：**
```
你
你好
你好，
你好，这
你好，这是
你好，这是流
你好，这是流式
你好，这是流式传
你好，这是流式传输
你好，这是流式传输的
你好，这是流式传输的回
你好，这是流式传输的回答
你好，这是流式传输的回答！
流式传输完成！
```

#### 进阶版本（按词流式 + 变速）

```typescript
// 本地流式传输 - 进阶版
interface StreamConfig {
  type: 'char' | 'word' | 'sentence'; // 按字符、词、句子
  baseDelay: number; // 基础延迟
  randomDelay?: number; // 随机延迟（模拟真实打字）
  punctuationDelay?: number; // 标点符号后的额外延迟
}

async function advancedStreamLocal(
  fullMessage: string,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  config: StreamConfig = { type: 'char', baseDelay: 50 }
) {
  let chunks: string[] = [];

  // 根据类型分割内容
  switch (config.type) {
    case 'char':
      chunks = fullMessage.split('');
      break;
    case 'word':
      // 按空格和标点分词
      chunks = fullMessage.match(/[\u4e00-\u9fa5]+|[a-zA-Z]+|\s+|[^\u4e00-\u9fa5a-zA-Z\s]/g) || [];
      break;
    case 'sentence':
      chunks = fullMessage.split(/([。！？.!?])/);
      break;
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    onChunk(chunk);

    // 计算延迟
    let delay = config.baseDelay;

    // 添加随机延迟（模拟真实打字）
    if (config.randomDelay) {
      delay += Math.random() * config.randomDelay;
    }

    // 标点符号后停顿更久
    if (config.punctuationDelay && /[。！？，,、.!?]/.test(chunk)) {
      delay += config.punctuationDelay;
    }

    await new Promise(resolve => setTimeout(resolve, delay));
  }

  onComplete();
}

// 使用示例1：按字符流式（慢速）
advancedStreamLocal(
  "你好！我是AI助手。",
  (chunk) => console.log(chunk),
  () => console.log("✓ 完成"),
  { type: 'char', baseDelay: 100, randomDelay: 50, punctuationDelay: 300 }
);

// 使用示例2：按词流式（快速）
advancedStreamLocal(
  "Hello world! This is streaming.",
  (chunk) => console.log(chunk),
  () => console.log("✓ Done"),
  { type: 'word', baseDelay: 100 }
);
```

### 2.3 实现方式2：Generator函数（优雅方案）

```typescript
// 使用Generator实现流式传输
function* messageStreamGenerator(message: string, chunkSize: number = 1) {
  for (let i = 0; i < message.length; i += chunkSize) {
    yield message.slice(i, i + chunkSize);
  }
}

// 异步流式播放器
async function playStream(
  generator: Generator<string>,
  onChunk: (chunk: string) => void,
  delayMs: number = 50
) {
  for (const chunk of generator) {
    onChunk(chunk);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}

// 使用示例
const stream = messageStreamGenerator("流式传输测试", 1);
playStream(stream, chunk => console.log(chunk), 100);
```

**为什么Generator更优雅？**
1. **关注点分离**：数据生成和播放逻辑分离
2. **可暂停/恢复**：支持暂停、继续功能
3. **内存高效**：按需生成，不需要一次性加载所有数据
4. **可组合**：可以组合多个Generator

### 2.4 实现方式3：Observable模式（RxJS风格）

```typescript
// 简化版Observable实现
class MessageStream {
  private listeners: Array<(chunk: string) => void> = [];

  subscribe(callback: (chunk: string) => void) {
    this.listeners.push(callback);
  }

  async emit(message: string, delayMs: number = 50) {
    for (const char of message) {
      this.listeners.forEach(listener => listener(char));
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

// 使用示例
const stream = new MessageStream();

stream.subscribe(chunk => {
  console.log("监听器1:", chunk);
});

stream.subscribe(chunk => {
  console.log("监听器2:", chunk);
});

stream.emit("Observable流式", 100);
```

---

## 3. HTTP流式传输实现

### 3.1 问题3：如何为真实API做准备？

为真实API做准备需要考虑：
1. **抽象接口**：统一的消息发送接口
2. **策略模式**：可切换的实现（本地/远程）
3. **错误处理**：网络错误、超时处理
4. **状态管理**：加载、错误、成功状态

### 3.2 技术选型：SSE vs Fetch Stream vs WebSocket

#### 方案对比

| 特性 | Server-Sent Events | Fetch + ReadableStream | WebSocket |
|-----|-------------------|----------------------|-----------|
| **方向** | 单向（服务器→客户端） | 单向（服务器→客户端） | 双向 |
| **协议** | HTTP | HTTP | WebSocket协议 |
| **兼容性** | 优秀（IE除外） | 优秀 | 优秀 |
| **自动重连** | ✅ 内置 | ❌ 需手动实现 | ❌ 需手动实现 |
| **消息ID** | ✅ 支持 | ❌ 不支持 | ❌ 不支持 |
| **复杂度** | ⭐⭐ 简单 | ⭐⭐⭐ 中等 | ⭐⭐⭐⭐ 复杂 |
| **适用场景** | 通知、日志流 | API流式响应 | 实时聊天、游戏 |

**推荐方案：**
- **OpenAI式聊天**：使用 `Fetch + ReadableStream`
- **简单通知**：使用 `SSE`
- **双向聊天**：使用 `WebSocket`

### 3.3 实现方式1：Server-Sent Events (SSE)

#### 服务端（Remix Action/Loader）

```typescript
// app/routes/api.chat-stream.ts
import type { ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  const { message } = await request.json();

  // 创建SSE流
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // 模拟AI逐字响应
      const response = "这是一个流式响应的示例";

      for (const char of response) {
        // SSE格式：data: {content}\n\n
        const data = `data: ${JSON.stringify({ content: char })}\n\n`;
        controller.enqueue(encoder.encode(data));

        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // 发送结束标记
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

#### 客户端

```typescript
// SSE客户端实现
async function sendMessageWithSSE(
  message: string,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
) {
  const eventSource = new EventSource(`/api/chat-stream?message=${encodeURIComponent(message)}`);

  eventSource.onmessage = (event) => {
    if (event.data === '[DONE]') {
      eventSource.close();
      onComplete();
      return;
    }

    try {
      const data = JSON.parse(event.data);
      onChunk(data.content);
    } catch (error) {
      console.error('解析错误:', error);
    }
  };

  eventSource.onerror = (error) => {
    eventSource.close();
    onError(new Error('SSE连接错误'));
  };
}
```

### 3.4 实现方式2：Fetch + ReadableStream（推荐）

这是OpenAI ChatGPT使用的方案，最灵活强大。

#### 服务端（Remix）

```typescript
// app/routes/api.chat.ts
import type { ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  const { message } = await request.json();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // 模拟调用AI API
      const mockAIResponse = "这是一个模拟的AI回答，会逐字显示。";

      for (let i = 0; i < mockAIResponse.length; i++) {
        const chunk = {
          type: 'content',
          content: mockAIResponse[i],
          index: i
        };

        // 发送JSON块
        controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));

        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // 发送完成标记
      controller.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/json",
      "Transfer-Encoding": "chunked",
    },
  });
}
```

#### 客户端（通用版本）

```typescript
// 使用Fetch + ReadableStream的客户端
async function sendMessageWithStream(
  message: string,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    // 读取流数据
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        onComplete();
        break;
      }

      // 解码数据
      buffer += decoder.decode(value, { stream: true });

      // 处理每一行（假设服务器发送的是换行分隔的JSON）
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留最后不完整的行

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const data = JSON.parse(line);

          if (data.type === 'content') {
            onChunk(data.content);
          } else if (data.type === 'done') {
            reader.cancel();
            onComplete();
            return;
          }
        } catch (error) {
          console.error('解析JSON错误:', error, line);
        }
      }
    }
  } catch (error) {
    onError(error as Error);
  }
}
```

#### 高级版本：支持中断和重试

```typescript
// 高级流式传输客户端
class StreamChat {
  private abortController: AbortController | null = null;

  async sendMessage(
    message: string,
    options: {
      onChunk: (chunk: string) => void;
      onComplete: () => void;
      onError: (error: Error) => void;
      maxRetries?: number;
    }
  ) {
    const { onChunk, onComplete, onError, maxRetries = 3 } = options;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        // 创建新的AbortController
        this.abortController = new AbortController();

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
          signal: this.abortController.signal, // 支持中断
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('无法获取流');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            onComplete();
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;

            const data = JSON.parse(line);
            if (data.type === 'content') {
              onChunk(data.content);
            } else if (data.type === 'done') {
              onComplete();
              return;
            }
          }
        }
      } catch (error: any) {
        // 用户主动取消，不重试
        if (error.name === 'AbortError') {
          onError(new Error('请求已取消'));
          return;
        }

        // 网络错误，重试
        retries++;
        if (retries < maxRetries) {
          console.log(`重试 ${retries}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        } else {
          onError(error);
        }
      }
    }
  }

  // 取消当前请求
  abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

// 使用示例
const chatClient = new StreamChat();

chatClient.sendMessage("你好", {
  onChunk: (chunk) => console.log(chunk),
  onComplete: () => console.log("✓ 完成"),
  onError: (error) => console.error("❌ 错误:", error),
  maxRetries: 3
});

// 5秒后取消
setTimeout(() => {
  chatClient.abort();
}, 5000);
```

---

## 4. 架构演进路径

### 4.1 第一阶段：本地Mock（当前状态）

```
┌─────────────────────────────────────┐
│          chat.tsx                   │
├─────────────────────────────────────┤
│  sendMessage() {                    │
│    await delay(1000);               │
│    setMessages([...msg, response]); │
│  }                                  │
└─────────────────────────────────────┘

优点：
✓ 简单、快速开发
✓ 无需后端
✓ 易于调试

缺点：
✗ 不够真实
✗ 无流式体验
✗ 难以扩展
```

### 4.2 第二阶段：本地流式Mock

```
┌─────────────────────────────────────┐
│          chat.tsx                   │
├─────────────────────────────────────┤
│  sendMessage() {                    │
│    for (let char of response) {     │
│      appendToMessage(char);         │
│      await delay(50);               │
│    }                                │
│  }                                  │
└─────────────────────────────────────┘

优点：
✓ 流式体验
✓ 无需后端
✓ 调试方便

缺点：
✗ 仍是假数据
✗ 未抽象接口
```

### 4.3 第三阶段：抽象层 + 策略模式

```
┌─────────────────────────────────────┐
│          chat.tsx                   │
├─────────────────────────────────────┤
│  const client = useChatClient();    │
│                                     │
│  client.sendMessage(msg, {          │
│    onChunk: appendToMessage,        │
│    onComplete: handleComplete       │
│  });                                │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│      chatClient.ts (接口层)         │
├─────────────────────────────────────┤
│  interface ChatClient {             │
│    sendMessage(msg, callbacks)      │
│  }                                  │
└─────────────────────────────────────┘
         ↙                    ↘
┌──────────────────┐  ┌──────────────────┐
│  MockChatClient  │  │  APIChatClient   │
├──────────────────┤  ├──────────────────┤
│  本地模拟        │  │  真实API调用      │
│  定时器流式      │  │  Fetch Stream    │
└──────────────────┘  └──────────────────┘

优点：
✓ 可切换实现
✓ 易于测试
✓ 渐进式迁移

缺点：
✗ 代码量增加
```

### 4.4 第四阶段：完整生产架构

```
┌────────────────────────────────────────────┐
│            UI Layer (chat.tsx)             │
├────────────────────────────────────────────┤
│  - 消息显示                                 │
│  - 用户输入                                 │
│  - 加载状态                                 │
└───────────────┬────────────────────────────┘
                ↓
┌────────────────────────────────────────────┐
│         Hook Layer (useChatStream)         │
├────────────────────────────────────────────┤
│  - 状态管理（messages, isLoading）         │
│  - 错误处理                                 │
│  - 重试逻辑                                 │
└───────────────┬────────────────────────────┘
                ↓
┌────────────────────────────────────────────┐
│      Service Layer (ChatClient)            │
├────────────────────────────────────────────┤
│  - API调用                                  │
│  - 流式解析                                 │
│  - 请求中断                                 │
└───────────────┬────────────────────────────┘
                ↓
┌────────────────────────────────────────────┐
│         API Layer (Remix Actions)          │
├────────────────────────────────────────────┤
│  - 请求验证                                 │
│  - 调用AI API                               │
│  - 流式转发                                 │
└───────────────┬────────────────────────────┘
                ↓
┌────────────────────────────────────────────┐
│       External API (OpenAI/Claude)         │
└────────────────────────────────────────────┘
```

---

## 5. 完整代码示例

### 5.1 抽象接口定义

```typescript
// app/lib/chat/types.ts

/** 聊天消息 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

/** 流式回调 */
export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
  onStart?: () => void;
}

/** 聊天客户端接口 */
export interface ChatClient {
  sendMessage(message: string, callbacks: StreamCallbacks): void;
  abort(): void;
}

/** 客户端配置 */
export interface ChatClientConfig {
  apiEndpoint?: string;
  timeout?: number;
  retries?: number;
}
```

### 5.2 本地Mock实现

```typescript
// app/lib/chat/mockClient.ts

import type { ChatClient, StreamCallbacks } from './types';

export class MockChatClient implements ChatClient {
  private abortFlag = false;

  async sendMessage(message: string, callbacks: StreamCallbacks) {
    this.abortFlag = false;
    callbacks.onStart?.();

    try {
      // 模拟响应库
      const responses = [
        "这是一个模拟的流式响应。",
        "我正在逐字显示内容。",
        "你可以看到打字机效果。",
      ];

      const response = responses[Math.floor(Math.random() * responses.length)];

      // 逐字流式发送
      for (let i = 0; i < response.length; i++) {
        if (this.abortFlag) {
          throw new Error('请求已中断');
        }

        callbacks.onChunk(response[i]);

        // 模拟延迟（30-100ms随机）
        const delay = 30 + Math.random() * 70;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      callbacks.onComplete();
    } catch (error) {
      callbacks.onError(error as Error);
    }
  }

  abort() {
    this.abortFlag = true;
  }
}
```

### 5.3 真实API实现

```typescript
// app/lib/chat/apiClient.ts

import type { ChatClient, StreamCallbacks, ChatClientConfig } from './types';

export class APIChatClient implements ChatClient {
  private abortController: AbortController | null = null;
  private config: Required<ChatClientConfig>;

  constructor(config: ChatClientConfig = {}) {
    this.config = {
      apiEndpoint: config.apiEndpoint || '/api/chat',
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
    };
  }

  async sendMessage(message: string, callbacks: StreamCallbacks) {
    callbacks.onStart?.();

    let retries = 0;

    while (retries < this.config.retries) {
      try {
        this.abortController = new AbortController();

        // 设置超时
        const timeoutId = setTimeout(() => {
          this.abortController?.abort();
        }, this.config.timeout);

        const response = await fetch(this.config.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message }),
          signal: this.abortController.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        await this.processStream(response, callbacks);
        return;
      } catch (error: any) {
        // 用户主动取消
        if (error.name === 'AbortError') {
          callbacks.onError(new Error('请求已取消'));
          return;
        }

        retries++;

        // 最后一次重试失败
        if (retries >= this.config.retries) {
          callbacks.onError(error);
          return;
        }

        // 等待后重试（指数退避）
        await new Promise(resolve =>
          setTimeout(resolve, Math.min(1000 * Math.pow(2, retries), 10000))
        );
      }
    }
  }

  private async processStream(response: Response, callbacks: StreamCallbacks) {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          callbacks.onComplete();
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // 处理换行分隔的JSON
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data = JSON.parse(line);

            if (data.type === 'content') {
              callbacks.onChunk(data.content);
            } else if (data.type === 'error') {
              throw new Error(data.message);
            } else if (data.type === 'done') {
              callbacks.onComplete();
              return;
            }
          } catch (error) {
            console.error('解析流数据错误:', error, line);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  abort() {
    this.abortController?.abort();
    this.abortController = null;
  }
}
```

### 5.4 客户端工厂

```typescript
// app/lib/chat/clientFactory.ts

import type { ChatClient, ChatClientConfig } from './types';
import { MockChatClient } from './mockClient';
import { APIChatClient } from './apiClient';

export type ClientType = 'mock' | 'api';

export class ChatClientFactory {
  static create(type: ClientType, config?: ChatClientConfig): ChatClient {
    switch (type) {
      case 'mock':
        return new MockChatClient();
      case 'api':
        return new APIChatClient(config);
      default:
        throw new Error(`未知的客户端类型: ${type}`);
    }
  }

  /** 自动选择：开发环境用Mock，生产环境用API */
  static createAuto(config?: ChatClientConfig): ChatClient {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const useMock = process.env.USE_MOCK_CHAT === 'true';

    if (isDevelopment && useMock) {
      return new MockChatClient();
    }

    return new APIChatClient(config);
  }
}
```

### 5.5 React Hook封装

```typescript
// app/hooks/useChatStream.ts

import { useState, useCallback, useRef } from 'react';
import type { ChatMessage } from '~/lib/chat/types';
import { ChatClientFactory } from '~/lib/chat/clientFactory';

export interface UseChatStreamOptions {
  clientType?: 'mock' | 'api';
  initialMessages?: ChatMessage[];
}

export function useChatStream(options: UseChatStreamOptions = {}) {
  const { clientType = 'mock', initialMessages = [] } = options;

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const clientRef = useRef(ChatClientFactory.create(clientType));
  const currentMessageRef = useRef('');

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      // 添加用户消息
      const userMessage: ChatMessage = {
        role: 'user',
        content,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, userMessage]);
      setError(null);
      setIsLoading(true);

      // 初始化流式消息
      currentMessageRef.current = '';

      clientRef.current.sendMessage(content, {
        onStart: () => {
          // 添加空的助手消息（将被流式填充）
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: '',
              timestamp: Date.now(),
            },
          ]);
        },

        onChunk: (chunk: string) => {
          currentMessageRef.current += chunk;

          // 更新最后一条消息（助手消息）
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];

            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = currentMessageRef.current;
            }

            return newMessages;
          });
        },

        onComplete: () => {
          setIsLoading(false);
          currentMessageRef.current = '';
        },

        onError: (err: Error) => {
          setError(err);
          setIsLoading(false);
          currentMessageRef.current = '';

          // 移除未完成的助手消息
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.role === 'assistant' && !lastMessage.content) {
              return prev.slice(0, -1);
            }
            return prev;
          });
        },
      });
    },
    [isLoading]
  );

  const abort = useCallback(() => {
    clientRef.current.abort();
    setIsLoading(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    abort,
    clearMessages,
  };
}
```

### 5.6 更新chat.tsx使用新架构

```typescript
// app/routes/chat.tsx（重构版本）

import { useState, useRef, useEffect } from "react";
import type { LinksFunction, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { useChatStream } from "~/hooks/useChatStream";
import { pageMeta } from "~/utils/seo";

// ... (loader和meta保持不变) ...

export default function ChatPage() {
  const { content } = useLoaderData<typeof loader>();

  // 使用新的Hook（开发环境自动使用Mock）
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    abort,
  } = useChatStream({
    clientType: 'mock', // 或 'api'
    initialMessages: [
      { role: 'assistant', content: content.initial_message }
    ],
  });

  const [inputMessage, setInputMessage] = useState('');
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 滚动到底部
  const scrollToBottom = () => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  };

  // 自动调整文本区域高度
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  };

  // 处理发送
  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading) return;

    await sendMessage(inputMessage);
    setInputMessage('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // 处理回车键
  const handleEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 预设问题
  const handlePresetQuestion = (question: string) => {
    setInputMessage(question);
    adjustTextareaHeight();
    setTimeout(() => {
      sendMessage(question);
      setInputMessage('');
    }, 100);
  };

  // 监听消息变化，自动滚动
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 监听输入变化，调整高度
  useEffect(() => {
    adjustTextareaHeight();
  }, [inputMessage]);

  return (
    <div className="min-h-screen bg-primary-50">
      <div className="flex flex-col min-h-screen font-sans">
        {/* ... 顶部导航栏保持不变 ... */}

        {/* 主体区域 */}
        <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 py-6">
          {/* 欢迎信息（保持不变） */}

          {/* 聊天记录区域 */}
          <div
            ref={chatWindowRef}
            className="flex-1 overflow-y-auto space-y-6 mb-6 chat-scrollbar"
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex flex-col ${
                  message.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div className="mb-1 px-2 text-sm text-primary-950/70">
                  {message.role === 'user'
                    ? content.user_label
                    : content.assistant_label}
                </div>

                <div
                  className={`max-w-[90%] rounded-2xl p-4 transition-all duration-300 ${
                    message.role === 'user'
                      ? 'bg-accent text-white'
                      : 'bg-primary-100 text-primary-950'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-base leading-relaxed">
                    {message.content}
                    {/* 流式输入中的光标效果 */}
                    {message.role === 'assistant' &&
                      index === messages.length - 1 &&
                      isLoading && (
                        <span className="inline-block w-2 h-4 ml-1 bg-primary-950 animate-pulse" />
                      )}
                  </p>
                </div>
              </div>
            ))}

            {/* 错误提示 */}
            {error && (
              <div className="flex justify-center">
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
                  ❌ {error.message}
                  <button
                    onClick={() => window.location.reload()}
                    className="ml-2 underline"
                  >
                    刷新重试
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 输入区域 */}
          <div className="border border-primary-100 rounded-xl bg-primary-100 shadow-sm">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyDown={handleEnter}
                placeholder={content.placeholder}
                disabled={isLoading}
                className="w-full p-4 pr-24 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-accent min-h-[60px] max-h-[200px] bg-primary-100 text-primary-950 placeholder:text-primary-950/50 disabled:opacity-50"
                rows={1}
              />
              <div className="absolute right-3 bottom-3 flex gap-2">
                {isLoading ? (
                  <button
                    onClick={abort}
                    className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 transition-colors text-sm"
                  >
                    ⏹ 停止
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    className="bg-accent text-white p-2 rounded hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!inputMessage.trim()}
                  >
                    <span className="text-lg">✈️</span>
                  </button>
                )}
              </div>
            </div>
            <div className="px-4 py-2 text-xs text-primary-950/70 border-t border-primary-100 flex justify-between">
              <span>{content.enter_to_send}</span>
              <span>{content.shift_enter_newline}</span>
            </div>
          </div>

          {/* 底部提示和返回链接（保持不变） */}
        </div>
      </div>
    </div>
  );
}
```

### 5.7 Remix API实现（服务端）

```typescript
// app/routes/api.chat.ts

import type { ActionFunctionArgs } from "@remix-run/node";

// 模拟调用OpenAI API
async function* streamAIResponse(userMessage: string) {
  // 这里可以调用真实的AI API（OpenAI、Claude等）
  // 现在用模拟数据
  const responses = [
    "这是一个真实的流式API响应。",
    "我正在模拟OpenAI的流式输出。",
    "每个字符都是实时发送的。",
  ];

  const response = responses[Math.floor(Math.random() * responses.length)];

  for (const char of response) {
    yield char;
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 50));
  }
}

export async function action({ request }: ActionFunctionArgs) {
  // 解析请求
  const { message } = await request.json();

  if (!message || typeof message !== 'string') {
    return new Response(
      JSON.stringify({ type: 'error', message: '无效的消息' }),
      { status: 400 }
    );
  }

  // 创建流式响应
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        // 逐字流式发送
        for await (const char of streamAIResponse(message)) {
          const chunk = JSON.stringify({
            type: 'content',
            content: char,
            timestamp: Date.now(),
          });

          controller.enqueue(encoder.encode(chunk + '\n'));
        }

        // 发送完成标记
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: 'done' }) + '\n')
        );
      } catch (error) {
        // 发送错误
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: 'error',
              message: error instanceof Error ? error.message : '未知错误',
            }) + '\n'
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### 5.8 环境变量配置

```bash
# .env

# 是否使用Mock客户端（开发环境推荐）
USE_MOCK_CHAT=true

# API端点
CHAT_API_ENDPOINT=/api/chat

# OpenAI配置（生产环境）
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4

# Claude配置（可选）
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 6. 最佳实践与注意事项

### 6.1 性能优化

#### 1. 节流更新（避免频繁渲染）

```typescript
// 使用节流避免每个字符都触发渲染
import { useState, useRef } from 'react';

function useThrottledUpdate(delayMs: number = 50) {
  const [value, setValue] = useState('');
  const bufferRef = useRef('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const update = (newValue: string) => {
    bufferRef.current = newValue;

    if (!timerRef.current) {
      timerRef.current = setTimeout(() => {
        setValue(bufferRef.current);
        timerRef.current = null;
      }, delayMs);
    }
  };

  return [value, update] as const;
}

// 使用
const [displayedContent, updateContent] = useThrottledUpdate(50);

streamClient.sendMessage(msg, {
  onChunk: (chunk) => {
    currentContent += chunk;
    updateContent(currentContent); // 节流更新
  }
});
```

#### 2. 虚拟滚动（消息过多时）

```typescript
// 使用react-window优化长列表
import { FixedSizeList } from 'react-window';

function ChatMessageList({ messages }: { messages: ChatMessage[] }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={messages.length}
      itemSize={100}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <MessageBubble message={messages[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

#### 3. 消息合并（减少状态更新）

```typescript
// 批量更新策略
const BATCH_SIZE = 10; // 每10个字符更新一次
let charBuffer = '';
let charCount = 0;

onChunk: (chunk) => {
  charBuffer += chunk;
  charCount++;

  if (charCount >= BATCH_SIZE) {
    updateMessage(charBuffer);
    charBuffer = '';
    charCount = 0;
  }
}
```

### 6.2 错误处理

#### 错误类型

```typescript
export class ChatError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ChatError';
  }
}

// 具体错误类型
export class NetworkError extends ChatError {
  constructor(message: string = '网络连接失败') {
    super(message, 'NETWORK_ERROR', true);
  }
}

export class TimeoutError extends ChatError {
  constructor(message: string = '请求超时') {
    super(message, 'TIMEOUT_ERROR', true);
  }
}

export class APIError extends ChatError {
  constructor(message: string, public statusCode: number) {
    super(message, 'API_ERROR', statusCode >= 500);
  }
}
```

#### 错误处理策略

```typescript
// 智能重试
async function sendWithRetry(
  message: string,
  callbacks: StreamCallbacks,
  maxRetries: number = 3
) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await sendMessage(message, callbacks);
      return; // 成功
    } catch (error) {
      lastError = error as Error;

      // 不可重试的错误直接抛出
      if (error instanceof ChatError && !error.retryable) {
        throw error;
      }

      // 最后一次尝试
      if (attempt === maxRetries - 1) {
        break;
      }

      // 指数退避
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));

      console.log(`重试 ${attempt + 1}/${maxRetries}...`);
    }
  }

  // 所有重试都失败
  throw lastError;
}
```

### 6.3 用户体验优化

#### 1. 加载状态可视化

```typescript
// 多种加载状态
enum LoadingState {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  STREAMING = 'streaming',
  FINISHING = 'finishing',
}

// 状态显示
const LoadingIndicator = ({ state }: { state: LoadingState }) => {
  const messages = {
    [LoadingState.CONNECTING]: '正在连接...',
    [LoadingState.STREAMING]: '正在输入...',
    [LoadingState.FINISHING]: '即将完成...',
  };

  return (
    <div className="flex items-center gap-2">
      <div className="typing-indicator">
        <span></span><span></span><span></span>
      </div>
      <span>{messages[state]}</span>
    </div>
  );
};
```

#### 2. 打字机效果CSS

```css
/* 光标闪烁效果 */
@keyframes blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

.cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background-color: currentColor;
  animation: blink 1s infinite;
}

/* 打点加载效果 */
@keyframes typing {
  0%, 20% { opacity: 0.2; }
  50% { opacity: 1; }
  100% { opacity: 0.2; }
}

.typing-indicator span {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: currentColor;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}
```

#### 3. 平滑滚动

```typescript
// 智能滚动：流式时跟随，用户上滑时停止
function useAutoScroll(messagesRef: React.RefObject<HTMLDivElement>) {
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const lastScrollTopRef = useRef(0);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;

      // 用户向上滚动
      if (scrollTop < lastScrollTopRef.current) {
        setIsAutoScroll(false);
      }

      // 用户滚动到底部
      if (isAtBottom) {
        setIsAutoScroll(true);
      }

      lastScrollTopRef.current = scrollTop;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messagesRef]);

  const scrollToBottom = (smooth = true) => {
    if (!isAutoScroll) return;

    messagesRef.current?.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  return { isAutoScroll, scrollToBottom };
}
```

### 6.4 安全性考虑

#### 1. 输入验证

```typescript
// 消息验证
function validateMessage(message: string): string {
  // 去除首尾空格
  message = message.trim();

  // 长度限制
  if (message.length === 0) {
    throw new Error('消息不能为空');
  }

  if (message.length > 5000) {
    throw new Error('消息过长（最多5000字符）');
  }

  // 过滤敏感内容（可选）
  // message = filterProfanity(message);

  return message;
}
```

#### 2. 速率限制（客户端）

```typescript
// 简单的速率限制
class RateLimiter {
  private timestamps: number[] = [];

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  canMakeRequest(): boolean {
    const now = Date.now();

    // 清除过期时间戳
    this.timestamps = this.timestamps.filter(
      ts => now - ts < this.windowMs
    );

    return this.timestamps.length < this.maxRequests;
  }

  recordRequest() {
    this.timestamps.push(Date.now());
  }
}

// 使用
const limiter = new RateLimiter(10, 60000); // 每分钟最多10次

function sendMessage(msg: string) {
  if (!limiter.canMakeRequest()) {
    throw new Error('发送过于频繁，请稍后再试');
  }

  limiter.recordRequest();
  // ... 发送逻辑
}
```

#### 3. XSS防护

```typescript
// 转义HTML
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, m => map[m]);
}

// 或使用DOMPurify库
import DOMPurify from 'dompurify';

function sanitizeMessage(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code', 'pre'],
  });
}
```

### 6.5 测试策略

#### 单元测试

```typescript
// mockClient.test.ts
import { MockChatClient } from '~/lib/chat/mockClient';

describe('MockChatClient', () => {
  it('应该逐字流式发送消息', async () => {
    const client = new MockChatClient();
    const chunks: string[] = [];
    let completed = false;

    await new Promise<void>(resolve => {
      client.sendMessage('测试', {
        onChunk: chunk => chunks.push(chunk),
        onComplete: () => {
          completed = true;
          resolve();
        },
        onError: error => {
          throw error;
        },
      });
    });

    expect(completed).toBe(true);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join('')).toBeTruthy();
  });

  it('应该支持中断', async () => {
    const client = new MockChatClient();
    let errorOccurred = false;

    const promise = new Promise<void>(resolve => {
      client.sendMessage('测试', {
        onChunk: () => {},
        onComplete: () => resolve(),
        onError: error => {
          errorOccurred = true;
          resolve();
        },
      });
    });

    // 100ms后中断
    setTimeout(() => client.abort(), 100);

    await promise;
    expect(errorOccurred).toBe(true);
  });
});
```

#### E2E测试（Playwright）

```typescript
// chat.spec.ts
import { test, expect } from '@playwright/test';

test('流式聊天测试', async ({ page }) => {
  await page.goto('/chat');

  // 输入消息
  await page.fill('textarea', '你好');
  await page.click('button[type="submit"]');

  // 等待流式响应开始
  await page.waitForSelector('.message.assistant', { timeout: 5000 });

  // 等待流式响应完成
  await page.waitForFunction(
    () => {
      const lastMessage = document.querySelector('.message.assistant:last-child');
      return lastMessage?.textContent && lastMessage.textContent.length > 5;
    },
    { timeout: 10000 }
  );

  // 验证消息存在
  const messages = await page.locator('.message.assistant').all();
  expect(messages.length).toBeGreaterThan(0);
});
```

---

## 7. 实际集成示例

### 7.1 集成OpenAI

```typescript
// app/lib/chat/openaiClient.ts

import OpenAI from 'openai';
import type { ChatClient, StreamCallbacks } from './types';

export class OpenAIChatClient implements ChatClient {
  private openai: OpenAI;
  private abortController: AbortController | null = null;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async sendMessage(message: string, callbacks: StreamCallbacks) {
    this.abortController = new AbortController();
    callbacks.onStart?.();

    try {
      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: message }],
        stream: true,
      }, {
        signal: this.abortController.signal,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          callbacks.onChunk(content);
        }
      }

      callbacks.onComplete();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        callbacks.onError(new Error('请求已取消'));
      } else {
        callbacks.onError(error);
      }
    }
  }

  abort() {
    this.abortController?.abort();
  }
}

// 使用
const client = new OpenAIChatClient(process.env.OPENAI_API_KEY!);
```

### 7.2 集成Anthropic Claude

```typescript
// app/lib/chat/claudeClient.ts

import Anthropic from '@anthropic-ai/sdk';
import type { ChatClient, StreamCallbacks } from './types';

export class ClaudeChatClient implements ChatClient {
  private anthropic: Anthropic;
  private abortController: AbortController | null = null;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  async sendMessage(message: string, callbacks: StreamCallbacks) {
    this.abortController = new AbortController();
    callbacks.onStart?.();

    try {
      const stream = await this.anthropic.messages.stream({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: message }],
      });

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          callbacks.onChunk(event.delta.text);
        }
      }

      callbacks.onComplete();
    } catch (error: any) {
      callbacks.onError(error);
    }
  }

  abort() {
    this.abortController?.abort();
  }
}
```

---

## 8. 总结

### 核心要点回顾

#### 问题1：流式传输必须HTTP请求吗？
**答：不是。** 流式传输是一种效果，可以用：
- ✅ 定时器 + 字符串切片（本地）
- ✅ Generator函数（本地）
- ✅ HTTP SSE（网络）
- ✅ HTTP Fetch Stream（网络）
- ✅ WebSocket（网络）

#### 问题2：本地数据能实现流式传输吗？
**答：完全可以。** 使用：
```typescript
for (let char of message) {
  onChunk(char);
  await delay(50);
}
```

#### 问题3：如何为真实API做准备？
**答：三步走。**
1. **抽象接口**：定义 `ChatClient` 接口
2. **多实现**：`MockChatClient` + `APIChatClient`
3. **工厂模式**：环境自动切换

#### 问题4：架构演进路径

```
阶段1: 硬编码数据（当前）
  ↓
阶段2: 本地流式Mock
  ↓
阶段3: 抽象层 + 策略模式
  ↓
阶段4: 真实API集成
  ↓
阶段5: 生产级优化
```

### 下一步行动

1. **立即行动**：使用本文的 `MockChatClient` 添加流式效果
2. **短期目标**：重构为Hook架构（`useChatStream`）
3. **中期目标**：集成真实API（OpenAI/Claude）
4. **长期目标**：性能优化、错误处理、监控

### 参考资源

- [MDN - ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)
- [OpenAI API - Streaming](https://platform.openai.com/docs/api-reference/streaming)
- [Anthropic - Streaming Messages](https://docs.anthropic.com/en/api/messages-streaming)
- [Remix - Streaming](https://remix.run/docs/en/main/guides/streaming)

---

**文档版本**：1.0
**最后更新**：2025-11-20
**作者**：Claude for 汪家俊

*这份文档是一份活文档，会随着你的项目演进而更新。记得在实践中不断总结和改进！*
