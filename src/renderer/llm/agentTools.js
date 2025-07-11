import { tool } from '@langchain/core/tools'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import store from '@/store'
import bus from '@/bus'
import { wordCount } from 'muya/lib/utils'
import { z } from 'zod'

const getLineContent = tool(
  async ({ lineNumber }) => {
    const currentFile = store.state.editor.currentFile
    if (!currentFile) {
      return 'No document is currently open'
    }

    const lines = currentFile.markdown.split('\n')
    const targetLine = lineNumber - 1

    if (targetLine < 0) {
      return 'Invalid line number. Line numbers start at 1.'
    }

    if (targetLine >= lines.length) {
      return `Line ${lineNumber} does not exist. Document has ${lines.length} lines.`
    }

    return `Line ${lineNumber}: ${lines[targetLine]}`
  },
  {
    name: 'get_line_content',
    description: 'Get the content of a specific line number.',
    schema: z.object({
      lineNumber: z.number().positive().describe('The line number to retrieve (1-based indexing).')
    })
  }
)

const getLineRange = tool(
  async ({ startLine, endLine }) => {
    const currentFile = store.state.editor.currentFile
    if (!currentFile) {
      return 'No document is currently open'
    }

    const lines = currentFile.markdown.split('\n')
    const start = startLine - 1
    const end = endLine - 1

    if (start < 0 || startLine < 1) {
      return 'Invalid start line number. Line numbers start at 1.'
    }

    if (end < start) {
      return 'End line must be greater than or equal to start line.'
    }

    if (start >= lines.length) {
      return `Start line ${startLine} does not exist. Document has ${lines.length} lines.`
    }

    const actualEnd = Math.min(end, lines.length - 1)
    const selectedLines = lines.slice(start, actualEnd + 1)

    return `Lines ${startLine}-${actualEnd + 1}:\n${selectedLines.map((line, i) => `${start + i + 1}: ${line}`).join('\n')}`
  },
  {
    name: 'get_line_range',
    description: 'Get the content of a range of lines.',
    schema: z.object({
      startLine: z.number().positive().describe('The starting line number (1-based indexing).'),
      endLine: z.number().positive().describe('The ending line number (1-based indexing).')
    })
  }
)

const searchForText = tool(
  async ({ searchTerm, includeLineNumbers = true, contextLines = 2 }) => {
    const currentFile = store.state.editor.currentFile
    if (!currentFile) {
      return 'No document is currently open'
    }

    const lines = currentFile.markdown.split('\n')
    const matches = []

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(searchTerm.toLowerCase())) {
        const contextStart = Math.max(0, i - contextLines)
        const contextEnd = Math.min(lines.length - 1, i + contextLines)

        const contextBlock = []
        for (let j = contextStart; j <= contextEnd; j++) {
          const prefix = j === i ? '>>> ' : '    '
          const lineNum = includeLineNumbers ? `${j + 1}: ` : ''
          contextBlock.push(`${prefix}${lineNum}${lines[j]}`)
        }

        matches.push({
          line: i + 1,
          content: lines[i],
          context: contextBlock.join('\n')
        })
      }
    }

    if (matches.length === 0) {
      return `No matches found for "${searchTerm}"`
    }

    const result = matches.map(match =>
      `Match at line ${match.line}:\n${match.context}`
    ).join('\n\n---\n\n')

    return `Found ${matches.length} match(es) for "${searchTerm}":\n\n${result}`
  },
  {
    name: 'search_for_text',
    description: 'Search for specific text in the document and return matches with surrounding context.',
    schema: z.object({
      searchTerm: z.string().describe('The text to search for (case-insensitive).'),
      includeLineNumbers: z.boolean().default(true).describe('Whether to include line numbers in results.'),
      contextLines: z.number().min(0).max(10).default(2).describe('Number of context lines to show before and after each match.')
    })
  }
)

