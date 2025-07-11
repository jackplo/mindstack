<template>
  <div class="chat-input-container">
    <div class="chat-input-wrapper">
      <textarea
        ref="chatInput"
        v-model="inputMessage"
        @keydown="handleKeyDown"
        @input="handleInput"
        placeholder="Ask a question..."
        class="chat-textarea"
        :style="{ height: textareaHeight + 'px' }"
      />
      <button
        @click="sendMessage"
        :disabled="!inputMessage.trim()"
        class="chat-send-button"
        title="Send message (Enter)"
      >
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ChatInput',
  data () {
    return {
      inputMessage: '',
      textareaHeight: 36,
      minHeight: 36,
      maxHeight: 120
    }
  },
  methods: {
    handleKeyDown (event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        this.sendMessage()
      }
    },
    handleInput () {
      this.adjustTextareaHeight()
    },
    adjustTextareaHeight () {
      const textarea = this.$refs.chatInput
      if (!textarea) return

      textarea.style.height = 'auto'
      const scrollHeight = textarea.scrollHeight
      const newHeight = Math.min(Math.max(scrollHeight, this.minHeight), this.maxHeight)
      this.textareaHeight = newHeight
    },
    sendMessage () {
      const message = this.inputMessage.trim()
      if (!message) return

      this.$emit('send-message', message)
      this.inputMessage = ''
      this.textareaHeight = this.minHeight
    },
    focus () {
      this.$nextTick(() => {
        this.$refs.chatInput?.focus()
      })
    }
  },
  mounted () {
    this.adjustTextareaHeight()
  }
}
</script>

<style scoped>
.chat-input-container {
  padding-bottom: 10px;
  padding-right: 6px;
  padding-left: 6px;
  background: var(--sideBarBgColor);
}

.chat-input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px;
  background: var(--editorBgColor);
  border: 1px solid var(--itemBgColor);
  border-radius: 8px;
  transition: border-color 0.2s ease;
}

.chat-textarea {
  flex: 1;
  min-height: 70px;
  max-height: 120px;
  padding: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--sideBarColor);
  font-family: var(--editorFontFamily);
  font-size: 14px;
  line-height: 20px;
  resize: none;
  overflow-y: hidden;
}

.chat-textarea::placeholder {
  color: var(--sideBarColor);
}

.chat-send-button {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 12px;
  background: var(--themeColor);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.chat-send-button:hover:not(:disabled) {
  background: var(--themeColor);
  opacity: 0.9;
  transform: scale(1.05);
}

.chat-send-button:active:not(:disabled) {
  transform: scale(0.95);
}

.chat-send-button:disabled {
  background: var(--itemBgColor);
  color: var(--editorColor50);
  cursor: not-allowed;
  opacity: 0.6;
}

.chat-send-button svg {
  transition: transform 0.2s ease;
}

.chat-send-button:hover:not(:disabled) svg {
  transform: translateX(1px);
}
</style>
