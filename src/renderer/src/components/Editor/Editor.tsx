import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useRef } from 'react'
import { useAppStore } from '../../store/useAppStore'

const DEBOUNCE_MS = 1000

export function Editor() {
  const { activeFile } = useAppStore()
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p></p>',
    editorProps: { attributes: { class: 'prose prose-sm max-w-none min-h-[300px] p-4 outline-none' } }
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

  if (!activeFile) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        在左侧选择或新建文件
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-white">
      <EditorContent editor={editor} />
    </div>
  )
}
