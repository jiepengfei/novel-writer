import { GoogleGenerativeAI } from '@google/generative-ai'
import type { WebContents } from 'electron'

const MODEL = 'gemini-2.5-flash'

/**
 * Stream chat completion from Gemini and send chunks to the renderer.
 */
export async function streamChat(
  message: string,
  apiKey: string,
  webContents: WebContents
): Promise<void> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: MODEL })
  const result = await model.generateContentStream(message)
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
