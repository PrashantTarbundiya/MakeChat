import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export const MessageBubble = ({ content, role }) => {
  const [copiedCode, setCopiedCode] = useState(null);
  const mediaRef = useRef(null);

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
        btn.onclick = (e) => {
          e.preventDefault();
          const url = btn.getAttribute('data-url');
          const filename = btn.getAttribute('data-filename');
          const fileContent = btn.getAttribute('data-content');
          const fileType = btn.getAttribute('data-type');
          
          if (fileContent) {
            handleDownloadFile(fileContent, filename, fileType);
          } else {
            fetch(url)
              .then(r => r.blob())
              .then(blob => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = filename;
                a.click();
                URL.revokeObjectURL(a.href);
              });
          }
        };
      });
    }
  }, [content]);

  // Check if content contains HTML media elements, loader, or file download
  const hasMediaHTML = content.includes('<video') || content.includes('<audio') || content.includes('media-container') || content.includes('loader-box') || content.includes('file-download');

  return (
    <div className={`rounded-2xl w-full ${
      role === 'user' ? 'bg-[#1F2023] text-white px-3 py-1' : 'text-white px-2 py-1'
    }`}>
      {hasMediaHTML ? (
        <div ref={mediaRef} dangerouslySetInnerHTML={{ __html: content }} />
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
                <div className="flex items-center justify-between bg-[#1e1e1e] px-4 py-2 rounded-t-lg">
                  <span className="text-xs text-gray-400">{match[1]}</span>
                  <button
                    onClick={() => handleCopyCode(codeString, codeIndex)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
                  >
                    {copiedCode === codeIndex ? (
                      <>
                        <Check className="w-3 h-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  className="!mt-0 !rounded-t-none"
                  wrapLongLines={true}
                  {...props}
                >
                  {codeString}
                </SyntaxHighlighter>
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
            return <h1 className="text-2xl font-bold mb-3 mt-4">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-xl font-bold mb-2 mt-3">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-lg font-bold mb-2 mt-2">{children}</h3>;
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
              <th className="border-r border-gray-600 px-4 py-3 text-left font-semibold text-white text-sm">
                {children}
              </th>
            );
          },
          td({ children }) {
            return <td className="border-r border-gray-600 px-4 py-3 text-gray-300 text-sm">{children}</td>;
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
              <img 
                src={src} 
                alt={alt || 'Uploaded image'} 
                className="rounded-lg my-2 block" 
                style={{width: '150px', height: '100px', objectFit: 'cover'}} 
                loading="lazy"
              />
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
        {content}
      </ReactMarkdown>
      )}
    </div>
  );
};
