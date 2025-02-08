(function() {
  // Add marked library and wait for it to load
  const markedScript = document.createElement('script');
  markedScript.src = 'https://cdn.jsdelivr.net/npm/marked@4.3.0/marked.min.js';
  markedScript.onload = () => {
    // Initialize marked options once loaded
    marked.setOptions({
      breaks: true, // Adds <br> on single line breaks
      gfm: true,    // GitHub Flavored Markdown
      sanitize: false // Allow HTML in the input
    });
  };
  document.head.appendChild(markedScript);

  document.head.insertAdjacentHTML('beforeend', '<link href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.16/tailwind.min.css" rel="stylesheet">');

  // Inject the CSS
  const style = document.createElement('style');
  style.innerHTML = `
  .hidden {
    display: none;
  }
  #chat-widget-container {
    position: fixed;
    bottom: 20px;
    right: 100px;
    bottom: 40px;
    flex-direction: column;
  }
  #chat-popup {
    height: 70vh;
    max-height: 70vh;
    transition: all 0.3s;
    overflow: hidden;
  }
  .loading-spinner {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    margin-left: 12px;
  }
  .loading-spinner .dots {
    display: flex;
    gap: 4px;
  }
  .loading-spinner .dot {
    width: 8px;
    height: 8px;
    background-color: #4B5563;
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out;
  }
  .loading-spinner .dot:nth-child(1) { animation-delay: -0.32s; }
  .loading-spinner .dot:nth-child(2) { animation-delay: -0.16s; }
  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }
  /* Markdown Styles */
  .markdown-content {
    line-height: 1.5;
  }
  .markdown-content p {
    margin-bottom: 0.5rem;
  }
  .markdown-content h1, .markdown-content h2, .markdown-content h3, 
  .markdown-content h4, .markdown-content h5, .markdown-content h6 {
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }
  .markdown-content ul, .markdown-content ol {
    margin-left: 1.5rem;
    margin-bottom: 0.5rem;
  }
  .markdown-content ul {
    list-style-type: disc;
  }
  .markdown-content ol {
    list-style-type: decimal;
  }
  .markdown-content code {
    background-color: #f3f4f6;
    padding: 0.2rem 0.4rem;
    border-radius: 0.25rem;
    font-family: monospace;
    font-size: 0.9em;
  }
  .markdown-content pre {
    background-color: #f3f4f6;
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin: 0.5rem 0;
  }
  .markdown-content pre code {
    background-color: transparent;
    padding: 0;
  }
  .markdown-content a {
    color: #3b82f6;
    text-decoration: underline;
  }
  .markdown-content blockquote {
    border-left: 4px solid #e5e7eb;
    padding-left: 1rem;
    margin: 0.5rem 0;
    color: #4b5563;
  }
  @media (max-width: 768px) {
    #chat-popup {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 100%;
      max-height: 100%;
      border-radius: 0;
    }
  }
  `;

  document.head.appendChild(style);

  // Add chat history management functions
  const chatHistory = {
    storageKey: 'chat_widget_history',
    maxMessages: 50, // Maximum number of messages to store
    welcomeMessage: "Hi! How can I help you today?",

    initialize: function() {
      // Only initialize if there's no history
      if (this.load().length === 0) {
        this.save(this.welcomeMessage, false);
      }
    },

    save: function(message, isUser = false) {
      try {
        let history = this.load();
        const newMessage = {
          message: message,
          isUser: isUser,
          timestamp: new Date().toISOString(),
          order: history.length // Add order index
        };

        // Ensure alternating pattern
        if (history.length > 0) {
          const lastMessage = history[history.length - 1];
          if (lastMessage.isUser === isUser) {
            console.warn('Attempting to save message with same sender twice in a row');
            return;
          }
        }

        history.push(newMessage);

        // Keep only the last maxMessages
        if (history.length > this.maxMessages) {
          history = history.slice(history.length - this.maxMessages);
          // Reorder remaining messages
          history = history.map((msg, index) => ({
            ...msg,
            order: index
          }));
        }

        localStorage.setItem(this.storageKey, JSON.stringify(history));
        console.log('Saved message to history:', newMessage);
        console.log('Current history:', history);
      } catch (error) {
        console.error('Error saving chat history:', error);
      }
    },

    load: function() {
      try {
        const history = localStorage.getItem(this.storageKey);
        let parsedHistory = history ? JSON.parse(history) : [];
        
        // Sort by order and ensure each message has an order property
        parsedHistory = parsedHistory
          .map((msg, index) => ({
            ...msg,
            order: msg.order ?? index
          }))
          .sort((a, b) => a.order - b.order);

        console.log('Loaded chat history:', parsedHistory);
        return parsedHistory;
      } catch (error) {
        console.error('Error loading chat history:', error);
        return [];
      }
    },

    clear: function() {
      try {
        localStorage.removeItem(this.storageKey);
        console.log('Chat history cleared');
        // Reinitialize with welcome message after clearing
        this.initialize();
        return true;
      } catch (error) {
        console.error('Error clearing chat history:', error);
        return false;
      }
    }
  };

  // Create chat widget container
  const chatWidgetContainer = document.createElement('div');
  chatWidgetContainer.id = 'chat-widget-container';
  document.body.appendChild(chatWidgetContainer);
  
  // Inject the HTML
  chatWidgetContainer.innerHTML = `
    <div id="chat-bubble" class="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center cursor-pointer text-3xl">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    </div>
    <div id="chat-popup" class="hidden absolute bottom-20 right-0 w-96 bg-white rounded-md shadow-md flex flex-col transition-all text-sm">
      <div id="chat-header" class="flex justify-between items-center p-4 bg-gray-800 text-white rounded-t-md">
        <h3 class="m-0 text-lg">Overland Armenia - Jackbot AI</h3>
        <div class="flex items-center">
          <button id="clear-history" class="bg-transparent border-none text-white cursor-pointer mx-2" title="Clear Chat History">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button id="close-popup" class="bg-transparent border-none text-white cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div id="chat-messages" class="flex-1 p-4 overflow-y-auto"></div>
      <div id="chat-input-container" class="p-4 border-t border-gray-200">
        <div class="flex space-x-4 items-center">
          <input type="text" id="chat-input" class="flex-1 border border-gray-300 rounded-md px-4 py-2 outline-none w-3/4" placeholder="Type your message...">
          <button id="chat-submit" class="bg-gray-800 text-white rounded-md px-4 py-2 cursor-pointer">Send</button>
        </div>
        <div class="flex text-center text-xs pt-4">
          <span class="flex-1">Powered by <a href="https://askjackbot.com" target="_blank" class="text-indigo-600">@askjackbot</a></span>
        </div>
      </div>
    </div>
  `;

  // Initialize elements after DOM is ready
  const chatInput = document.getElementById('chat-input');
  const chatSubmit = document.getElementById('chat-submit');
  const chatMessages = document.getElementById('chat-messages');
  const chatBubble = document.getElementById('chat-bubble');
  const chatPopup = document.getElementById('chat-popup');
  const closePopup = document.getElementById('close-popup');
  const clearHistoryBtn = document.getElementById('clear-history');

  // Initialize chat history with welcome message if needed
  chatHistory.initialize();

  // Load chat history immediately
  loadChatHistory();

  // Add event listeners
  chatSubmit.addEventListener('click', () => {
    const message = chatInput.value.trim();
    if (!message) return;
    onUserRequest(message);
  });

  chatInput.addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
      chatSubmit.click();
    }
  });

  chatBubble.addEventListener('click', togglePopup);
  closePopup.addEventListener('click', togglePopup);
  
  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the chat history?')) {
      if (chatHistory.clear()) {
        chatMessages.innerHTML = '';
        loadChatHistory(); // Reload history with welcome message
      }
    }
  });

  function togglePopup() {
    chatPopup.classList.toggle('hidden');
    if (!chatPopup.classList.contains('hidden')) {
      chatInput.focus();
    }
  }

  // Also load chat history on window load for safety
  window.addEventListener('load', () => {
    if (chatMessages.children.length === 0) {
      loadChatHistory();
      console.log('Chat history loaded on window load');
    }
  });

  function onUserRequest(message) {
    const history = chatHistory.load();
    const lastMessage = history[history.length - 1];
    
    // Prevent duplicate user messages
    if (lastMessage && lastMessage.isUser) {
      console.warn('Preventing duplicate user message');
      return;
    }

    // Save and display user message
    chatHistory.save(message, true);

    // Display user message
    const messageElement = document.createElement('div');
    messageElement.className = 'flex justify-end mb-3';
    messageElement.innerHTML = `
      <div class="bg-gray-800 text-white rounded-lg py-2 px-4 max-w-[70%]">
        ${message}
      </div>
    `;
    chatMessages.appendChild(messageElement);

    // Add loading spinner
    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading-spinner';
    loadingElement.innerHTML = `
      <div class="dots">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    `;
    chatMessages.appendChild(loadingElement);
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
    chatInput.value = '';
  
    // Make API call to Langflow through a CORS proxy
    fetch('https://cors-anywhere.herokuapp.com/https://api.langflow.astra.datastax.com/lf/81657b1c-0f8e-4752-beae-286f0590e5e4/api/v1/run/a8d25d16-9704-456a-88a2-d2c7a8f50b4d?stream=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer AstraCS:TZlUAHJWNXcQDhwOtZxCjmjP:1f6671de302233b4455ce57680f580b5a9795d00573f9583674d8c2d882b2838',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        input_value: message,
        output_type: "chat",
        input_type: "chat",
        tweaks: {
          "ChatInput-PLr2q": {},
          "ParseData-XSgjj": {},
          "Prompt-SXLKQ": {},
          "SplitText-q3cGH": {},
          "ChatOutput-qVP2H": {},
          "AstraDB-9kbxl": {},
          "OpenAIEmbeddings-0VwaS": {},
          "AstraDB-B2fMP": {},
          "File-BhMCj": {},
          "GoogleGenerativeAIModel-ah62A": {},
          "OpenAIEmbeddings-5b0fd": {}
        }
      })
    })
    .then(response => response.json())
    .then(data => {
      // Remove loading spinner
      const loadingSpinner = document.querySelector('.loading-spinner');
      if (loadingSpinner) {
        loadingSpinner.remove();
      }

      // Handle the API response
      if (data?.outputs?.[0]?.outputs?.[0]?.results?.message?.text) {
        const responseText = data.outputs[0].outputs[0].results.message.text;
        chatHistory.save(responseText, false); // Save bot response to history
        reply(responseText);
      } else {
        console.log('Unexpected response structure:', data);
        const errorMessage = 'Sorry, I received an unexpected response format.';
        chatHistory.save(errorMessage, false);
        reply(errorMessage);
      }
    })
    .catch(error => {
      // Remove loading spinner
      const loadingSpinner = document.querySelector('.loading-spinner');
      if (loadingSpinner) {
        loadingSpinner.remove();
      }

      console.error('Error:', error);
      const errorMessage = 'Sorry, there was an error processing your request.';
      chatHistory.save(errorMessage, false);
      reply(errorMessage);
    });
  }
  
  function reply(message) {
    const chatMessages = document.getElementById('chat-messages');
    const replyElement = document.createElement('div');
    replyElement.className = 'flex mb-3';
    
    // Wait for marked to be loaded
    if (typeof marked === 'undefined') {
      const checkMarked = setInterval(() => {
        if (typeof marked !== 'undefined') {
          clearInterval(checkMarked);
          renderMessage();
        }
      }, 100);
    } else {
      renderMessage();
    }

    function renderMessage() {
      try {
        // Use marked.parse() instead of direct marked() call
        const htmlContent = marked.parse(message);

        replyElement.innerHTML = `
          <div class="bg-gray-200 text-black rounded-lg py-2 px-4 max-w-[70%]">
            <div class="markdown-content">${htmlContent}</div>
          </div>
        `;
        chatMessages.appendChild(replyElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      } catch (error) {
        console.error('Markdown parsing error:', error);
        // Fallback to plain text if markdown parsing fails
        replyElement.innerHTML = `
          <div class="bg-gray-200 text-black rounded-lg py-2 px-4 max-w-[70%]">
            <div class="markdown-content">${message}</div>
          </div>
        `;
        chatMessages.appendChild(replyElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }
  }

  // Function to load and display chat history
  function loadChatHistory() {
    const history = chatHistory.load();
    chatMessages.innerHTML = ''; // Clear existing messages
    
    if (history.length === 0) {
      // Initialize with welcome message if history is empty
      chatHistory.initialize();
      history = chatHistory.load();
    }

    // Sort history by order
    const sortedHistory = history.sort((a, b) => a.order - b.order);

    // Display messages sequentially
    function displayMessages(index) {
      if (index >= sortedHistory.length) return;

      const item = sortedHistory[index];
      
      if (item.isUser) {
        const messageElement = document.createElement('div');
        messageElement.className = 'flex justify-end mb-3';
        messageElement.innerHTML = `
          <div class="bg-gray-800 text-white rounded-lg py-2 px-4 max-w-[70%]">
            ${item.message}
          </div>
        `;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        // Move to next message after a short delay
        setTimeout(() => displayMessages(index + 1), 100);
      } else {
        const replyElement = document.createElement('div');
        replyElement.className = 'flex mb-3';
        try {
          const htmlContent = marked ? marked.parse(item.message) : item.message;
          replyElement.innerHTML = `
            <div class="bg-gray-200 text-black rounded-lg py-2 px-4 max-w-[70%]">
              <div class="markdown-content">${htmlContent}</div>
            </div>
          `;
        } catch (error) {
          replyElement.innerHTML = `
            <div class="bg-gray-200 text-black rounded-lg py-2 px-4 max-w-[70%]">
              <div class="markdown-content">${item.message}</div>
            </div>
          `;
        }
        chatMessages.appendChild(replyElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        // Move to next message after a short delay
        setTimeout(() => displayMessages(index + 1), 100);
      }
    }

    // Start displaying messages
    displayMessages(0);
  }
})();