const getHeadings = tool(
  async ({ maxLevel = 6 }) => {
    const currentFile = store.state.editor.currentFile
    if (!currentFile) {
      return 'No document is currently open'
    }

    const lines = currentFile.markdown.split('\n')
    const headings = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      const match = line.match(/^(#{1,6})\s+(.*)$/)

      if (match) {
        const level = match[1].length
        if (level <= maxLevel) {
          headings.push({
            level,
            text: match[2],
            line: i + 1,
            markdown: line
          })
        }
      }
    }

    if (headings.length === 0) {
      return 'No headings found in the document'
    }

    const result = headings.map(heading =>
      `${'  '.repeat(heading.level - 1)}${'#'.repeat(heading.level)} ${heading.text} (Line ${heading.line})`
    ).join('\n')

    return `Document headings:\n${result}`
  },
  {
    name: 'get_headings',
    description: 'Get all headings in the document with their hierarchy.',
    schema: z.object({
      maxLevel: z.number().min(1).max(6).default(6).describe('Maximum heading level to include (1-6).')
    })
  }
)

const getParagraph = tool(
  async ({ paragraphNumber }) => {
    const currentFile = store.state.editor.currentFile
    if (!currentFile) {
      return 'No document is currently open'
    }

    const text = currentFile.markdown
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0)

    if (paragraphNumber < 1 || paragraphNumber > paragraphs.length) {
      return `Invalid paragraph number. Document has ${paragraphs.length} paragraphs.`
    }

    const paragraph = paragraphs[paragraphNumber - 1].trim()
    return `Paragraph ${paragraphNumber}:\n${paragraph}`
  },
  {
    name: 'get_paragraph',
    description: 'Get a specific paragraph from the document.',
    schema: z.object({
      paragraphNumber: z.number().positive().describe('The paragraph number to retrieve (1-based indexing).')
    })
  }
)

const getDocumentStructure = tool(
  async () => {
    const currentFile = store.state.editor.currentFile
    if (!currentFile) {
      return 'No document is currently open'
    }

    const lines = currentFile.markdown.split('\n')
    const structure = {
      totalLines: lines.length,
      totalWords: wordCount(currentFile.markdown),
      headings: [],
      paragraphs: 0,
      codeBlocks: 0,
      lists: 0
    }

    let inCodeBlock = false
    let currentParagraph = ''

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
      if (headingMatch) {
        structure.headings.push({
          level: headingMatch[1].length,
          text: headingMatch[2],
          line: i + 1
        })
      }

      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock
        if (inCodeBlock) structure.codeBlocks++
      }

      if (line.match(/^[\s]*[-*+]\s/) || line.match(/^[\s]*\d+\.\s/)) {
        structure.lists++
      }

      if (line.length > 0 && !inCodeBlock) {
        currentParagraph += line + ' '
      } else if (currentParagraph.trim().length > 0) {
        structure.paragraphs++
        currentParagraph = ''
      }
    }

    if (currentParagraph.trim().length > 0) {
      structure.paragraphs++
    }

    let result = `Document Structure:
                  - Total Lines: ${structure.totalLines}
                  - Total Words: ${structure.totalWords}
                  - Paragraphs: ${structure.paragraphs}
                  - Code Blocks: ${structure.codeBlocks}
                  - List Items: ${structure.lists}`

    if (structure.headings.length > 0) {
      result += `\n\nHeadings:\n${structure.headings.map(h =>
        `${'  '.repeat(h.level - 1)}${'#'.repeat(h.level)} ${h.text} (Line ${h.line})`
      ).join('\n')}`
    }

    return result
  },
  {
    name: 'get_document_structure',
    description: 'Get an overview of the document structure including headings, word count, and content summary.'
  }
)

