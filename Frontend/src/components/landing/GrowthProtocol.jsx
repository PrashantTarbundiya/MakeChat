import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Thinking } from './Thinking';

const steps = [
  {
    id: '01',
    title: 'Select Intelligence',
    description: 'Choose the expert for the job. Need reasoning? Use o1-mini. Need creative writing? Claude 3.5 Sonnet. Need code? DeepSeek R1.',
    tags: ['Model Selection', 'Expert Routing', 'Task Optimization'],
    image: 'https://res.cloudinary.com/durcxd0dn/image/upload/v1767339216/workflow_select_v2_uol0hw.jpg'
  },
  {
    id: '02',
    title: 'Context Integration',
    description: 'Upload PDFs, images, or code files. MakeChat parses your documents and combines them with live web search results for grounding.',
    tags: ['File Analysis', 'Live Search', 'Grounding'],
    image: 'https://res.cloudinary.com/durcxd0dn/image/upload/v1767339212/workflow_context_v2_hbgcrc.jpg'
  },
  {
    id: '03',
    title: 'Synthesized Output',
    description: 'Receive a comprehensive answer. Save chats, share links, or fork conversations to explore new directions instantly.',
    tags: ['Markdown Export', 'Chat Sharing', 'Forking'],
    image: 'https://res.cloudinary.com/durcxd0dn/image/upload/v1767339206/workflow_output_v2_n88fip.jpg'
  }
];

const StepCard = ({ step }) => (
  <div className="min-h-screen flex items-center justify-center py-20">
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ margin: "-20% 0px -20% 0px" }}
      transition={{ duration: 0.8 }}
      className="max-w-xl w-full"
    >
      <div className="mb-6 flex gap-3">
        {step.tags.map(tag => (
          <span key={tag} className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-200 uppercase tracking-wider">
            {tag}
          </span>
        ))}
      </div>
      <h3 className="text-4xl md:text-6xl font-bold text-white mb-6">
        {step.title}
      </h3>
      <p className="text-lg text-white/60 leading-relaxed mb-8">
        {step.description}
      </p>
      


      <div className="aspect-video w-full rounded-2xl border border-white/5 relative overflow-hidden group">
         <div 
           className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
           style={{ backgroundImage: `url(${step.image})` }}
         />
         <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-700" />
         
         {/* Animated Overlay */}
         <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
             {step.id === '02' ? (
                <Thinking />
             ) : (
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/50 flex items-center justify-center">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
                </div>
             )}
         </div>
      </div>
    </motion.div>
  </div>
);

export const GrowthProtocol = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  return (
    <section id="workflow" ref={containerRef} className="relative bg-black">
      <div className="container mx-auto px-6 flex">
        
        {/* Sticky Sidebar */}
        <div className="w-1/3 hidden lg:flex flex-col justify-center h-screen sticky top-0 border-r border-white/5 pl-8">
           <h2 className="text-sm font-mono text-white/40 mb-12 tracking-widest uppercase">
             The Workflow
           </h2>
           <div className="flex flex-col gap-12 relative">
             {/* Progress Line */}
             <div className="absolute left-[7px] top-2 bottom-2 w-[1px] bg-white/10">
                <motion.div 
                  style={{ scaleY: scrollYProgress, transformOrigin: "top" }}
                  className="w-full h-full bg-emerald-500"
                />
             </div>

             {steps.map((step, index) => {
               return (
                 <div key={step.id} className="relative pl-8">
                   <span className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-black border border-white/20 rounded-full z-10" />
                   <span className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40 opacity-20">
                     {step.id}
                   </span>
                 </div>
               );
             })}
           </div>
        </div>
        
        {/* Scrollable Content */}
        <div className="w-full lg:w-2/3 lg:pl-20">
          {steps.map(step => (
            <StepCard key={step.id} step={step} />
          ))}
        </div>

      </div>
    </section>
  );
};
