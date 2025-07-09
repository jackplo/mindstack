import { systemPrompt, systemNewPrompt } from './prompts/systemPrompt'

class PromptBuilder {
  constructor () {
    this.systemPrompt = systemPrompt
    this.systemNewPrompt = systemNewPrompt
  }

  async buildPrompt (userPrompt, documentContext) {
    const promptValue = await this.systemPrompt.format({
      userPrompt,
      documentContext: documentContext || 'No document context available'
    })

    // Convert PromptValue to string for ChatOpenAI
    return promptValue.toString()
  }
}

export default new PromptBuilder()
