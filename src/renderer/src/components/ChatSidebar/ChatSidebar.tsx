import React, { useState, useEffect, useRef } from 'react'

interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

export function ChatSidebar(): React.ReactElement {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!window.aiAPI) return
    const unChunk = window.aiAPI.onChunk((text: string) => {
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.role === 'model') {
          next[next.length - 1] = { ...last, content: last.content + text }
        }
        return next
      })
    })
    const unDone = window.aiAPI.onDone(() => setIsStreaming(false))
    const unError = window.aiAPI.onError((msg: string) => {
      setError(msg)
      setIsStreaming(false)
    })
    return () => {
      unChunk()
      unDone()
      unError()
    }
  }, [])

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (): void => {
    const text = input.trim()
    if (!text || isStreaming || !window.aiAPI) return
    setError(null)
    setMessages((prev) => [...prev, { role: 'user', content: text }, { role: 'model', content: '' }])
    setInput('')
    setIsStreaming(true)
    window.aiAPI.startChat(text)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-gray-200 font-medium text-gray-700">AI 助手</div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {messages.length === 0 && !error && (
          <p className="text-gray-400 text-sm">输入消息与 Gemini 对话，回复将流式显示。</p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
              msg.role === 'user'
                ? 'bg-gray-200 text-gray-900 ml-4'
                : 'bg-gray-100 text-gray-800 mr-4'
            }`}
          >
            {msg.content || (msg.role === 'model' && isStreaming ? '…' : '')}
          </div>
        ))}
        {error && (
          <div className="rounded-lg px-3 py-2 text-sm bg-red-50 text-red-700">{error}</div>
        )}
        <div ref={listEndRef} />
      </div>
      <div className="p-2 border-t border-gray-200">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="输入消息…"
            rows={2}
            disabled={isStreaming}
            className="flex-1 resize-none rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 disabled:bg-gray-100"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="shrink-0 px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}
