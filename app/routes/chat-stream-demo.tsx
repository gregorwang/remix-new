/**
 * 流式聊天演示页面
 *
 * 这是一个完整的流式聊天实现示例，展示了：
 * 1. 如何使用 useChatStream Hook
 * 2. 如何实现打字机效果
 * 3. 如何处理加载状态和错误
 * 4. 如何支持中断请求
 *
 * 可以通过访问 /chat-stream-demo 来查看效果
 */

import type { LinksFunction, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { useState, useRef, useEffect } from "react";
import { useChatStream } from "~/hooks/useChatStream";
import { pageMeta } from "~/utils/seo";

export const links: LinksFunction = () => [];
export const meta: MetaFunction = () => pageMeta.chat();

export async function loader() {
  return json({
    content: {
      title: "流式聊天演示",
      description: "体验本地流式传输效果",
      welcome_title: "流式聊天演示 - 打字机效果",
      welcome_subtitle: "这个页面演示了完全本地的流式传输实现，无需后端API",
      preset_questions: {
        question1: "什么是汪家俊的疯狂自我意识？",
        question2: "为什么这个AI对话角色叫做Nemesis？",
        question3: "测试流式传输效果",
        question4: "汪家俊现在在做什么工作？"
      },
      user_label: "您",
      assistant_label: "Nemesis (流式)",
      placeholder: "输入消息体验流式传输...",
      enter_to_send: "按回车发送",
      shift_enter_newline: "Shift+回车换行",
      privacy_notice: "这是本地Mock实现，所有数据都在浏览器中处理",
      initial_message: "你好！我现在使用流式传输技术。你会看到文字像打字机一样逐个出现。",
    }
  }, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export default function ChatStreamDemo() {
  const { content } = useLoaderData<typeof loader>();

  // 使用流式聊天Hook（使用Mock客户端）
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    abort,
    retry,
  } = useChatStream({
    clientType: 'mock', // 使用本地Mock，无需API
    initialMessages: [
      { role: 'assistant', content: content.initial_message }
    ],
  });

  // 本地状态
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
        {/* 顶部导航栏 */}
        <header className="py-3 px-4 border-b border-primary-100 bg-white shadow-sm">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center group" prefetch="intent">
              <div className="h-8 w-8 mr-2 bg-accent rounded-lg flex items-center justify-center transition-all duration-300 ease-expo-out hover:bg-accent-hover group-hover:-translate-y-0.5 group-hover:shadow-lg">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <h1 className="text-lg font-semibold text-primary-950 transition-colors duration-300 ease-expo-out group-hover:text-accent">
                Nemesis 流式演示
              </h1>
            </Link>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                本地Mock
              </div>

              <Link
                to="/chat"
                className="text-sm text-primary-950/70 hover:text-primary-950 px-3 py-1 rounded hover:bg-primary-100 transition-colors"
              >
                原版聊天
              </Link>
            </div>
          </div>
        </header>

        {/* 主体区域 */}
        <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 py-6">
          {/* 欢迎信息 */}
          {messages.length <= 1 && (
            <div className="mb-8 text-center py-16">
              <h2 className="text-2xl font-semibold leading-tight tracking-tight text-primary-950 mb-3">
                {content.welcome_title}
              </h2>
              <p className="text-base leading-relaxed text-primary-950/70 mb-6">
                {content.welcome_subtitle}
              </p>

              {/* 建议问题 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {Object.values(content.preset_questions).map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handlePresetQuestion(question)}
                    className="bg-primary-100 hover:bg-primary-100/80 text-primary-950 py-3 px-4 rounded-xl text-left transition-all duration-300 ease-expo-out text-sm font-medium hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-sm animate-fade-in"
                    style={{ animationDelay: `${100 + index * 50}ms` }}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

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
                } animate-fade-in`}
              >
                {/* 消息标签 */}
                <div className="mb-1 px-2 text-sm text-primary-950/70">
                  {message.role === 'user'
                    ? content.user_label
                    : content.assistant_label}
                </div>

                {/* 消息内容 */}
                <div
                  className={`max-w-[90%] rounded-2xl p-4 transition-all duration-300 ${
                    message.role === 'user'
                      ? 'bg-accent text-white shadow-md'
                      : 'bg-primary-100 text-primary-950 shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-base leading-relaxed">
                    {message.content}
                    {/* 流式输入中的光标效果 */}
                    {message.role === 'assistant' &&
                      index === messages.length - 1 &&
                      isLoading && (
                        <span className="inline-block w-0.5 h-5 ml-1 bg-primary-950 animate-pulse align-middle" />
                      )}
                  </p>
                </div>
              </div>
            ))}

            {/* 错误提示 */}
            {error && (
              <div className="flex justify-center animate-fade-in">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm max-w-md">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">❌</span>
                    <div className="flex-1">
                      <div className="font-medium mb-1">发生错误</div>
                      <div className="text-red-500">{error.message}</div>
                      <button
                        onClick={retry}
                        className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors text-xs font-medium"
                      >
                        重试
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 输入区域 */}
          <div className="border border-primary-100 rounded-xl bg-white shadow-md">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyDown={handleEnter}
                placeholder={content.placeholder}
                disabled={isLoading}
                className="w-full p-4 pr-24 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[60px] max-h-[200px] bg-white text-primary-950 placeholder:text-primary-950/50 disabled:opacity-50 disabled:bg-gray-50"
                rows={1}
              />
              <div className="absolute right-3 bottom-3 flex gap-2">
                {isLoading ? (
                  <button
                    onClick={abort}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 shadow-md"
                  >
                    <span>⏹</span>
                    停止
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    className="bg-accent hover:bg-accent-hover text-white p-2 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg disabled:hover:shadow-md"
                    disabled={!inputMessage.trim()}
                  >
                    <span className="text-lg">✈️</span>
                  </button>
                )}
              </div>
            </div>
            <div className="px-4 py-2 text-xs text-primary-950/70 border-t border-primary-100 flex justify-between items-center bg-gray-50">
              <span>{content.enter_to_send}</span>
              <span>{content.shift_enter_newline}</span>
            </div>
          </div>

          {/* 底部提示 */}
          <p className="text-center text-primary-950/70 text-xs mt-4">
            {content.privacy_notice}
          </p>

          {/* 统计信息 */}
          <div className="flex justify-center gap-4 mt-4 text-xs text-primary-950/50">
            <span>消息数: {messages.length}</span>
            <span>•</span>
            <span>状态: {isLoading ? '⏳ 加载中' : '✅ 就绪'}</span>
            <span>•</span>
            <span>模式: Mock</span>
          </div>

          {/* 返回链接 */}
          <div className="text-center mt-4">
            <Link
              to="/chat"
              prefetch="intent"
              className="text-accent hover:text-accent-hover transition-colors duration-300 ease-expo-out text-sm font-medium"
            >
              ← 返回原版聊天
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold leading-tight tracking-tight text-primary-950 mb-2">
            页面错误
          </h1>
          <p className="text-base leading-relaxed text-primary-950/70 mb-4">
            抱歉，页面出现了问题。
          </p>
          <Link
            to="/"
            prefetch="intent"
            className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded text-sm font-medium transition-colors duration-300 ease-expo-out inline-block"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
