<template>
  <div class="chat-message" :class="{ 'own-message': isOwnMessage }">
    <div class="message-content">
      <div class="message-text">{{ message.text }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ChatMessage',
  props: {
    message: {
      type: Object,
      required: true,
      validator (value) {
        return value && typeof value.text === 'string' && value.timestamp
      }
    },
    isOwnMessage: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    formatTime (timestamp) {
      const date = new Date(timestamp)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }
}
</script>

<style scoped>
.chat-message {
  margin-bottom: 12px;
  animation: fadeIn 0.3s ease-out;
}

.chat-message.own-message {
  justify-content: flex-end;
}

.message-content {
  max-width: 100%;
  padding: 8px 12px;
  border-radius: 6px;
  color: var(--sideBarColor);
  position: relative;
}

.own-message .message-content {
  background: var(--editorBgColor);
  border: 1px solid var(--itemBgColor);
}

.message-text {
  font-size: 12px;
  line-height: 1.4;
  word-wrap: break-word;
  white-space: pre-wrap;
  color: var(--sideBarColor);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
