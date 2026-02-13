# Project Specification: Phase 6 - Export & Compilation

**Version:** 0.6.0 (The Publisher)
**Prerequisite:** Phase 5 (Drag & Drop) completed.
**Goal:** Merge all scattered chapter files into a single document based on the `project.json` order.

---

## 1. Feature Overview

### 1.1 The "Compile" Feature
* **Problem:** The novel exists as many small `.md` files.
* **Solution:** Create an "Export" function that:
    1.  Reads the chapter order from `project.json`.
    2.  Reads the content of each file.
    3.  Concatenates them into a single string with separators.
    4.  Saves the result as a `.txt` file to a location chosen by the user.

---

## 2. Technical Implementation

### 2.1 Backend Logic (`ProjectManager`)

1.  **`exportProject(category: string, targetPath: string): void`**
    * **Step 1:** Read `project.json` to get the sorted list of files for the given category (usually "content").
    * **Step 2:** Iterate through the list.
    * **Step 3:** Read each file's content.
    * **Step 4:** Format the output:
        ```text
        ### [Chapter Title]

        [Chapter Content]

        ---
        (Next Chapter)
        ```
    * **Step 5:** Write the final huge string to `targetPath`.

### 2.2 Frontend UI
1.  **Export Button:** Add an "Export" icon/button in the Sidebar Header (next to the project title).
2.  **Save Dialog:** When clicked, trigger `dialog:save-file` (Native OS Save Dialog) to let the user pick where to save the `.txt` file.
3.  **Trigger:** Call `project:export` with the chosen path.

---

## 3. API Contract (IPC)

| Channel | Type | Payload | Description |
| :--- | :--- | :--- | :--- |
| `dialog:show-save` | `invoke` | `void` | Open OS save dialog, return path |
| `project:export` | `invoke` | `{ category, path }` | Perform the merge and save |

---

## 4. Prompt for Cursor (Copy & Paste)

"Hello Cursor. We are reaching the final core feature: **Phase 6: Export**.

**Objective:**
I need to merge all my chapters into a single `.txt` file so I can publish my novel.

**Step 1: Backend Logic**
1.  Implement `exportProject(category, targetPath)` in `ProjectManager`.
2.  It must follow the **order** defined in `project.json`.
3.  Between chapters, insert the Chapter Title and a separator (e.g., `\n\n### Title\n\n`).

**Step 2: Frontend UI**
1.  Add an **Export Button** to the Sidebar header.
2.  When clicked, open the native System Save Dialog (`dialog.showSaveDialog`) to let me choose the destination.
3.  Call the backend to perform the export.

Please start by implementing the backend export logic."
