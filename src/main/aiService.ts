import { GoogleGenerativeAI } from '@google/generative-ai'
import type { WebContents } from 'electron'

/**
 * Stream chat completion from Gemini and send chunks to the renderer.
 * @param model - 模型名，如 gemini-2.5-flash，由设置传入
 */
export async function streamChat(
  message: string,
  apiKey: string,
  model: string,
  webContents: WebContents
): Promise<void> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const generativeModel = genAI.getGenerativeModel({ model: model || 'gemini-2.5-flash' })
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
