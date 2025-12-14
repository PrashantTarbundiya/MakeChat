import express from 'express';
import multer from 'multer';
import { Groq } from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';
import Bytez from 'bytez.js';
import mammoth from 'mammoth';
import { createRequire } from 'module';
import dotenv from 'dotenv';
import { SYSTEM_PROMPT } from '../config/systemPrompt.js';
import { performWebSearch } from '../utils/webSearch.js';
import { uploadToCloudinary } from '../utils/uploadToCloudinary.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse').default || require('pdf-parse');

dotenv.config();

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API });
const bytez = new Bytez(process.env.BYTEZ_API);

const MODELS = {
  'gpt-oss': 'openai/gpt-oss-120b',
  'llama-maverick': 'meta-llama/llama-4-maverick-17b-128e-instruct',
  'llama-scout': 'meta-llama/llama-4-scout-17b-16e-instruct',
  'kimi': 'moonshotai/kimi-k2-instruct-0905',
  'gemini-pro': 'gemini-pro',
  'grok-fast': 'x-ai/grok-4.1-fast:free',
  'deepseek': 'deepseek/deepseek-v3.2',
  'qwen-32b': 'qwen/qwen3-32b',
  'claude-opus': 'anthropic/claude-opus-4-5',
  'llm-council': 'council',
  'bytez-image': 'stabilityai/stable-diffusion-xl-base-1.0',
  'bytez-video': 'ali-vilab/text-to-video-ms-1.7b',
  'bytez-audio': 'suno/bark-small',
  'bytez-music': 'facebook/musicgen-stereo-small'
};

const COUNCIL_MODELS = ['grok-fast', 'gemini-pro','gpt-oss','kimi'];
const CHAIRMAN_MODEL = 'deepseek/deepseek-v3.2';

