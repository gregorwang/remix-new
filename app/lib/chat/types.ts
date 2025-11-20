/**
 * 聊天系统类型定义
 *
 * 这个文件定义了聊天系统的核心接口，支持本地Mock和真实API两种实现
 */

/** 聊天消息 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

/** 流式传输回调函数 */
export interface StreamCallbacks {
  /** 接收到新的文本块时调用 */
  onChunk: (chunk: string) => void;

  /** 流式传输完成时调用 */
  onComplete: () => void;

  /** 发生错误时调用 */
  onError: (error: Error) => void;

  /** 开始传输时调用（可选） */
  onStart?: () => void;
}

/** 聊天客户端接口 - 统一的抽象层 */
export interface ChatClient {
  /** 发送消息并接收流式响应 */
  sendMessage(message: string, callbacks: StreamCallbacks): void;

  /** 中断当前请求 */
  abort(): void;
}

/** 客户端配置 */
export interface ChatClientConfig {
  /** API端点（用于真实API客户端） */
  apiEndpoint?: string;

  /** 请求超时时间（毫秒） */
  timeout?: number;

  /** 失败重试次数 */
  retries?: number;

  /** 每个字符的延迟时间（用于Mock客户端，毫秒） */
  charDelay?: number;

  /** 随机延迟范围（用于Mock客户端，毫秒） */
  randomDelay?: number;
}

/** 流式数据块的类型 */
export interface StreamChunk {
  type: 'content' | 'done' | 'error';
  content?: string;
  error?: string;
  timestamp?: number;
}
