import { Injectable } from '@nestjs/common'

interface GeminiGenerateJsonInput {
  systemInstruction: string
  prompt: string
  model?: string
  temperature?: number
}

@Injectable()
export class GeminiClientService {
  private readonly defaultModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

  async generateJson<T>({
    systemInstruction,
    prompt,
    model,
    temperature = 0.2,
  }: GeminiGenerateJsonInput): Promise<T | null> {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return null
    }

    const selectedModel = model || this.defaultModel
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\n${prompt}` }],
            },
          ],
          generationConfig: {
            temperature,
            responseMimeType: 'application/json',
          },
        }),
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json() as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>
          }
        }>
      }

      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (!rawText) {
        return null
      }

      const normalizedText = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim()

      return JSON.parse(normalizedText) as T
    } catch {
      return null
    }
  }
}
