# Project Specification: Gemini Novelist (v0.2 AI Connection)

**Version:** 0.2.0 (AI Integration)
**Prerequisite:** v0.1 (UI & File System) completed.
**Goal:** Implement the Settings configuration (API Key) and a functional real-time Chat Sidebar using Google Gemini.

---

## 1. Feature Overview

This phase connects the application to the "Brain" (Gemini).

### 1.1 Settings Management
* **Problem:** The app needs a valid Google Gemini API Key to work.
* **Solution:** A "Settings" modal allows the user to input their key.
* **Storage:** The key is saved locally using `electron-store` (persists after restart).

### 1.2 The Chat Interface (Right Pane)
* **Problem:** The right pane is currently a placeholder.
* **Solution:** Replace it with a chat interface.
* **Interaction:** User types a message -> App sends to Gemini -> Gemini streams the answer back letter-by-letter.

---

## 2. Technical Architecture

### 2.1 Dependencies
* `electron-store`: For saving the API Key and user preferences.
* `@google/generative-ai`: Google's official Node.js SDK.

### 2.2 Data Flow (Streaming)
Unlike standard HTTP requests, we use **Streaming** to reduce perceived latency.

1.  **Renderer:** Emits `ai:chat-start` with `{ message, history }`.
2.  **Main:**
    * Retrieves API Key from Store.
    * Initializes Gemini Model.
    * Calls `model.generateContentStream(prompt)`.
    * **Loop:** As chunks arrive, sends `ai:chat-chunk` to Renderer.
    * **End:** Sends `ai:chat-done`.
3.  **Renderer:** Listens to chunks and appends text to the last message in state.

---

## 3. Implementation Steps

### Step 1: Configuration Infrastructure
**Goal:** Ability to save/load settings.
1.  **Install:** `npm install electron-store @google/generative-ai`
2.  **Main Process:**
    * Initialize `store`.
    * IPC `settings:get`: Returns `{ geminiApiKey }`.
    * IPC `settings:save`: Accepts `{ key, value }` and saves to store.

### Step 2: The Settings Modal
**Goal:** UI for user input.
1.  **Component:** Create `SettingsModal.tsx`.
    * Input field for "Gemini API Key".
    * "Save" button.
2.  **Trigger:** Add a "⚙️ Settings" button (e.g., at the bottom of the Left Sidebar).
3.  **Logic:** On save, call `settings:save`.

### Step 3: The AI Backend Service
**Goal:** The logic that talks to Google.
1.  **Main Process:** Create `AIService.ts`.
    * Function `streamChat(prompt, apiKey, webContents)`.
    * Use `getGenerativeModel({ model: "gemini-2.5-pro" })`.
2.  **IPC Handler:**
    * Listen for `ai:chat-start`.
    * Validation: If no API Key in store, reply with error "Please configure API Key".
    * Call `AIService.streamChat`.

### Step 4: The Chat UI (Right Pane)
**Goal:** Replace the placeholder.
1.  **State:** `messages: { role: 'user' | 'model', content: string }[]`.
2.  **Component:** `ChatSidebar.tsx`.
    * **Message List:** Scrollable area showing bubbles.
    * **Input Area:** Textarea + Send Button.
3.  **Streaming Logic:**
    * On Send: Append user message to list. Create an empty 'model' message.
    * On `ai:chat-chunk`: Append incoming text to the *last* 'model' message.

---

## 4. API Contract (IPC Channels)

| Channel | Type | Payload | Direction | Description |
| :--- | :--- | :--- | :--- | :--- |
| `settings:get` | `invoke` | `void` | Renderer -> Main | Get config object |
| `settings:save` | `invoke` | `{ key: string, value: any }` | Renderer -> Main | Save config |
| `ai:chat-start` | `send` | `{ message: string }` | Renderer -> Main | Start a new chat turn |
| `ai:chat-chunk` | `on` | `string` (text fragment) | Main -> Renderer | Streaming response |
| `ai:chat-done` | `on` | `void` | Main -> Renderer | Stream finished |
| `ai:error` | `on` | `string` (error msg) | Main -> Renderer | Error handling |

---

## 5. Prompt for Cursor (Copy & Paste)

"Hello Cursor. I need to implement **Phase 2: AI Integration** based on the SPEC above.

**Tasks:**
1.  Install `electron-store` and `@google/generative-ai`.
2.  **Backend:** Set up the `Store` and the IPC handlers for saving/loading the API Key.
3.  **Frontend:** Create a `SettingsModal` triggered by a button in the sidebar to input the API Key.
4.  **Backend:** Implement the `ai:chat-start` handler that uses the Google SDK to **stream** responses back to the frontend.
5.  **Frontend:** Build the `ChatSidebar` in the right pane. It should send messages to the backend and display the streaming response in real-time.

Please start by installing the dependencies and setting up the Settings Store."
