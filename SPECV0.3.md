# Phase 3 Update: AI Expansion with "Review Mode" (Like Cursor's Diff)

I want to upgrade the AI expansion feature. instead of just blindly replacing text, I want a **"Review Workflow"** similar to how Cursor edits code (Accept/Reject changes).

**The Workflow:**
1.  **Selection:** I select text and click "✨ Expand" in the BubbleMenu.
2.  **Lock & Stream:** The editor becomes read-only. AI streams the response.
3.  **Visual Diff (The "AI Mark"):**
    * The generated text should replace the selection but be wrapped in a special Tiptap Mark (e.g., `<span class="ai-generated" style="color: purple; background: #f3e8ff;">`).
    * This distinguishes AI text from human text visually.
4.  **Review Menu:**
    * After streaming finishes, show a persistent menu near the text with two buttons:
        * "✅ Accept": Removes the generic styling, keeping the text.
        * "❌ Reject": Reverts the text back to the **Original Selection** (Undo).

**Technical Implementation Requirements:**
1.  **New Tiptap Extension:** Create a custom Mark called `AIHighlight`.
2.  **State Management:** You need to store the `originalText` before the API call starts, so we can restore it if the user clicks Reject.
3.  **UI:** Update the `BubbleMenu` logic:
    * If selection has `AIHighlight` -> Show "Accept/Reject".
    * Else -> Show "Expand".

**Task:**
Please implement this "Review Mode" logic. Start by creating the `AIHighlight` extension and modifying the `ai:expand-text` handler to support this workflow.

# Phase 3.5: Implement "Chat with Selection" (Contextual Chat)

Great! The "Edit/Expand" feature is working nicely. Now I need to implement the **"Chat"** button in the Bubble Menu.

**Goal:**
When I select text in the Editor and click "💬 Chat" in the Bubble Menu, the selected text should be **quoted** in the Right Sidebar's chat input, allowing me to ask questions about it.

**Architecture:**
Since the `Editor` and `ChatSidebar` are separate components, we need to use our global state (Zustand) to communicate.

## Implementation Steps for Cursor:

### 1. Update Global Store (Zustand)
* Modify the `useAppStore` (or `useChatStore`).
* Add a state: `chatDraft: string`.
* Add an action: `setChatDraft(text: string)`.

### 2. Update `EditorBubbleMenu`
* Add a "💬 Chat" button next to the "Expand" button.
* **On Click Logic:**
    1.  Get the current selection text.
    2.  Format it as a Markdown blockquote: `> {selection}\n\n`.
    3.  Call `store.setChatDraft(formattedText)`.
    4.  (Optional) Open the Right Sidebar if it's collapsed.

### 3. Update `ChatSidebar`
* Listen to changes in `chatDraft`.
* When `chatDraft` updates:
    1.  **Auto-focus** the textarea.
    2.  **Set the value** of the textarea to the new draft text.
    3.  Move the cursor to the end of the text so I can start typing my question immediately.

**Task:**
Please implement this "Chat with Selection" workflow. Start by updating the Zustand store to handle the chat draft.
