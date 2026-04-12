import React from 'react';
import { Download, FileText, FileSpreadsheet, FileCode, File, Image, Archive, FileJson, Code2, Database, Settings } from 'lucide-react';

const FileIcon = ({ type = '' }) => {
  const safeType = (typeof type === 'string' ? type : '').toLowerCase();

  // Documents
  if (safeType.includes('pdf')) return <FileText className="w-4 h-4 text-red-400" />;
  if (safeType.includes('word') || safeType.includes('document') || safeType.includes('docx'))
    return <FileText className="w-4 h-4 text-blue-400" />;

  // Spreadsheets
  if (safeType.includes('excel') || safeType.includes('spreadsheet') || safeType.includes('xlsx') || safeType.includes('csv') || safeType.includes('tsv'))
    return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;

  // Data formats
  if (safeType.includes('json') || safeType.includes('jsonl') || safeType.includes('ndjson'))
    return <FileJson className="w-4 h-4 text-yellow-400" />;
  if (safeType.includes('xml') || safeType.includes('yaml') || safeType.includes('toml') || safeType.includes('ini'))
    return <Code2 className="w-4 h-4 text-orange-400" />;
  if (safeType.includes('sql') || safeType.includes('database'))
    return <Database className="w-4 h-4 text-purple-400" />;

  // Programming languages
  if (safeType.includes('javascript') || safeType.includes('python') || safeType.includes('java') ||
    safeType.includes('cpp') || safeType.includes('typescript') || safeType.includes('golang') ||
    safeType.includes('rust') || safeType.includes('ruby') || safeType.includes('php') ||
    safeType.includes('dart') || safeType.includes('kotlin') || safeType.includes('swift') ||
    safeType.includes('groovy') || safeType.includes('csharp'))
    return <Code2 className="w-4 h-4 text-cyan-400" />;

  // Web & Configuration
  if (safeType.includes('html') || safeType.includes('xhtml') || safeType.includes('astro'))
    return <FileCode className="w-4 h-4 text-pink-400" />;
  if (safeType.includes('css') || safeType.includes('scss') || safeType.includes('less'))
    return <FileCode className="w-4 h-4 text-blue-300" />;
  if (safeType.includes('graphql') || safeType.includes('gql'))
    return <Code2 className="w-4 h-4 text-fuchsia-400" />;
  if (safeType.includes('dockerfile') || safeType.includes('makefile') || safeType.includes('env') || safeType.includes('properties'))
    return <Settings className="w-4 h-4 text-gray-300" />;

  // Archives
  if (safeType.includes('zip') || safeType.includes('compressed') || safeType.includes('tar') || safeType.includes('gz'))
    return <Archive className="w-4 h-4 text-amber-400" />;

  // Images
  if (safeType.includes('image') || safeType.includes('svg') || safeType.includes('png') || safeType.includes('jpeg') || safeType.includes('jpg'))
    return <Image className="w-4 h-4 text-purple-400" />;

  // Text/Markup
  if (safeType.includes('markdown') || safeType.includes('latex') || safeType.includes('text') || safeType.includes('plain'))
    return <FileText className="w-4 h-4 text-gray-300" />;

  return <File className="w-4 h-4 text-gray-400" />;
};

