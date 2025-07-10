import { tool } from '@langchain/core/tools'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import store from '@/store'
import bus from '@/bus'
import { wordCount } from 'muya/lib/utils'
import { z } from 'zod'

const getEntireDocumentContent = tool(
  async () => {
    const currentFile = store.state.editor.currentFile
    if (!currentFile) {
      return 'No document is currently open'
    }
    return currentFile.markdown || ''
  },
  {
    name: 'get_entire_document_content',
    description: 'Get the entire content of the document'
  }
)

const writeToDocument = tool(
  async ({ text }) => {
    const file = store.state.editor.currentFile
    console.log('File', file)
    console.log('Writing to document.', text)
    if (!file || typeof file.markdown !== 'string') {
      console.log('No document is currently open')
      return 'No document is currently open.'
    }

    console.log('Current Content', file.markdown)
    const updated = file.markdown.trimEnd() + '\n\n' + text
    const currentWordCount = wordCount(updated)

    // Update the store first
    store.commit('SET_MARKDOWN', updated)
    store.commit('SET_WORD_COUNT', currentWordCount)
    store.commit('SET_SAVE_STATUS', false)

    // Then notify the editor to refresh
    const { id } = file
    bus.$emit('file-changed', {
      id,
      markdown: updated,
      cursor: null,
      renderCursor: false,
      history: null
    })

    console.log('Content After', store.state.editor.currentFile.markdown)
    console.log('Text written to document.', updated)

    return 'Text written to document.'
  },
  {
    name: 'write_to_document',
    description: 'Appends the provided text to the end of the markdown document.',
    schema: z.object({
      text: z.string().describe('The text to write to the document.')
    })
  }
)

export const tools = [
  getEntireDocumentContent,
  writeToDocument
]

export const toolNode = new ToolNode(tools)

/*
DATA FLOW:
User: User types → inputHandler → change event → LISTEN_FOR_CONTENT_CHANGE → Store
AI: AI tools → Store mutations → file-changed event → Editor refresh
*/
