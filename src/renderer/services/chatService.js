import EventEmitter from 'events'
import agent from '../llm/agent'
import editor from '@/store/editor'

class ChatService extends EventEmitter {
  async sendMessage (message, options = {}) {
    const requestId = options.requestId || this._generateRequestId()

    try {
      const response = await agent.invoke(message)

      this.emit('chat-response', { data: response || response, requestId })

      return response.content || response
    } catch (error) {
      this.emit('chat-error', { error: error.message, requestId })
      throw error
    }
  }

  /*
  async * sendMessageStream (message, options = {}) {
    const requestId = options.requestId || this._generateRequestId()

    try {
      const streamGenerator = agent.invokeStream(message)

      for await (const chunk of streamGenerator) {
        // Emit different events based on chunk type
        switch (chunk.type) {
          case 'response':
            this.emit('chat-response-chunk', {
              data: chunk.content,
              requestId,
              done: chunk.done
            })
            yield chunk
            break
          case 'tool_calls':
            this.emit('chat-tool-calls', {
              toolCalls: chunk.tool_calls,
              requestId
            })
            yield chunk
            break
          case 'tool_result':
            this.emit('chat-tool-result', {
              result: chunk.content,
              requestId
            })
            yield chunk
            break
          case 'complete':
            this.emit('chat-complete', { requestId })
            yield chunk
            break
        }
      }
    } catch (error) {
      this.emit('chat-error', { error: error.message, requestId })
      throw error
    }
  }
  */

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