const appendToDocument = tool(
  async ({ text }) => {
    const file = store.state.editor.currentFile
    if (!file || typeof file.markdown !== 'string') {
      return 'No document is currently open.'
    }

    const baseContent = file.markdown.trimEnd() + '\n\n'
    const words = text.split(' ')
    let currentText = ''

    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i]
      const updated = baseContent + currentText
      const currentWordCount = wordCount(updated)

      store.commit('SET_MARKDOWN', updated)
      store.commit('SET_WORD_COUNT', currentWordCount)
      store.commit('SET_SAVE_STATUS', false)

      const { id } = file
      bus.$emit('file-changed', {
        id,
        markdown: updated,
        cursor: null,
        renderCursor: false,
        history: null
      })

      await new Promise(resolve => setTimeout(resolve, 50))
    }

    return 'Text appended to document.'
  },
  {
    name: 'append_to_document',
    description: 'Append text to the end of the document with streaming updates.',
    schema: z.object({
      text: z.string().describe('The text to append to the document.')
    })
  }
)

const replaceLine = tool(
  async ({ lineNumber, text }) => {
    const file = store.state.editor.currentFile
    if (!file || typeof file.markdown !== 'string') {
      return 'No document is currently open.'
    }

    const lines = file.markdown.split('\n')
    const targetLine = lineNumber - 1

    while (lines.length <= targetLine) {
      lines.push('')
    }

    const words = text.split(' ')
    let currentText = ''

    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i]
      const tempLines = [...lines]
      tempLines[targetLine] = currentText
      const updated = tempLines.join('\n')
      const currentWordCount = wordCount(updated)

      store.commit('SET_MARKDOWN', updated)
      store.commit('SET_WORD_COUNT', currentWordCount)
      store.commit('SET_SAVE_STATUS', false)

      const { id } = file
      bus.$emit('file-changed', {
        id,
        markdown: updated,
        cursor: null,
        renderCursor: false,
        history: null
      })

      await new Promise(resolve => setTimeout(resolve, 50))
    }

    return `Line ${lineNumber} replaced successfully.`
  },
  {
    name: 'replace_line',
    description: 'Replace the content of a specific line with new text.',
    schema: z.object({
      lineNumber: z.number().positive().describe('The line number to replace (1-based indexing).'),
      text: z.string().describe('The text to replace the line with.')
    })
  }
)

const insertLineBefore = tool(
  async ({ lineNumber, text }) => {
    const file = store.state.editor.currentFile
    if (!file || typeof file.markdown !== 'string') {
      return 'No document is currently open.'
    }

    const lines = file.markdown.split('\n')
    const targetLine = lineNumber - 1

    if (targetLine < 0) {
      return 'Invalid line number. Line numbers start at 1.'
    }

    while (lines.length <= targetLine) {
      lines.push('')
    }

    const words = text.split(' ')
    let currentText = ''

    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i]
      const tempLines = [...lines]
      tempLines.splice(targetLine, 0, currentText)
      const updated = tempLines.join('\n')
      const currentWordCount = wordCount(updated)

      store.commit('SET_MARKDOWN', updated)
      store.commit('SET_WORD_COUNT', currentWordCount)
      store.commit('SET_SAVE_STATUS', false)

      const { id } = file
      bus.$emit('file-changed', {
        id,
        markdown: updated,
        cursor: null,
        renderCursor: false,
        history: null
      })

      await new Promise(resolve => setTimeout(resolve, 50))
    }

    return `New line inserted before line ${lineNumber}.`
  },
  {
    name: 'insert_line_before',
    description: 'Insert a new line of text before a specific line number.',
    schema: z.object({
      lineNumber: z.number().positive().describe('The line number to insert before (1-based indexing).'),
      text: z.string().describe('The text to insert as a new line.')
    })
  }
)

