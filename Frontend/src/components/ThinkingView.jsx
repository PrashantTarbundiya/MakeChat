import { MessageBubble } from './MessageBubble';

export const ThinkingView = ({ content }) => {
  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-purple-600/10 border border-purple-500/30 rounded-xl sm:rounded-2xl p-2 sm:p-4 overflow-hidden">
      <MessageBubble content={content} role="assistant" />
    </div>
  );
};
