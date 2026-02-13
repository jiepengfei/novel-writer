import { Mark, mergeAttributes } from '@tiptap/core'

export interface AIHighlightOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiHighlight: {
      setAIHighlight: (attrs?: { originalText?: string }) => ReturnType
      unsetAIHighlight: () => ReturnType
    }
  }
}

/**
 * Mark for AI-generated text. Renders with green styling.
 * originalText is stored so Reject can restore.
 */
export const AIHighlight = Mark.create<AIHighlightOptions>({
  name: 'aiHighlight',

  addOptions() {
    return {
      HTMLAttributes: {}
    }
  },

  addAttributes() {
    return {
      originalText: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-original-text'),
        renderHTML: (attrs) =>
          attrs.originalText ? { 'data-original-text': attrs.originalText } : {}
      }
    }
  },

  parseHTML() {
    return [{ tag: 'span.ai-generated' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        { class: 'ai-generated', style: 'color:#059669;background:#d1fae5;' },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      0
    ]
  }
})
