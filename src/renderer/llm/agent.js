import { ChatOpenAI } from '@langchain/openai'
import { StateGraph, MessagesAnnotation } from '@langchain/langgraph'
import { toolNode, tools } from './agentTools'
import { systemPrompt } from './prompts/systemPrompt'

class Agent {
  constructor () {
    this.model = this.createChatModel()
    this.workflow = this.createWorkflowGraph()
    this.app = this.workflow.compile()
    this.messages = []

    this.messages.push({
      role: 'system',
      content: systemPrompt
    })
  }

  async invoke (message) {
    this.messages.push({ role: 'user', content: message })
    const result = await this.app.invoke({ messages: this.messages })
    this.messages = result.messages
    const lastMessage = this.messages[this.messages.length - 1]
    return lastMessage.content
  }

  createChatModel () {
    return new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4.1-nano',
      temperature: 0
    }).bindTools(tools)
  }

  shouldContinue ({ messages }) {
    const lastMessage = messages[messages.length - 1]
    // If the LLM makes a tool call, then we route to the 'tools' node
    if (lastMessage.tool_calls?.length) {
      return 'tools'
    }
    // Otherwise, we stop (reply to the user) using the special '__end__' node
    return '__end__'
  }

  async callModel (state) {
    const response = await this.model.invoke(state.messages)
    // We return a list, because this will get added to the existing list
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
