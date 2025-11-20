/**
 * Mock聊天客户端 - 本地流式传输实现
 *
 * 这个类实现了完全本地的流式传输效果，不需要任何HTTP请求。
 * 它通过定时器逐字释放数据，模拟真实的AI流式响应。
 *
 * 关键特性：
 * 1. 纯客户端实现，无需后端
 * 2. 支持中断操作
 * 3. 可配置的延迟和随机性
 * 4. 适合开发调试和Demo演示
 */

import type { ChatClient, StreamCallbacks, ChatClientConfig } from './types';

export class MockChatClient implements ChatClient {
  private abortFlag = false;
  private config: Required<Pick<ChatClientConfig, 'charDelay' | 'randomDelay'>>;

  constructor(config: ChatClientConfig = {}) {
    this.config = {
      charDelay: config.charDelay ?? 50,
      randomDelay: config.randomDelay ?? 30,
    };
  }

  async sendMessage(message: string, callbacks: StreamCallbacks) {
    // 重置中断标志
    this.abortFlag = false;

    // 通知开始
    callbacks.onStart?.();

    try {
      // 获取模拟响应
      const response = this.getResponse(message);

      // 逐字流式发送
      for (let i = 0; i < response.length; i++) {
        // 检查是否被中断
        if (this.abortFlag) {
          throw new Error('请求已中断');
        }

        // 发送单个字符
        callbacks.onChunk(response[i]);

        // 计算延迟（基础延迟 + 随机延迟）
        const delay = this.config.charDelay +
                     Math.random() * this.config.randomDelay;

        // 等待
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // 完成
      callbacks.onComplete();
    } catch (error) {
      callbacks.onError(error as Error);
    }
  }

  abort() {
    this.abortFlag = true;
  }

  /**
   * 获取模拟响应
   * 这里可以根据用户消息返回不同的响应
   */
  private getResponse(userMessage: string): string {
    const lowerMessage = userMessage.toLowerCase();

    // 根据关键词返回不同响应
    if (lowerMessage.includes('汪家俊') || lowerMessage.includes('你')) {
      return this.getRandomAsciiResponse();
    }

    if (lowerMessage.includes('测试') || lowerMessage.includes('test')) {
      return '这是一个测试响应，用于演示流式传输效果。你可以看到文字是逐个字符出现的，就像真实的AI在打字一样。';
    }

    if (lowerMessage.includes('hello') || lowerMessage.includes('你好')) {
      return '你好！我是Nemesis，基于汪家俊意识构建的AI助手。我现在正在使用本地Mock实现流式传输。';
    }

    // 默认响应
    return this.getRandomAsciiResponse();
  }

  /**
   * 获取随机ASCII艺术响应
   */
  private getRandomAsciiResponse(): string {
    const responses = [
      `╔═══════════════════════════════════════╗
║   汪家俊工作进度查询系统 v2.0         ║
╠═══════════════════════════════════════╣
║                                       ║
║   █████████████████████░░  99.99%     ║
║                                       ║
║   当前状态: 正在思考人生               ║
║   预计完成: ∞ 天后                     ║
║   工作效率: 极低                       ║
║                                       ║
╚═══════════════════════════════════════╝`,

      `    ╭─────────────────────╮
    │   汪家俊の日常      │
    ╰─────────────────────╯

       ___
      /   \\      今日活动:
     | O O |
      \\___/      [ ] 写代码
       | |       [√] 喝咖啡
      /| |\\      [√] 摸鱼
     / |_| \\     [√] 发呆
                 [ ] 加班

    结论: 今日份摸鱼完成✓`,

      `╔════════════════════════════════════╗
║  Nemesis AI 系统状态               ║
╠════════════════════════════════════╣
║                                    ║
║  🎯 训练进度:  [░░░░░░░░░░] 0.01%  ║
║  🧠 智能等级:  计算中...            ║
║  💬 对话能力:  开发中               ║
║  📊 数据集量:  需要更多咖啡          ║
║                                    ║
║  预计上线时间: 假的喵，上线时间待定 ║
║  当前状态: 咕咕咕中...              ║
║                                    ║
╚════════════════════════════════════╝`,

      `╔═══════════════════════════════════════╗
║         汪家俊档案系统                ║
╠═══════════════════════════════════════╣
║                                       ║
║        ___                            ║
║       /   \\                           ║
║      | o_o |    身份: 学徒（代码小工） ║
║       \\___/                           ║
║        | |      爱好: 写代码、摸鱼    ║
║       /| |\\                           ║
║                                       ║
║  ⚙️  技能树:                          ║
║  ├─ 前端开发 ████████░░ 10%           ║
║  ├─ 后端开发 ███████░░░ 10%           ║
║  ├─ 摸鱼技能 ██████████ 100%          ║
║  └─ 调试能力 █████░░░░░ 10%           ║
║                                       ║
║  💭 当前想法: 代码能跑就行...          ║
║                                       ║
╚═══════════════════════════════════════╝`,
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }
}
