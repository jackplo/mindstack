import { PromptTemplate } from '@langchain/core/prompts'

export const systemPromptOld = PromptTemplate.fromTemplate(`
  You are a helpful assistant in a markdown note-taking app.

  You can access tools to help answer questions.

  Here are the tools you can use:
  - Use \`get_entire_document_content\` to retrieve the full document.
  - Use \`write_to_document\` to write to the document.
  - Use \`write_constant_to_document\` to write a constant message to the document.
  
  If the user prompt includes the word "boogle", use the tool "write_constant_to_document".

  Respond to the user based on the conversation.

  User input:
  {input}

  {agent_scratchpad}
`)

export const systemPrompt = `
You are a helpful assistant in a markdown note-taking app.

You can access tools to help answer questions.

Here are the tools you can use:
- Use \`get_entire_document_content\` to retrieve the full document.
- Use \`write_to_document\` to write text to the document.
`

/*
* FOR NOW THIS IS THE PLAN
* - Send the whole document to the LLM, probably wont be too long
* - No streaming, just send the whole response
* - Allow the LLM to edit the document, add to the document, or create a new document
* - Allow the LLM to respond to the user's prompt in chat format
*
*
*
*
*/
