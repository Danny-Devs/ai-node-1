<!--
  App.vue - Main chat interface component
  
  Features:
  1. Modern layout with header and sidebar
  2. Conversation history and settings in sidebar
  3. Responsive chat area with better spacing
  4. Loading states and error handling
-->

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { ConversationManager } from './lib/ConversationManager';

const messages = ref<{ id: string; role: string; content: string }[]>([]);
const newMessage = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const isLoading = ref(false);
const sidebarOpen = ref(true);
const conversationManager = new ConversationManager();

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};

const sendMessage = async () => {
  const content = newMessage.value.trim();
  if (!content || isLoading.value) return;

  // Add user message
  messages.value.push({
    id: crypto.randomUUID(),
    role: 'user',
    content
  });
  newMessage.value = '';
  await scrollToBottom();

  try {
    isLoading.value = true;
    // Get AI response
    const response = await conversationManager.sendMessage(content);
    messages.value.push({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: response
    });
    await scrollToBottom();
  } catch (error) {
    console.error('Error getting AI response:', error);
    messages.value.push({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Sorry, I encountered an error. Please try again.'
    });
    await scrollToBottom();
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  scrollToBottom();
});
</script>

<template>
  <div class="app-container">
    <!-- Header -->
    <header class="header">
      <button class="menu-button" @click="toggleSidebar">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      <h1 class="header-title">AI Chat</h1>
      <div class="header-actions">
        <button class="action-button">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="3"></circle>
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
            ></path>
          </svg>
        </button>
      </div>
    </header>

    <div class="main-container">
      <!-- Sidebar -->
      <aside class="sidebar" :class="{ 'sidebar-open': sidebarOpen }">
        <div class="sidebar-header">
          <h2>Conversations</h2>
        </div>
        <div class="conversation-list">
          <div class="conversation active">
            <span class="conversation-title">Current Chat</span>
          </div>
          <!-- Add more conversations here -->
        </div>
      </aside>

      <!-- Main chat area -->
      <main class="chat-area" :class="{ 'sidebar-open': sidebarOpen }">
        <div class="chat-container">
          <!-- Message display area with auto-scroll -->
          <div class="messages" ref="messagesContainer">
            <div
              v-for="message in messages"
              :key="message.id"
              class="message-wrapper"
            >
              <div :class="['message', message.role]">
                <div class="message-content">{{ message.content }}</div>
              </div>
            </div>
          </div>

          <!-- Message input form -->
          <div class="input-wrapper">
            <div class="input-container">
              <input
                v-model="newMessage"
                class="message-input"
                type="text"
                placeholder="Type your message..."
                @keyup.enter="sendMessage"
                :disabled="isLoading"
              />
              <button
                class="send-button"
                @click="sendMessage"
                :disabled="isLoading || !newMessage.trim()"
              >
                <span v-if="!isLoading">Send</span>
                <span v-else class="loading-dots">
                  <span>.</span><span>.</span><span>.</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f9fafb;
}

.header {
  height: 60px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
  position: relative;
  z-index: 20;
}

.menu-button {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  margin-right: 1rem;
  border-radius: 0.375rem;
  transition: all 0.2s;
}

.menu-button:hover {
  background: #f3f4f6;
  color: #374151;
}

.header-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.header-actions {
  margin-left: auto;
}

.action-button {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.375rem;
  transition: all 0.2s;
}

.action-button:hover {
  background: #f3f4f6;
  color: #374151;
}

.main-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 300px;
  background: white;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;
  position: relative;
  z-index: 10;
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
}

.conversation-list {
  padding: 1rem;
}

.conversation {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.conversation:hover {
  background: #f3f4f6;
}

.conversation.active {
  background: #e5e7eb;
}

.conversation-title {
  font-size: 0.875rem;
  color: #374151;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  transition: margin-left 0.3s ease;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
  padding: 2rem;
  height: calc(100vh - 60px);
}

.messages {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 2rem;
  padding: 0 1rem;
  scroll-behavior: smooth;
}

.message-wrapper {
  margin: 1rem 0;
}

.message {
  display: inline-block;
  max-width: 85%;
  border-radius: 1rem;
  padding: 0.75rem 1rem;
  line-height: 1.5;
  position: relative;
  font-size: 0.95rem;
  transition: all 0.2s ease;
}

.message.user {
  float: right;
  background: #2563eb;
  color: white;
  border-bottom-right-radius: 0.25rem;
}

.message.assistant {
  float: left;
  background: white;
  color: #1f2937;
  border: 1px solid #e5e7eb;
  border-bottom-left-radius: 0.25rem;
}

.message-content {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.input-wrapper {
  padding: 1rem 0 2rem;
  margin-top: auto;
  background: linear-gradient(180deg, rgba(249, 250, 251, 0) 0%, #f9fafb 20%);
}

.input-container {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  padding: 0.5rem;
  display: flex;
  gap: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.input-container:focus-within {
  border-color: #2563eb;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.1);
}

.message-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  font-size: 0.95rem;
  color: #1f2937;
  outline: none;
}

.message-input::placeholder {
  color: #9ca3af;
}

.send-button {
  padding: 0.75rem 1.5rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-button:not(:disabled):hover {
  background: #1d4ed8;
}

.send-button:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}

.loading-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.loading-dots span {
  animation: loading 1.4s infinite;
  display: inline-block;
}

.loading-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes loading {
  0%,
  100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-2px);
  }
}

/* Custom scrollbar */
.messages::-webkit-scrollbar {
  width: 6px;
}

.messages::-webkit-scrollbar-track {
  background: transparent;
}

.messages::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.messages::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Clear floats after messages */
.message-wrapper::after {
  content: '';
  display: table;
  clear: both;
}

@media (max-width: 768px) {
  .sidebar {
    position: absolute;
    top: 60px;
    bottom: 0;
    left: 0;
    transform: translateX(-100%);
  }

  .sidebar.sidebar-open {
    transform: translateX(0);
  }

  .chat-area {
    margin-left: 0 !important;
  }
}
</style>
