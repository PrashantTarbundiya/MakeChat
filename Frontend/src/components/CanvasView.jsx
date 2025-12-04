import { MessageBubble } from './MessageBubble';

export const CanvasView = ({ content }) => {
  return (
    <div className="bg-[#0a0a0a] border border-gray-700 rounded-2xl p-3 sm:p-6 shadow-2xl">
      <div className="flex items-center gap-2 mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-gray-700">
        <div className="w-2 sm:w-3 h-2 sm:h-3 rounded-full bg-red-500"></div>
        <div className="w-2 sm:w-3 h-2 sm:h-3 rounded-full bg-yellow-500"></div>
        <div className="w-2 sm:w-3 h-2 sm:h-3 rounded-full bg-green-500"></div>
      </div>
      <div className="bg-[#1e1e1e] rounded-lg p-2 sm:p-4 max-h-[400px] sm:max-h-[600px] overflow-y-auto">
        <MessageBubble content={content} role="assistant" />
      </div>
    </div>
  );
};
