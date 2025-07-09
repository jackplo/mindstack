import EventEmitter from 'events'
import langChain from '../llm/langChain'
import promptBuilder from '../llm/promptBuilder'
import editor from '@/store/editor'

class ChatService extends EventEmitter {
  async sendMessage (message, options = {}) {
    const requestId = options.requestId || this._generateRequestId()

    try {
      let context = this.getDocumentContext()

      const prompt = await promptBuilder.buildPrompt(message, context)

      const response = await langChain.invoke(prompt)

      this.emit('chat-response', { data: response.content || response, requestId })

      return response.content || response
    } catch (error) {
      this.emit('chat-error', { error: error.message, requestId })
      throw error
    }
  }

  getDocumentContext () {
    const currentFile = editor.state.currentFile

    if (!currentFile) {
      return 'No document is currently open'
    }
    return currentFile.markdown || ''
  }

  _generateRequestId () {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  async sendMessageAsync (message, options = {}) {
    return this.sendMessage(message, options)
  }
}

export default new ChatService()
