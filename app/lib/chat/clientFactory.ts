/**
 * 聊天客户端工厂
 *
 * 提供统一的客户端创建接口，支持：
 * 1. 手动指定客户端类型
 * 2. 根据环境自动选择
 * 3. 开发环境优先使用Mock，生产环境使用真实API
 */

import type { ChatClient, ChatClientConfig } from './types';
import { MockChatClient } from './mockClient';
import { APIChatClient } from './apiClient';

export type ClientType = 'mock' | 'api';

export class ChatClientFactory {
  /**
   * 创建指定类型的客户端
   */
  static create(type: ClientType, config?: ChatClientConfig): ChatClient {
    switch (type) {
      case 'mock':
        return new MockChatClient(config);
      case 'api':
        return new APIChatClient(config);
      default:
        throw new Error(`未知的客户端类型: ${type}`);
    }
  }

  /**
   * 自动选择客户端类型
   *
   * 优先级：
   * 1. 环境变量 USE_MOCK_CHAT=true -> Mock
   * 2. 开发环境 + 未设置环境变量 -> Mock
   * 3. 生产环境 -> API
   */
  static createAuto(config?: ChatClientConfig): ChatClient {
    // 检查环境变量
    const useMock = typeof window !== 'undefined'
      ? false // 浏览器端默认不使用Mock（除非配置）
      : process.env.USE_MOCK_CHAT === 'true';

    if (useMock) {
      console.log('[ChatClient] 使用Mock客户端');
      return new MockChatClient(config);
    }

    console.log('[ChatClient] 使用API客户端');
    return new APIChatClient(config);
  }
}
