import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, ChevronDown, ChevronRight, X, Maximize2, ZoomIn, ZoomOut, Download, Maximize, Sun, Moon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
});

const MermaidDiagram = ({ chart }) => {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const idRef = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);
  const renderCountRef = useRef(0);

  const sanitizeChart = (raw) => {
    return raw.replace(
      /(\w+)(\{|\[|\()((?:(?!\2).)*?[\[\]\{\}\(\)].*?)(}|\]|\))/g,
      (match, id, open, text, close) => {
        if (text.startsWith('"') && text.endsWith('"')) return match;
        return `${id}${open}"${text}"${close}`;
      }
    );
  };

  const renderMermaid = async (theme) => {
    renderCountRef.current += 1;
    const uniqueId = `${idRef.current}-${renderCountRef.current}`;
    mermaid.initialize({ startOnLoad: false, theme: theme === 'dark' ? 'dark' : 'default', securityLevel: 'loose' });
    
    // Clean up any leftover mermaid error elements from DOM
    const cleanup = () => {
      document.querySelectorAll('[id^="d"][id*="mermaid"]').forEach(el => {
        if (el.closest('.mermaid-container')) return; // skip our own containers
        el.remove();
      });
      // Remove any mermaid error divs
      document.querySelectorAll('.error-icon, .error-text, [id*="-syntax-error"]').forEach(el => el.closest('svg')?.remove());
      document.querySelectorAll(`#${CSS.escape(uniqueId)}, #${CSS.escape(uniqueId)}-retry`).forEach(el => el.remove());
    };

    try {
      const { svg: renderedSvg } = await mermaid.render(uniqueId, chart);
      setSvg(renderedSvg);
      setError(false);
    } catch (err) {
      cleanup();
      try {
        const sanitized = sanitizeChart(chart);
        const retryId = `${uniqueId}-retry`;
        const { svg: renderedSvg } = await mermaid.render(retryId, sanitized);
        setSvg(renderedSvg);
        setError(false);
      } catch (retryErr) {
        cleanup();
        console.error('Mermaid rendering failed', retryErr);
        setError(true);
      }
    }
  };

  useEffect(() => {
    if (chart) renderMermaid(isDarkTheme ? 'dark' : 'default');
  }, [chart, isDarkTheme]);

  useEffect(() => {
    if (!isFullscreen) {
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
    }
  }, [isFullscreen]);

  // Attach native wheel listener with passive:false so preventDefault works
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isFullscreen) return;
    const onWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.ctrlKey ? -e.deltaY * 0.01 : -e.deltaY * 0.002;
      setZoom(z => Math.min(4, Math.max(0.25, z + delta)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isFullscreen]);

  const handleExportSVG = () => {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPNG = () => {
    const svgEl = document.createElement('div');
    svgEl.innerHTML = svg;
    const svgNode = svgEl.querySelector('svg');
    if (!svgNode) return;

    const canvas = document.createElement('canvas');
    const bbox = svgNode.getBoundingClientRect();
    const width = parseInt(svgNode.getAttribute('width') || svgNode.viewBox?.baseVal?.width || 1200);
    const height = parseInt(svgNode.getAttribute('height') || svgNode.viewBox?.baseVal?.height || 800);
    const scale = 2; // High DPI
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // Set background
    ctx.fillStyle = isDarkTheme ? '#1a1a1a' : '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const img = new Image();
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'diagram.png';
      a.click();
    };
    img.src = url;
  };

  const handleFitToScreen = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Pan handlers — mouse
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };
  const handleMouseMove = (e) => {
    if (!isPanning) return;
    setPanOffset({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
  };
  const handleMouseUp = () => setIsPanning(false);

  // Pan handlers — touch
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      panStartRef.current = { x: e.touches[0].clientX - panOffset.x, y: e.touches[0].clientY - panOffset.y };
    }
  };
  const handleTouchMove = (e) => {
    if (!isPanning || e.touches.length !== 1) return;
    e.preventDefault();
    setPanOffset({ x: e.touches[0].clientX - panStartRef.current.x, y: e.touches[0].clientY - panStartRef.current.y });
  };
  const handleTouchEnd = () => setIsPanning(false);

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 overflow-hidden">
        <div className="px-4 py-2 text-yellow-400 text-xs font-medium border-b border-yellow-500/20">⚠️ Could not render diagram — showing raw code</div>
        <pre className="p-4 text-gray-300 text-xs overflow-x-auto whitespace-pre-wrap">{chart}</pre>
      </div>
    );
  }

  return (
    <>
      <div className="relative group my-4">
        <div 
          onClick={() => setIsFullscreen(true)}
          dangerouslySetInnerHTML={{ __html: svg }} 
          className="flex justify-center bg-[#1e1e1e] p-4 rounded-lg border border-black/50 cursor-pointer hover:border-blue-500/50 transition-colors [&>svg]:max-w-full [&>svg]:h-auto" 
          title="Click to view full screen"
        />
        <button 
          onClick={() => setIsFullscreen(true)}
          className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-md text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity backdrop-blur-sm flex items-center gap-1"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase font-bold tracking-wider">Expand</span>
        </button>
      </div>

      <AnimatePresence>
        {isFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center p-1 sm:p-4 backdrop-blur-md"
            onClick={() => setIsFullscreen(false)}
          >
            <button 
              className="absolute top-2 right-2 sm:top-4 sm:right-4 p-1.5 sm:p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[10000]"
              onClick={() => setIsFullscreen(false)}
            >
              <X className="w-6 h-6" />
            </button>
            <div 
              className={`w-full max-w-[100vw] sm:max-w-[95vw] h-[92vh] sm:h-[85vh] overflow-hidden p-2 sm:p-8 rounded-none sm:rounded-xl border-0 sm:border shadow-2xl relative transition-colors duration-300 ${isDarkTheme ? 'bg-[#1a1a1a] sm:border-white/10' : 'bg-white sm:border-gray-200'} ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
              onClick={e => e.stopPropagation()}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              ref={containerRef}
            >
              <div 
                dangerouslySetInnerHTML={{ __html: svg }} 
                className="transition-all ease-out mx-auto [&>svg]:!w-full [&>svg]:!h-auto [&>svg]:!max-w-none select-none"
                style={{ 
                  width: `${Math.max(10, zoom * 100)}%`,
                  minWidth: `${zoom * 300}px`,
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                  transitionDuration: isPanning ? '0ms' : '200ms'
                }}
              />
            </div>
            
            {/* Enhanced Toolbar */}
            <div 
              className="absolute bottom-3 sm:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-0.5 sm:gap-1 bg-[#252525] border border-white/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-2xl z-[10000] max-w-[95vw] overflow-x-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Zoom controls */}
              <button 
                onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} 
                className="p-1.5 sm:p-2 hover:bg-blue-500/20 hover:text-blue-400 rounded-full text-gray-300 transition-colors flex-shrink-0"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 sm:w-4 h-3.5 sm:h-4"/>
              </button>
              <span className="text-gray-200 text-[10px] sm:text-xs font-medium w-8 sm:w-10 text-center select-none flex-shrink-0">
                {Math.round(zoom * 100)}%
              </span>
              <button 
                onClick={() => setZoom(z => Math.min(4, z + 0.25))} 
                className="p-1.5 sm:p-2 hover:bg-blue-500/20 hover:text-blue-400 rounded-full text-gray-300 transition-colors flex-shrink-0"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 sm:w-4 h-3.5 sm:h-4"/>
              </button>

              <div className="w-px h-4 sm:h-5 bg-white/10 mx-0.5 sm:mx-1 flex-shrink-0" />

              {/* Fit to screen */}
              <button 
                onClick={handleFitToScreen}
                className="p-1.5 sm:p-2 hover:bg-emerald-500/20 hover:text-emerald-400 rounded-full text-gray-300 transition-colors flex-shrink-0"
                title="Fit to Screen"
              >
                <Maximize className="w-3.5 sm:w-4 h-3.5 sm:h-4"/>
              </button>

              {/* Theme toggle */}
              <button 
                onClick={() => setIsDarkTheme(d => !d)}
                className="p-1.5 sm:p-2 hover:bg-amber-500/20 hover:text-amber-400 rounded-full text-gray-300 transition-colors flex-shrink-0"
                title={isDarkTheme ? 'Light Theme' : 'Dark Theme'}
              >
                {isDarkTheme ? <Sun className="w-3.5 sm:w-4 h-3.5 sm:h-4"/> : <Moon className="w-3.5 sm:w-4 h-3.5 sm:h-4"/>}
              </button>

              <div className="w-px h-4 sm:h-5 bg-white/10 mx-0.5 sm:mx-1 flex-shrink-0" />

              {/* Export buttons */}
              <button 
                onClick={handleExportPNG}
                className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 hover:bg-purple-500/20 hover:text-purple-400 rounded-full text-gray-300 transition-colors text-[10px] sm:text-xs font-medium flex-shrink-0"
                title="Export as PNG"
              >
                <Download className="w-3 sm:w-3.5 h-3 sm:h-3.5"/>
                PNG
              </button>
              <button 
                onClick={handleExportSVG}
                className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 hover:bg-purple-500/20 hover:text-purple-400 rounded-full text-gray-300 transition-colors text-[10px] sm:text-xs font-medium flex-shrink-0"
                title="Export as SVG"
              >
                <Download className="w-3 sm:w-3.5 h-3 sm:h-3.5"/>
                SVG
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

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

              if (match && match[1].toLowerCase() === 'mermaid') {
                return <MermaidDiagram chart={codeString} />;
              }

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
