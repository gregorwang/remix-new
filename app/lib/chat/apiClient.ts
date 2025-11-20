/**
 * API聊天客户端 - 真实HTTP流式传输实现
 *
 * 这个类实现了通过HTTP Fetch API的流式传输。
 * 使用ReadableStream逐步接收服务器响应。
 *
 * 关键特性：
 * 1. 支持自动重试
 * 2. 请求超时控制
 * 3. 可中断请求
 * 4. 错误处理
 */

import type { ChatClient, StreamCallbacks, ChatClientConfig, StreamChunk } from './types';

export class APIChatClient implements ChatClient {
  private abortController: AbortController | null = null;
  private config: Required<Pick<ChatClientConfig, 'apiEndpoint' | 'timeout' | 'retries'>>;

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
        // 创建新的AbortController
        this.abortController = new AbortController();

        // 设置超时
        const timeoutId = setTimeout(() => {
          this.abortController?.abort();
        }, this.config.timeout);

        // 发送请求
        const response = await fetch(this.config.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message }),
          signal: this.abortController.signal,
        });

        clearTimeout(timeoutId);

        // 检查响应状态
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // 处理流式响应
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
          callbacks.onError(
            new Error(`请求失败（已重试${retries}次）: ${error.message}`)
          );
          return;
        }

        // 等待后重试（指数退避）
        const delay = Math.min(1000 * Math.pow(2, retries), 10000);
        console.log(`重试 ${retries}/${this.config.retries}，等待 ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * 处理流式响应
   */
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

        // 解码数据
        buffer += decoder.decode(value, { stream: true });

        // 处理每一行（假设服务器发送的是换行分隔的JSON）
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留最后不完整的行

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data: StreamChunk = JSON.parse(line);

            if (data.type === 'content' && data.content) {
              callbacks.onChunk(data.content);
            } else if (data.type === 'error') {
              throw new Error(data.error || '服务器错误');
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
