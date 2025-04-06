<!-- TODO: 
- extract UI sections into separate components
- add user authentication -->
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

const messagesContainer = ref<HTMLElement | null>(null);
const messageInput = ref<HTMLInputElement | null>(null);
const newMessage = ref('');
const isLoading = ref(false);
const sidebarOpen = ref(true);
const conversationManager = new ConversationManager();

interface Message {
  role: string;
  content: string;
}

const messages = ref<Message[]>([]);

const scrollToBottom = async () => {
  // Wait for the next tick to ensure the DOM is updated
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};

const sendMessage = async () => {
  if (!newMessage.value.trim()) return;

  const userMessage = newMessage.value;
  newMessage.value = '';

  try {
    await conversationManager.sendMessage(userMessage);
    messages.value = conversationManager.getCurrentMessages();
    await scrollToBottom();
    messageInput.value?.focus();
  } catch (error) {
    console.error('Error sending message:', error);
    // You could add error handling UI here
  }
};

onMounted(() => {
  messageInput.value?.focus();
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
          <h2>Current Chat</h2>
        </div>
        <div class="memory-sections">
          <section class="memory-section">
            <h3>Short-term Memory</h3>
            <div class="memory-items">
              <!-- Placeholder for short-term memory items -->
            </div>
          </section>
          <section class="memory-section">
            <h3>Mid-term Memory</h3>
            <div class="memory-items">
              <!-- Placeholder for mid-term memory items -->
            </div>
          </section>
          <section class="memory-section">
            <h3>Long-term Memory</h3>
            <div class="memory-items">
              <!-- Placeholder for long-term memory items -->
            </div>
          </section>
        </div>
      </aside>

      <!-- Main chat area -->
      <main class="chat-area" :class="{ 'sidebar-open': sidebarOpen }">
        <div class="chat-container">
          <!-- Message display area with auto-scroll -->
          <div class="messages" ref="messagesContainer">
            <div
              v-for="(message, index) in messages"
              :key="index"
              class="message-wrapper"
            >
              <div :class="['message', message.role]">
                <div class="message-content">{{ message.content }}</div>
              </div>
            </div>
          </div>

          <!-- Message input form -->
          <div class="input-container">
            <input
              ref="messageInput"
              v-model="newMessage"
              @keyup.enter="sendMessage"
              placeholder="Type your message..."
              class="message-input"
            />
            <button @click="sendMessage" class="send-button">Send</button>
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

.memory-sections {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.memory-section {
  margin-bottom: 2rem;
}

.memory-section h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  margin: 0 0 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.memory-items {
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
  clear: both;
}

.message {
  display: inline-block;
  max-width: 85%;
  padding: 0.75rem 1rem;
  line-height: 1.5;
  font-size: 0.95rem;
  border-radius: 1rem;
}

.message.user {
  float: right;
  background: #2563eb;
  color: white;
  border-bottom-right-radius: 0.25rem;
}

.message.assistant {
  float: left;
  background: #7c3aed;
  color: white;
  border-bottom-left-radius: 0.25rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.message-content {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.input-container {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 0 2rem;
  margin-top: auto;
  background: linear-gradient(180deg, rgba(249, 250, 251, 0) 0%, #f9fafb 20%);
}

.message-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  font-size: 0.95rem;
  color: #1f2937;
  outline: none;
}

.message-input:focus {
  border-color: #2563eb;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.1);
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
}

.send-button:hover {
  background: #3b82f6;
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
