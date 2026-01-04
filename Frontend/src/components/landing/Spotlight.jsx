import React, { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

export const Spotlight = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring animation for the cursor follower
  const springConfig = { damping: 25, stiffness: 150 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        x: x, // Apply spring animated X
        y: y, // Apply spring animated Y
        translateX: '-50%',
        translateY: '-50%',
        width: 600,
        height: 600,
        background: `radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(0,0,0,0) 70%)`,
        pointerEvents: 'none',
        zIndex: 9999,
        mixBlendMode: 'screen'
      }}
    />
  );
};
