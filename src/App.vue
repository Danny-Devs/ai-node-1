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
import { ref, onMounted, nextTick, computed } from 'vue';
import {
  ConversationManager,
  type Message,
  type ApiError
} from './lib/ConversationManager';
import { supabase } from './lib/supabase';
import { useDark, useToggle } from '@vueuse/core';

interface RelatedConversation {
  conversation_id: string;
  summary: string;
  tags: string[];
  created_at: string;
  raw_conversation: string;
}

const messagesContainer = ref<HTMLElement | null>(null);
const messageInput = ref<HTMLInputElement | null>(null);
const newMessage = ref('');
const isLoading = computed(() => conversationManager.isLoading());
const sidebarOpen = ref(true);
const conversationManager = new ConversationManager();
const selectedTags = ref<string[]>([]);
const relatedConversations = ref<RelatedConversation[]>([]);
const showRawConversation = ref<string | null>(null);
const error = computed(() => conversationManager.getError());

const messages = computed(() => conversationManager.getCurrentMessages());
const context = computed(() => conversationManager.getContext());

const isDark = useDark();
const toggleDark = useToggle(isDark);

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
  if (!newMessage.value.trim() || isLoading.value) return;

  const messageToSend = newMessage.value;
  newMessage.value = '';

  try {
    await conversationManager.sendMessage(messageToSend);
    await scrollToBottom();
  } catch (err) {
    console.error('Failed to send message:', err);
  }
};

const filterByTags = async (tags: string[]) => {
  selectedTags.value = tags;
  relatedConversations.value = (await conversationManager.searchByTags(
    tags
  )) as RelatedConversation[];
};

const addConversationContext = async (conversationId: string) => {
  await conversationManager.injectContext(conversationId);
  await scrollToBottom();
};

const addSampleData = async () => {
  try {
    const response = await fetch('/api/sample-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Failed to add sample data');
    }

    // Get all unique tags from the context
    const { data: contextData, error: contextError } = await supabase
      .from('conversation_contexts')
      .select('tags');

    if (contextError) throw contextError;

    // Extract unique tags
    const allTags = new Set<string>();
    contextData?.forEach((ctx: { tags?: string[] }) => {
      ctx.tags?.forEach((tag: string) => allTags.add(tag));
    });

    // Update selected tags and search
    if (allTags.size > 0) {
      selectedTags.value = Array.from(allTags).slice(0, 3); // Select first 3 tags
      relatedConversations.value = (await conversationManager.searchByTags(
        selectedTags.value
      )) as RelatedConversation[];
    }
  } catch (err) {
    console.error('Error adding sample data:', err);
  }
};

onMounted(() => {
  messageInput.value?.focus();
});
</script>

<template>
  <div class="app-container" :class="{ dark: isDark }">
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
        <button class="theme-toggle" @click="toggleDark()">
          {{ isDark ? '🌙' : '☀️' }}
        </button>
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
            <h3>Current Conversation</h3>
            <div class="memory-items">
              <div v-if="context.summary" class="context-summary">
                <h4>Summary</h4>
                <p>{{ context.summary }}</p>
              </div>
              <div v-if="context.keyTerms?.length" class="key-terms">
                <h4>Tags</h4>
                <div class="tag-cloud">
                  <span
                    v-for="term in context.keyTerms"
                    :key="term"
                    class="tag"
                    :class="{ selected: selectedTags.includes(term) }"
                    @click="filterByTags([...selectedTags, term])"
                  >
                    {{ term }}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section class="memory-section">
            <h3>Related Conversations</h3>
            <div class="memory-items">
              <div v-if="selectedTags.length" class="selected-filters">
                <span
                  v-for="tag in selectedTags"
                  :key="tag"
                  class="selected-tag"
                  @click="filterByTags(selectedTags.filter(t => t !== tag))"
                >
                  {{ tag }} ×
                </span>
              </div>

              <div
                v-if="relatedConversations.length"
                class="related-conversations"
              >
                <div
                  v-for="conv in relatedConversations"
                  :key="conv.conversation_id"
                  class="related-conversation"
                >
                  <div class="conversation-header">
                    <h4>
                      {{ new Date(conv.created_at).toLocaleDateString() }}
                    </h4>
                    <button
                      class="inject-button"
                      @click="addConversationContext(conv.conversation_id)"
                    >
                      Add Context
                    </button>
                  </div>
                  <p class="conversation-summary">{{ conv.summary }}</p>
                  <div class="conversation-tags">
                    <span
                      v-for="tag in conv.tags"
                      :key="tag"
                      class="mini-tag"
                      :class="{ selected: selectedTags.includes(tag) }"
                      @click="filterByTags([...selectedTags, tag])"
                    >
                      {{ tag }}
                    </span>
                  </div>
                  <button
                    class="view-raw"
                    @click="showRawConversation = conv.conversation_id"
                  >
                    View Full Conversation
                  </button>
                </div>
              </div>
              <p v-else-if="selectedTags.length" class="no-results">
                No conversations found with selected tags
              </p>
              <p v-else class="placeholder-text">
                Select tags above to find related conversations
              </p>
            </div>
          </section>
        </div>

        <!-- Add sample data button -->
        <button class="sample-data-button" @click="addSampleData">
          Add Sample Data
        </button>
      </aside>

      <!-- Main chat area -->
      <main class="chat-area" :class="{ 'sidebar-open': sidebarOpen }">
        <div class="chat-container">
          <!-- Error display -->
          <div v-if="error" class="error-message">
            <p>{{ error.message }}</p>
            <button @click="error = null" class="close-error">×</button>
          </div>

          <!-- Messages -->
          <div class="messages" ref="messagesContainer">
            <div
              v-for="(message, index) in messages"
              :key="index"
              class="message"
              :class="message.role"
            >
              {{ message.content }}
            </div>

            <!-- Loading indicator -->
            <div v-if="isLoading" class="message assistant loading">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>

          <!-- Input area -->
          <div class="input-container">
            <input
              v-model="newMessage"
              class="message-input"
              placeholder="Type your message..."
              @keyup.enter="sendMessage"
              :disabled="isLoading"
            />
            <button
              class="send-button"
              @click="sendMessage"
              :disabled="!newMessage.trim() || isLoading"
            >
              {{ isLoading ? 'Sending...' : 'Send' }}
            </button>
          </div>
        </div>
      </main>
    </div>
  </div>

  <div v-if="showRawConversation" class="raw-conversation-modal">
    <div class="modal-content">
      <button class="close-button" @click="showRawConversation = null">
        ×
      </button>
      <h3>Full Conversation</h3>
      <div class="raw-conversation-text">
        {{
          relatedConversations.find(
            c => c.conversation_id === showRawConversation
          )?.raw_conversation
        }}
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Component-specific styles */
.app-container {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-main);
  color: var(--text-primary);
}

