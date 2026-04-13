import express from 'express';
import multer from 'multer';
import { Groq } from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';
import Bytez from 'bytez.js';
import mammoth from 'mammoth';
import { createRequire } from 'module';
import dotenv from 'dotenv';
import { SYSTEM_PROMPT } from '../config/systemPrompt.js';
import { SPECIALIZED_3D_PROMPT } from '../config/specialized3DPrompt.js';
import { performWebSearch } from '../utils/webSearch.js';
import { uploadToCloudinary } from '../utils/uploadToCloudinary.js';
import { generateFileBuffer } from '../utils/fileGenerator.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

dotenv.config();

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API });
const bytez = new Bytez(process.env.BYTEZ_API);

const MODELS = {
  'gpt-oss': 'openai/gpt-oss-120b',
  'llama-maverick': 'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama-scout': 'meta-llama/llama-4-scout-17b-16e-instruct',
  'kimi': 'moonshotai/kimi-k2-instruct-0905',
  'gemini-pro': 'gemini-pro',
  'grok-fast': 'x-ai/grok-4.1-fast:free',
  'deepseek': 'deepseek/deepseek-v3.2',
  'step-3.5-flash': 'stepfun/step-3.5-flash:free',
  'qwen-32b': 'qwen/qwen3-32b',
  'claude-opus': 'anthropic/claude-opus-4-5',
  'llm-council': 'council',
  'bytez-image': 'stabilityai/stable-diffusion-xl-base-1.0',
  'bytez-video': 'ali-vilab/text-to-video-ms-1.7b',
  'bytez-audio': 'suno/bark-small',
  'bytez-music': 'facebook/musicgen-stereo-small'
};

