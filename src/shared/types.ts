export interface FileNode {
  id: string
  filename: string
  title: string
  /** 子节点，用于分卷等多层级 */
  children?: FileNode[]
  /** 仅设定项使用：是否参与 AI 上下文注入，默认 false */
  isActive?: boolean
  /** 仅正文章节使用：该章摘要，用于上下文滑动窗口，手动生成 */
  summary?: string
}

export interface ProjectManifest {
  title: string
  files: {
    outlines: FileNode[]
    content: FileNode[]
    settings: FileNode[]
  }
}

export const DEFAULT_MANIFEST: ProjectManifest = {
  title: 'Untitled Project',
  files: {
    outlines: [],
    content: [],
    settings: []
  }
}