.app-container.dark {
  --bg-main: #1a1b1e;
  --bg-white: #2c2e33;
  --bg-sidebar: #25262b;
  --bg-message-user: #3b82f6;
  --bg-message-assistant: #2c2e33;
  --bg-message-system: #4b5563;
  --text-primary: #e5e7eb;
  --text-secondary: #d1d5db;
  --text-muted: #9ca3af;
  --text-on-primary: #ffffff;
  --border-color: #374151;
  --shadow-color: rgba(0, 0, 0, 0.2);
  --input-bg: #1f2937;
  --input-border: #4b5563;
  --tag-bg: #374151;
  --tag-text: #d1d5db;
  --tag-bg-selected: #3b82f6;
  --tag-text-selected: #ffffff;
  --primary: #3b82f6;
  --primary-dark: #2563eb;
}

/* Header */
.header {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
  background: var(--bg-white);
  border-bottom: 1px solid var(--border-color);
  gap: 1rem;
}

.menu-button {
  background: none;
  border: none;
  color: var(--text-muted);
  padding: 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.menu-button:hover {
  background: var(--bg-main);
  color: var(--text-primary);
}

.header-title {
  color: var(--text-primary);
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.header-actions {
  margin-left: auto;
}

/* Main content */
.main-container {
  flex: 1;
  display: flex;
  min-height: 0;
  position: relative;
}

/* Sidebar */
.sidebar {
  width: 300px;
  display: flex;
  flex-direction: column;
  background: var(--bg-white);
  border-right: 1px solid var(--border-color);
  height: calc(100vh - 60px);
}

.sidebar-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.sidebar-header h2 {
  color: var(--text-primary);
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}

.memory-sections {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
}

/* Chat area */
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: calc(100vh - 60px);
  overflow: hidden;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
  padding: 1.5rem;
  height: 100%;
  overflow: hidden;
}

/* Messages */
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0;
  margin-bottom: 1rem;
}

.message {
  display: inline-block;
  max-width: 85%;
  padding: 0.75rem 1rem;
  margin: 0.5rem 0;
  border-radius: 1rem;
  clear: both;
  line-height: 1.5;
  font-size: 0.95rem;
}

.message.user {
  float: right;
  background: var(--primary);
  color: var(--text-on-primary);
  border-bottom-right-radius: 0.25rem;
}

.message.assistant {
  float: left;
  background: var(--bg-white);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-bottom-left-radius: 0.25rem;
}

.message.system {
  float: left;
  background: var(--bg-message-system);
  color: var(--text-on-primary);
  border-radius: 0.5rem;
  font-style: italic;
  font-size: 0.875rem;
  max-width: 100%;
  margin: 1rem 0;
}

/* Input area */
.input-container {
  padding: 1rem 1.5rem;
  background: var(--bg-white);
  border-radius: 1rem;
  display: flex;
  gap: 0.75rem;
  margin-top: auto;
  box-shadow: 0 2px 4px var(--shadow-color);
}

