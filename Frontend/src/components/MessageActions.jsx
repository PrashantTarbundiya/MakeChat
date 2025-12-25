import { RefreshCw, Pencil, Copy, Check } from 'lucide-react';

export const MessageActions = ({ 
  role, 
  isLast, 
  isLoading, 
  onRegenerate, 
  onEdit, 
  onCopy, 
  isCopied,
  versions,
  currentVersion,
  onVersionChange
}) => {
  if (role === 'user') {
    return (
      <div className="flex justify-end mt-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs sm:text-sm"
        >
          <Pencil className="w-3 sm:w-4 h-3 sm:h-4" />
          Edit
        </button>
      </div>
    );
  }

  if (role === 'assistant' && !isLoading) {
    return (
      <div className="flex gap-2 mt-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        {versions && versions.length > 1 && (
          <div className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-white/20 text-white rounded-lg text-xs sm:text-sm">
            <button
              onClick={() => onVersionChange(currentVersion - 1)}
              disabled={currentVersion === 0}
              className="hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed px-1 rounded"
            >
              ←
            </button>
            <span className="text-xs">{currentVersion + 1}/{versions.length}</span>
            <button
              onClick={() => onVersionChange(currentVersion + 1)}
              disabled={currentVersion === versions.length - 1}
              className="hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed px-1 rounded"
            >
              →
            </button>
          </div>
        )}
        {isLast && (
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs sm:text-sm"
          >
            <RefreshCw className="w-3 sm:w-4 h-3 sm:h-4" />
            <span className="hidden sm:inline">Regenerate</span>
            <span className="sm:hidden">Regen</span>
          </button>
        )}
        <button
          onClick={onCopy}
          className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs sm:text-sm"
        >
          {isCopied ? <Check className="w-3 sm:w-4 h-3 sm:h-4" /> : <Copy className="w-3 sm:w-4 h-3 sm:h-4" />}
          {isCopied ? 'Copied' : 'Copy'}
        </button>
      </div>
    );
  }

  return null;
};
