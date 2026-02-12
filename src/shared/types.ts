export interface FileNode {
  id: string
  filename: string
  title: string
  /** 子节点，用于分卷等多层级 */
  children?: FileNode[]
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
