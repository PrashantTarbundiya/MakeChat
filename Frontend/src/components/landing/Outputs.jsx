import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const outputs = [
  { id: '01', title: 'GPT-4o', category: 'OpenAI', image: 'https://res.cloudinary.com/durcxd0dn/image/upload/v1767339212/gpt4_v2_l51l2y.jpg' },
  { id: '02', title: 'Claude 3.5', category: 'Anthropic', image: 'https://res.cloudinary.com/durcxd0dn/image/upload/v1767339213/claude_v2_gze63i.jpg' },
  { id: '03', title: 'Gemini Pro', category: 'Google', image: 'https://res.cloudinary.com/durcxd0dn/image/upload/v1767339207/gemini_v2_oguqpq.jpg' },
  { id: '04', title: 'DeepSeek R1', category: 'DeepSeek', image: 'https://res.cloudinary.com/durcxd0dn/image/upload/v1767339212/deepseek_v2_wsvgrb.jpg' },
];

const GlitchCard = ({ output }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(useSpring(y), [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(useSpring(x), [-0.5, 0.5], ["-7deg", "7deg"]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className="group relative h-[400px] w-full overflow-hidden rounded-2xl border border-white/5 bg-white/5 perspective-1000"
    >
      {/* Background Image / Placeholder */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
        style={{ backgroundImage: `url(${output.image})` }} 
      />
      
      <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors duration-500" />
      
      {/* Glitch Overlay effects */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay transition-opacity duration-300 pointer-events-none" />
      
      {/* Content */}
      <div style={{ transform: "translateZ(30px)" }} className="absolute inset-0 p-8 flex flex-col justify-between z-20">
         <div className="flex justify-between items-start">
            <span className="px-3 py-1 text-xs border border-white/20 rounded-full text-white/60 uppercase tracking-widest backdrop-blur-md bg-black/50">
               {output.category}
            </span>
            <span className="font-mono text-white/40">/{output.id}</span>
         </div>
         
         <div>
            <h3 className="text-3xl font-bold text-white mb-2 group-hover:translate-x-2 transition-transform duration-300 drop-shadow-xl">
               {output.title}
            </h3>
            <div className="h-px w-full bg-white/20 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 shadow-[0_0_10px_white]" />
         </div>
      </div>
    </motion.div>
  );
}

export const Outputs = () => {
  return (
    <section id="models" className="py-32 bg-black">
      <div className="container mx-auto px-6">
        <div className="mb-16">
           <h2 className="text-sm font-mono text-white/40 mb-4 tracking-[0.2em] uppercase">
             Powerhouse Models
           </h2>
           <div className="h-px w-full bg-white/10" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {outputs.map(output => (
            <GlitchCard key={output.id} output={output} />
          ))}
        </div>
        
        {/* Final CTA in Outputs */}
        <div className="mt-32 flex flex-col items-center justify-center text-center relative py-20 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
           <div className="absolute inset-0 bg-emerald-500/10 blur-[100px]" />
           <h2 className="text-5xl md:text-8xl font-bold text-white mb-8 relative z-10">
             READY TO <span className="text-emerald-500">CHAT?</span>
           </h2>
           <button className="relative z-10 px-8 py-4 bg-white text-black text-lg font-bold rounded-full hover:scale-105 transition-transform" onClick={() => window.location.href='/chat'}>
             START CHATTING
           </button>
        </div>

      </div>
    </section>
  );
};
