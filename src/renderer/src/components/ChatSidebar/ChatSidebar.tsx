import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '../../store/useAppStore'

interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

const INPUT_MIN_H = 120
const INPUT_MAX_H = 400
const INPUT_DEFAULT_H = 160

export function ChatSidebar(): React.ReactElement {
  const { chatContextTags, removeChatContextTag } = useAppStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inputHeight, setInputHeight] = useState(INPUT_DEFAULT_H)
  const listEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dragStartY = useRef(0)
  const dragStartH = useRef(0)

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

  const buildMessage = useCallback((): string => {
    const userText = input.trim()
    if (chatContextTags.length === 0) return userText
    const quoted = chatContextTags
      .map((t) =>
        t
          .split('\n')
          .map((line) => '> ' + line)
          .join('\n')
      )
      .join('\n\n')
    return quoted + '\n\n' + userText
  }, [input, chatContextTags])

  const handleSend = (): void => {
    const text = buildMessage()
    if (!text.trim() || isStreaming || !window.aiAPI) return
    setError(null)
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text },
      { role: 'model', content: '' }
    ])
    setInput('')
    setIsStreaming(true)
    window.aiAPI.startChat(text)
  }

  const onResizerMouseDown = (e: React.MouseEvent): void => {
    e.preventDefault()
    dragStartY.current = e.clientY
    dragStartH.current = inputHeight
    const onMove = (e2: MouseEvent): void => {
      const dy = e2.clientY - dragStartY.current
      setInputHeight((h) => Math.min(INPUT_MAX_H, Math.max(INPUT_MIN_H, h - dy)))
    }
    const onUp = (): void => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-gray-200 font-medium text-gray-700 shrink-0">AI 助手</div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0 selectable-text">
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
      <div
        className="shrink-0 border-t border-gray-200 flex flex-col bg-gray-50/50"
        style={{ height: inputHeight }}
      >
        <div
          role="separator"
          aria-label="调整输入区高度"
          onMouseDown={onResizerMouseDown}
          className="h-2 flex-shrink-0 cursor-row-resize hover:bg-gray-200 flex items-center justify-center"
        >
          <span className="text-gray-400 text-xs">⋮</span>
        </div>
        <div className="flex-1 flex flex-col min-h-0 p-2">
          {chatContextTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {chatContextTags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 max-w-full rounded bg-gray-200 text-gray-800 text-xs px-2 py-1"
                >
                  <span className="truncate max-w-[200px]" title={tag}>
                    {tag}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeChatContextTag(i)}
                    className="shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-gray-300 text-gray-600"
                    aria-label="删除"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2 flex-1 min-h-0">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="输入消息…"
              disabled={isStreaming}
              className="flex-1 min-h-[60px] resize-y rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 disabled:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400"
              style={{ minHeight: 60, maxHeight: 280 }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={(!input.trim() && chatContextTags.length === 0) || isStreaming}
              className="shrink-0 px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50 self-end"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
