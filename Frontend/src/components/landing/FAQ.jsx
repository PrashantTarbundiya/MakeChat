import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

const faqs = [
  {
    question: "Is MakeChat truly free?",
    answer: "Yes, MakeChat provides free access to premium models like GPT-4, Claude 3.5 Sonnet, and Gemini Pro through our optimized shared tier. No credit card required."
  },
  {
    question: "How do I switch between models?",
    answer: "You can select your preferred model from the dropdown menu in the chat interface before sending a message. You can even switch models mid-conversation!"
  },
  {
    question: "Is my data private?",
    answer: "Absolutely. We do not use your chat data to train our models. Your conversations are encrypted and stored securely."
  },
  {
    question: "Can I generate images?",
    answer: "Yes! Simply ask any model to 'generate an image of...' and our routed image generation agent will handle the request instantly."
  },
  {
    question: "What is the 'LLM Council'?",
    answer: "This is a unique feature where your prompt is sent to multiple top models simultaneously, and their answers are synthesized to give you the most accurate, balanced result."
  }
];

const FAQItem = ({ question, answer, isOpen, onClick }) => {
  return (
    <div className="border-b border-white/10 last:border-0">
      <button
        onClick={onClick}
        className="w-full py-6 flex items-center justify-between text-left group"
      >
        <span className={`text-lg font-medium transition-colors ${isOpen ? 'text-emerald-500' : 'text-white group-hover:text-emerald-400'}`}>
          {question}
        </span>
        <div className={`p-2 rounded-full border transition-all duration-300 ${isOpen ? 'bg-emerald-500 border-emerald-500 text-black rotate-180' : 'border-white/10 text-white/60 group-hover:border-emerald-500/50 group-hover:text-emerald-500'}`}>
          {isOpen ? <Minus size={16} /> : <Plus size={16} />}
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-white/60 leading-relaxed pr-8">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="py-24 bg-black">
      <div className="container mx-auto px-6 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-sm font-mono text-white/40 mb-4 tracking-[0.2em] uppercase text-left">
            Frequently Asked
          </h2>
          <div className="h-px w-full bg-white/10 mb-12" />
        </motion.div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
          {faqs.map((faq, i) => (
            <FAQItem
              key={i}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === i}
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section >
  );
};
