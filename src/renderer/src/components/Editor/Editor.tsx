import React, { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import { useAppStore } from '../../store/useAppStore'
import { AIHighlight } from '../../extensions/AIHighlight'

const DEBOUNCE_MS = 1000

export function Editor(): React.ReactElement {
  const { activeFile, addChatContextTag } = useAppStore()
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isExpanding, setIsExpanding] = useState(false)
  const [expandError, setExpandError] = useState<string | null>(null)
  const expandRef = useRef<{
    from: number
    to: number
    originalText: string
    accumulated: string
  } | null>(null)
  /** 弹出菜单时保存的选区（用 state 触发重渲染，使按钮在选中后立即可点） */
  const [capturedSelection, setCapturedSelection] = useState<{
    from: number
    to: number
    text: string
  } | null>(null)
  /** 流式结束后显示的审阅面板：上文红字原文 + 下文可编辑生成（绿框）+ 右下角接受/取消 */
  const [reviewPanel, setReviewPanel] = useState<{
    originalText: string
    generatedText: string
    /** 用户编辑后的生成内容，接受时用此结果 */
    editedText: string
    from: number
    to: number
  } | null>(null)

  const editor = useEditor({
    extensions: [StarterKit, AIHighlight],
    content: '<p></p>',
    editorProps: {
      attributes: { class: 'prose prose-sm max-w-none min-h-[300px] p-4 outline-none' }
    }
  })

  useEffect(() => {
    if (!editor || !activeFile || !window.fileAPI) return
    let cancelled = false
    window.fileAPI.read(activeFile.category, activeFile.id).then((text) => {
      if (cancelled) return
      const html = text.trim()
        ? text
            .split('\n')
            .map((line) => '<p>' + line.replace(/</g, '&lt;') + '</p>')
            .join('')
        : '<p></p>'
      editor.commands.setContent(html)
    })
    return () => {
      cancelled = true
    }
  }, [activeFile?.id, activeFile?.category, editor])

  useEffect(() => {
    if (!editor || !activeFile || !window.fileAPI) return
    const onUpdate = () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        const text = editor.getText()
        window.fileAPI.save(activeFile.category, activeFile.id, text)
        saveTimeoutRef.current = null
      }, DEBOUNCE_MS)
    }
    editor.on('update', onUpdate)
    return () => {
      editor.off('update', onUpdate)
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [editor, activeFile])

  useEffect(() => {
    if (!editor) return
    const onSelectionUpdate = (): void => {
      if (editor.state.selection.empty) return
      const { from, to } = editor.state.selection
      setCapturedSelection({
        from,
        to,
        text: editor.state.doc.textBetween(from, to).trim()
      })
    }
    editor.on('selectionUpdate', onSelectionUpdate)
    return () => {
      editor.off('selectionUpdate', onSelectionUpdate)
    }
  }, [editor])

  // Expand stream: chunk / done / error
  useEffect(() => {
    if (!editor || !window.aiAPI) return
    const unChunk = window.aiAPI.onExpandChunk((text: string) => {
      const data = expandRef.current
      if (!data) return
      const newAccumulated = data.accumulated + text
      const from = data.from
      const toDelete =
        data.accumulated === '' ? data.to : data.from + data.accumulated.length
      editor
        .chain()
        .focus()
        .deleteRange({ from, to: toDelete })
        .insertContentAt(from, [
          {
            type: 'text',
            text: newAccumulated,
            marks: [{ type: 'aiHighlight', attrs: { originalText: data.originalText } }]
          }
        ])
        .run()
      data.accumulated = newAccumulated
    })
    const unDone = window.aiAPI.onExpandDone(() => {
      const data = expandRef.current
      if (data?.accumulated != null && data.accumulated.length > 0) {
        const generated = data.accumulated
        setReviewPanel({
          originalText: data.originalText,
          generatedText: generated,
          editedText: generated,
          from: data.from,
          to: data.from + data.accumulated.length
        })
      }
      setIsExpanding(false)
      expandRef.current = null
      if (editor.isEditable === false) editor.setEditable(true)
    })
    const unError = window.aiAPI.onExpandError((msg: string) => {
      setExpandError(msg)
      setIsExpanding(false)
      expandRef.current = null
      if (editor.isEditable === false) editor.setEditable(true)
    })
    return () => {
      unChunk()
      unDone()
      unError()
    }
  }, [editor])

  const handleExpand = (): void => {
    if (!editor || !window.aiAPI || isExpanding) return
    const sel = !editor.state.selection.empty
      ? {
          from: editor.state.selection.from,
          to: editor.state.selection.to,
          text: editor.state.doc.textBetween(
            editor.state.selection.from,
            editor.state.selection.to
          ).trim()
        }
      : capturedSelection
    if (!sel?.text) return
    setExpandError(null)
    expandRef.current = { from: sel.from, to: sel.to, originalText: sel.text, accumulated: '' }
    editor.setEditable(false)
    setIsExpanding(true)
    window.aiAPI.expandStart(sel.text)
  }

  /** 获取当前光标/选区所在整块 AI 高亮的范围与原文（连续多个带 aiHighlight 的节点合并为一块） */
  const getAIHighlightBlock = (): { from: number; to: number; originalText: string | null } | null => {
    if (!editor) return null
    const { from } = editor.state.selection
    const doc = editor.state.doc
    const segments: { from: number; to: number; originalText: string | null }[] = []
    doc.nodesBetween(0, doc.content.size, (node, pos) => {
      const mark = node.marks.find((m) => m.type.name === 'aiHighlight')
      if (!mark || !node.isText) return
      segments.push({
        from: pos,
        to: pos + node.nodeSize,
        originalText: mark.attrs?.originalText ?? null
      })
    })
    if (segments.length === 0) return null
    segments.sort((a, b) => a.from - b.from)
    const merged: { from: number; to: number; originalText: string | null }[] = []
    for (const seg of segments) {
      const last = merged[merged.length - 1]
      if (last && last.to === seg.from) {
        last.to = seg.to
        if (seg.originalText != null) last.originalText = last.originalText ?? seg.originalText
      } else {
        merged.push({ ...seg })
      }
    }
    const block = merged.find((b) => b.from <= from && from <= b.to)
    return block ?? null
  }

  const handleAccept = (): void => {
    if (!editor) return
    const block = getAIHighlightBlock()
    if (!block) return
    const text = editor.state.doc.textBetween(block.from, block.to)
    editor
      .chain()
      .focus()
      .deleteRange({ from: block.from, to: block.to })
      .insertContentAt(block.from, text)
      .run()
  }

  const handleReject = (): void => {
    if (!editor) return
    const block = getAIHighlightBlock()
    if (!block?.originalText) return
    editor
      .chain()
      .focus()
      .deleteRange({ from: block.from, to: block.to })
      .insertContentAt(block.from, block.originalText)
      .run()
  }

  const handleReviewAccept = (): void => {
    if (!editor || !reviewPanel) return
    const finalText = reviewPanel.editedText.trim() || reviewPanel.generatedText
    editor
      .chain()
      .focus()
      .deleteRange({ from: reviewPanel.from, to: reviewPanel.to })
      .insertContentAt(reviewPanel.from, finalText)
      .run()
    setReviewPanel(null)
  }

  const handleReviewCancel = (): void => {
    if (!editor || !reviewPanel) return
    editor
      .chain()
      .focus()
      .deleteRange({ from: reviewPanel.from, to: reviewPanel.to })
      .insertContentAt(reviewPanel.from, reviewPanel.originalText)
      .run()
    setReviewPanel(null)
  }

  const handleChatWithSelection = (): void => {
    if (!editor) return
    const selectedText = !editor.state.selection.empty
      ? editor.state.doc
          .textBetween(editor.state.selection.from, editor.state.selection.to)
          .trim()
      : capturedSelection?.text
    if (!selectedText) return
    addChatContextTag(selectedText)
  }

  const hasAIHighlight = editor?.isActive('aiHighlight') ?? false
  const hasSelection =
    (editor && !editor.state.selection.empty) || capturedSelection != null

  if (!activeFile) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        在左侧选择或新建文件
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-white relative">
      {expandError && (
        <div className="px-4 py-2 bg-red-50 text-red-700 text-sm border-b border-red-100">
          {expandError}
          <button
            type="button"
            onClick={() => setExpandError(null)}
            className="ml-2 underline"
          >
            关闭
          </button>
        </div>
      )}
      {reviewPanel && (
        <div className="absolute right-4 bottom-4 w-[360px] max-w-[90vw] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20 flex flex-col max-h-[70vh]">
          <div className="px-3 py-2 border-b border-gray-200 text-xs font-medium text-gray-500 bg-gray-50">
            审阅
          </div>
          <div className="p-3 flex-1 overflow-y-auto space-y-2">
            <div>
              <div className="text-xs text-gray-500 mb-1">原文（选中）</div>
              <div className="px-2 py-2 rounded text-sm bg-red-50 text-red-900 border border-red-200 whitespace-pre-wrap break-words">
                {reviewPanel.originalText}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">生成（可编辑，接受时以此处为准）</div>
              <textarea
                value={reviewPanel.editedText}
                onChange={(e) =>
                  setReviewPanel((prev) =>
                    prev ? { ...prev, editedText: e.target.value } : null
                  )
                }
                className="w-full min-h-[120px] px-2 py-2 rounded text-sm bg-emerald-50 text-emerald-900 border border-emerald-300 resize-y focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
                placeholder="生成内容可在此编辑"
              />
            </div>
          </div>
          <div className="px-3 py-2 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleReviewCancel}
              className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleReviewAccept}
              className="px-3 py-1.5 text-sm rounded bg-gray-800 text-white hover:bg-gray-700"
            >
              接受
            </button>
          </div>
        </div>
      )}
      {editor && (
        <BubbleMenu
          editor={editor}
          className="flex items-center gap-1 p-1 bg-white border border-gray-200 rounded shadow-lg"
        >
          {hasAIHighlight ? (
            <>
              <button
                type="button"
                onClick={handleAccept}
                className="px-2 py-1 text-sm rounded hover:bg-gray-100"
                title="接受"
              >
                ✅ 接受
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="px-2 py-1 text-sm rounded hover:bg-gray-100"
                title="拒绝"
              >
                ❌ 拒绝
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleExpand}
                disabled={!hasSelection || isExpanding}
                className="px-2 py-1 text-sm rounded hover:bg-gray-100 disabled:opacity-50"
                title="AI 扩展"
              >
                ✨ {isExpanding ? '生成中…' : 'Expand'}
              </button>
              <button
                type="button"
                onClick={handleChatWithSelection}
                disabled={!hasSelection}
                className="px-2 py-1 text-sm rounded hover:bg-gray-100 disabled:opacity-50"
                title="带到聊天"
              >
                💬 Chat
              </button>
            </>
          )}
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}
