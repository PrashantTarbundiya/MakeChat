import { MessageBubble } from './MessageBubble';
import { Code2, Sparkles, CheckCircle2, Play, Layout } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

// Enhanced Code Extractor for React/HTML/JS
const extractExecuteableCode = (content) => {
  if (!content) return { code: null, type: null };

  // Prioritize finding React/JSX code first
  const reactMatch = content.match(/```(?:jsx|tsx|react|javascript)\n([\s\S]*?)```/i);
  if (reactMatch) {
    const codeText = reactMatch[1].trim();
    // Check if the code looks like React (imports react, has JSX tags, or exports default)
    if (
      codeText.includes('import React') ||
      codeText.includes('export default') ||
      codeText.includes('className=') ||
      codeText.match(/<[a-z]+[^>]*>/i) // contains JSX tags
    ) {
      return { code: codeText, type: 'react' };
    }
  }

  // Fallback to HTML
  const htmlMatch = content.match(/```html\n([\s\S]*?)```/i);
  if (htmlMatch) {
    return { code: htmlMatch[1].trim(), type: 'html' };
  }

  return { code: null, type: null };
};

export const CanvasView = ({ content, isLoading = false }) => {
  const [viewMode, setViewMode] = useState('code'); // 'code' or 'preview'
  const { code, type } = extractExecuteableCode(content);
  const iframeRef = useRef(null);

  // Generate srcDoc for execution
  const getPreviewHtml = () => {
    if (!code) return '';

    if (type === 'html') {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body class="p-4">
            ${code}
          </body>
        </html>
      `;
    }

    if (type === 'react') {
      // Find what the main component is called (either from export default or the first capitalized function)
      const exportMatch = code.match(/export default (\w+)/);
      const functionMatch = code.match(/(?:function|const|let|var)\s+([A-Z]\w*)/);
      const componentName = exportMatch ? exportMatch[1] : (functionMatch ? functionMatch[1] : 'App');

      // Remove imports and exports for inline rendering
      const cleanCode = code
        .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '')
        .replace(/import\s+['"][^'"]+['"];?/g, '')
        .replace(/export\s+default\s+\w+;?/g, '')
        .replace(/<\/script>/g, '<\\/script>');
      
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
            <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
            <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
            <script src="https://cdn.tailwindcss.com"></script>
            <script>
              tailwind.config = {
                theme: {
                  extend: {
                    colors: {
                      border: "hsl(var(--border))",
                      input: "hsl(var(--input))",
                      ring: "hsl(var(--ring))",
                      background: "hsl(var(--background))",
                      foreground: "hsl(var(--foreground))",
                      primary: {
                        DEFAULT: "hsl(var(--primary))",
                        foreground: "hsl(var(--primary-foreground))",
                      },
                      secondary: {
                        DEFAULT: "hsl(var(--secondary))",
                        foreground: "hsl(var(--secondary-foreground))",
                      },
                    }
                  }
                }
              }
            </script>
            <style>
              body { margin: 0; padding: 1rem; width: 100vw; overflow-x: hidden; }
              #root { width: 100%; height: 100%; }
              /* Add some default CSS variables for common Shadcn UI components */
              :root {
                --background: 0 0% 100%;
                --foreground: 222.2 84% 4.9%;
                --card: 0 0% 100%;
                --card-foreground: 222.2 84% 4.9%;
                --popover: 0 0% 100%;
                --popover-foreground: 222.2 84% 4.9%;
                --primary: 222.2 47.4% 11.2%;
                --primary-foreground: 210 40% 98%;
                --secondary: 210 40% 96.1%;
                --secondary-foreground: 222.2 47.4% 11.2%;
                --muted: 210 40% 96.1%;
                --muted-foreground: 215.4 16.3% 46.9%;
                --accent: 210 40% 96.1%;
                --accent-foreground: 222.2 47.4% 11.2%;
                --destructive: 0 84.2% 60.2%;
                --destructive-foreground: 210 40% 98%;
                --border: 214.3 31.8% 91.4%;
                --input: 214.3 31.8% 91.4%;
                --ring: 222.2 84% 4.9%;
                --radius: 0.5rem;
              }
              .dark {
                --background: 222.2 84% 4.9%;
                --foreground: 210 40% 98%;
                --primary: 210 40% 98%;
                --primary-foreground: 222.2 47.4% 11.2%;
              }
            </style>
          </head>
          <body>
            <div id="root"></div>
            <script type="text/babel" data-presets="react,env">
              const { useState, useEffect, useRef } = React;
              ${cleanCode}
              
              // Fallback to React 17 render if createRoot fails or isn't used properly by the model
              const rootElement = document.getElementById('root');
              if (ReactDOM.createRoot) {
                const root = ReactDOM.createRoot(rootElement);
                root.render(<${componentName} />);
              } else {
                ReactDOM.render(<${componentName} />, rootElement);
              }
            </script>
          </body>
        </html>
      `;
    }
    return '';
  };

  useEffect(() => {
    if (code && viewMode === 'preview' && iframeRef.current) {
        iframeRef.current.srcdoc = getPreviewHtml();
    }
  }, [code, viewMode]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative group w-full"
    >
      {/* Outer ambient glow */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600/20 via-indigo-500/20 to-violet-600/20 rounded-3xl blur opacity-0 group-hover:opacity-40 transition duration-500 pointer-events-none" />
      
      <div className="relative bg-[#0f1014]/90 backdrop-blur-md border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl">
        {/* Top Gloss Highlight */}
        <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        {/* Header Ribbon with macOS dots */}
        <div className="relative z-10 px-4 py-3 sm:px-6 sm:py-4 border-b border-white/[0.06] bg-[#17181c] flex items-center justify-between gap-2 overflow-hidden">
          <div className="flex items-center gap-3.5">
            {/* macOS window dots */}
            <div className="flex items-center gap-1.5 mr-1">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e]"></div>
              <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#dea123]"></div>
              <div className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29]"></div>
            </div>
            <div className="h-5 w-px bg-white/10" />
            
            <div className="flex gap-2">
              <button 
                onClick={() => setViewMode('code')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${viewMode === 'code' ? 'bg-violet-500/20 text-violet-300' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <Code2 className="w-4 h-4" /> Code
              </button>
              {code && (
                <button 
                  onClick={() => setViewMode('preview')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${viewMode === 'preview' ? 'bg-emerald-500/20 text-emerald-300' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  <Play className="w-4 h-4" /> Preview
                </button>
              )}
            </div>
          </div>

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center gap-1.5 opacity-50">
              {[1, 2, 3].map((i) => (
                <motion.div 
                  key={i}
                  className="w-1.5 h-1.5 bg-violet-500/50 rounded-full"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2, ease: "easeInOut" }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="relative z-10 bg-[#1e1e1e] max-h-[600px] overflow-hidden flex flex-col">
          {viewMode === 'code' ? (
            <div className="p-2 sm:p-4 overflow-y-auto w-full max-h-[500px]">
              <MessageBubble content={content} role="assistant" />
            </div>
          ) : (
            <div className="w-full flex-grow h-[500px] bg-white">
               <iframe
                  ref={iframeRef}
                  className="w-full h-full border-none"
                  sandbox="allow-scripts allow-modals allow-forms allow-popups"
                  title="Preview"
               />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