const insertLineAfter = tool(
  async ({ lineNumber, text }) => {
    const file = store.state.editor.currentFile
    if (!file || typeof file.markdown !== 'string') {
      return 'No document is currently open.'
    }

    const lines = file.markdown.split('\n')
    const targetLine = lineNumber - 1

    if (targetLine < 0) {
      return 'Invalid line number. Line numbers start at 1.'
    }

    while (lines.length <= targetLine) {
      lines.push('')
    }

    const words = text.split(' ')
    let currentText = ''

    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i]
      const tempLines = [...lines]
      tempLines.splice(targetLine + 1, 0, currentText)
      const updated = tempLines.join('\n')
      const currentWordCount = wordCount(updated)

      store.commit('SET_MARKDOWN', updated)
      store.commit('SET_WORD_COUNT', currentWordCount)
      store.commit('SET_SAVE_STATUS', false)

      const { id } = file
      bus.$emit('file-changed', {
        id,
        markdown: updated,
        cursor: null,
        renderCursor: false,
        history: null
      })

      await new Promise(resolve => setTimeout(resolve, 50))
    }

    return `New line inserted after line ${lineNumber}.`
  },
  {
    name: 'insert_line_after',
    description: 'Insert a new line of text after a specific line number.',
    schema: z.object({
      lineNumber: z.number().positive().describe('The line number to insert after (1-based indexing).'),
      text: z.string().describe('The text to insert as a new line.')
    })
  }
)

const appendToLine = tool(
  async ({ lineNumber, text }) => {
    const file = store.state.editor.currentFile
    if (!file || typeof file.markdown !== 'string') {
      return 'No document is currently open.'
    }

    const lines = file.markdown.split('\n')
    const targetLine = lineNumber - 1

    if (targetLine < 0) {
      return 'Invalid line number. Line numbers start at 1.'
    }

    while (lines.length <= targetLine) {
      lines.push('')
    }

    const words = text.split(' ')
    let currentText = ''

    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i]
      const tempLines = [...lines]
      tempLines[targetLine] = lines[targetLine] + currentText
      const updated = tempLines.join('\n')
      const currentWordCount = wordCount(updated)

      store.commit('SET_MARKDOWN', updated)
      store.commit('SET_WORD_COUNT', currentWordCount)
      store.commit('SET_SAVE_STATUS', false)

      const { id } = file
      bus.$emit('file-changed', {
        id,
        markdown: updated,
        cursor: null,
        renderCursor: false,
        history: null
      })

      await new Promise(resolve => setTimeout(resolve, 50))
    }

    return `Text appended to line ${lineNumber}.`
  },
  {
    name: 'append_to_line',
    description: 'Append text to the end of a specific line.',
    schema: z.object({
      lineNumber: z.number().positive().describe('The line number to append to (1-based indexing).'),
      text: z.string().describe('The text to append to the line.')
    })
  }
)

const deleteLine = tool(
  async ({ lineNumber }) => {
    const file = store.state.editor.currentFile
    if (!file || typeof file.markdown !== 'string') {
      return 'No document is currently open.'
    }

    const lines = file.markdown.split('\n')
    const targetLine = lineNumber - 1

    if (targetLine < 0) {
      return 'Invalid line number. Line numbers start at 1.'
    }

    if (targetLine >= lines.length) {
      return `Line ${lineNumber} does not exist. Document has ${lines.length} lines.`
    }

    // Remove the line
    const updatedLines = [...lines]
    updatedLines.splice(targetLine, 1)
    const updated = updatedLines.join('\n')
    const currentWordCount = wordCount(updated)

    store.commit('SET_MARKDOWN', updated)
    store.commit('SET_WORD_COUNT', currentWordCount)
    store.commit('SET_SAVE_STATUS', false)

    const { id } = file
    bus.$emit('file-changed', {
      id,
      markdown: updated,
      cursor: null,
      renderCursor: false,
      history: null
    })

    return `Line ${lineNumber} deleted successfully.`
  },
  {
    name: 'delete_line',
    description: 'Delete a specific line from the document.',
    schema: z.object({
      lineNumber: z.number().positive().describe('The line number to delete (1-based indexing).')
    })
  }
)

