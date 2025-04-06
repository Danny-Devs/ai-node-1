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
import { ref, onMounted, nextTick, computed, type Ref, reactive } from 'vue';
import { useDark, useToggle } from '@vueuse/core';
import {
  ConversationManager,
  type Message,
  type ApiError
} from './lib/ConversationManager';
import { supabase } from './lib/supabase';

// Types
interface RelatedConversation {
  conversation_id: string;
  summary: string;
  tags: string[];
  created_at: string;
  raw_conversation: string;
}

interface ChatState {
  newMessage: string;
}

interface UIState {
  showSettings: boolean;
  showAbout: boolean;
  selectedTags: string[];
  showRawConversation: string | null;
}

// Chat state
const conversationManager = new ConversationManager();
const messages = computed(() => {
  const msgs = conversationManager.getCurrentMessages();
  console.log('Computing messages:', msgs);
  return msgs.filter(msg => msg.role !== 'system');
});
const isLoading = computed(() => conversationManager.isLoading());
const error = computed(() => conversationManager.getError());
const context = computed(() => ({
  summary: conversationManager.getContext().summary || '',
  keyTerms: conversationManager.getContext().keyTerms || []
}));

const chatState = reactive<ChatState>({
  newMessage: ''
});

// UI state
const isDark = useDark();
const toggleDark = () => useToggle(isDark)();

const uiState = reactive<UIState>({
  showSettings: false,
  showAbout: false,
  selectedTags: [],
  showRawConversation: null
});

// Refs for DOM elements
const messagesContainer = ref<HTMLElement | null>(null);
const messageInput = ref<HTMLInputElement | null>(null);

// Related conversations state
const relatedConversations = ref<RelatedConversation[]>([]);

// Chat functions
const scrollToBottom = async (): Promise<void> => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const sendMessage = async (): Promise<void> => {
  const messageText = chatState.newMessage.trim();
  if (!messageText || isLoading.value) return;

  chatState.newMessage = '';

  try {
    await conversationManager.sendMessage(messageText);
    await scrollToBottom();
  } catch (err) {
    console.error('Failed to send message:', err);
  }
};

// Tag and conversation functions
const filterByTags = async (tags: string[]): Promise<void> => {
  uiState.selectedTags = tags;
  relatedConversations.value = (await conversationManager.searchByTags(
    tags
  )) as RelatedConversation[];
};

const addConversationContext = async (
  conversationId: string
): Promise<void> => {
  await conversationManager.injectContext(conversationId);
  await scrollToBottom();
};

const addSampleData = async (): Promise<void> => {
  try {
    const response = await fetch('/api/sample-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Failed to add sample data');
    }

    const { data: contextData, error: contextError } = await supabase
      .from('conversation_contexts')
      .select('tags');

    if (contextError) throw contextError;

    const allTags = new Set<string>();
    contextData?.forEach((ctx: { tags?: string[] }) => {
      ctx.tags?.forEach(tag => allTags.add(tag));
    });

    if (allTags.size > 0) {
      uiState.selectedTags = Array.from(allTags).slice(0, 3);
      relatedConversations.value = (await conversationManager.searchByTags(
        uiState.selectedTags
      )) as RelatedConversation[];
    }
  } catch (err) {
    console.error('Error adding sample data:', err);
  }
};

// Lifecycle hooks
onMounted(() => {
  messageInput.value?.focus();
});
</script>