.message-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid var(--input-border);
  border-radius: 0.75rem;
  font-size: 0.95rem;
  color: var(--text-primary);
  background: var(--input-bg);
  transition: all 0.2s ease;
}

.message-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 2px 4px var(--shadow-color);
}

.message-input:disabled {
  background: var(--bg-main);
  cursor: not-allowed;
}

.send-button {
  padding: 0.75rem 1.5rem;
  background: var(--primary);
  color: var(--text-on-primary);
  border: none;
  border-radius: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.send-button:hover:not(:disabled) {
  background: var(--primary-dark);
  transform: translateY(-1px);
}

.send-button:disabled {
  background: var(--bg-message-system);
  cursor: not-allowed;
}

/* Sample data button */
.sample-data-button {
  margin: 1.25rem;
  padding: 0.75rem 1rem;
  background: var(--primary);
  color: var(--text-on-primary);
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sample-data-button:hover {
  background: var(--primary-dark);
  transform: translateY(-1px);
}

/* Tags and related content */
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.tag {
  background: var(--tag-bg);
  color: var(--tag-text);
  padding: 0.375rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag:hover {
  background: var(--primary);
  color: var(--text-on-primary);
}

.tag.selected {
  background: var(--tag-bg-selected);
  color: var(--tag-text-selected);
}

/* Error message */
.error-message {
  position: fixed;
  top: 1rem;
  right: 1rem;
  background: #fee2e2;
  border: 1px solid #ef4444;
  color: #b91c1c;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 50;
  max-width: 24rem;
  box-shadow: 0 2px 4px var(--shadow-color);
}

/* Loading indicator */
.message.loading {
  background: var(--bg-main);
  min-height: 2.5rem;
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
}

.typing-indicator {
  display: flex;
  gap: 0.25rem;
  padding: 0.5rem;
}

.typing-indicator span {
  width: 0.5rem;
  height: 0.5rem;
  background: var(--text-muted);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .sidebar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    z-index: 20;
  }

  .sidebar.sidebar-open {
    transform: translateX(0);
  }

  .chat-container {
    padding: 1rem;
  }

  .input-container {
    margin: 0 0.5rem 0.5rem;
  }
}

.context-summary {
  background: #f8fafc;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
}

.context-summary h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
  margin: 0 0 0.5rem;
}

.context-summary p {
  font-size: 0.875rem;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}

.key-terms {
  margin-bottom: 1rem;
}

.key-terms h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
  margin: 0 0 0.5rem;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background: #e2e8f0;
  color: #475569;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.tag.selected {
  background: #2563eb;
  color: white;
}

.placeholder-text {
  color: #94a3b8;
  font-size: 0.875rem;
  font-style: italic;
}

.selected-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.selected-tag {
  background: #2563eb;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
}

.related-conversations {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.conversation-header h4 {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.inject-button {
  background: #2563eb;
  color: white;
  border: none;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  cursor: pointer;
}

.conversation-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.5rem;
}

.mini-tag {
  background: #f3f4f6;
  color: #6b7280;
  padding: 0.125rem 0.5rem;
  border-radius: 0.75rem;
  font-size: 0.75rem;
  cursor: pointer;
}

.mini-tag.selected {
  background: #2563eb;
  color: white;
}

.view-raw {
  background: none;
  border: none;
  color: #6b7280;
  font-size: 0.75rem;
  padding: 0;
  margin-top: 0.5rem;
  cursor: pointer;
  text-decoration: underline;
}

.raw-conversation-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal-content {
  background: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
}

.close-button {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
}

.raw-conversation-text {
  white-space: pre-wrap;
  font-size: 0.875rem;
  color: #374151;
  margin-top: 1rem;
}

.no-results {
  color: #6b7280;
  font-size: 0.875rem;
  font-style: italic;
}

.close-error {
  background: none;
  border: none;
  color: #b91c1c;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0;
}

.typing-indicator {
  display: flex;
  gap: 0.25rem;
  padding: 0.5rem;
}

.typing-indicator span {
  width: 0.5rem;
  height: 0.5rem;
  background: #6b7280;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}
.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.message.loading {
  background: #f3f4f6;
  min-height: 2.5rem;
  display: flex;
  align-items: center;
}

/* Header */
.theme-toggle {
  background: none;
  border: none;
  font-size: 1.25rem;
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
}

.theme-toggle:hover {
  background: var(--bg-main);
}

/* Sidebar */
.memory-section h3 {
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 1rem;
}

.context-summary h4,
.key-terms h4 {
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
}

.context-summary p {
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
}

.conversation-header h4 {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0;
}

.conversation-summary {
  color: var(--text-primary);
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0.5rem 0;
}

.placeholder-text {
  color: var(--text-muted);
  font-size: 0.875rem;
  font-style: italic;
}

.no-results {
  color: var(--text-muted);
  font-size: 0.875rem;
  font-style: italic;
}
</style>
