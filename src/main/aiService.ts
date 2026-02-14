import { GoogleGenerativeAI } from '@google/generative-ai'
import type { WebContents } from 'electron'

/**
 * Stream chat completion from Gemini and send chunks to the renderer.
 * @param systemContext - 可选，注入到 systemInstruction（如 Story Bible，仅 Active 设定）
 */
export async function streamChat(
  message: string,
  apiKey: string,
  model: string,
  webContents: WebContents,
  systemContext?: string
): Promise<void> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const generativeModel = genAI.getGenerativeModel({
    model: model || 'gemini-2.5-flash',
    ...(systemContext?.trim() ? { systemInstruction: systemContext.trim() } : {})
  })
  const result = await generativeModel.generateContentStream(message)
  for await (const chunk of result.stream) {
    try {
      const text = chunk.text()
      if (text) webContents.send('ai:chat-chunk', text)
    } catch {
      // skip blocked or empty chunks
    }
  }
  webContents.send('ai:chat-done')
}

const EXPAND_PROMPT = (text: string) =>
  `Expand the following text naturally. Output only the expanded version, no explanation or preamble.\n\n${text}`

/**
 * Stream "expand text" from Gemini for the Review Mode workflow.
 * @param systemContext - 可选，注入到 systemInstruction（如 Story Bible）
 */
export async function streamExpand(
  text: string,
  apiKey: string,
  model: string,
  webContents: WebContents,
  systemContext?: string
): Promise<void> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const generativeModel = genAI.getGenerativeModel({
    model: model || 'gemini-2.0-flash',
    ...(systemContext?.trim() ? { systemInstruction: systemContext.trim() } : {})
  })
  const result = await generativeModel.generateContentStream(EXPAND_PROMPT(text))
  for await (const chunk of result.stream) {
    try {
      const part = chunk.text()
      if (part) webContents.send('ai:expand-chunk', part)
    } catch {
      // skip blocked or empty chunks
    }
  }
  webContents.send('ai:expand-done')
}

const SUMMARY_PROMPT = (text: string) =>
  `Summarize the following chapter in 2-4 short sentences. Output only the summary, no preamble or explanation.\n\n${text}`

/**
 * 生成章节摘要（非流式），用于上下文记忆。
 */
export async function generateSummary(
  chapterText: string,
  apiKey: string,
  model: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const generativeModel = genAI.getGenerativeModel({
    model: model || 'gemini-2.5-flash'
  })
  const result = await generativeModel.generateContent(SUMMARY_PROMPT(chapterText))
  const response = result.response
  const text = response.text()
  return text?.trim() ?? ''
}
