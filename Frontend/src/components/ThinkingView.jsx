import { MessageBubble } from './MessageBubble';

export const ThinkingView = ({ content }) => {
  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-purple-600/10 border border-purple-500/30 rounded-2xl p-3 sm:p-4">
      <MessageBubble content={content} role="assistant" />
    </div>
  );
};
