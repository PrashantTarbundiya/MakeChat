import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const MessageBubble = ({ content, role }) => {
  const [copiedCode, setCopiedCode] = useState(null);
  const [showThinking, setShowThinking] = useState(false);
  const mediaRef = useRef(null);

  // Parse reasoning model response (thinking + answer + web search + canvas)
  const parseReasoningResponse = (text) => {
    let thinking = null;
    let webSearch = null;
    let canvas = null;
    let answer = text;

    // Extract thinking
    const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/i);
    if (thinkMatch) {
      thinking = thinkMatch[1].trim();
      answer = answer.replace(/<think>[\s\S]*?<\/think>/i, '');
    }

    // Extract web search
    const searchMatch = answer.match(/\[WEB SEARCH RESULTS\]([\s\S]*?)\[\/WEB SEARCH RESULTS\]/i);
    if (searchMatch) {
      webSearch = searchMatch[1].trim();
      answer = answer.replace(/\[WEB SEARCH RESULTS\][\s\S]*?\[\/WEB SEARCH RESULTS\]/i, '');
    }

    // Extract canvas
    const canvasMatch = answer.match(/\[CANVAS\]([\s\S]*?)\[\/CANVAS\]/i);
    if (canvasMatch) {
      canvas = canvasMatch[1].trim();
      answer = answer.replace(/\[CANVAS\][\s\S]*?\[\/CANVAS\]/i, '');
    }

    return { thinking, webSearch, canvas, answer: answer.trim() };
  };

  const { thinking, webSearch, canvas, answer } = parseReasoningResponse(content);

  const handleCopyCode = (code, index) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(index);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDownloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (mediaRef.current) {
      const buttons = mediaRef.current.querySelectorAll('button[data-download]');
      buttons.forEach(btn => {
        btn.onclick = async (e) => {
          e.preventDefault();
          const url = btn.getAttribute('data-url');
          const filename = btn.getAttribute('data-filename');
          const fileContent = btn.getAttribute('data-content');
          const fileType = btn.getAttribute('data-type');

          if (fileContent) {
            const decodedContent = decodeURIComponent(fileContent);
            handleDownloadFile(decodedContent, filename, fileType);
          } else if (url) {
            try {
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              a.target = '_blank';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            } catch (error) {
              console.error('Download failed:', error);
              window.open(url, '_blank');
            }
          }
        };
      });
    }
  }, [content]);

  // Check if content contains HTML media elements, loader, or file download
  const hasMediaHTML = answer.includes('<video') || answer.includes('<audio') || answer.includes('media-container') || answer.includes('loader-box') || answer.includes('file-download');

  return (
    <div className={`rounded-2xl w-full overflow-x-auto ${role === 'user' ? 'bg-[#171717] border border-white/10 text-white px-3 py-1' : 'text-white px-2 py-1'
      }`}>
      {thinking && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-4 rounded-xl overflow-hidden border border-white/10 bg-white/5"
        >
          <button
            onClick={() => setShowThinking(!showThinking)}
            className="w-full px-4 py-3 text-left flex items-center justify-between group hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </div>
              <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Thinking Process</span>
            </div>
            <span className="text-gray-500 group-hover:text-gray-300">
              {showThinking ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
          </button>
          <AnimatePresence>
            {showThinking && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="px-4 pb-4 pt-1 text-sm text-gray-400 leading-relaxed font-mono border-t border-white/5">
                  {thinking}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
      {webSearch && (
        <div className="mb-4 border-l-4 border-teal-500 bg-teal-500/10 rounded-r-lg p-4">
          <div className="text-sm font-semibold text-teal-400 mb-2">🔍 Web Search Results</div>
          <div className="text-xs text-gray-400 whitespace-pre-wrap">{webSearch}</div>
        </div>
      )}
      {canvas && (
        <div className="mb-4 border-l-4 border-pink-500 bg-pink-500/10 rounded-r-lg p-4">
          <div className="text-sm font-semibold text-pink-400 mb-2">🎨 Canvas Content</div>
          <div className="text-xs text-gray-300 whitespace-pre-wrap font-mono">{canvas}</div>
        </div>
      )}
      {hasMediaHTML ? (
        <div ref={mediaRef} dangerouslySetInnerHTML={{ __html: answer }} />
      ) : (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const codeString = String(children).replace(/\n$/, '');
              const codeIndex = node?.position?.start?.line || 0;

              return !inline && match ? (
                <div className="relative group my-4">
                  <div className="flex items-center justify-between bg-[#1e1e1e] px-2 sm:px-4 py-2 rounded-t-lg border-b border-black/50">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                      </div>
                      <span className="text-[10px] sm:text-xs text-gray-400 ml-2">{match[1]}</span>
                    </div>
                    <button
                      onClick={() => handleCopyCode(codeString, codeIndex)}
                      className="flex items-center gap-1 px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
                    >
                      {copiedCode === codeIndex ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span className="hidden sm:inline">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="hidden sm:inline">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      className="!mt-0 !rounded-t-none !text-xs sm:!text-sm"
                      wrapLongLines={true}
                      customStyle={{ margin: 0, fontSize: 'inherit' }}
                      {...props}
                    >
                      {codeString}
                    </SyntaxHighlighter>
                  </div>
                </div>
              ) : (
                <code className="bg-gray-700 px-1.5 py-0.5 rounded text-sm break-all" {...props}>
                  {children}
                </code>
              );
            },
            p({ children }) {
              return <p className="mb-3 leading-relaxed break-words">{children}</p>;
            },
            ul({ children }) {
              return <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>;
            },
            ol({ children }) {
              return <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>;
            },
            h1({ children }) {
              return <h1 className="text-xl sm:text-2xl font-bold mb-3 mt-4">{children}</h1>;
            },
            h2({ children }) {
              return <h2 className="text-lg sm:text-xl font-bold mb-2 mt-3">{children}</h2>;
            },
            h3({ children }) {
              return <h3 className="text-base sm:text-lg font-bold mb-2 mt-2">{children}</h3>;
            },
            table({ children }) {
              return (
                <div className="overflow-x-auto my-4 rounded-lg border border-gray-600">
                  <table className="w-full border-collapse">
                    {children}
                  </table>
                </div>
              );
            },
            thead({ children }) {
              return <thead className="bg-gray-800">{children}</thead>;
            },
            tbody({ children }) {
              return <tbody className="bg-gray-900">{children}</tbody>;
            },
            tr({ children }) {
              return <tr className="border-b border-gray-600 hover:bg-gray-800/50">{children}</tr>;
            },
            th({ children }) {
              return (
                <th className="border-r border-gray-600 px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-white text-xs sm:text-sm">
                  {children}
                </th>
              );
            },
            td({ children }) {
              return <td className="border-r border-gray-600 px-2 sm:px-4 py-2 sm:py-3 text-gray-300 text-xs sm:text-sm">{children}</td>;
            },
            blockquote({ children }) {
              return (
                <blockquote className="border-l-4 border-blue-500 pl-4 italic my-3 text-gray-300">
                  {children}
                </blockquote>
              );
            },
            img({ src, alt }) {
              if (!src) return null;
              return (
                <div className="relative group inline-block">
                  <img
                    src={src}
                    alt={alt || 'Uploaded image'}
                    className="rounded-lg my-2 block max-w-full cursor-pointer"
                    style={{ maxWidth: '300px', height: 'auto', objectFit: 'cover' }}
                    loading="lazy"
                    onClick={() => window.open(src, '_blank')}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const a = document.createElement('a');
                      a.href = src;
                      a.download = 'image.png';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                    title="Download Image"
                  >
                    <ArrowUp className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              );
            },
            a({ href, children }) {
              if (href && href.includes('res.cloudinary.com')) {
                return <span className="text-gray-300">{children}</span>;
              }
              return <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>;
            },
          }}
        >
          {answer}
        </ReactMarkdown>
      )}
    </div>
  );
};
