import { X, Sparkles } from 'lucide-react';

export const ModelsModal = ({ isOpen, onClose, onSelectModel }) => {
  if (!isOpen) return null;

  const models = [
    { id: 'bytez-image', name: '🎨 Image Generation', desc: 'Generate images from text' },
    { id: 'bytez-video', name: '🎬 Video Generation', desc: 'Create videos from text' },
    { id: 'bytez-audio', name: '🎙️ Audio Generation', desc: 'Generate audio from text' },
    { id: 'bytez-music', name: '🎵 Music Generation', desc: 'Create music from text' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#1F2023] rounded-lg p-6 w-[600px] h-[500px] mx-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Media Generation Models</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {models.map(model => (
            <button
              key={model.id}
              onClick={() => {
                onSelectModel(model.id);
                onClose();
              }}
              className="w-full flex flex-col gap-1 px-4 py-3 hover:bg-white/10 rounded-lg text-left transition-colors"
            >
              <span className="text-base text-white font-medium">{model.name}</span>
              <span className="text-sm text-gray-400">{model.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