<template>
  <div class="app-container" :class="{ dark: isDark }">
    <!-- Header -->
    <header class="header">
      <h1 class="header-title">AI Chat</h1>
      <div class="header-right">
        <nav class="header-nav">
          <button class="nav-link" @click="uiState.showAbout = true">
            About
          </button>
          <button class="nav-link" @click="uiState.showSettings = true">
            Settings
          </button>
        </nav>
        <button class="theme-toggle" @click="toggleDark">
          <span v-if="!isDark" class="theme-icon dark">🌙</span>
          <span v-else class="theme-icon light">☀️</span>
        </button>
      </div>
    </header>

    <div class="main-container">
      <!-- Sidebar -->
      <aside class="sidebar">
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
              <div v-if="context.keyTerms.length" class="key-terms">
                <h4>Tags</h4>
                <div class="tag-cloud">
                  <span
                    v-for="term in context.keyTerms"
                    :key="term"
                    class="tag"
                    :class="{ selected: uiState.selectedTags.includes(term) }"
                    @click="filterByTags([...uiState.selectedTags, term])"
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
              <div v-if="uiState.selectedTags.length" class="selected-filters">
                <span
                  v-for="tag in uiState.selectedTags"
                  :key="tag"
                  class="selected-tag"
                  @click="
                    filterByTags(uiState.selectedTags.filter(t => t !== tag))
                  "
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
                      :class="{ selected: uiState.selectedTags.includes(tag) }"
                      @click="filterByTags([...uiState.selectedTags, tag])"
                    >
                      {{ tag }}
                    </span>
                  </div>
                  <button
                    class="view-raw"
                    @click="uiState.showRawConversation = conv.conversation_id"
                  >
                    View Full Conversation
                  </button>
                </div>
              </div>
              <p v-else-if="uiState.selectedTags.length" class="no-results">
                No conversations found with selected tags
              </p>
              <p v-else class="placeholder-text">
                Select tags above to find related conversations
              </p>
            </div>
          </section>
        </div>

        <button class="sample-data-button" @click="addSampleData">
          Add Sample Data
        </button>
      </aside>

      <!-- Main chat area -->
      <main class="chat-area">
        <div class="chat-container">
          <!-- Error display -->
          <div v-if="error" class="error-message">
            <p>{{ error.message }}</p>
            <button @click="error = null" class="close-error">×</button>
          </div>

          <!-- Messages -->
          <div class="messages" ref="messagesContainer">
            <div
              v-for="message in messages"
              :key="message.content"
              class="message"
              :class="message.role"
            >
              {{ message.content }}
            </div>
            <div v-if="isLoading" class="message assistant loading">
              <div class="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>

          <!-- Input area -->
          <div class="input-container">
            <input
              v-model="chatState.newMessage"
              class="message-input"
              placeholder="Type your message..."
              @keyup.enter="sendMessage"
              :disabled="isLoading"
              ref="messageInput"
            />
            <button
              class="send-button"
              @click="sendMessage"
              :disabled="!chatState.newMessage.trim() || isLoading"
            >
              {{ isLoading ? 'Sending...' : 'Send' }}
            </button>
          </div>
        </div>
      </main>
    </div>

    <!-- Raw conversation modal -->
    <div v-if="uiState.showRawConversation" class="raw-conversation-modal">
      <div class="modal-content">
        <button
          class="close-button"
          @click="uiState.showRawConversation = null"
        >
          ×
        </button>
        <h3>Full Conversation</h3>
        <div class="raw-conversation-text">
          {{
            relatedConversations.find(
              c => c.conversation_id === uiState.showRawConversation
            )?.raw_conversation
          }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Base reset and theme variables */
.app-container {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-main);
  color: var(--text-primary);
  overflow: hidden;
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

/* Reset */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* Layout */
.main-container {
  flex: 1;
  display: flex;
  min-height: 0;
}

/* Header */
.header {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
  background: var(--bg-white);
  border-bottom: 1px solid var(--border-color);
}

.header-title {
  font-size: 1.25rem;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-left: auto;
}

.header-nav {
  display: flex;
  gap: 1rem;
}

.nav-link {
  background: none;
  border: none;
  color: var(--text-muted);
  padding: 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.95rem;
}

.nav-link:hover {
  color: var(--text-primary);
}

.theme-toggle {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
}

.theme-icon {
  font-size: 1.25rem;
}

/* Sidebar */
.sidebar {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-white);
  border-right: 1px solid var(--border-color);
  overflow: hidden;
}

.sidebar-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.sidebar-header h2 {
  font-size: 1.125rem;
  font-weight: 600;
}

.memory-sections {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
}

.memory-section {
  margin-bottom: 2rem;
}

.memory-section h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

/* Chat area */
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #f9fafb;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
  height: calc(100vh - 60px);
  overflow: hidden;
}

/* Messages */
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.message {
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  max-width: 80%;
  word-break: break-word;
}

.message.user {
  margin-left: auto;
  background: #2563eb;
  color: white;
}

.message.assistant {
  margin-right: auto;
  background: #f3f4f6;
  color: black;
  min-width: 120px;
}

.message.system {
  display: none;
}

.message.assistant.loading {
  padding: 0.75rem;
  min-width: 120px;
  display: flex;
  justify-content: center;
}

/* Input area */
.input-container {
  margin-top: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 1rem;
}

.message-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  font-size: 0.95rem;
  color: var(--text-primary);
  background: var(--bg-main);
  transition: all 0.2s ease;
}

.message-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 2px 4px var(--shadow-color);
}

.message-input:disabled {
  opacity: 0.7;
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
  opacity: 0.7;
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

/* Tags */
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background: var(--tag-bg);
  color: var(--tag-text);
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
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

/* Modal */
.raw-conversation-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal-content {
  background: var(--bg-white);
  border-radius: 0.5rem;
  padding: 1.5rem;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  color: var(--text-primary);
}

.close-button {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-muted);
  cursor: pointer;
}

.raw-conversation-text {
  white-space: pre-wrap;
  font-size: 0.875rem;
  margin-top: 1rem;
}

/* Error message */
.error-message {
  background: #fee2e2;
  border: 1px solid #ef4444;
  color: #b91c1c;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.close-error {
  background: none;
  border: none;
  color: #b91c1c;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
}

/* Context summary and key terms */
.context-summary {
  background: var(--bg-white);
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
}

.context-summary h4,
.key-terms h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.5rem;
}

.context-summary p {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

.key-terms {
  margin-bottom: 1rem;
}

/* Related conversations */
.selected-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.selected-tag {
  background: var(--primary);
  color: var(--text-on-primary);
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
  color: var(--text-secondary);
}

.inject-button {
  background: var(--primary);
  color: var(--text-on-primary);
  border: none;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.inject-button:hover {
  background: var(--primary-dark);
}

.conversation-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.5rem;
}

.mini-tag {
  background: var(--tag-bg);
  color: var(--tag-text);
  padding: 0.125rem 0.5rem;
  border-radius: 0.75rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mini-tag:hover {
  background: var(--primary);
  color: var(--text-on-primary);
}

.mini-tag.selected {
  background: var(--tag-bg-selected);
  color: var(--tag-text-selected);
}

.view-raw {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 0.75rem;
  padding: 0;
  margin-top: 0.5rem;
  cursor: pointer;
  text-decoration: underline;
}

.view-raw:hover {
  color: var(--text-primary);
}

.no-results,
.placeholder-text {
  color: var(--text-muted);
  font-size: 0.875rem;
  font-style: italic;
}

.typing-indicator {
  display: flex;
  gap: 6px;
  padding: 4px;
  justify-content: center;
  align-items: center;
  min-height: 24px;
  min-width: 60px;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #9ca3af;
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
</style>
