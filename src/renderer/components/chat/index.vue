<template>
  <div
    v-show="showChatPanel"
    class="chat-panel"
    ref="chatPanel"
    :style="{ 'width': `${finalChatPanelWidth}px` }"
  >
    <div class="drag-bar" ref="dragBar"></div>
    <div class="chat-content">
      <div class="chat-header">
        <div class="chat-title">Chat</div>
        <div class="chat-setting-icon" tooltip="Chat Settings" @click="openChatSettings">
          <svg :viewBox="settingIcon.viewBox">
            <use :xlink:href="settingIcon.url"></use>
          </svg>
        </div>
      </div>
      <div class="chat-messages-container" ref="messagesContainer">
        <div class="chat-messages">
          <chat-message
            v-for="message in messages"
            :key="message.id"
            :message="message"
            :is-own-message="message.isOwnMessage"
          />
        </div>
      </div>
      <chat-input @send-message="handleSendMessage" ref="chatInput" />
    </div>
  </div>
</template>

<script>
import SettingIcon from '@/assets/icons/setting.svg'
import { mapState } from 'vuex'
import ChatInput from './ChatInput.vue'
import ChatMessage from './ChatMessage.vue'
import chatService from '../../services/chatService'

export default {
  name: 'ChatPanel',
  components: {
    ChatInput,
    ChatMessage
  },
  data () {
    this.settingIcon = SettingIcon
    return {
      chatPanelViewWidth: 280,
      messages: [],
      messageIdCounter: 1,
      isWaitingForResponse: false
    }
  },
  computed: {
    ...mapState({
      showChatPanel: state => state.layout.showChatPanel,
      chatPanelWidth: state => state.layout.chatPanelWidth || 280
    }),
    finalChatPanelWidth () {
      const { showChatPanel, chatPanelViewWidth } = this
      if (!showChatPanel) return 0
      return chatPanelViewWidth < 220 ? 220 : chatPanelViewWidth
    }
  },
  methods: {
    openChatSettings () {
      this.$store.dispatch('OPEN_SETTING_WINDOW')
    },
    async handleSendMessage (messageText) {
      const message = {
        id: this.messageIdCounter++,
        text: messageText,
        timestamp: Date.now(),
        isOwnMessage: true
      }
      this.messages.push(message)
      this.scrollToBottom()

      console.log(this.messages)

      await this.sendToAI(messageText)
    },
    async sendToAI (userMessage) {
      if (this.isWaitingForResponse) {
        return
      }
      this.isWaitingForResponse = true

      const loadingMessage = {
        id: this.messageIdCounter++,
        text: 'Thinking...',
        timestamp: Date.now(),
        isOwnMessage: false,
        isLoading: true
      }
      this.messages.push(loadingMessage)
      this.scrollToBottom()

      try {
        const response = await chatService.sendMessageAsync(userMessage, {
          includeContext: true,
          contextOptions: {
            includeCurrentDocument: true,
            includeSelection: true
          }
        })

        this.messages = this.messages.filter(m => m.id !== loadingMessage.id)

        const aiMessage = {
          id: this.messageIdCounter++,
          text: response,
          timestamp: Date.now(),
          isOwnMessage: false
        }
        this.messages.push(aiMessage)
        this.scrollToBottom()
      } catch (error) {
        this.messages = this.messages.filter(m => m.id !== loadingMessage.id)

        const errorMessage = {
          id: this.messageIdCounter++,
          text: `Error: ${error.message}`,
          timestamp: Date.now(),
          isOwnMessage: false,
          isError: true
        }
        this.messages.push(errorMessage)
        this.scrollToBottom()
      } finally {
        this.isWaitingForResponse = false
      }
    },
    scrollToBottom () {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer
        if (container) {
          container.scrollTop = container.scrollHeight
        }
      })
    },
    handleResize () {
      // Handle any resize logic if needed
    }
  },
  created () {
    this.$nextTick(() => {
      const dragBar = this.$refs.dragBar
      let startX = 0
      let chatPanelWidth = +this.chatPanelWidth
      let startWidth = chatPanelWidth

      this.chatPanelViewWidth = chatPanelWidth

      const mouseUpHandler = event => {
        document.removeEventListener('mousemove', mouseMoveHandler, false)
        document.removeEventListener('mouseup', mouseUpHandler, false)
        this.$store.dispatch('CHANGE_CHAT_PANEL_WIDTH', chatPanelWidth < 220 ? 220 : chatPanelWidth)
      }

      const mouseMoveHandler = event => {
        const offset = startX - event.clientX
        chatPanelWidth = startWidth + offset
        this.chatPanelViewWidth = chatPanelWidth
      }

      const mouseDownHandler = event => {
        startX = event.clientX
        startWidth = +this.chatPanelWidth
        document.addEventListener('mousemove', mouseMoveHandler, false)
        document.addEventListener('mouseup', mouseUpHandler, false)
      }

      if (dragBar) {
        dragBar.addEventListener('mousedown', mouseDownHandler, false)
      }
    })
  }
}
</script>

<style scoped>
.chat-panel {
  display: flex;
  flex-shrink: 0;
  flex-grow: 0;
  width: 280px;
  height: 100vh;
  min-width: 220px;
  position: relative;
  color: var(--sideBarColor);
  user-select: none;
}

.drag-bar {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  height: 100%;
  width: 3px;
  cursor: col-resize;
  z-index: 10;
  background: var(--sideBarBgColor);
}

.drag-bar:hover {
  border-left: 2px solid var(--iconColor);
}

.chat-content {
  flex: 1;
  width: calc(100% - 3px);
  padding-left: 3px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 16px;
  background: var(--sideBarBgColor);
}

.chat-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--sideBarColor);
}

.chat-setting-icon {
  width: 18px;
  height: 18px;
  cursor: pointer;
  & > svg {
    width: 18px;
    height: 18px;
    fill: var(--sideBarIconColor);
    opacity: 1;
  }
}

.chat-clear-button {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--sideBarColor);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: all 0.2s ease;
}

.chat-clear-button:hover {
  opacity: 1;
  background: var(--itemBgColor);
}

.chat-messages-container {
  background: var(--sideBarBgColor);
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.chat-messages {
  padding: 10px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  opacity: 0.6;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 14px;
  color: var(--editorColor);
}

/* Custom scrollbar */
.chat-messages-container::-webkit-scrollbar {
  width: 6px;
}

.chat-messages-container::-webkit-scrollbar-track {
  background: var(--sideBarBgColor);
}

.chat-messages-container::-webkit-scrollbar-thumb {
  background: var(--itemBgColor);
  border-radius: 0px;
}

.chat-messages-container::-webkit-scrollbar-thumb:hover {
  background: var(--iconColor);
}
</style>