router.post('/chat', upload.array('files'), async (req, res) => {
  try {
    const { message, model = 'llama-maverick', history, chatId, userId } = req.body;
    const files = req.files;
    
    // Process uploaded files
    let imageData = null;
    let documentText = '';
    let uploadedFileUrl = null;
    let uploadedFilePublicId = null;
    
    if (files && files.length > 0) {
      const file = files[0];
      
      // Upload to Cloudinary first
      try {
        const cloudinaryResult = await uploadToCloudinary(file.buffer);
        uploadedFileUrl = cloudinaryResult.secure_url;
        uploadedFilePublicId = cloudinaryResult.public_id;
      } catch (error) {
        console.error('Cloudinary upload failed:', error);
      }
      if (file.mimetype.startsWith('image/')) {
        imageData = {
          type: 'image_url',
          image_url: {
            url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
          }
        };
      } else if (file.mimetype === 'application/pdf') {
        try {
          const pdfData = await pdfParse(file.buffer);
          if (pdfData && pdfData.text && pdfData.text.trim()) {
            documentText = `\n\n[PDF Document Content]:\n${pdfData.text}`;
          } else {
            documentText = '\n\n[PDF appears to be empty or contains only images. Please describe what you need help with regarding this PDF.]';
          }
        } catch (e) {
          console.error('PDF parsing error:', e);
          documentText = '\n\n[Unable to extract text from PDF. The file may be image-based or protected. Please describe what you need help with.]';
        }
      } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        documentText = `\n\n[Word Document Content]:\n${result.value}`;
      } else if (file.mimetype === 'text/plain') {
        documentText = `\n\n[Text File Content]:\n${file.buffer.toString('utf-8')}`;
      }
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Detect mode and perform actions
    let userMessage = message + documentText;
    
    if (message.startsWith('[Search:')) {
      const query = message.replace(/^\[Search:\s*/, '').replace(/\]$/, '');
      const searchResults = await performWebSearch(query);
      
      if (searchResults) {
        const searchContext = `\n\nWeb Search Results for "${query}":\n` +
          searchResults.map((r, i) => 
            `${i + 1}. ${r.title}\n   ${r.snippet}\n   Source: ${r.url}\n`
          ).join('\n');
        userMessage = message + searchContext;
      }
    }
    
    if (message.startsWith('[Think:')) {
      const query = message.replace(/^\[Think:\s*/, '').replace(/\]$/, '');
      const searchResults = await performWebSearch(query);
      
      if (searchResults) {
        const researchContext = `\n\nResearch Data for "${query}":\n` +
          searchResults.map((r, i) => 
            `Source ${i + 1}: ${r.title}\n${r.snippet}\nURL: ${r.url}\n`
          ).join('\n') +
          '\n\nAnalyze this data deeply with step-by-step reasoning.';
        userMessage = message + researchContext;
      }
    }
    
    if (message.startsWith('[Canvas:')) {
      userMessage = message + '\n\nProvide complete standalone HTML with all CSS/JS inline. User will see the rendered output, not code.';
    }

    // Build messages array with history from DB or request
    let systemPrompt = SYSTEM_PROMPT;
    
    // Add user memory to system prompt
    if (userId && userId !== 'guest') {
      try {
        const UserMemory = (await import('../models/UserMemory.js')).default;
        const userMemory = await UserMemory.findOne({ userId });
        if (userMemory && userMemory.memories.length > 0) {
          systemPrompt += '\n\n=== USER PERSONALIZED INFORMATION ===\n' +
            'The following information is about this specific user. Use it ONLY when relevant to their question or when it adds value to your response. Do NOT force this information into every answer.\n\n' +
            userMemory.memories.join('\n') +
            '\n\nWhen user says "save this", "remember this", "store this", or similar phrases, acknowledge that you will remember the information.';
        }
      } catch (e) {
        console.error('Failed to load user memory:', e);
      }
    }
    
    const messages = [{ role: 'system', content: systemPrompt }];
    
    if (chatId) {
      try {
        const Chat = (await import('../models/Chat.js')).default;
        const chat = await Chat.findById(chatId);
        if (chat && chat.messages) {
          chat.messages.forEach(msg => {
            messages.push({ role: msg.role, content: msg.content });
          });
        }
      } catch (e) {
        console.error('Failed to load chat history:', e);
      }
    } else if (history) {
      try {
        const parsedHistory = JSON.parse(history);
        parsedHistory.forEach(msg => {
          messages.push({ role: msg.role, content: msg.content });
        });
      } catch (e) {}
    }
    
    // Add user message with image if present
    if (imageData) {
      messages.push({ 
        role: 'user', 
        content: [
          { type: 'text', text: userMessage },
          imageData
        ]
      });
    } else {
      messages.push({ role: 'user', content: userMessage });
    }

    let fullResponse = '';

    // Handle LLM Council mode
    if (model === 'llm-council') {
      res.write(`data: ${JSON.stringify({ content: '### 🏛️ LLM Council - Stage 1: Gathering Opinions\n\n' })}

`);
      
      const councilResponses = [];
      
      // Stage 1: Get responses from all council members
      for (const councilModel of COUNCIL_MODELS) {
        res.write(`data: ${JSON.stringify({ content: `**${councilModel.toUpperCase()}** is thinking...\n` })}

`);
        
        let response = '';
        if (councilModel === 'gemini-pro') {
          const result = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
            systemInstruction: systemPrompt
          });
          response = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else if (councilModel === 'grok-fast') {
          const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: MODELS[councilModel], messages: [{ role: 'user', content: userMessage }] })
          });
          const data = await resp.json();
          response = data.choices?.[0]?.message?.content || '';
        } else {
          const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: userMessage }],
            model: MODELS[councilModel],
            temperature: 1,
            max_completion_tokens: 2048
          });
          response = completion.choices[0]?.message?.content || '';
        }
        
        councilResponses.push({ model: councilModel, response });
        res.write(`data: ${JSON.stringify({ content: `✓ ${councilModel.toUpperCase()} responded\n` })}

`);
      }
      
      // Stage 2: Review and rank
      res.write(`data: ${JSON.stringify({ content: '\n### 🔍 Stage 2: Peer Review\n\n' })}

`);
      
      const rankings = [];
      for (let i = 0; i < councilResponses.length; i++) {
        const reviewer = councilResponses[i];
        const othersAnonymized = councilResponses
          .filter((_, idx) => idx !== i)
          .map((r, idx) => `Response ${idx + 1}: ${r.response}`)
          .join('\n\n');
        
        const reviewPrompt = `You are reviewing responses to: "${userMessage}"\n\nHere are the responses:\n${othersAnonymized}\n\nRank these responses from best to worst (1 being best) based on accuracy and insight. Respond with just the rankings like: 1,2,3`;
        
        let ranking = '';
        if (reviewer.model === 'gemini-pro') {
          const result = await genAI.models.generateContent({ model: 'gemini-2.5-flash', contents: [{ role: 'user', parts: [{ text: reviewPrompt }] }] });
          ranking = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else if (reviewer.model === 'grok-fast') {
          const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: MODELS[reviewer.model], messages: [{ role: 'user', content: reviewPrompt }] })
          });
          const data = await resp.json();
          ranking = data.choices?.[0]?.message?.content || '';
        } else {
          const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: reviewPrompt }],
            model: MODELS[reviewer.model],
            temperature: 0.5,
            max_completion_tokens: 100
          });
          ranking = completion.choices[0]?.message?.content || '';
        }
        rankings.push(ranking);
      }
      
      res.write(`data: ${JSON.stringify({ content: 'Reviews collected\n' })}

`);
      
      // Stage 3: Chairman produces final response
      res.write(`data: ${JSON.stringify({ content: '\n### 👔 Stage 3: Chairman\'s Final Response\n\n' })}

`);
      
      const allResponses = councilResponses.map((r, i) => `**${r.model.toUpperCase()}:**\n${r.response}`).join('\n\n---\n\n');
      const chairmanPrompt = `You are the Chairman of an LLM Council. The user asked: "${userMessage}"\n\nHere are the responses from council members:\n\n${allResponses}\n\nBased on these responses and peer reviews, provide a comprehensive final answer that synthesizes the best insights.`;
      
      const chairmanResp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: CHAIRMAN_MODEL, messages: [{ role: 'user', content: chairmanPrompt }], stream: true })
      });
      
      const reader = chairmanResp.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));
        for (const line of lines) {
          const data = line.replace('data: ', '').trim();
          if (data === '[DONE]') break;
          if (!data) continue;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              res.write(`data: ${JSON.stringify({ content })}

`);
            }
          } catch (e) {}
        }
      }
      
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }
    
    // Detect file generation request
    const fileGenMatch = message.match(/(?:provide|give|create|generate|make).*?(?:in|as|to)\s+(pdf|docx|txt|csv|json|xml|html|md)/i);
    const isFileGeneration = fileGenMatch !== null;

    // Handle Gemini model
    if (model === 'gemini-pro') {
      try {
        const geminiHistory = [];
        for (let i = 1; i < messages.length - 1; i++) {
          geminiHistory.push({
            role: messages[i].role === 'assistant' ? 'model' : 'user',
            parts: [{ text: messages[i].content }]
          });
        }
        
        let currentContent;
        if (imageData) {
          const base64Data = imageData.image_url.url.split(',')[1];
          const mimeType = imageData.image_url.url.match(/data:(.*?);/)[1];
          currentContent = [
            { text: userMessage },
            { inlineData: { data: base64Data, mimeType } }
          ];
        } else {
          currentContent = [{ text: userMessage }];
        }
        
        const result = await genAI.models.generateContentStream({
          model: 'gemini-2.5-flash',
          contents: [...geminiHistory, { role: 'user', parts: currentContent }],
          systemInstruction: systemPrompt
        });
        for await (const chunk of result) {
          const content = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (content) {
            fullResponse += content;
            res.write(`data: ${JSON.stringify({ content })}

`);
          }
        }
        if (!fullResponse) {
          fullResponse = 'No response generated. Please try again.';
          res.write(`data: ${JSON.stringify({ content: fullResponse })}

`);
        }
      } catch (error) {
        console.error('Gemini error:', error);
        fullResponse = `Error: ${error.message || 'Gemini API failed. Please try again.'}`;
        res.write(`data: ${JSON.stringify({ content: fullResponse })}

`);
      }
    }
    // Handle OpenRouter text models
    else if (['grok-fast', 'deepseek'].includes(model)) {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MODELS[model],
          messages: messages.filter(m => typeof m.content === 'string').map(m => ({ role: m.role, content: m.content })),
          stream: true
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenRouter API error');
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));
        for (const line of lines) {
          const data = line.replace('data: ', '').trim();
          if (data === '[DONE]') break;
          if (!data) continue;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              res.write(`data: ${JSON.stringify({ content })}

`);
            }
          } catch (e) {
            console.error('Parse error:', e, 'Data:', data);
          }
        }
      }
    }
    // Handle Bytez Image Generation
    else if (model === 'bytez-image') {
      res.write(`data: ${JSON.stringify({ content: '<div class="loader-box" style="padding:20px; background:#1F2023; border-radius:12px; border:1px solid #444; text-align:center;"><div style="display:inline-block; width:40px; height:40px; border:4px solid #333; border-top-color:#3b82f6; border-radius:50%; animation:spin 1s linear infinite;"></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style><div style="margin-top:15px; color:#fff; font-weight:500;">🎨 Generating image...</div><div style="margin-top:8px; color:#9CA3AF; font-size:14px;">This may take a moment, please wait...</div></div>' })}

`);
      const cleanPrompt = message.replace(/^\[.*?:\s*/, '').replace(/\]$/, '').trim();
      const bytezModel = bytez.model(MODELS[model]);
      const { error, output } = await bytezModel.run(cleanPrompt);
      if (error) throw new Error(error);
      fullResponse = `<div class="media-container" style="position:relative;"><img src="${output}" style="max-width:100%; border-radius:8px;"/><button data-download data-url="${output}" data-filename="image.png" style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.7); padding:8px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:none; cursor:pointer;" title="Download Image"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg></button></div>`;
      res.write(`data: ${JSON.stringify({ content: fullResponse })}

`);
    }
    // Handle Bytez Video Generation
    else if (model === 'bytez-video') {
      res.write(`data: ${JSON.stringify({ content: '<div class="loader-box" style="padding:20px; background:#1F2023; border-radius:12px; border:1px solid #444; text-align:center;"><div style="display:inline-block; width:40px; height:40px; border:4px solid #333; border-top-color:#3b82f6; border-radius:50%; animation:spin 1s linear infinite;"></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style><div style="margin-top:15px; color:#fff; font-weight:500;">🎬 Generating video...</div><div style="margin-top:8px; color:#9CA3AF; font-size:14px;">Video generation takes time, please be patient...</div></div>' })}

`);
      const cleanPrompt = message.replace(/^\[.*?:\s*/, '').replace(/\]$/, '').trim();
      const bytezModel = bytez.model(MODELS[model]);
      const { error, output } = await bytezModel.run(cleanPrompt);
      if (error) throw new Error(error);
      fullResponse = `<div class="media-container" style="position:relative;"><video controls src="${output}" style="max-width:100%; border-radius:8px;"></video><button data-download data-url="${output}" data-filename="video.mp4" style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.7); padding:8px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:none; cursor:pointer;" title="Download Video"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg></button></div>`;
      res.write(`data: ${JSON.stringify({ content: fullResponse })}

`);
    }
    // Handle Bytez Audio Generation
    else if (model === 'bytez-audio') {
      res.write(`data: ${JSON.stringify({ content: '<div class="loader-box" style="padding:20px; background:#1F2023; border-radius:12px; border:1px solid #444; text-align:center;"><div style="display:inline-block; width:40px; height:40px; border:4px solid #333; border-top-color:#3b82f6; border-radius:50%; animation:spin 1s linear infinite;"></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style><div style="margin-top:15px; color:#fff; font-weight:500;">🎙️ Generating audio...</div><div style="margin-top:8px; color:#9CA3AF; font-size:14px;">Please wait while we generate audio...</div></div>' })}

`);
      const cleanPrompt = message.replace(/^\[.*?:\s*/, '').replace(/\]$/, '').trim();
      const bytezModel = bytez.model(MODELS[model]);
      const { error, output } = await bytezModel.run(cleanPrompt);
      if (error) throw new Error(error);
      fullResponse = `<div class="media-container" style="position:relative;"><audio controls src="${output}" style="max-width:100%;"></audio><button data-download data-url="${output}" data-filename="audio.mp3" style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.7); padding:8px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:none; cursor:pointer;" title="Download Audio"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg></button></div>`;
      res.write(`data: ${JSON.stringify({ content: fullResponse })}

`);
    }
    // Handle Claude Opus via Bytez
    else if (model === 'claude-opus') {
      const bytezModel = bytez.model(MODELS[model]);
      const bytezMessages = messages.filter(m => m.role !== 'system' && typeof m.content === 'string').map(m => ({
        role: m.role,
        content: m.content
      }));
      const { error, output } = await bytezModel.run(bytezMessages);
      if (error) throw new Error(error);
      
      if (typeof output === 'object' && output.content) {
        fullResponse = output.content;
      } else if (typeof output === 'string') {
        fullResponse = output;
      } else {
        fullResponse = JSON.stringify(output);
      }
      
      res.write(`data: ${JSON.stringify({ content: fullResponse })}

`);
    }
    // Handle Bytez Music Generation
    else if (model === 'bytez-music') {
      res.write(`data: ${JSON.stringify({ content: '<div class="loader-box" style="padding:20px; background:#1F2023; border-radius:12px; border:1px solid #444; text-align:center;"><div style="display:inline-block; width:40px; height:40px; border:4px solid #333; border-top-color:#3b82f6; border-radius:50%; animation:spin 1s linear infinite;"></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style><div style="margin-top:15px; color:#fff; font-weight:500;">🎵 Generating music...</div><div style="margin-top:8px; color:#9CA3AF; font-size:14px;">Music generation in progress, please wait...</div></div>' })}

`);
      const cleanPrompt = message.replace(/^\[.*?:\s*/, '').replace(/\]$/, '').trim();
      const bytezModel = bytez.model(MODELS[model]);
      const { error, output } = await bytezModel.run(cleanPrompt);
      if (error) throw new Error(error);
      fullResponse = `<div class="media-container" style="position:relative;"><audio controls src="${output}" style="max-width:100%;"></audio><button data-download data-url="${output}" data-filename="music.mp3" style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.7); padding:8px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:none; cursor:pointer;" title="Download Music"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg></button></div>`;
      res.write(`data: ${JSON.stringify({ content: fullResponse })}

`);
    }
    // Handle Groq models
    else {
      const groqConfig = {
        messages,
        model: MODELS[model] || MODELS['llama-maverick'],
        temperature: model === 'qwen-32b' ? 0.6 : 1,
        max_completion_tokens: 4096,
        top_p: model === 'qwen-32b' ? 0.95 : 1,
        stream: true,
        stop: null
      };
      
      if (model === 'qwen-32b') {
        groqConfig.reasoning_effort = 'default';
      }
      
      const chatCompletion = await groq.chat.completions.create(groqConfig);
      let thinkingContent = '';
      for await (const chunk of chatCompletion) {
        const content = chunk.choices[0]?.delta?.content || '';
        const reasoning = chunk.choices[0]?.delta?.reasoning_content || '';
        if (reasoning) {
          thinkingContent += reasoning;
          res.write(`data: ${JSON.stringify({ reasoning })}

`);
        }
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}

`);
        }
      }
    }

    // Handle file generation if detected
    if (isFileGeneration && fullResponse) {
      const fileType = fileGenMatch[1].toLowerCase();
      const mimeTypes = {
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        txt: 'text/plain',
        csv: 'text/csv',
        json: 'application/json',
        xml: 'application/xml',
        html: 'text/html',
        md: 'text/markdown'
      };
      
      const cleanContent = fullResponse.replace(/<[^>]*>/g, '').replace(/```[\s\S]*?```/g, (match) => {
        return match.replace(/```\w*\n?/, '').replace(/```$/, '');
      }).trim();
      
      const filename = `response.${fileType}`;
      const encodedContent = encodeURIComponent(cleanContent);
      
      fullResponse += `\n\n<div class="file-download" style="margin-top:20px; padding:16px; background:#1F2023; border-radius:12px; border:1px solid #444;"><div style="display:flex; align-items:center; gap:12px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><div style="flex:1;"><div style="color:#fff; font-weight:500;">${filename}</div><div style="color:#9CA3AF; font-size:14px; margin-top:2px;">Click to download</div></div><button data-download data-content="${encodedContent}" data-filename="${filename}" data-type="${mimeTypes[fileType]}" style="background:#3b82f6; color:#fff; padding:8px 16px; border-radius:8px; border:none; cursor:pointer; font-weight:500;">Download</button></div></div>`;
    }
    
    // Auto-save to memory if user asks to save/remember
    const lowerMsg = message.toLowerCase();
    if (userId && userId !== 'guest' && 
        (lowerMsg.includes('save this') || lowerMsg.includes('remember this') || 
         lowerMsg.includes('store this') || lowerMsg.includes('save that') || 
         lowerMsg.includes('remember that'))) {
      try {
        const UserMemory = (await import('../models/UserMemory.js')).default;
        let userMemory = await UserMemory.findOne({ userId });
        
        // Extract the information to save (remove the save/remember command)
        let infoToSave = message
          .replace(/save this|remember this|store this|save that|remember that/gi, '')
          .trim();
        
        if (infoToSave) {
          if (!userMemory) {
            userMemory = new UserMemory({ userId, memories: [infoToSave] });
          } else {
            userMemory.memories.push(infoToSave);
          }
          await userMemory.save();
        }
      } catch (e) {
        console.error('Failed to auto-save memory:', e);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Error:', error);
    try {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/event-stream');
      }
      const errorMsg = `Error: ${error.message || 'Something went wrong. Please try again.'}`;
      res.write(`data: ${JSON.stringify({ content: errorMsg })}

`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (e) {
      console.error('Failed to send error:', e);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  }
});

router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const audioFile = req.file;
    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Use Groq Whisper for transcription
    const formData = new FormData();
    const audioBlob = new Blob([audioFile.buffer], { type: 'audio/webm' });
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-large-v3');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: formData
    });

    const data = await response.json();
    res.json({ text: data.text || '' });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: 'Transcription failed', text: '' });
  }
});

router.get('/models', (req, res) => {
  res.json({ models: Object.keys(MODELS) });
});

export default router;
