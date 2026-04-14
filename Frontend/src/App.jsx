import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import { MessageBubble } from "@/components/MessageBubble";
import { MessageActions } from "@/components/MessageActions";
import { EditMessage } from "@/components/EditMessage";
import { CanvasView } from "@/components/CanvasView";
import { ThinkingView } from "@/components/ThinkingView";
import { SearchView } from "@/components/SearchView";
import { Sidebar } from "@/components/Sidebar";
import { Settings } from "@/components/Settings";
import { Header } from "@/components/Header";
import { QueryOutline } from "@/components/QueryOutline";
import { Spotlight } from "@/components/landing/Spotlight";
import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Code2, Palette, Lightbulb, FileText, Sparkles } from "lucide-react";

import toast, { Toaster } from 'react-hot-toast';

function App({ user, isShared = false }) {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [selectedModel, setSelectedModel] = useState('llama-maverick');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [thinkingPanel, setThinkingPanel] = useState(null);
  const [loadingState, setLoadingState] = useState('');
  const [shareToken, setShareToken] = useState(null);
  const [isForked, setIsForked] = useState(false);

  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const lastUserMessageRef = useRef(null);
  const messageRefs = useRef({});
  const activeChatIdRef = useRef(null);
  const [backgroundGenerations, setBackgroundGenerations] = useState(new Set());
  const backgroundChatMessagesRef = useRef(new Map());
  const backgroundCurrentResponseRef = useRef(new Map());
  const pendingNewChatRef = useRef(false);

  const handleScrollToMessage = (index) => {
    const el = messageRefs.current[index];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Flash highlight
      el.classList.add('ring-1', 'ring-emerald-500/50', 'bg-emerald-500/5', 'rounded-xl');
      setTimeout(() => {
        el.classList.remove('ring-1', 'ring-emerald-500/50', 'bg-emerald-500/5', 'rounded-xl');
      }, 1500);
    }
  };

  const handleSendMessage = async (message, files, model) => {
    // Check if user is authenticated when trying to send a message
    if (!user || user.id === 'guest' || !localStorage.getItem('token')) {
      window.location.href = '/login';
      return;
    }

    // Fork shared chat on first message
    if (isShared && !isForked && user) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/shared/${shareToken}/fork`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const forkedChat = await response.json();
          setCurrentChatId(forkedChat._id);
          activeChatIdRef.current = forkedChat._id;
          setIsForked(true);
          window.history.replaceState({}, '', '/');
        }
      } catch (error) {
        console.error('Failed to fork chat:', error);
      }
    }
    setSelectedModel(model);
    setIsLoading(true);
    setCurrentResponse('');

    // Auto-detect mode from message content
    let isSearch = message.startsWith('[Search:');
    let isThink = message.startsWith('[Think:');
    const isCanvas = message.startsWith('[Canvas:');

    // AI auto-detection
    if (!isSearch && !isThink && !isCanvas) {
      const lowerMsg = message.toLowerCase();
      const searchKeywords = ['latest', 'current', 'news', 'today', 'recent', 'what is happening', 'update on', 'search for', 'find information'];
      const thinkKeywords = ['analyze', 'compare', 'explain deeply', 'think about', 'reasoning', 'why', 'how does', 'complex'];

      if (searchKeywords.some(kw => lowerMsg.includes(kw))) {
        isSearch = true;
        message = `[Search: ${message}]`;
      } else if (thinkKeywords.some(kw => lowerMsg.includes(kw))) {
        isThink = true;
        message = `[Think: ${message}]`;
      }
    }

    // Set loading state
    if (isSearch) setLoadingState('🌐 Searching web...');
    else if (isThink) setLoadingState('🧠 Thinking deeply...');
    else setLoadingState('✨ Generating response...');

    // Remove mode prefix from display
    let cleanMessage = message;
    if (isSearch) cleanMessage = message.replace(/^\[Search:\s*/, '').replace(/\]$/, '');
    if (isThink) cleanMessage = message.replace(/^\[Think:\s*/, '').replace(/\]$/, '');
    if (isCanvas) cleanMessage = message.replace(/^\[Canvas:\s*/, '').replace(/\]$/, '');

    // Upload files to Cloudinary first if present (silently in background)
    let uploadedFileUrl = null;
    let uploadedFilePublicId = null;
    let uploadedFileInfo = '';
    let uploadRetries = 3;

    if (files && files.length > 0) {
      const file = files[0];

      // Upload to Cloudinary with retries (no UI feedback)
      while (uploadRetries > 0 && !uploadedFileUrl) {
        try {
          const formData = new FormData();
          formData.append('file', file);

          const uploadResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/upload/file`, {
            method: 'POST',
            body: formData
          });

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            uploadedFileUrl = uploadData.url;
            uploadedFilePublicId = uploadData.publicId;

            // Add file info to message (image first, then text)
            if (file.type.startsWith('image/')) {
              uploadedFileInfo = `![Uploaded Image](${uploadedFileUrl})\n\n`;
            } else {
              uploadedFileInfo = `📄 ${file.name}\n\n`;
            }
            break;
          }
        } catch (error) {
          console.error('Upload attempt failed:', error);
          uploadRetries--;
          if (uploadRetries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      // If upload failed: block only for images (they need a visible URL)
      // For documents (PDF, DOCX, TXT), proceed anyway — backend will parse the file directly
      if (!uploadedFileUrl) {
        if (file.type.startsWith('image/')) {
          setIsLoading(false);
          alert('Image upload failed. Please try again.');
          return;
        } else {
          // Document file — still show filename in chat, backend will parse it
          uploadedFileInfo = `📄 ${file.name}\n\n`;
        }
      }
    }

    // Determine the chatId to use for this request
    let requestChatId = currentChatId;
    const token = localStorage.getItem('token');

    // If we don't have a chatId yet, save the user message immediately to create a new chat
    if (!requestChatId) {
      try {
        const userMessageObj = {
          role: 'user',
          content: cleanMessage + uploadedFileInfo,
          mode: isSearch ? 'search' : isThink ? 'think' : isCanvas ? 'canvas' : 'normal',
          filePublicId: uploadedFilePublicId
        };
        const saveResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            chatId: null,
            messages: [userMessageObj],
            title: cleanMessage.slice(0, 50) || 'New Chat'
          })
        });

        if (saveResponse.ok) {
          const chat = await saveResponse.json();
          requestChatId = chat._id;
          setCurrentChatId(requestChatId);
          activeChatIdRef.current = requestChatId;
        } else {
          console.error('Failed to create chat');
          setIsLoading(false);
          setCurrentResponse('');
          return;
        }
      } catch (error) {
        console.error('Failed to save initial message:', error);
        setIsLoading(false);
        setCurrentResponse('');
        return;
      }
    }

    // Create user message object
    const userMessage = {
      role: 'user',
      content: cleanMessage + uploadedFileInfo,
      mode: isSearch ? 'search' : isThink ? 'think' : isCanvas ? 'canvas' : 'normal',
      filePublicId: uploadedFilePublicId
    };

    // Add user message to state and store snapshot for potential background save
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    backgroundChatMessagesRef.current.set(requestChatId, updatedMessages);

    // Mark this chat as generating in the background
    setBackgroundGenerations(prev => new Set(prev).add(requestChatId));

    setTimeout(() => {
      lastUserMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append('message', message);
      formData.append('model', model);
      formData.append('userId', user?.id || 'guest');
      formData.append('history', JSON.stringify(messages));
      if (requestChatId) formData.append('chatId', requestChatId);
      if (uploadedFileUrl) {
        formData.append('fileUrl', uploadedFileUrl);
        formData.append('filePublicId', uploadedFilePublicId);
      }
      files?.forEach(file => formData.append('files', file));

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/chat`, {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let thinkingText = '';
      const isMediaModel = ['bytez-image', 'bytez-video', 'bytez-audio', 'bytez-music'].includes(model);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.reasoning) {
                thinkingText += parsed.reasoning;
              }
              if (isMediaModel && parsed.content?.includes('media-container')) {
                fullResponse = parsed.content;
              } else if (parsed.content) {
                fullResponse += parsed.content;
              }
              const displayResponse = fullResponse.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<think>[\s\S]*$/g, '');
              backgroundCurrentResponseRef.current.set(requestChatId, displayResponse);
              if (activeChatIdRef.current === requestChatId) {
                setCurrentResponse(displayResponse);
              }
            } catch (e) { }
          }
        }
      }

      let cleanResponse = fullResponse.replace(/<\d+\/\d+>/g, '').trim();
      let extractedThinking = thinkingText;

      // Extract ALL <think> blocks (global, handles multiple)
      const thinkMatches = [...cleanResponse.matchAll(/<think>([\s\S]*?)<\/think>/g)];
      if (thinkMatches.length > 0) {
        extractedThinking = thinkMatches.map(m => m[1].trim()).join('\n\n');
        cleanResponse = cleanResponse.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      }
      // Also strip any unclosed <think> tag at the end (model didn't finish closing it)
      cleanResponse = cleanResponse.replace(/<think>[\s\S]*$/g, '').trim();

      // Store thinking if present
      const hasThinking = extractedThinking && extractedThinking.trim().length > 0;

      const assistantMsg = {
        role: 'assistant',
        content: cleanResponse,
        model,
        mode: isSearch ? 'search' : isThink ? 'think' : isCanvas ? 'canvas' : 'normal',
        thinking: hasThinking ? extractedThinking : undefined,
        versions: [cleanResponse],
        currentVersion: 0
      };

      // Check if the current active chat is the one we're generating for
      if (activeChatIdRef.current === requestChatId) {
        // Still active, update UI
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        // User navigated away, save silently in background
        const savedMsgs = backgroundChatMessagesRef.current.get(requestChatId) || [];
        const fullMessages = [...savedMsgs, assistantMsg];
        const title = savedMsgs[0]?.content?.slice(0, 50) || 'New Chat';
        await performSaveChat(requestChatId, fullMessages, title);
      }

      setCurrentResponse('');
    } catch (error) {
      if (error.name === 'AbortError') {
        // Only append partial message if manually stopped
        const isNavigation = abortControllerRef.current?.signal?.reason === 'navigation';
        if (!isNavigation && currentResponse) {
          const cleanResponse = currentResponse.replace(/<\d+\/\d+>/g, '').trim();
          // If still active, show stopped message. If background, maybe save partial? For simplicity, treat same: if active, update UI; else save background.
          const partialMsg = {
            role: 'assistant',
            content: cleanResponse + ' [Stopped]',
            model,
            versions: [cleanResponse + ' [Stopped]'],
            currentVersion: 0
          };
          if (activeChatIdRef.current === requestChatId) {
            setMessages(prev => [...prev, partialMsg]);
          } else {
            const savedMsgs = backgroundChatMessagesRef.current.get(requestChatId) || [];
            const fullMessages = [...savedMsgs, partialMsg];
            const title = savedMsgs[0]?.content?.slice(0, 50) || 'New Chat';
            await performSaveChat(requestChatId, fullMessages, title);
          }
        }
        setCurrentResponse('');
      } else {
        console.error('Error:', error);
      }
    } finally {
      if (activeChatIdRef.current === requestChatId) {
        setIsLoading(false);
        setLoadingState('');
        abortControllerRef.current = null;
      }
      // Cleanup background tracking
      backgroundChatMessagesRef.current.delete(requestChatId);
      backgroundCurrentResponseRef.current.delete(requestChatId);
      setBackgroundGenerations(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestChatId);
        return newSet;
      });
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const performSaveChat = async (chatId, messagesToSave, title) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await fetch(`${import.meta.env.VITE_API_URL}/api/chat/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          chatId,
          messages: messagesToSave,
          title: title || 'New Chat'
        })
      });
    } catch (error) {
      console.error('Background save failed:', error);
    }
  };

  const handleRegenerate = async () => {
    if (messages.length >= 2) {
      const lastUserMsg = messages[messages.length - 2];
      const lastAssistantMsg = messages[messages.length - 1];

      // Store current response as a version
      const versions = lastAssistantMsg.versions || [lastAssistantMsg.content];

      // Remove last assistant message and regenerate without adding user message again
      setMessages(prev => prev.slice(0, -1));

      // Determine the chatId we're regenerating for
      const requestChatId = currentChatId;
      // Store snapshot of messages (without the removed assistant message)
      const snapshotMessages = messages.slice(0, -1);
      backgroundChatMessagesRef.current.set(requestChatId, snapshotMessages);
      setBackgroundGenerations(prev => new Set(prev).add(requestChatId));

      // Call the API directly without adding user message
      setIsLoading(true);
      setCurrentResponse('');
      abortControllerRef.current = new AbortController();

      try {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('message', lastUserMsg.content);
        formData.append('model', lastAssistantMsg.model || selectedModel);
        formData.append('userId', user?.id || 'guest');
        formData.append('mode', lastAssistantMsg.mode || 'normal');
        formData.append('history', JSON.stringify(messages.slice(0, -2)));
        if (requestChatId) formData.append('chatId', requestChatId);
        if (token) formData.append('token', token);

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/chat`, {
          method: 'POST',
          body: formData,
          signal: abortControllerRef.current.signal,
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        let thinkingText = '';
        const isMediaModel = ['bytez-image', 'bytez-video', 'bytez-audio', 'bytez-music'].includes(lastAssistantMsg.model || selectedModel);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.reasoning) {
                  thinkingText += parsed.reasoning;
                }
                if (isMediaModel && parsed.content?.includes('media-container')) {
                  fullResponse = parsed.content;
                } else if (parsed.content) {
                  fullResponse += parsed.content;
                }
                const displayResponse = fullResponse.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<think>[\s\S]*$/g, '');
                backgroundCurrentResponseRef.current.set(requestChatId, displayResponse);
                if (activeChatIdRef.current === requestChatId) {
                  setCurrentResponse(displayResponse);
                }
              } catch (e) { }
            }
          }
        }

        let cleanResponse = fullResponse.replace(/<\d+\/\d+>/g, '').trim();
        let extractedThinking = thinkingText;

        const thinkMatches = [...cleanResponse.matchAll(/<think>([\s\S]*?)<\/think>/g)];
        if (thinkMatches.length > 0) {
          extractedThinking = thinkMatches.map(m => m[1].trim()).join('\n\n');
          cleanResponse = cleanResponse.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        }
        cleanResponse = cleanResponse.replace(/<think>[\s\S]*$/g, '').trim();

        const hasThinking = extractedThinking && extractedThinking.trim().length > 0;

        // Add new version
        const newVersions = [...versions, cleanResponse];

        const assistantMsg = {
          role: 'assistant',
          content: cleanResponse,
          model: lastAssistantMsg.model || selectedModel,
          mode: lastAssistantMsg.mode || 'normal',
          thinking: hasThinking ? extractedThinking : undefined,
          versions: newVersions,
          currentVersion: newVersions.length - 1
        };

        if (activeChatIdRef.current === requestChatId) {
          // Still active, update UI
          setMessages(prev => [...prev, assistantMsg]);
        } else {
          // User navigated away, save silently in background
          const savedMsgs = backgroundChatMessagesRef.current.get(requestChatId) || [];
          const fullMessages = [...savedMsgs, assistantMsg];
          const title = savedMsgs[0]?.content?.slice(0, 50) || 'New Chat';
          await performSaveChat(requestChatId, fullMessages, title);
        }

        setCurrentResponse('');
      } catch (error) {
        if (error.name === 'AbortError') {
          // Only append partial message if manually stopped
          if (currentResponse) {
            const cleanResponse = currentResponse.replace(/<\d+\/\d+>/g, '').trim();
            const partialMsg = {
              role: 'assistant',
              content: cleanResponse + ' [Stopped]',
              model: lastAssistantMsg.model || selectedModel,
              versions: [cleanResponse + ' [Stopped]'],
              currentVersion: 0
            };
            if (activeChatIdRef.current === requestChatId) {
              setMessages(prev => [...prev, partialMsg]);
            } else {
              const savedMsgs = backgroundChatMessagesRef.current.get(requestChatId) || [];
              const fullMessages = [...savedMsgs, partialMsg];
              const title = savedMsgs[0]?.content?.slice(0, 50) || 'New Chat';
              await performSaveChat(requestChatId, fullMessages, title);
            }
          }
          setCurrentResponse('');
        } else {
          console.error('Error:', error);
        }
      } finally {
        if (activeChatIdRef.current === requestChatId) {
          setIsLoading(false);
          setLoadingState('');
          abortControllerRef.current = null;
        }
        // Cleanup background tracking
        backgroundChatMessagesRef.current.delete(requestChatId);
        setBackgroundGenerations(prev => {
          const newSet = new Set(prev);
          newSet.delete(requestChatId);
          return newSet;
        });
      }
    }
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditText(messages[index].content);
  };

  const handleSaveEdit = (index) => {
    const updatedMessages = [...messages];
    updatedMessages[index].content = editText;
    setMessages(updatedMessages.slice(0, index + 1));
    setEditingIndex(null);
    if (updatedMessages[index].role === 'user') {
      handleSendMessage(editText, [], selectedModel);
    }
  };

  const handleVersionChange = (index, newVersion) => {
    setMessages(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        currentVersion: newVersion,
        content: updated[index].versions[newVersion]
      };
      return updated;
    });
  };

  const handleCopy = (text, index) => {
    const cleanText = text.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    navigator.clipboard.writeText(cleanText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const handleNewChat = () => {
    // Cancel any pending new chat auto-select
    pendingNewChatRef.current = false;

    // Check if user is authenticated when trying to create a new chat
    if (!user || user.id === 'guest' || !localStorage.getItem('token')) {
      window.location.href = '/login';
      return;
    }

    setIsLoading(false);
    setMessages([]);
    setCurrentResponse('');
    activeChatIdRef.current = null; // Update ref immediately to avoid race condition
    setCurrentChatId(null);
    setThinkingPanel(null);
  };

  const handleSelectChat = async (chatId) => {
    // Cancel any pending new chat auto-select
    pendingNewChatRef.current = false;

    setIsLoading(false);
    setCurrentResponse('');

    const specialModels = ['bytez-image', 'bytez-video', 'bytez-audio', 'bytez-music', 'llm-council'];
    if (specialModels.includes(chatId)) {
      // For special models, just clear the chat without authentication check
      setMessages([]);
      setCurrentResponse('');
      activeChatIdRef.current = null;
      setCurrentChatId(null);
      setThinkingPanel(null);
      setSelectedModel(chatId);
      return;
    }

    if (['mode-diagram', 'mode-map', 'mode-file', 'mode-3d'].includes(chatId)) {
      setSidebarOpen(false);
      const prefix = chatId === 'mode-diagram' ? '[Diagram: ' 
                   : chatId === 'mode-map' ? '[Map: ' 
                   : chatId === 'mode-3d' ? '[3D: '
                   : '[File:docx] ';
      window.dispatchEvent(new CustomEvent('inject-prompt', { detail: prefix }));
      return;
    }
    setThinkingPanel(null);
    // Immediately set active chat ref to avoid race conditions with background generation
    activeChatIdRef.current = chatId;
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to access chats');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/${chatId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('cachedChats');
        window.location.href = '/login';
        return;
      }

      if (response.ok) {
        const chat = await response.json();
        setMessages(chat.messages);
        setCurrentChatId(chatId);
        toast.remove();
        toast.success('Chat loaded successfully');

        if (backgroundGenerations.has(chatId)) {
          setIsLoading(true);
          setLoadingState('✨ Generating response...');
          setCurrentResponse(backgroundCurrentResponseRef.current.get(chatId) || '');
        }
      } else {
        toast.remove();
        toast.error('Failed to load chat');
      }
    } catch (error) {
      console.error('Failed to load chat:', error);
      toast.remove();
      toast.error('Failed to load chat');
    }
  };

  const saveChat = async () => {
    if (user?.id === 'guest' || messages.length === 0) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const messagesToSave = currentResponse && isLoading
        ? [...messages, { role: 'assistant', content: currentResponse + ' [Incomplete]', model: selectedModel }]
        : messages;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            chatId: currentChatId,
            messages: messagesToSave,
            title: messages[0]?.content.slice(0, 50) || 'New Chat'
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('cachedChats');
          window.location.href = '/login';
          return;
        }

        if (response.ok) {
          const chat = await response.json();
          if (!currentChatId) {
            setCurrentChatId(chat._id);
            activeChatIdRef.current = chat._id;
          }
          // Update cache - move edited chat to top
          const cachedChats = JSON.parse(localStorage.getItem('cachedChats') || '[]');
          const filteredChats = cachedChats.filter(c => c._id !== chat._id);
          const updatedCache = [{ ...chat, updatedAt: new Date().toISOString() }, ...filteredChats].slice(0, 4);
          localStorage.setItem('cachedChats', JSON.stringify(updatedCache));
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.warn('Chat save request timed out after 10 seconds');
        } else {
          console.error('Failed to save chat:', fetchError.message);
        }
      }
    } catch (error) {
      console.error('Unexpected error in saveChat:', error);
    }
  };

  useEffect(() => {
    const loadSharedChat = async () => {
      if (isShared) {
        const token = window.location.pathname.split('/share/')[1];
        setShareToken(token);
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/shared/${token}`);
          if (response.ok) {
            const chat = await response.json();
            setMessages(chat.messages);
          }
        } catch (error) {
          console.error('Failed to load shared chat:', error);
        }
      }
    };
    loadSharedChat();
  }, [isShared]);

  useEffect(() => {
    if (messages.length > 0 && !isShared && !isLoading) {
      const timer = setTimeout(() => saveChat(), 1000);
      return () => clearTimeout(timer);
    }
  }, [messages, isShared]);



  useEffect(() => {
    const handleBeforeUnload = () => {
      if (messages.length > 0 && user?.id !== 'guest' && !isShared) {
        saveChat();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [messages, currentChatId, user, isShared]);

  useEffect(() => {
    activeChatIdRef.current = currentChatId;
    if (!isShared) {
      if (currentChatId && currentChatId !== chatId) {
        navigate(`/chat/${currentChatId}`, { replace: true });
      } else if (!currentChatId && chatId) {
        navigate(`/chat`, { replace: true });
      }
    }
  }, [currentChatId, chatId, navigate, isShared]);

  useEffect(() => {
    if (chatId && chatId !== currentChatId && user?.id !== 'guest' && !isShared) {
      // Small timeout to let Sidebar fetch component data if needed, or just let handleSelectChat fetch
      handleSelectChat(chatId);
    }
  }, [chatId, user, isShared]);

  const handleShareCurrentChat = async () => {
    if (!currentChatId || user?.id === 'guest') {
      toast.error('You need an account to share chats');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/${currentChatId}/share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const shareUrl = `${window.location.origin}/share/${data.shareToken}`;
        if (navigator.share) {
          await navigator.share({ url: shareUrl, title: 'Check out this MakeChat conversation' });
        } else {
          navigator.clipboard.writeText(shareUrl);
          toast.success('Share link copied to clipboard!');
        }
      } else {
        toast.error('Failed to share chat');
      }
    } catch (error) {
      console.error('Share failed:', error);
      toast.error('Share failed');
    }
  };

  return (
    <div className="flex w-full h-screen bg-black overflow-hidden relative">
      <Spotlight />
      <Toaster position="top-center" toastOptions={{ style: { background: '#1F2023', color: '#fff' } }} />
      <Header 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        currentChatId={currentChatId}
        onShare={handleShareCurrentChat}
      />
      <Sidebar
        user={user}
        onLogout={handleLogout}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        currentChatId={currentChatId}
        backgroundGenerations={backgroundGenerations}
        refreshTrigger={messages.length}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <div className={`flex flex-col flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'ml-0'} ${thinkingPanel !== null ? 'lg:mr-[300px]' : ''} h-screen`}>
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 pt-[70px] md:pt-[80px] pb-[120px] md:pb-[140px] scrollbar-thin scrollbar-thumb-black scrollbar-track-black">
          <div className={`mx-auto space-y-4 w-full transition-all duration-300 ${thinkingPanel !== null ? 'max-w-[700px]' : 'max-w-[800px]'}`}>
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 relative z-10 w-full">
                {/* Background ambient glow - scaled down */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none opacity-40" />
                <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none opacity-40" />

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
                  className="text-center mb-8 relative"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="inline-flex items-center justify-center p-1.5 bg-white/5 border border-white/10 rounded-xl mb-4 shadow-lg backdrop-blur-md"
                  >
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                  </motion.div>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/40 tracking-tight mb-2 drop-shadow-sm pb-1">
                    {user?.name ? `Welcome back, ${user.name}` : 'Welcome to MakeChat'}
                  </h1>
                  <p className="text-gray-400 text-base md:text-lg max-w-xl mx-auto font-medium">
                    How can I help you today?
                  </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-[650px] relative">
                  {[
                    { icon: <Code2 className="w-5 h-5 text-emerald-400 group-hover:text-white transition-colors" />, bg: "from-emerald-500/20 to-transparent", title: 'Write code', desc: 'Create a Python script for data analysis' },
                    { icon: <Palette className="w-5 h-5 text-purple-400 group-hover:text-white transition-colors" />, bg: "from-purple-500/20 to-transparent", title: 'Design UI', desc: 'Generate a modern landing page design' },
                    { icon: <Lightbulb className="w-5 h-5 text-amber-400 group-hover:text-white transition-colors" />, bg: "from-amber-500/20 to-transparent", title: 'Brainstorm', desc: 'Ideas for a new marketing campaign' },
                    { icon: <FileText className="w-5 h-5 text-blue-400 group-hover:text-white transition-colors" />, bg: "from-blue-500/20 to-transparent", title: 'Summarize', desc: 'Condense a long article or document' }
                  ].map((item, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.1, duration: 0.4, ease: "easeOut" }}
                      onClick={() => handleSendMessage(item.desc, [], selectedModel)}
                      className="group relative flex flex-col items-start gap-3 p-4 bg-[#16171A]/80 hover:bg-[#1A1C20] border border-white/[0.05] hover:border-white/[0.15] rounded-2xl transition-all duration-300 text-left overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-0.5"
                    >
                      {/* Hover Gradient Background */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${item.bg} opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none`} />

                      <div className="p-2.5 bg-white/[0.03] border border-white/[0.05] group-hover:bg-white/[0.08] group-hover:border-white/[0.1] rounded-lg transition-all duration-300">
                        {item.icon}
                      </div>
                      <div>
                        <div className="text-white font-medium text-sm mb-0.5 tracking-wide">{item.title}</div>
                        <div className="text-gray-400 text-xs font-medium leading-relaxed">{item.desc}</div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => {
              const isLastAssistant = msg.role === 'assistant' && i === messages.length - 1;
              const isLastUser = msg.role === 'user' && i === messages.length - 1;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group transition-all duration-500"
                  ref={(el) => {
                    messageRefs.current[i] = el;
                    if (isLastUser) lastUserMessageRef.current = el;
                  }}
                >
                  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`space-y-2 ${msg.role === 'user' ? 'max-w-[80%]' : msg.mode === 'canvas' ? 'w-full' : 'max-w-[95%]'}`}>
                      {editingIndex === i ? (
                        <EditMessage
                          value={editText}
                          onChange={setEditText}
                          onSave={() => handleSaveEdit(i)}
                          onCancel={() => setEditingIndex(null)}
                          role={msg.role}
                          onRemoveFile={async () => {
                            if (msg.filePublicId) {
                              try {
                                await fetch(`${import.meta.env.VITE_API_URL}/api/upload/delete`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ publicId: msg.filePublicId })
                                });
                              } catch (e) {
                                console.error('Failed to delete file:', e);
                              }
                            }
                          }}
                        />
                      ) : msg.role === 'assistant' && msg.mode === 'canvas' ? (
                        <CanvasView content={msg.content} />
                      ) : msg.role === 'assistant' && msg.mode === 'think' ? (
                        <ThinkingView content={msg.content} />
                      ) : msg.role === 'assistant' && msg.mode === 'search' ? (
                        <SearchView content={msg.content} />
                      ) : (
                        <MessageBubble
                          content={msg.content}
                          role={msg.role}
                          versions={msg.versions}
                          currentVersion={msg.currentVersion || 0}
                          onVersionChange={(v) => handleVersionChange(i, v)}
                          onSendMessage={(text) => handleSendMessage(text, [], selectedModel)}

                        />
                      )}
                      {msg.thinking && msg.role === 'assistant' && editingIndex !== i && (
                        <button
                          onClick={() => setThinkingPanel(thinkingPanel === i ? null : i)}
                          className="mt-2 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white"
                        >
                          💭 Thinking
                        </button>
                      )}
                    </div>
                  </div>
                  {!editingIndex && (
                    <MessageActions
                      role={msg.role}
                      isLast={isLastAssistant}
                      isLoading={isLoading}
                      onRegenerate={handleRegenerate}
                      onEdit={() => handleEdit(i)}
                      onCopy={() => handleCopy(msg.content, i)}
                      isCopied={copiedIndex === i}
                      versions={msg.versions}
                      currentVersion={msg.currentVersion || 0}
                      onVersionChange={(v) => handleVersionChange(i, v)}
                    />
                  )}
                </motion.div>
              );
            })}
            {isLoading && !currentResponse && loadingState && (
              <div className="flex flex-col gap-3 justify-start">
                <div className="bg-white/5 rounded-2xl px-4 py-3 text-white/70 text-sm self-start">
                  <style>
                    {`
                      @keyframes dots{0%,20%{content:''}40%{content:'.'}60%{content:'..'}80%,100%{content:'...'}}
                      @keyframes shimmer{100%{transform:translateX(100%)}}
                    `}
                  </style>
                  <span>{loadingState.replace('...', '')}<span className="inline-block" style={{ animation: 'dots 1.5s infinite' }}></span></span>
                </div>
                {['bytez-image', 'bytez-video'].includes(selectedModel) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] bg-[#1F2023] rounded-2xl flex items-center justify-center border border-white/5 overflow-hidden relative shadow-lg"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full" style={{ animation: 'shimmer 2s infinite' }} />
                    <div className="flex flex-col items-center gap-4 text-white/20 relative z-10">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
            {currentResponse && !currentResponse.includes('media-container') && (
              <div className="flex justify-start">
                <div className="max-w-[95%]">
                  {messages[messages.length - 1]?.mode === 'canvas' ? (
                    <MessageBubble content={currentResponse} role="assistant" />
                  ) : messages[messages.length - 1]?.mode === 'think' ? (
                    <ThinkingView content={currentResponse} isLoading={true} />
                  ) : messages[messages.length - 1]?.mode === 'search' ? (
                    <SearchView content={currentResponse} isLoading={true} />
                  ) : (
                    <MessageBubble content={currentResponse} role="assistant" />
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        <div className={`fixed bottom-0 left-0 right-0 p-2 sm:p-3 bg-gradient-to-t from-black via-black/95 to-transparent backdrop-blur-sm ${sidebarOpen ? 'lg:left-64' : 'left-0'} ${thinkingPanel !== null ? 'lg:right-[300px]' : 'right-0'} z-10 pb-safe`}>
          <div className={`w-full mx-auto ${thinkingPanel !== null ? 'max-w-[700px]' : 'max-w-[800px]'}`}>
            <PromptInputBox
              onSend={handleSendMessage}
              isLoading={isLoading}
              defaultModel={selectedModel}
              selectedModel={selectedModel}
              onStop={handleStop}
            />
          </div>
        </div>
      </div>
      {thinkingPanel !== null && messages[thinkingPanel]?.thinking && (
        <>
          <div className="fixed right-0 top-0 h-full w-full sm:w-[300px] bg-black border-l border-white/10 shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <span>💭</span> Thinking Process
              </h3>
              <button
                onClick={() => setThinkingPanel(null)}
                className="text-white hover:bg-white/10 rounded p-1"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="text-white whitespace-pre-wrap text-sm leading-relaxed">
                {messages[thinkingPanel].thinking}
              </div>
            </div>
          </div>
          {window.innerWidth < 640 && (
            <div
              onClick={() => setThinkingPanel(null)}
              className="fixed inset-0 bg-black/50 z-40"
            />
          )}
        </>
      )}
      <QueryOutline messages={messages} onScrollTo={handleScrollToMessage} />
      <Settings user={user} isOpen={settingsOpen} setIsOpen={setSettingsOpen} onLogout={handleLogout} />



    </div>
  );
}

export default App;
