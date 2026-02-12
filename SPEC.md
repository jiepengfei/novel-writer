# Project Specification: Gemini Novelist (v0.1 UI & File Management)

**Version:** 0.1.0 (UI First Strategy)
**Tech Stack:** Electron + React + TypeScript + Tailwind CSS + Tiptap
**Goal:** Implement the 3-column layout and the File Management System (CRUD) for "Outlines", "Content", and "Settings".

---

## 1. UI Architecture (The 3-Pane Layout)

The application follows a strict 3-column grid design.

### 1.1 Layout Specifications (Tailwind Classes)
* **Container:** `h-screen w-screen flex overflow-hidden bg-white text-gray-800`
* **Left Pane (File Tree):**
    * Width: `w-64` (min-width: 200px, resizable preferred but fixed ok for v0.1).
    * Style: `border-r border-gray-200 bg-gray-50 flex flex-col`.
    * Content: A list of files grouped by category (Outlines/Content/Settings).
* **Center Pane (Editor):**
    * Width: `flex-1` (Auto-fill remaining space).
    * Style: `h-full overflow-y-auto bg-white relative`.
    * Content: The Tiptap editor instance.
* **Right Pane (AI Placeholder):**
    * Width: `w-80`.
    * Style: `border-l border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400`.
    * Content: Static text "AI Assistant (Coming in v0.2)".

---

## 2. File System Architecture (The "Three Buckets")

The application manages a user-selected folder as the "Project Root". Inside, files are strictly categorized.

### 2.1 Directory Structure
When a project is initialized, the system must ensure this structure exists:
```text
MyProjectRoot/
├── project.json       # Metadata & File Ordering
├── outlines/          # Category A: Outline files (.md)
├── content/           # Category B: Story Content files (.md)
└── settings/          # Category C: Setting files (.md)

Note: For v0.1, "Settings" (e.g., Character Bios) are treated as standard Markdown files to reuse the main editor.

2.2 Data Schema (project.json)
Used to track the order and display names of files, separate from their physical filenames.

interface ProjectManifest {
  title: string;
  files: {
    outlines: FileNode[];
    content: FileNode[];
    settings: FileNode[];
  };
}

interface FileNode {
  id: string;        // UUID
  filename: string;  // e.g., "file_a1b2.md"
  title: string;     // Display name, e.g., "Chapter 1"
}

3. Implementation Logic (Backend & Frontend)
3.1 Main Process (Backend)
Class: ProjectManager

initProject(path: string): Creates the 3 subfolders and initial project.json.

createFile(category, title):

Generate UUID.

Create physical file: path/category/{uuid}.md.

Update project.json to add the new node.

Return the new file object.

deleteFile(category, id):

Find filename from project.json.

Delete physical file (or move to trash).

Remove from project.json.

readFile(category, id): Reads the content of the target .md file.

saveFile(category, id, content): Writes content to the target .md file.

IPC Channels:

project:init

file:create

file:delete

file:read

file:save

3.2 Renderer Process (Frontend)
State Management (Zustand):

activeFile: { id: string, category: string } | null

fileTree: The ProjectManifest object loaded from backend.

Components:

FileTreeSidebar:

Renders 3 collapsible sections: 大纲 (Outlines), 正文 (Content), 设定 (Settings).

Each section has a "+" button to create a new file.

Clicking a file sets it as activeFile.

Right-click -> "Delete".

Editor:

Listens to changes in activeFile.

On change: Calls file:read to load content.

On type: Updates local state + Triggers debouncedSave (1000ms delay) calling file:save.

4. Prompt for Cursor (Copy & Paste to start)
"Hello Cursor. I am building v0.1 of the Gemini Novelist App.
Please read the SPEC.md file above.

Phase 1 Goal: Set up the basic Electron + React project with the specified 3-Column Layout.

Phase 2 Goal: Implement the File Management System.

Create the ProjectManager in the main process to handle creating folders (outlines, content, settings) and managing .md files.

Build the FileTreeSidebar to display these categories.

Allow me to Add, Delete, and Select files in the UI.

When a file is selected, load its content into the center Tiptap Editor and support auto-saving.
