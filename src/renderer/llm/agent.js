import { ChatOpenAI } from '@langchain/openai'
import { StateGraph, MessagesAnnotation } from '@langchain/langgraph'
import { toolNode, tools } from './agentTools'
import { systemPrompt } from './prompts/systemPrompt'

class Agent {
  constructor () {
    this.model = this.createChatModel()
    // this.streamingModel = this.createStreamingChatModel()
    this.workflow = this.createWorkflowGraph()
    this.app = this.workflow.compile({
      recursionLimit: 15 // Reduce from default 25 to prevent excessive tool calling
    })
    this.messages = []

    this.messages.push({
      role: 'system',
      content: systemPrompt
    })
  }

  async invoke (message) {
    this.messages.push({ role: 'user', content: message })

    try {
      const result = await this.app.invoke({ messages: this.messages })
      this.messages = result.messages
      const lastMessage = this.messages[this.messages.length - 1]
      return lastMessage.content
    } catch (error) {
      if (error.message && error.message.includes('recursion')) {
        console.error('Recursion limit reached:', error)
        // Reset the conversation to prevent further issues
        this.resetConversation()
        return 'I apologize, but I encountered an issue while processing your request. The task may have been too complex or required too many steps. Please try breaking your request into smaller, more specific tasks.'
      }
      throw error
    }
  }

  resetConversation () {
    this.messages = [{
      role: 'system',
      content: systemPrompt
    }]
  }

  /*
  async * invokeStream (message) {
    this.messages.push({ role: 'user', content: message })

    let currentMessages = [...this.messages]
    let iteration = 0
    const maxIterations = 10 // Prevent infinite loops

    while (iteration < maxIterations) {
      iteration++

      // Stream the LLM response
      const stream = await this.streamingModel.stream(currentMessages)
      let finalResponse = null

      for await (const chunk of stream) {
        if (chunk.content) {
          yield {
            type: 'response',
            content: chunk.content,
            done: false
          }
        }
        finalResponse = chunk
      }

      // Add the complete response to messages
      currentMessages.push(finalResponse)

      // Check if we need to call tools
      if (finalResponse.tool_calls && finalResponse.tool_calls.length > 0) {
        yield {
          type: 'tool_calls',
          tool_calls: finalResponse.tool_calls,
          done: false
        }

        // Execute tools
        const toolResults = await toolNode.invoke({
          messages: currentMessages
        })

        // Add tool results to messages
        currentMessages.push(...toolResults.messages)

        // Yield tool results
        for (const toolMessage of toolResults.messages) {
          yield {
            type: 'tool_result',
            content: toolMessage.content,
            done: false
          }
        }

        // Continue the loop to get the next response
        continue
      } else {
        // No tool calls, we're done
        break
      }
    }

    // Update the agent's message history
    this.messages = currentMessages

    yield {
      type: 'complete',
      done: true
    }
  }
  */

  createChatModel () {
    return new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4.1-nano',
      temperature: 0
    }).bindTools(tools)
  }

  /*
  createStreamingChatModel () {
    return new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini',
      temperature: 0,
      streaming: true
    }).bindTools(tools)
  }
  */

  shouldContinue ({ messages }) {
    const lastMessage = messages[messages.length - 1]
    // If the LLM makes a tool call, then route to the 'tools' node
    if (lastMessage.tool_calls?.length) {
      return 'tools'
    }
    // Otherwise stop and reply to the user using the special '__end__' node
    return '__end__'
  }

  async callModel (state) {
    const response = await this.model.invoke(state.messages)
    return { messages: [response] }
  }

  createWorkflowGraph () {
    return new StateGraph(MessagesAnnotation)
      .addNode('agent', this.callModel.bind(this))
      .addEdge('__start__', 'agent')
      .addNode('tools', toolNode)
      .addEdge('tools', 'agent')
      .addConditionalEdges('agent', this.shouldContinue.bind(this))
  }
}

export default new Agent()
