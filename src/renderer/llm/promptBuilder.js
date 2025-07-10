import { systemPrompt } from './prompts/systemPrompt'

class PromptBuilder {
  constructor () {
    this.systemPrompt = systemPrompt
  }

  async buildPrompt (input, documentContext) {
    const promptValue = await this.systemPrompt.format({
      input,
      documentContext: documentContext || 'No document context available',
      agent_scratchpad: ''
    })

    // Convert PromptValue to string for ChatOpenAI
    return promptValue.toString()
  }
}

export default new PromptBuilder()