export const FileDownloadButton = ({ filename, type = 'text/plain', content, url, size, description }) => {
  const [downloading, setDownloading] = React.useState(false);
  const downloadTimeoutRef = React.useRef(null);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (downloadTimeoutRef.current) {
        clearTimeout(downloadTimeoutRef.current);
      }
    };
  }, []);

  const handleAction = async (e, forceDownload = false) => {
    e.stopPropagation();

    // Prevent multiple simultaneous downloads
    if (downloading) {
      console.warn('Download already in progress');
      return;
    }

    try {
      setDownloading(true);

      let blobUrlToOpen = null;
      // Ensure type is always a string before processing
      let safeType = typeof type === 'string' ? type : (type || 'text/plain').toString();
      if (!safeType && typeof content === 'string' && content.startsWith('data:')) {
        try {
          const mimeMatch = content.split(';')[0].split(':')[1];
          safeType = mimeMatch || 'text/plain';
        } catch {
          safeType = 'text/plain';
        }
      }
      const parsedType = (safeType || 'text/plain').toLowerCase();
      const isPreviewable = parsedType.includes('pdf') || parsedType.includes('image') || parsedType.includes('text') || parsedType.includes('json');

      if (url) {
        if (url.startsWith('data:')) {
          // It's a Data URI! Parse it locally
          try {
            const arr = url.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], { type: mime || type });
            blobUrlToOpen = URL.createObjectURL(blob);
          } catch (e) {
            console.error('Failed to parse data URL locally:', e);
            if (forceDownload || !isPreviewable) {
              const a = document.createElement('a');
              a.href = url;
              a.download = filename || 'download';
              a.click();
              return;
            } else {
              window.open(url, '_blank');
              return;
            }
          }
        } else {
          try {
            // Route Cloudinary URLs through backend proxy to avoid 401 errors
            const fetchUrl = url.includes('res.cloudinary.com')
              ? `${import.meta.env.VITE_API_URL}/api/upload/proxy?url=${encodeURIComponent(url)}`
              : url;
            const response = await fetch(fetchUrl);
            if (!response.ok) throw new Error('Fetch failed');
            const blob = await response.blob();
            blobUrlToOpen = URL.createObjectURL(blob);
          } catch (fetchErr) {
            console.error('Blob fetch failed, falling back:', fetchErr);
            if (forceDownload || !isPreviewable) {
              const a = document.createElement('a');
              a.href = url;
              a.download = filename || 'download';
              a.click();
            } else {
              window.open(url, '_blank');
            }
            return;
          }
        }
      } else {
        // If content provided (string or base64), create blob
        let blob;
        if (typeof content === 'string') {
          if (content.startsWith('data:')) {
            const response = await fetch(content);
            blob = await response.blob();
          } else {
            const isBinaryType = type.includes('image') || type.includes('pdf') || type.includes('zip') || type.includes('octet-stream');
            const looksLikeBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(content) && content.length % 4 === 0 && !content.includes(' ');

            if (isBinaryType && looksLikeBase64) {
              try {
                const binary = atob(content);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                  bytes[i] = binary.charCodeAt(i);
                }
                blob = new Blob([bytes], { type });
              } catch (e) {
                blob = new Blob([content], { type });
              }
            } else {
              blob = new Blob([content], { type });
            }
          }
        } else if (content instanceof Blob) {
          blob = content;
        } else if (content instanceof ArrayBuffer) {
          blob = new Blob([content], { type });
        } else {
          console.error('Unsupported content type for download');
          return;
        }
        blobUrlToOpen = URL.createObjectURL(blob);
      }

      // We have the blob URL, now route to either Preview or Download
      if (blobUrlToOpen) {
        if (forceDownload || !isPreviewable) {
          const a = document.createElement('a');
          a.href = blobUrlToOpen;
          a.download = filename || 'download';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          // Open in new tab
          window.open(blobUrlToOpen, '_blank');
        }
        // Give the browser a moment to process the file before revoking (especially important for preview tabs)
        setTimeout(() => URL.revokeObjectURL(blobUrlToOpen), 5000);
      }

    } catch (e) {
      console.error('Error handling file:', e);
    } finally {
      // Use timeout to ensure UI updates properly
      downloadTimeoutRef.current = setTimeout(() => {
        setDownloading(false);
      }, 300);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      onClick={(e) => handleAction(e, false)}
      role="button"
      tabIndex={0}
      className="group relative flex items-center gap-3 w-full sm:w-fit min-w-[280px] max-w-full sm:max-w-[480px] p-[2px] rounded-[24px] overflow-hidden transition-all duration-500 hover:-translate-y-1 cursor-pointer shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-black/50 hover:shadow-2xl hover:shadow-blue-900/40 z-0 isolate bg-black/40 backdrop-blur-xl"
      title={`Open ${filename}`}
    >
      {/* Animated gradient border background (hidden by default, glowing on hover) */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 group-hover:from-blue-500/80 group-hover:via-purple-500/80 group-hover:to-pink-500/80 transition-all duration-500 -z-10"></div>

      {/* Inner background to create the border effect padding */}
      <div className="relative flex items-start sm:items-center gap-4 w-full h-full p-3.5 rounded-[22px] bg-[#16171ae6] backdrop-blur-3xl group-hover:bg-[#111214f2] transition-colors duration-500 overflow-hidden text-left shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">

        {/* Soft inner glow on hover */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-500/20 blur-[40px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

        <div className="relative flex items-center justify-center w-12 h-12 rounded-[16px] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-inner group-hover:scale-105 transition-transform duration-500 shrink-0 mt-0.5 sm:mt-0">
          <FileIcon type={type} />
        </div>

        <div className="flex-1 min-w-0 pr-1 flex flex-col justify-center gap-1.5">
          <div className="text-[14px] font-semibold text-gray-100 break-words leading-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-200 group-hover:to-purple-200 transition-all duration-300 block">
            {filename || 'File'}
          </div>
          {description && (
            <div className="text-[12px] text-gray-400 break-words leading-snug tracking-wide block">{description}</div>
          )}
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-300 font-medium mt-0.5">
            <span className="uppercase tracking-wider px-2 py-[2px] rounded border border-white/5 bg-white/5 shadow-sm">{typeof type === 'string' ? type.split('/')[1] || 'FILE' : 'FILE'}</span>
            {size && <span className="opacity-80 flex items-center gap-1.5"><div className="w-[4px] h-[4px] rounded-full bg-gray-500"></div>{formatSize(size)}</span>}
          </div>
        </div>

        <div className="relative flex flex-col items-center justify-center shrink-0 pr-1 pt-1 sm:pt-0">
          <button
            onClick={(e) => handleAction(e, true)}
            disabled={downloading}
            title={`Download ${filename}`}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-gradient-to-tr hover:from-blue-600 hover:to-indigo-500 text-gray-300 hover:text-white border border-white/10 hover:border-transparent transition-all duration-300 disabled:opacity-50 cursor-pointer shadow-md hover:shadow-[0_0_20px_rgba(59,130,246,0.6)]"
          >
            {downloading ? (
              <div className="w-4 h-4 border-[2px] border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileDownloadButton;
