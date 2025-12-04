import { MessageBubble } from './MessageBubble';

export const SearchView = ({ content }) => {
  return (
    <div className="bg-gradient-to-br from-blue-900/20 to-blue-600/10 border border-blue-500/30 rounded-2xl p-3 sm:p-4">
      <MessageBubble content={content} role="assistant" />
    </div>
  );
};
