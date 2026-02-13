# Phase 4 Update: Selective Context Injection (The "Active Settings" Toggle)

The user is concerned about Token usage. Instead of sending ALL files in `settings/` every time, we need a way to **select** which settings are currently relevant.

**Goal:**
Add a "Toggle Active" feature to the Settings files in the sidebar. Only "Active" files are sent to the AI.

**Implementation Steps:**

1.  **Backend Data (`project.json`):**
    * Update the `FileNode` interface for items in the `settings` category.
    * Add a property: `isActive: boolean` (default to `false`).

2.  **Sidebar UI Update:**
    * In the `FileTreeSidebar` (specifically for the "Settings" section), add a small **Checkbox** or **Eye Icon** next to each file.
    * Clicking it toggles the `isActive` state in the store/backend.

3.  **Context Logic Update (`ProjectManager`):**
    * Modify `getStoryContext()`:
    * Instead of `fs.readdir` all files, iterate through the `project.settings` array.
    * **Filter:** Only include files where `node.isActive === true`.
    * Read and concatenate only those files.

**Prompt Strategy:**
Please implement this "Active Toggle" logic.
1. Start by updating the `project.json` schema and the `ProjectManager` to handle the `toggleFileActive` action.
2. Then update the Sidebar UI to show the toggle.
