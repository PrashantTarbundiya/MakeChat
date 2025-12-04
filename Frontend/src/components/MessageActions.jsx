import { RefreshCw, Pencil, Copy, Check } from 'lucide-react';

export const MessageActions = ({ 
  role, 
  isLast, 
  isLoading, 
  onRegenerate, 
  onEdit, 
  onCopy, 
  isCopied 
}) => {
  if (role === 'user') {
    return (
      <div className="flex justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm"
        >
          <Pencil className="w-4 h-4" />
          Edit
        </button>
      </div>
    );
  }

  if (role === 'assistant' && !isLoading) {
    return (
      <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {isLast && (
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Regenerate
          </button>
        )}
        <button
          onClick={onCopy}
          className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm"
        >
          {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {isCopied ? 'Copied' : 'Copy'}
        </button>
      </div>
    );
  }

  return null;
};
