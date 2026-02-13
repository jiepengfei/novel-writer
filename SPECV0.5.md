# Project Specification: Phase 5 - Structure Management (Drag & Drop Only)

**Version:** 0.5.0 (Structure Manager)
**Prerequisite:** Phase 4 completed.
**Goal:** Implement Drag-and-Drop reordering for files in the Sidebar to manage the story structure.

---

## 1. Feature Overview

### 1.1 Drag & Drop Sorting
* **Problem:** Writers need to rearrange chapters frequently (e.g., moving Chapter 5 before Chapter 3). Alphabetical sorting is insufficient.
* **Solution:** Implement a Drag & Drop interface in the `FileTreeSidebar`.
* **Scope:** Apply to all sections ("Outlines", "Content", "Settings"), but strictly manage the order via `project.json`.
* **Behavior:**
    1.  User drags a file item in the sidebar.
    2.  Visual feedback shows the new position.
    3.  On drop, the UI updates immediately.
    4.  The new order is saved to `project.json` so it persists after restart.

---

## 2. Technical Implementation

### 2.1 Dependencies
* **Frontend:** Install `@dnd-kit/core` and `@dnd-kit/sortable`.
  * *Reason:* It's a modern, lightweight, and accessible DnD library for React.

### 2.2 Backend Logic (`ProjectManager`)

1.  **`reorderFiles(category: string, newOrderIds: string[]): void`**
    * **Input:** The category name (e.g., "content") and the array of File IDs in the new order.
    * **Logic:**
        * Read `project.json`.
        * Re-sort the `projectData.files[category]` array to match the incoming `newOrderIds`.
        * Save `project.json` to disk.
    * **Return:** Success/Failure boolean.

### 2.3 Frontend Logic (`FileTreeSidebar`)

1.  **Context Wrapper:** Wrap the file list in `<DndContext>` with `closestCenter` collision detection.
2.  **Sortable Strategy:** Wrap the list items in `<SortableContext>` using `verticalListSortingStrategy`.
3.  **Draggable Components:** Convert the existing `FileItem` component into a `SortableItem` (using `useSortable` hook).
4.  **Event Handling:**
    * Implement `handleDragEnd(event)`.
    * Check if `active.id !== over.id`.
    * Use `arrayMove` to update the local state.
    * **Debounce/Trigger:** Call `ipc:file-reorder` to save the new order to the backend.

---

## 3. API Contract (IPC)

| Channel | Type | Payload | Description |
| :--- | :--- | :--- | :--- |
| `file:reorder` | `invoke` | `{ category, newOrderIds }` | Save new sort order to project.json |

---

## 4. Prompt for Cursor (Copy & Paste)

"Hello Cursor. We are moving to **Phase 5: Structure Management (Drag & Drop)**.
Renaming is already done, so we strictly focus on **Reordering**.

**Objective:**
I need to be able to **reorder** my chapters/files in the sidebar via Drag & Drop.

**Step 1: Setup & Backend**
1.  Install `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities`.
2.  In `ProjectManager`, implement `reorderFiles(category, newOrderIds)`. This function should update the order of the file array in `project.json` and save it.
3.  Expose this via the `file:reorder` IPC channel.

**Step 2: Frontend Implementation**
1.  Refactor `FileTreeSidebar.tsx` to use `@dnd-kit`.
2.  Make the file items draggable using `useSortable`.
3.  Handle the `onDragEnd` event:
    * Update the local UI state immediately (`arrayMove`).
    * Send the new ID order to the backend via `file:reorder`.

Please start by installing the dependencies."