const COUNCIL_MODELS = ['grok-fast', 'gemini-pro', 'gpt-oss', 'kimi'];
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
      // console.log(`[File Upload] Received: ${file.originalname}, type: ${file.mimetype}, size: ${(file.size / 1024).toFixed(1)}KB`);

      // Upload to Cloudinary first
      try {
        const cloudinaryResult = await uploadToCloudinary(file.buffer);
        uploadedFileUrl = cloudinaryResult.secure_url;
        uploadedFilePublicId = cloudinaryResult.public_id;
        // console.log(`[File Upload] Cloudinary success: ${uploadedFileUrl}`);
      } catch (error) {
        // console.error('[File Upload] Cloudinary failed:', error.message);
      }
      if (file.mimetype.startsWith('image/')) {
        imageData = {
          type: 'image_url',
          image_url: {
            url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
          }
        };
      } else if (file.mimetype === 'application/pdf') {
        // console.log('[PDF Parse] Starting extraction...');
        try {
          const pdfData = await pdfParse(file.buffer);
          const text = pdfData?.text?.trim() || '';
          const pageCount = pdfData?.numpages || 'unknown';
          // console.log(`[PDF Parse] Success — Pages: ${pageCount}, Characters: ${text.length}`);

          if (text.length > 0) {
            // Truncate very large PDFs to avoid token limits
            const maxChars = 50000;
            const truncated = text.length > maxChars;
            const content = truncated ? text.slice(0, maxChars) : text;

            documentText = `\n\n=== PDF DOCUMENT ===\nFilename: ${file.originalname}\nPages: ${pageCount}\nCharacters: ${text.length}${truncated ? ` (showing first ${maxChars})` : ''}\n\n--- CONTENT START ---\n${content}\n--- CONTENT END ---${truncated ? '\n[Note: Document was truncated due to length. Ask user if they need content from later pages.]' : ''}`;
          } else {
            // console.log('[PDF Parse] No text extracted — PDF may be image-based or scanned');
            documentText = `\n\n[PDF "${file.originalname}" was uploaded but contains no extractable text. It may be a scanned/image-based PDF. Please describe what you see or need help with regarding this document.]`;
          }
        } catch (e) {
          // console.error('[PDF Parse] Error:', e.message);
          documentText = `\n\n[Failed to extract text from "${file.originalname}". Error: ${e.message}. The PDF may be corrupted, encrypted, or image-based. Please describe what you need help with.]`;
        }
      } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // console.log('[DOCX Parse] Starting extraction...');
        try {
          const result = await mammoth.extractRawText({ buffer: file.buffer });
          // console.log(`[DOCX Parse] Success — Characters: ${result.value.length}`);
          documentText = `\n\n=== WORD DOCUMENT ===\nFilename: ${file.originalname}\n\n--- CONTENT START ---\n${result.value}\n--- CONTENT END ---`;
        } catch (e) {
          // console.error('[DOCX Parse] Error:', e.message);
          documentText = `\n\n[Failed to extract text from "${file.originalname}". Please describe what you need help with.]`;
        }
      } else if (file.mimetype === 'text/plain') {
        const text = file.buffer.toString('utf-8');
        // console.log(`[TXT Parse] Success — Characters: ${text.length}`);
        documentText = `\n\n=== TEXT FILE ===\nFilename: ${file.originalname}\n\n--- CONTENT START ---\n${text}\n--- CONTENT END ---`;
      } else {
        // console.log(`[File Upload] Unsupported file type: ${file.mimetype}`);
      }
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Detect mode and perform actions
    let userMessage = message + documentText;

    if (message.startsWith('[Search:')) {
      const query = message.replace(/^\[Search:\s*/, '').replace(/\]$/, '');
      try {
        const searchResults = await performWebSearch(query);

        if (searchResults) {
          const searchContext = `\n\nWeb Search Results for "${query}":\n` +
            searchResults.map((r, i) =>
              `${i + 1}. ${r.title}\n   ${r.snippet}\n   Source: ${r.url}\n`
            ).join('\n');
          userMessage = message + searchContext;
        }
      } catch (e) {
        console.error('Search failed:', e);
      }
    }

    if (message.startsWith('[Think:')) {
      const query = message.replace(/^\[Think:\s*/, '').replace(/\]$/, '');
      try {
        const searchResults = await performWebSearch(query);

        if (searchResults) {
          const researchContext = `\n\nResearch Data for "${query}":\n` +
            searchResults.map((r, i) =>
              `Source ${i + 1}: ${r.title}\n${r.snippet}\nURL: ${r.url}\n`
            ).join('\n') +
            '\n\nAnalyze this data deeply with step-by-step reasoning.';
          userMessage = message + researchContext;
        }
      } catch (e) {
        console.error('Think search failed:', e);
      }
    }

    if (message.startsWith('[Canvas:')) {
      userMessage = message + '\n\nProvide complete standalone HTML with all CSS/JS inline. User will see the rendered output, not code.';
    }

    if (message.startsWith('[Diagram:')) {
      userMessage = message + '\n\nCRITICAL INSTRUCTION: Analyze the request and ONLY output a valid mermaid.js diagram enclosed in a ```mermaid code block. Do NOT provide any conversational text, explanations, or wrapper HTML.';
    }

    if (message.startsWith('[Map:')) {
      userMessage = message + '\n\nCRITICAL INSTRUCTION: Analyze the request and ONLY output a valid Map configuration JSON wrapped in a ```json mapConfig code block. Include center coordinates, zoom, and points of interest markers. Do NOT provide any other text.';
    }



    // Detect file generation request — comprehensive multi-pattern detection
    const FILE_TYPES_PATTERN = '(pdf|docx|txt|csv|tsv|json|xml|yaml|yml|md|markdown|sql|jsonl|ndjson|toml|ini|properties|svg|html|html5|xhtml|astro|jsx|tsx|py|python|js|javascript|ts|typescript|cpp|java|cs|csharp|go|golang|rust|shell|bash|sh|ruby|php|dockerfile|makefile|gradle|maven|pom|dart|kotlin|swift|groovy|latex|tex|r|matlab|css|scss|less|gql|graphql|env|gitignore)';
    const lowerMessage = message.toLowerCase();

    let fileGenMatch = null;
    // Skip fuzzy detection for question-like messages (only allow explicit patterns)
    const isQuestion = /^(what|how|why|when|where|who|is|are|does|do|can|could|explain|tell me about|describe|compare)\b/i.test(message.trim());

    // Pattern 1: Explicit [File:xxx] prefix — always checked
    fileGenMatch = fileGenMatch || message.match(/^\[File:([\w.]+)\]/i);
    // Pattern 2: "verb ... filetype" — provide pdf, generate a pdf, give me pdf, etc.
    fileGenMatch = fileGenMatch || message.match(new RegExp(`(?:provide|give|create|generate|make|return|output|save|export|send|write|build|prepare|compile|produce|render|convert|download|get).*?\\b${FILE_TYPES_PATTERN}\\b`, 'i'));
    // Patterns 3-8: Fuzzy detection — skip for question-like messages to avoid false positives
    if (!fileGenMatch && !isQuestion) {
      // Pattern 3: "i need/want pdf" / "i need a pdf" / "i need pdf here"
      fileGenMatch = fileGenMatch || message.match(new RegExp(`(?:i\\s+(?:need|want|require)(?:\\s+(?:a|an|the|this|that))?\\s+)${FILE_TYPES_PATTERN}\\b`, 'i'));
      // Pattern 4: "filetype for ..." / "pdf for hello world"
      fileGenMatch = fileGenMatch || message.match(new RegExp(`^\\s*${FILE_TYPES_PATTERN}\\s+(?:for|of|about|on|regarding|containing|with)\\b`, 'i'));
      // Pattern 5: "as pdf" / "in pdf" / "to pdf" / "into pdf" / "as a pdf"
      fileGenMatch = fileGenMatch || message.match(new RegExp(`(?:as|in|to|into)\\s+(?:a\\s+)?${FILE_TYPES_PATTERN}(?:\\s+(?:file|format|document))?\\b`, 'i'));
      // Pattern 6: "pdf please" / "pdf file" / "pdf document"
      fileGenMatch = fileGenMatch || message.match(new RegExp(`\\b${FILE_TYPES_PATTERN}\\s+(?:please|file|document|format|download|here)\\b`, 'i'));
      // Pattern 7: "download link" / "download it" / "download here" (infer pdf from context)
      if (!fileGenMatch && /\b(download|file)\b.*\b(link|it|here|this|button|now)\b/i.test(message)) {
        const typeInMsg = message.match(new RegExp(`\\b${FILE_TYPES_PATTERN}\\b`, 'i'));
        if (typeInMsg) {
          fileGenMatch = typeInMsg;
        } else if (history || chatId) {
          fileGenMatch = ['download pdf', 'pdf'];
        }
      }
      // Pattern 8: Standalone filetype word (e.g. just "pdf") when there's prior conversation
      if (!fileGenMatch && (history || chatId)) {
        const standaloneMatch = lowerMessage.trim().match(new RegExp(`^\\s*(?:(?:a|the|one|this)\\s+)?${FILE_TYPES_PATTERN}\\s*[.!?]*\\s*$`, 'i'));
        if (standaloneMatch) fileGenMatch = standaloneMatch;
      }
    }

    const isFileGeneration = fileGenMatch !== null;
    const detectedFileType = fileGenMatch ? (fileGenMatch[1] || 'pdf').toLowerCase() : null;

    // Build messages array with history from DB or request
    // Detect 3D mode: [3D:...], [3D ...], [3D rendering:...], [3d model:...], etc.
    const is3DMode = model === 'mode-3d' || /^\[3[dD]\s*[:\-\s]/i.test(message.trim());
    let systemPrompt = is3DMode ? SPECIALIZED_3D_PROMPT : SYSTEM_PROMPT;
    if (isFileGeneration) {
      const ft = detectedFileType.toUpperCase();
      const hasHistory = !!(history || chatId);
      systemPrompt += `\n\nCRITICAL PRIORITY — FILE GENERATION MODE:
You MUST generate a downloadable ${ft} file for the user.
The backend will AUTOMATICALLY convert your text output into a real binary ${ft} file and give the user a download link. This is seamless and invisible to them.

RULES:
1. You must NEVER say "I cannot generate files" or "I'm a text-based AI". You CAN and WILL generate the file.
2. You must NEVER suggest the user use Google Docs, Microsoft Word, or any external tool. The file is generated HERE.
3. You must NOT wrap your response in a markdown code block (e.g. \`\`\`markdown). Output the formatted document text DIRECTLY.
4. ${hasHistory ? 'If the user is referring to content from earlier in this conversation, use that content as the basis for the file. Re-generate and include that earlier content in your response — do NOT just reference it.' : 'Generate the complete document content as requested.'}
5. Write high-quality, complete document content. Include proper headings, formatting, and structure.
6. For PDF/DOCX: Use markdown formatting (headings, bold, lists, code blocks) — the system will render it beautifully.
7. For code files: Output ONLY the raw code, no explanations around it.`;
    }

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

    if (history) {
      try {
        const parsedHistory = JSON.parse(history);
        parsedHistory.forEach(msg => {
          messages.push({ role: msg.role, content: msg.content });
        });
      } catch (e) { }
    } else if (chatId) {
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
    }

    // For 3D mode, wrap user message with reinforcement directive
    let userMessage_final = userMessage;
    if (is3DMode) {
      userMessage_final = `REMINDER: You MUST output ONLY a single \`\`\`3d code block containing a complete, self-contained HTML file. NO text before or after. NO descriptions. NO explanations. Just the code block.

USER REQUEST: ${userMessage}`;
    }

    // Add user message with image if present
    if (imageData) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: userMessage_final },
          imageData
        ]
      });
    } else {
      messages.push({ role: 'user', content: userMessage_final });
    }

    let fullResponse = '';

    // Handle LLM Council mode
    if (model === 'llm-council') {
      res.write(`data: ${JSON.stringify({ content: '### 🏛️ LLM Council - Stage 1: Initial Opinions\n\n' })}

`);

      const councilResponses = [];

      // Stage 1: Get initial responses from all council members
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

      // Stage 2: Debate - Each model reviews all other responses and provides critique
      res.write(`data: ${JSON.stringify({ content: '\n### 💬 Stage 2: Council Debate\n\n' })}

`);

      const debates = [];
      for (let i = 0; i < councilResponses.length; i++) {
        const debater = councilResponses[i];
        const allResponses = councilResponses
          .map((r, idx) => `**${r.model.toUpperCase()}:**\n${r.response}`)
          .join('\n\n---\n\n');

        const debatePrompt = `You are ${debater.model.toUpperCase()} in an LLM Council debate.\n\nOriginal question: "${userMessage}"\n\nHere are all council members' responses:\n\n${allResponses}\n\nNow provide your analysis: What are the strengths and weaknesses of each response? What insights are missing? Keep it concise (2-3 sentences per response).`;

        res.write(`data: ${JSON.stringify({ content: `**${debater.model.toUpperCase()}** is analyzing...\n` })}

`);

        let debate = '';
        if (debater.model === 'gemini-pro') {
          const result = await genAI.models.generateContent({ model: 'gemini-2.5-flash', contents: [{ role: 'user', parts: [{ text: debatePrompt }] }] });
          debate = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else if (debater.model === 'grok-fast') {
          const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: MODELS[debater.model], messages: [{ role: 'user', content: debatePrompt }] })
          });
          const data = await resp.json();
          debate = data.choices?.[0]?.message?.content || '';
        } else {
          const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: debatePrompt }],
            model: MODELS[debater.model],
            temperature: 0.7,
            max_completion_tokens: 1024
          });
          debate = completion.choices[0]?.message?.content || '';
        }

        debates.push({ model: debater.model, debate });
        res.write(`data: ${JSON.stringify({ content: `✓ ${debater.model.toUpperCase()} analyzed\n` })}

`);
      }

      // Stage 3: Chairman synthesizes everything
      res.write(`data: ${JSON.stringify({ content: '\n### 👔 Stage 3: Chairman\'s Synthesis\n\n' })}

`);

      const allResponses = councilResponses.map((r, i) => `**${r.model.toUpperCase()}:**\n${r.response}`).join('\n\n---\n\n');
      const allDebates = debates.map((d, i) => `**${d.model.toUpperCase()}\'s Analysis:**\n${d.debate}`).join('\n\n---\n\n');

      const chairmanPrompt = `You are the Chairman of an LLM Council. The user asked: "${userMessage}"\n\n## Initial Responses:\n${allResponses}\n\n## Council Debate & Analysis:\n${allDebates}\n\nBased on all responses and the debate analysis, provide a comprehensive final answer that:\n1. Synthesizes the best insights from all members\n2. Addresses weaknesses identified in the debate\n3. Provides a complete, accurate answer to the user's question`;

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
          } catch (e) { }
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

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
    else if (['grok-fast', 'deepseek', 'step-3.5-flash'].includes(model)) {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MODELS[model],
          messages: messages.map(m => {
            if (typeof m.content === 'string') return { role: m.role, content: m.content };
            return { role: m.role, content: m.content }; // Pass multimodal array exactly as is
          }),
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
            const reasoning = parsed.choices[0]?.delta?.reasoning;

            if (reasoning) {
              res.write(`data: ${JSON.stringify({ reasoning })}

`);
            }
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
      const bytezMessages = messages.filter(m => m.role !== 'system').map(m => {
        let content = m.content;
        if (typeof content !== 'string') {
          const textPart = content.find(c => c.type === 'text');
          content = textPart ? textPart.text : '';
        }
        return { role: m.role, content };
      });

      const { error, output } = await bytezModel.run(bytezMessages);
      if (error) throw new Error(error);

      // Extract content from response
      let responseText = '';
      if (typeof output === 'object' && output.content) {
        if (Array.isArray(output.content)) {
          responseText = output.content.map(c => c.text || c).join('');
        } else {
          responseText = output.content;
        }
      } else if (typeof output === 'string') {
        responseText = output;
      } else {
        responseText = JSON.stringify(output);
      }

      fullResponse = responseText;
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
    // Handle Groq models (Text only)
    else {
      const groqConfig = {
        messages: messages.map(m => {
          // Groq strict string requirement
          if (typeof m.content === 'string') return m;
          // Extract just the text prompt, ignore the image
          const textPart = m.content.find(c => c.type === 'text');
          return { role: m.role, content: textPart ? textPart.text : '' };
        }),
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
      try {
        const fileType = detectedFileType;
        const mimeTypes = {
          // Documents
          pdf: 'application/pdf',
          docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

          // Data formats
          json: 'application/json',
          jsonl: 'application/x-jsonlines',
          ndjson: 'application/x-jsonlines',
          csv: 'text/csv',
          tsv: 'text/tab-separated-values',
          xml: 'application/xml',
          yaml: 'text/yaml',
          yml: 'text/yaml',
          toml: 'text/plain',
          ini: 'text/plain',
          properties: 'text/plain',

          // Markup & Styling
          html: 'text/html',
          html5: 'text/html',
          xhtml: 'application/xhtml+xml',
          md: 'text/markdown',
          markdown: 'text/markdown',
          svg: 'image/svg+xml',
          css: 'text/css',
          scss: 'text/plain',
          less: 'text/plain',

          // Programming languages
          js: 'text/javascript',
          javascript: 'text/javascript',
          ts: 'text/plain',
          typescript: 'text/plain',
          jsx: 'text/plain',
          tsx: 'text/plain',
          py: 'text/plain',
          python: 'text/plain',
          java: 'text/plain',
          cpp: 'text/plain',
          'c++': 'text/plain',
          cs: 'text/plain',
          csharp: 'text/plain',
          go: 'text/plain',
          golang: 'text/plain',
          rust: 'text/plain',
          ruby: 'text/plain',
          php: 'text/plain',
          shell: 'text/plain',
          bash: 'text/plain',
          sh: 'text/plain',
          dart: 'text/plain',
          kotlin: 'text/plain',
          swift: 'text/plain',
          groovy: 'text/plain',
          r: 'text/plain',
          matlab: 'text/plain',
          latex: 'text/plain',
          tex: 'text/plain',
          sql: 'text/plain',
          graphql: 'text/plain',
          gql: 'text/plain',

          // Web & Frameworks
          astro: 'text/plain',
          dockerfile: 'text/plain',
          makefile: 'text/plain',
          gradle: 'text/plain',
          maven: 'application/xml',
          pom: 'application/xml',

          // Configuration
          env: 'text/plain',
          gitignore: 'text/plain',

          // Default
          txt: 'text/plain'
        };

        const fileMimeType = mimeTypes[fileType] || 'text/plain';
        console.log(`[FILE_GEN] Detected ${fileType} generation request`);

        // Generate a smart filename from user's message
        const smartName = message
          .replace(/(?:provide|give|create|generate|make|return|output|save|export|download|write|send|convert|build|prepare|compile|produce|render|get|as|a|an|the|it|in|on|for|of|with|about|please|can you|could you|i need|i want|i require|here|this|that|no|not|just|me|link|button|now|format|file|document|to|into)/gi, '')
          .replace(/\b(pdf|docx|txt|csv|tsv|json|jsonl|ndjson|xml|yaml|yml|md|markdown|sql|toml|ini|properties|svg|html|html5|xhtml|astro|jsx|tsx|py|python|js|javascript|ts|typescript|cpp|java|cs|csharp|go|golang|rust|shell|bash|sh|ruby|php|dockerfile|makefile|gradle|maven|pom|dart|kotlin|swift|groovy|latex|tex|r|matlab|css|scss|less|gql|graphql|env|gitignore)\b/gi, '')
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .trim()
          .split(/\s+/)
          .filter(w => w.length > 1)
          .slice(0, 5)
          .join('_')
          .toLowerCase() || 'document';
        const filename = `${smartName}.${fileType}`;
        console.log(`[FILE_GEN] Generated filename: ${filename}`);

        // Send a loading message for the file generation
        res.write(`data: ${JSON.stringify({ content: '\n\n[FILE_GENERATING]' })}\n\n`);

        // Generate the binary buffer from the AI response markdown
        console.log(`[FILE_GEN] Converting response to ${fileType}...`);
        const fileData = await generateFileBuffer(fullResponse, fileType);
        console.log(`[FILE_GEN] Buffer created: ${fileData.buffer.length} bytes, mime: ${fileData.mimetype}`);

        if (!fileData.buffer || fileData.buffer.length === 0) {
          throw new Error(`Empty buffer generated for ${fileType} file`);
        }

        // Check file size (MongoDB 16MB document limit)
        if (fileData.buffer.length > 15 * 1024 * 1024) {
          throw new Error(`File too large: ${(fileData.buffer.length / 1024 / 1024).toFixed(2)}MB exceeds 15MB limit`);
        }

        // Convert to base64 and validate
        let base64Data;
        try {
          base64Data = fileData.buffer.toString('base64');
          if (!base64Data || base64Data.length === 0) {
            throw new Error('Base64 encoding resulted in empty string');
          }
          console.log(`[FILE_GEN] Base64 encoded: ${base64Data.length} chars (original: ${fileData.buffer.length} bytes)`);
        } catch (encodeError) {
          throw new Error(`Failed to encode buffer to base64: ${encodeError.message}`);
        }

        // Store file in MongoDB
        const FileDownload = (await import('../models/FileDownload.js')).default;
        try {
          const fileRecord = await FileDownload.create({
            filename: filename,
            mimetype: fileData.mimetype,
            data: base64Data,
            size: fileData.buffer.length
          });
          console.log(`[FILE_GEN] File stored in DB with ID: ${fileRecord._id} (${base64Data.length} chars base64)`);

          // Generate the strict tag footprint
          const protocol = req.headers['x-forwarded-proto'] || req.protocol;
          const host = req.get('host');
          const downloadUrl = `${protocol}://${host}/api/upload/download/${fileRecord._id}`;
          const fileDownloadObj = {
            filename: filename,
            url: downloadUrl,
            size: fileData.buffer.length,
            type: fileData.mimetype
          };
          const footprint = `\n\n[FILE_DOWNLOAD:${JSON.stringify(fileDownloadObj)}]`;

          console.log(`[FILE_GEN] Download link generated: ${downloadUrl}`);
          console.log(`[FILE_GEN] Footprint: ${footprint}`);

          fullResponse += footprint;
          res.write(`data: ${JSON.stringify({ content: footprint.replace('\n\n*Processing file generation...*', '') })}\n\n`);
        } catch (dbError) {
          throw new Error(`Failed to store file in database: ${dbError.message}`);
        }
      } catch (genError) {
        console.error('[FILE_GEN] Error:', genError);
        const errorMsg = `\n\n[Failed to generate or store ${detectedFileType.toUpperCase()} file. Error: ${genError.message}]`;
        fullResponse += errorMsg;
        res.write(`data: ${JSON.stringify({ content: errorMsg })}\n\n`);
      }
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

    // Track usage stats
    if (userId && userId !== 'guest' && fullResponse) {
      try {
        const UsageStats = (await import('../models/UsageStats.js')).default;
        await UsageStats.trackUsage(userId, model);
      } catch (e) {
        console.error('Failed to track usage:', e);
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
