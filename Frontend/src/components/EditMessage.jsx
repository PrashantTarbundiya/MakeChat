export const EditMessage = ({ value, onChange, onSave, onCancel, role, onRemoveFile }) => {
  const imageMatch = value.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
  const docMatch = value.match(/📄\s+([^\n]+)/);
  const hasFile = imageMatch || docMatch;
  
  let textOnly = value;
  if (imageMatch) textOnly = value.replace(/!\[.*?\]\(https?:\/\/[^)]+\)/, '').trim();
  if (docMatch) textOnly = value.replace(/📄\s+[^\n]+/, '').trim();
  
  const imageUrl = imageMatch ? imageMatch[1] : null;
  const docName = docMatch ? docMatch[1] : null;
  
  return (
    <div className="space-y-2">
      <div className={`rounded-2xl px-3 sm:px-4 py-2 sm:py-3 ${
        role === 'user' ? 'bg-white text-black' : 'bg-[#1F2023] text-white'
      }`}>
        {imageMatch && (
          <div className="relative inline-block mb-2">
            <img src={imageMatch[1]} alt="Uploaded" className="rounded-lg max-w-full" style={{maxWidth: '150px', height: 'auto', objectFit: 'cover'}} />
            <button
              onClick={() => {
                onChange(textOnly);
                onRemoveFile?.();
              }}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        )}
        {docMatch && (
          <div className="flex items-center gap-2 mb-2 bg-white/10 rounded px-3 py-2">
            <span>📄 {docMatch[1]}</span>
            <button
              onClick={() => {
                onChange(textOnly);
                onRemoveFile?.();
              }}
              className="ml-auto bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        )}
        {textOnly && <div className="mb-2 text-sm opacity-80">{textOnly}</div>}
        <textarea
          value={textOnly}
          onChange={(e) => {
            let newValue = e.target.value;
            if (imageUrl) newValue = `![Uploaded Image](${imageUrl})\n\n${newValue}`;
            if (docName) newValue = `📄 ${docName}\n\n${newValue}`;
            onChange(newValue);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation();
            }
          }}
          className={`w-full border-none outline-none resize-none bg-transparent ${
            role === 'user' ? 'text-black' : 'text-white'
          }`}
          rows={3}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSave}
          className="px-3 py-1.5 bg-white text-black rounded-lg text-xs sm:text-sm"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 bg-white/20 text-white rounded-lg text-xs sm:text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