const deleteInRange = tool(
  async ({ startLine, endLine }) => {
    const file = store.state.editor.currentFile
    if (!file || typeof file.markdown !== 'string') {
      return 'No document is currently open.'
    }

    const lines = file.markdown.split('\n')
    const totalLines = lines.length

    // Validate line numbers
    if (startLine < 1 || startLine > totalLines) {
      return `Invalid start line ${startLine}. Document has ${totalLines} lines (valid range: 1-${totalLines}).`
    }

    if (endLine < 1 || endLine > totalLines) {
      return `Invalid end line ${endLine}. Document has ${totalLines} lines (valid range: 1-${totalLines}).`
    }

    if (startLine > endLine) {
      return 'Start line must be less than or equal to end line.'
    }

    const startIndex = startLine - 1
    const endIndex = endLine - 1

    const linesToDelete = endIndex - startIndex + 1

    const updatedLines = [...lines]
    updatedLines.splice(startIndex, linesToDelete)

    const updated = updatedLines.join('\n')
    const currentWordCount = wordCount(updated)

    store.commit('SET_MARKDOWN', updated)
    store.commit('SET_WORD_COUNT', currentWordCount)
    store.commit('SET_SAVE_STATUS', false)

    const { id } = file
    bus.$emit('file-changed', {
      id,
      markdown: updated,
      cursor: null,
      renderCursor: false,
      history: null
    })

    return `Successfully deleted lines ${startLine}-${endLine} (${linesToDelete} lines). Document now has ${updatedLines.length} lines.`
  },
  {
    name: 'delete_in_range',
    description: 'Delete all lines between two line numbers (inclusive).',
    schema: z.object({
      startLine: z.number().positive().describe('The starting line number to delete (1-based indexing).'),
      endLine: z.number().positive().describe('The ending line number to delete (1-based indexing).')
    })
  }
)

const replaceTextInLine = tool(
  async ({ lineNumber, oldText, newText }) => {
    const file = store.state.editor.currentFile
    if (!file || typeof file.markdown !== 'string') {
      return 'No document is currently open.'
    }

    const lines = file.markdown.split('\n')
    const targetLine = lineNumber - 1

    if (targetLine < 0) {
      return 'Invalid line number. Line numbers start at 1.'
    }

    if (targetLine >= lines.length) {
      return `Line ${lineNumber} does not exist. Document has ${lines.length} lines.`
    }

    const originalLine = lines[targetLine]
    if (!originalLine.includes(oldText)) {
      return `Text "${oldText}" not found in line ${lineNumber}. Line content: "${originalLine}"`
    }

    const words = newText.split(' ')
    let currentText = ''

    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i]
      const tempLine = originalLine.replace(oldText, currentText)
      const tempLines = [...lines]
      tempLines[targetLine] = tempLine
      const updated = tempLines.join('\n')
      const currentWordCount = wordCount(updated)

      store.commit('SET_MARKDOWN', updated)
      store.commit('SET_WORD_COUNT', currentWordCount)
      store.commit('SET_SAVE_STATUS', false)

      const { id } = file
      bus.$emit('file-changed', {
        id,
        markdown: updated,
        cursor: null,
        renderCursor: false,
        history: null
      })

      await new Promise(resolve => setTimeout(resolve, 50))
    }

    return `Text "${oldText}" replaced with "${newText}" in line ${lineNumber}.`
  },
  {
    name: 'replace_text_in_line',
    description: 'Replace specific text within a line with new text.',
    schema: z.object({
      lineNumber: z.number().positive().describe('The line number containing the text to replace (1-based indexing).'),
      oldText: z.string().describe('The exact text to find and replace.'),
      newText: z.string().describe('The new text to replace the old text with.')
    })
  }
)

