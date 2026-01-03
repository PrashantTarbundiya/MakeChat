import React from 'react';
import { motion } from 'framer-motion';

const stats = [
  { label: 'Top Models', value: '10+', sub: 'GPT-4, Claude, Gemini & More' },
  { label: 'Web Access', value: 'Real-Time', sub: 'Live Internet Search' },
  { label: 'Possibilities', value: 'Unlimited', sub: 'Text, Code, Images & Voice' },
];

export const Stats = () => {
  return (
    <section className="py-24 bg-black border-b border-white/5">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2, duration: 0.6 }}
              className="flex flex-col items-center text-center p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <h3 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 mb-2">
                {stat.value}
              </h3>
              <p className="text-lg text-white font-medium mb-1">{stat.label}</p>
              <p className="text-sm text-white/40">{stat.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
