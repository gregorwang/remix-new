/**
 * 聊天流式传输 React Hook
 *
 * 这个Hook封装了所有聊天相关的状态管理和流式传输逻辑。
 * 使用方式：
 *
 * ```tsx
 * const { messages, isLoading, error, sendMessage, abort } = useChatStream({
 *   clientType: 'mock', // 或 'api'
 *   initialMessages: [{ role: 'assistant', content: '你好！' }]
 * });
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage } from '~/lib/chat/types';
import { ChatClientFactory, type ClientType } from '~/lib/chat/clientFactory';

export interface UseChatStreamOptions {
  /** 客户端类型：'mock' 或 'api' */
  clientType?: ClientType;

  /** 初始消息列表 */
  initialMessages?: ChatMessage[];

  /** 消息更新回调 */
  onMessageUpdate?: (messages: ChatMessage[]) => void;

  /** 发送成功回调 */
  onSendSuccess?: () => void;

  /** 发送失败回调 */
  onSendError?: (error: Error) => void;
}

export function useChatStream(options: UseChatStreamOptions = {}) {
  const {
    clientType = 'mock',
    initialMessages = [],
    onMessageUpdate,
    onSendSuccess,
    onSendError,
  } = options;

  // 状态
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 引用
  const clientRef = useRef(ChatClientFactory.create(clientType));
  const currentMessageRef = useRef('');

  // 消息更新时调用回调
  useEffect(() => {
    onMessageUpdate?.(messages);
  }, [messages, onMessageUpdate]);

  /**
   * 发送消息
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      // 添加用户消息
      const userMessage: ChatMessage = {
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, userMessage]);
      setError(null);
      setIsLoading(true);

      // 初始化当前消息
      currentMessageRef.current = '';

      // 发送到客户端
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
          // 累积文本
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
          onSendSuccess?.();
        },

        onError: (err: Error) => {
          setError(err);
          setIsLoading(false);
          currentMessageRef.current = '';
          onSendError?.(err);

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
    [isLoading, onSendSuccess, onSendError]
  );

  /**
   * 中断当前请求
   */
  const abort = useCallback(() => {
    clientRef.current.abort();
    setIsLoading(false);
  }, []);

  /**
   * 清空所有消息
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  /**
   * 重新发送最后一条用户消息
   */
  const retry = useCallback(() => {
    const lastUserMessage = [...messages]
      .reverse()
      .find(msg => msg.role === 'user');

    if (lastUserMessage) {
      // 移除最后一条助手消息（如果有）
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.role === 'assistant') {
          return prev.slice(0, -1);
        }
        return prev;
      });

      // 重新发送
      sendMessage(lastUserMessage.content);
    }
  }, [messages, sendMessage]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    abort,
    clearMessages,
    retry,
  };
}