const insertTextAtPosition = tool(
  async ({ lineNumber, position, text }) => {
    const file = store.state.editor.currentFile
    if (!file || typeof file.markdown !== 'string') {
      return 'No document is currently open.'
    }

    const lines = file.markdown.split('\n')
    const targetLine = lineNumber - 1

    if (targetLine < 0) {
      return 'Invalid line number. Line numbers start at 1.'
    }

    if (targetLine >= lines.length) {
      return `Line ${lineNumber} does not exist. Document has ${lines.length} lines.`
    }

    const originalLine = lines[targetLine]
    if (position < 0 || position > originalLine.length) {
      return `Invalid position ${position}. Line ${lineNumber} has ${originalLine.length} characters.`
    }

    const words = text.split(' ')
    let currentText = ''

    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i]
      const beforeText = originalLine.substring(0, position)
      const afterText = originalLine.substring(position)
      const tempLine = beforeText + currentText + afterText
      const tempLines = [...lines]
      tempLines[targetLine] = tempLine
      const updated = tempLines.join('\n')
      const currentWordCount = wordCount(updated)

      store.commit('SET_MARKDOWN', updated)
      store.commit('SET_WORD_COUNT', currentWordCount)
      store.commit('SET_SAVE_STATUS', false)

      const { id } = file
      bus.$emit('file-changed', {
        id,
        markdown: updated,
        cursor: null,
        renderCursor: false,
        history: null
      })

      await new Promise(resolve => setTimeout(resolve, 50))
    }

    return `Text "${text}" inserted at position ${position} in line ${lineNumber}.`
  },
  {
    name: 'insert_text_at_position',
    description: 'Insert text at a specific character position within a line.',
    schema: z.object({
      lineNumber: z.number().positive().describe('The line number to insert text into (1-based indexing).'),
      position: z.number().min(0).describe('The character position within the line to insert text at (0-based indexing).'),
      text: z.string().describe('The text to insert.')
    })
  }
)

const getTextRange = tool(
  async ({ lineNumber, startPosition, endPosition }) => {
    const file = store.state.editor.currentFile
    if (!file || typeof file.markdown !== 'string') {
      return 'No document is currently open.'
    }

    const lines = file.markdown.split('\n')
    const targetLine = lineNumber - 1

    if (targetLine < 0) {
      return 'Invalid line number. Line numbers start at 1.'
    }

    if (targetLine >= lines.length) {
      return `Line ${lineNumber} does not exist. Document has ${lines.length} lines.`
    }

    const line = lines[targetLine]
    if (startPosition < 0 || startPosition > line.length) {
      return `Invalid start position ${startPosition}. Line ${lineNumber} has ${line.length} characters.`
    }

    if (endPosition < startPosition || endPosition > line.length) {
      return `Invalid end position ${endPosition}. Must be between ${startPosition} and ${line.length}.`
    }

    const textRange = line.substring(startPosition, endPosition)
    return `Text from line ${lineNumber}, positions ${startPosition}-${endPosition}: "${textRange}"`
  },
  {
    name: 'get_text_range',
    description: 'Get a specific range of text from within a line using character positions.',
    schema: z.object({
      lineNumber: z.number().positive().describe('The line number to extract text from (1-based indexing).'),
      startPosition: z.number().min(0).describe('The starting character position (0-based indexing).'),
      endPosition: z.number().min(0).describe('The ending character position (0-based indexing).')
    })
  }
)

export const tools = [
  getLineContent,
  getLineRange,
  searchForText,
  getHeadings,
  getParagraph,
  getDocumentStructure,
  appendToDocument,
  replaceLine,
  insertLineBefore,
  insertLineAfter,
  appendToLine,
  deleteLine,
  deleteInRange,
  replaceTextInLine,
  insertTextAtPosition,
  getTextRange
]

export const toolNode = new ToolNode(tools)

/*
DATA FLOW:
User: User types → inputHandler → change event → LISTEN_FOR_CONTENT_CHANGE → Store
AI: AI tools → Store mutations → file-changed event → Editor refresh
Streaming: AI tools → Streaming callbacks → Real-time UI updates
*/
