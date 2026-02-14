# Project Specification: Phase 8.1 - Context Sliding Window

**Version:** 0.8.1 (Optimization)
**Prerequisite:** Phase 8 (Auto-Summarization) in progress.
**Goal:** Limit the number of previous chapter summaries injected into the context to save tokens and improve performance.

---

## 1. Feature Overview

### 1.1 The Problem
Injecting *all* previous chapter summaries (e.g., 100+ chapters) is unnecessary and costly. The AI mainly needs recent context + global settings.

### 1.2 The Solution
* **Configuration:** Add a `maxHistoryChapters` setting (default: 20).
* **Behavior:** When generating context for Chapter N, only include summaries from Chapter (N - 20) to Chapter (N - 1).

---

## 2. Technical Implementation

### 2.1 Storage (`electron-store`)
* Key: `maxHistoryChapters`
* Type: `number`
* Default: `20`
* Location: Same as `geminiApiKey` and `proxyUrl`.

### 2.2 Frontend UI (`SettingsModal`)
1.  Add a new **Number Input** field.
    * **Label:** "Context Window Size (Chapters)"
    * **Description:** "How many previous chapter summaries to send to AI."
    * **Min:** 1, **Max:** 100.
2.  Save this value to `electron-store` on submit.

### 2.3 Backend Logic (`ProjectManager`)

**Update `getStoryContext(currentChapterId)`:**

1.  **Retrieve Limit:**
    ```typescript
    const limit = store.get('maxHistoryChapters', 20);
    ```

2.  **Slice the Array:**
    * Get the list of *previous* chapters (as defined in Phase 8).
    * Apply the slice:
    ```typescript
    // Take the last 'limit' items from the previous chapters list
    const relevantChapters = previousChapters.slice(-limit);
    ```

3.  **Concatenate:**
    * Only fetch and join the summaries of `relevantChapters`.
    * Prepend the "Active Settings" (Characters/World) as usual.

---

## 3. Prompt for Cursor (Copy & Paste)

"Hello Cursor. I need to optimize the token usage for the Context Memory.

**Objective:**
Implement a **Sliding Window** for chapter summaries. I should be able to configure how many previous chapters the AI 'remembers'.

**Step 1: Settings UI**
1.  Update `SettingsModal` to include a number input for `maxHistoryChapters` (default 20).
2.  Save/Load this value using `electron-store`.

**Step 2: Backend Logic**
1.  Modify `getStoryContext` in `ProjectManager`.
2.  Read the `maxHistoryChapters` limit from the store.
3.  When collecting previous chapter summaries, **slice the array** to only include the last N chapters before the current one.

Please start by updating the Settings Modal."
