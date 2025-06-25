export class ChatLog {
  constructor(maxLength = 200, onUpdate = null) {
    this.messages = []
    this.maxLength = maxLength
    this.onUpdate = onUpdate // Optional callback for updating UI
  }

  addMessage(message) {
    this.messages.push(message)

    // Sort by timestamp
    this.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

    // Trim if needed
    if (this.messages.length > this.maxLength) {
      this.messages = this.messages.slice(-this.maxLength)
    }

    // Trigger UI update
    if (typeof this.onUpdate === 'function') {
      this.onUpdate(this.messages)
    }
  }

  addMessages(messageArray) {
    for (const msg of messageArray) {
      this.addMessage(msg)
    }
  }

  getMessages() {
    return [...this.messages] // return a copy
  }

  clear() {
    this.messages = []
    if (typeof this.onUpdate === 'function') {
      this.onUpdate(this.messages)
    }
  }
}

function createChatMessage(role, content, timestamp) {
  return {
    role: role,
    content: content,
    timestamp: timestamp || new Date().toISOString()
  };
}

function formatTime(isoString) {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    hour12: true 
  })
}

export { createChatMessage, formatTime }
