import { ChatOpenAI } from '@langchain/openai'

class LangChain {
  constructor () {
    // Get API key from environment or global marktext object
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      console.warn('OpenAI API key not found. Please set OPENAI_API_KEY environment variable.')
    }

    this.model = new ChatOpenAI({
      apiKey,
      model: 'gpt-4.1-nano'
    })
  }

  async invoke (message) {
    try {
      const response = await this.model.invoke(message)
      return response
    } catch (error) {
      console.error('LangChain error:', error)
      throw error
    }
  }

  async streamInvoke (message, onChunk) {
    try {
      const stream = await this.model.stream(message)
      let fullResponse = ''

      for await (const chunk of stream) {
        const content = chunk.content || ''
        fullResponse += content
        if (onChunk) {
          onChunk(content)
        }
      }

      return fullResponse
    } catch (error) {
      console.error('LangChain streaming error:', error)
      throw error
    }
  }
}

export default new LangChain()
