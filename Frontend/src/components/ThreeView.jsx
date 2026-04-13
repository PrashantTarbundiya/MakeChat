import React, { Suspense, useMemo, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, PerspectiveCamera, Environment, ContactShadows, PresentationControls, Float, Html } from '@react-three/drei';
import { Maximize2, Minimize2, X, Box, ZoomIn, ZoomOut, Maximize, AlertTriangle, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// CPK Coloring for common elements
const ATOM_COLORS = {
  H: '#ffffff',
  C: '#808080',
  N: '#0000ff',
  O: '#ff0000',
  P: '#ffa500',
  S: '#ffff00',
  Cl: '#00ff00',
  Br: '#8b0000',
  I: '#9400d3',
  F: '#daa520',
  He: '#00ffff',
  Mg: '#228b22',
  Ca: '#808080',
  Fe: '#ffa500',
  DEFAULT: '#ff00ff'
};

const ATOM_RADII = {
  H: 0.3,
  C: 0.6,
  N: 0.6,
  O: 0.6,
  P: 0.8,
  S: 0.8,
  DEFAULT: 0.5
};

const Molecule = ({ atoms = [], bonds = [] }) => {
  return (
    <group>
      {atoms.map((atom, i) => (
        <mesh key={`atom-${i}`} position={atom.pos || [0, 0, 0]}>
          <sphereGeometry args={[ATOM_RADII[atom.element] || ATOM_RADII.DEFAULT, 32, 32]} />
          <meshStandardMaterial color={ATOM_COLORS[atom.element] || ATOM_COLORS.DEFAULT} roughness={0.3} metalness={0.2} />
        </mesh>
      ))}
      {bonds.map((bond, i) => {
        const start = atoms[bond[0]]?.pos || [0, 0, 0];
        const end = atoms[bond[1]]?.pos || [0, 0, 0];
        const sub = [end[0] - start[0], end[1] - start[1], end[2] - start[2]];
        const len = Math.sqrt(sub[0] ** 2 + sub[1] ** 2 + sub[2] ** 2);
        const pos = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2];
        
        return (
          <mesh 
            key={`bond-${i}`} 
            position={pos} 
            onUpdate={(self) => {
                self.lookAt(end[0], end[1], end[2]);
                self.rotateX(Math.PI / 2);
            }}
          >
            <cylinderGeometry args={[0.15, 0.15, len, 8]} />
            <meshStandardMaterial color="#cccccc" roughness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
};

const GeometryView = ({ shapes = [] }) => {
  return (
    <group>
      {shapes.map((shape, i) => {
        const { type, pos = [0, 0, 0], color = '#3b82f6', scale = [1, 1, 1], rotation = [0, 0, 0] } = shape;
        let geometry;
        if (type === 'box') geometry = <boxGeometry args={[1, 1, 1]} />;
        else if (type === 'sphere') geometry = <sphereGeometry args={[0.5, 32, 32]} />;
        else if (type === 'cone') geometry = <coneGeometry args={[0.5, 1, 32]} />;
        else if (type === 'cylinder') geometry = <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
        else if (type === 'torus') geometry = <torusGeometry args={[0.5, 0.2, 16, 100]} />;
        else geometry = <boxGeometry args={[1, 1, 1]} />;

        return (
          <mesh key={`shape-${i}`} position={pos} scale={scale} rotation={rotation}>
            {geometry}
            <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
          </mesh>
        );
      })}
    </group>
  );
};

export const ThreeView = ({ data }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRotating, setIsRotating] = useState(true);
  const [expertRotating, setExpertRotating] = useState(true);
  const iframeRef = useRef(null);
  const orbitRef = useRef(null);

  const isExpertCode = (str) => {
    if (typeof str !== 'string') return false;
    const lower = str.toLowerCase();
    return (
      lower.includes('<think>') ||
      lower.includes('<!doctype') ||
      lower.includes('<html') ||
      lower.includes('importmap') ||
      lower.includes('three.scene') ||
      lower.includes('three.perspectivecamera') ||
      lower.includes('type="module"')
    );
  };
  
  const parsedData = useMemo(() => {
    // Guard: null, undefined, empty string, or the literal string "undefined"
    if (!data || data === 'undefined' || data === 'null' || (typeof data === 'string' && data.trim().length === 0)) {
      return null;
    }

    if (isExpertCode(data)) return null;

    // Only attempt JSON parse on strings that look like they start with JSON
    if (typeof data === 'string') {
      const trimmed = data.trim();
      if (trimmed[0] !== '{' && trimmed[0] !== '[') {
        // Not JSON — silently return null, no console error
        return null;
      }
      try {
        return JSON.parse(trimmed);
      } catch (e) {
        // Only log for genuinely short JSON-like strings that failed
        if (trimmed.length < 500) {
          console.warn('ThreeView: Could not parse JSON data:', e.message);
        }
        return null;
      }
    }

    // data is already an object
    return data;
  }, [data]);

  const extractExpertCode = (str) => {
    if (!str) return '';
    
    // 1. Try to extract from Markdown code blocks (tagged or untagged)
    const codeBlockMatch = str.match(/```(?:html|javascript|3d)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch) return codeBlockMatch[1];

    // 2. Try to extract raw HTML structure
    const htmlMatch = str.match(/<!DOCTYPE html>[\s\S]*?<\/html>/i) || 
                      str.match(/<html[\s\S]*?<\/html>/i);
    if (htmlMatch) return htmlMatch[0];

    // 3. Fallback to extracting the entire string if it contains key markers
    if (isExpertCode(str)) {
      // If it has think tags, ignore them
      return str.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
    }
    
    return str;
  };

  if (!parsedData) {
    // If data is missing/invalid, show nothing
    if (!data || data === 'undefined' || data === 'null' || (typeof data === 'string' && data.trim().length === 0)) {
      return null;
    }
    // If not JSON, check if it's HTML/Code for expert mode
    if (isExpertCode(data)) {
      const purifiedCode = extractExpertCode(data);
      const lowerCode = purifiedCode.toLowerCase();
      const hasStart = lowerCode.includes('<!doctype') || lowerCode.includes('<html') || lowerCode.includes('<script');
      const hasEnd = lowerCode.includes('</html>') || (lowerCode.includes('</script>') && lowerCode.split('</script>').length > (lowerCode.split('<script').length - 1));
      
      // If we have a start but no end, it's still streaming/building
      const isBuilding = hasStart && !hasEnd;

      return (
        <>
          <div 
            className="relative group my-4 rounded-xl border border-white/10 overflow-hidden bg-[#111] h-[400px] shadow-2xl cursor-pointer transition-colors duration-300"
            onClick={() => setIsFullscreen(true)}
          >
            <div className="absolute top-4 left-4 z-[5] flex items-center gap-2 pointer-events-none">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <Box className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-xs font-bold text-white uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                Expert 3D Engine
              </span>
            </div>

            <button 
               onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }}
               className="absolute top-4 right-4 p-1.5 bg-black/60 hover:bg-black/80 rounded-md text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity backdrop-blur-sm flex items-center gap-1 z-[6]"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Expand</span>
            </button>

            {isBuilding && (
              <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center bg-gradient-to-b from-[#0d1117] to-black p-6 text-center">
                {/* Triple-ring skeleton orb */}
                <div className="relative w-[90px] h-[90px] mb-5">
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 border-r-cyan-400/25 animate-spin" style={{ animationDuration: '1.8s', filter: 'drop-shadow(0 0 8px rgba(0,240,255,0.5))' }} />
                  <div className="absolute inset-[8px] rounded-full border-2 border-transparent border-b-purple-500 border-l-purple-500/25 animate-spin" style={{ animationDuration: '2.4s', animationDirection: 'reverse', filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.5))' }} />
                  <div className="absolute inset-[18px] rounded-full border-2 border-transparent border-t-emerald-500 border-r-emerald-500/25 animate-spin" style={{ animationDuration: '1.2s', filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.4))' }} />
                  <div className="absolute inset-[28px] rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#0a0a15] flex items-center justify-center shadow-[0_0_30px_rgba(0,240,255,0.08),inset_0_0_20px_rgba(0,0,0,0.5)]">
                    <Box className="w-5 h-5 text-cyan-400 animate-pulse" />
                  </div>
                </div>
                <h3 className="text-white/60 font-medium text-[13px] uppercase tracking-[3px] animate-pulse">Compiling Scene</h3>
                {/* Sliding bar */}
                <div className="mt-4 w-[120px] h-[2px] bg-white/5 rounded-full overflow-hidden">
                  <div className="w-[40%] h-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 animate-[skeletonBar_1.5s_ease-in-out_infinite]" />
                </div>
              </div>
            )}

            <iframe 
              ref={!isFullscreen ? iframeRef : undefined}
              srcDoc={isBuilding ? '' : purifiedCode}
              className="w-full h-full border-0 pointer-events-none"
              title="Expert 3D View"
              sandbox="allow-scripts"
            />

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/50 border border-white/10 backdrop-blur-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] text-white/50 uppercase tracking-tighter">Click to Explore in 3D</span>
            </div>
          </div>

          <AnimatePresence>
            {isFullscreen && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-1 sm:p-4 backdrop-blur-md pb-safe-offset-20"
                onClick={() => setIsFullscreen(false)}
              >
                <button 
                   className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[52]"
                   onClick={() => setIsFullscreen(false)}
                >
                  <X className="w-6 h-6" />
                </button>

                {/* Pinned Title Layer */}
                <div className="absolute top-6 sm:top-8 left-6 sm:left-10 z-[52] text-lg sm:text-3xl font-bold bg-[#1a1a1a]/40 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 shadow-lg text-white flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                    <Box className="w-6 h-6 text-emerald-400" />
                  </div>
                  Expert 3D Engine
                </div>

                <div 
                  className="w-full max-w-[100vw] sm:max-w-[95vw] h-full sm:h-[85vh] mt-16 sm:mt-0 rounded-none sm:rounded-xl border-0 sm:border border-white/10 shadow-2xl relative transition-colors duration-300 bg-[#111] overflow-hidden z-[51]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isBuilding && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gradient-to-b from-[#0d1117] to-black p-6 text-center">
                      {/* Triple-ring skeleton orb — fullscreen */}
                      <div className="relative w-[120px] h-[120px] mb-6">
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 border-r-cyan-400/25 animate-spin" style={{ animationDuration: '1.8s', filter: 'drop-shadow(0 0 8px rgba(0,240,255,0.5))' }} />
                        <div className="absolute inset-[10px] rounded-full border-2 border-transparent border-b-purple-500 border-l-purple-500/25 animate-spin" style={{ animationDuration: '2.4s', animationDirection: 'reverse', filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.5))' }} />
                        <div className="absolute inset-[22px] rounded-full border-2 border-transparent border-t-emerald-500 border-r-emerald-500/25 animate-spin" style={{ animationDuration: '1.2s', filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.4))' }} />
                        <div className="absolute inset-[34px] rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#0a0a15] flex items-center justify-center shadow-[0_0_30px_rgba(0,240,255,0.08),inset_0_0_20px_rgba(0,0,0,0.5)]">
                          <Box className="w-7 h-7 text-cyan-400 animate-pulse" />
                        </div>
                      </div>
                      <h3 className="text-white/60 font-medium text-[13px] uppercase tracking-[3px] animate-pulse">Compiling Scene</h3>
                      {/* Sliding bar */}
                      <div className="mt-4 w-[160px] h-[2px] bg-white/5 rounded-full overflow-hidden">
                        <div className="w-[40%] h-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 animate-[skeletonBar_1.5s_ease-in-out_infinite]" />
                      </div>
                    </div>
                  )}
                  <iframe 
                    ref={iframeRef}
                    srcDoc={isBuilding ? '' : purifiedCode}
                    className="w-full h-full border-0"
                    title="Expert 3D View Fullscreen"
                    sandbox="allow-scripts"
                  />
                </div>

                {/* Premium Toolbar */}
                <div 
                  className="absolute bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-4 bg-[#252525] border border-white/10 px-4 sm:px-6 py-2 sm:py-3 rounded-full shadow-2xl z-[52] max-w-[95vw]"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-white/40" />
                    <span className="text-white/80 text-[10px] sm:text-xs font-bold uppercase tracking-widest hidden sm:inline-block">Expert Scene</span>
                  </div>
                  <div className="hidden sm:block w-px h-6 bg-white/10" />

                  <button
                    onClick={() => {
                      iframeRef.current?.contentWindow?.postMessage({ type: 'toggleRotate' }, '*');
                      setExpertRotating(prev => !prev);
                    }}
                    className={`px-3 py-1.5 font-semibold text-[10px] sm:text-xs uppercase tracking-wider border rounded-lg transition-all ${
                      expertRotating ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-black/40 text-white/80 border-white/10 hover:bg-black/80 hover:text-white'
                    }`}
                  >
                    ⟳ Rotate
                  </button>
                  <button
                    onClick={() => {
                      iframeRef.current?.contentWindow?.postMessage({ type: 'resetCam' }, '*');
                    }}
                    className="px-3 py-1.5 font-semibold text-[10px] sm:text-xs uppercase tracking-wider bg-black/40 hover:bg-black/80 border border-white/10 rounded-lg text-white/80 hover:text-white transition-all"
                  >
                    ↺ Reset
                  </button>

                  <div className="hidden sm:block w-px h-6 bg-white/10" />
                  <div className="flex items-center gap-4">
                     <div className="flex items-center gap-1 text-white/50" title="Drag to Rotate">
                        <Maximize className="w-3 h-3" />
                        <span className="text-[9px] uppercase font-bold tracking-tighter">Drag</span>
                     </div>
                     <div className="hidden sm:flex items-center gap-1 text-white/50" title="Scroll to Zoom">
                        <ZoomIn className="w-3 h-3" />
                        <span className="text-[9px] uppercase font-bold tracking-tighter">Zoom</span>
                     </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      );
    }
    // Data doesn't match any renderable format — silently skip
    return null;
  }

  const titleText = parsedData.type === 'molecule' ? 'Molecular Viewer' : '3D Geometry Engine';

  return (
    <>
      <div 
        className="relative group my-4 rounded-xl border border-white/10 overflow-hidden bg-[#111] h-[400px] shadow-2xl cursor-pointer transition-colors duration-300"
        onClick={() => setIsFullscreen(true)}
      >
        <div className="absolute top-4 left-4 z-[5] flex items-center gap-2 pointer-events-none">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
            <Box className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-xs font-bold text-white uppercase tracking-widest drop-shadow-lg">
            {titleText}
          </span>
        </div>

        <button 
           onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }}
           className="absolute top-4 right-4 p-1.5 bg-black/60 hover:bg-black/80 rounded-md text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity backdrop-blur-sm flex items-center gap-1 z-[6]"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase font-bold tracking-wider">Expand</span>
        </button>

        <div className="w-full h-full">
          <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 5], fov: 50 }}>
            <Suspense fallback={<Html center><div className="flex flex-col items-center gap-4"><div className="w-12 h-12 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin"></div><span className="text-white/50 text-sm font-mono uppercase tracking-widest">Compiling...</span></div></Html>}>
              <Stage environment="city" intensity={0.5} contactShadow={{ opacity: 0.7, blur: 2 }} adjustCamera={true}>
                {parsedData.type === 'molecule' ? (
                  <Molecule atoms={parsedData.atoms} bonds={parsedData.bonds} />
                ) : (
                  <GeometryView shapes={parsedData.shapes} />
                )}
              </Stage>
              <OrbitControls makeDefault enableZoom={false} />
            </Suspense>
          </Canvas>
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/50 border border-white/10 backdrop-blur-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] text-white/50 uppercase tracking-tighter">Click to Explore in 3D</span>
        </div>
      </div>

      <AnimatePresence>
        {isFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-1 sm:p-4 backdrop-blur-md pb-safe-offset-20"
            onClick={() => setIsFullscreen(false)}
          >
            <button 
               className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[52]"
               onClick={() => setIsFullscreen(false)}
            >
              <X className="w-6 h-6" />
            </button>

            {/* Pinned Title Layer */}
            <div className={`absolute top-6 sm:top-8 left-6 sm:left-10 z-[52] text-lg sm:text-3xl font-bold bg-[#1a1a1a]/40 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 shadow-lg text-white flex items-center gap-4`}>
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                <Box className="w-6 h-6 text-blue-400" />
              </div>
              {titleText}
            </div>

            <div 
              className="w-full max-w-[100vw] sm:max-w-[95vw] h-full sm:h-[85vh] mt-16 sm:mt-0 rounded-none sm:rounded-xl border-0 sm:border border-white/10 shadow-2xl relative transition-colors duration-300 bg-[#111] z-[51]"
              onClick={(e) => e.stopPropagation()}
            >
              <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 5], fov: 50 }}>
                <Suspense fallback={<Html center><div className="flex flex-col items-center gap-4"><div className="w-16 h-16 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin"></div><span className="text-white/50 text-sm font-mono uppercase tracking-widest">Generating Space...</span></div></Html>}>
                  <Stage environment="city" intensity={0.6} contactShadow={{ opacity: 0.8, blur: 2.5 }} adjustCamera={true}>
                    {parsedData.type === 'molecule' ? (
                      <Molecule atoms={parsedData.atoms} bonds={parsedData.bonds} />
                    ) : (
                      <GeometryView shapes={parsedData.shapes} />
                    )}
                  </Stage>
                  <OrbitControls ref={orbitRef} makeDefault autoRotate={isRotating} autoRotateSpeed={0.5} />
                </Suspense>
              </Canvas>
            </div>

            {/* Premium Toolbar */}
            <div 
              className="absolute bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-4 bg-[#252525] border border-white/10 px-4 sm:px-6 py-2 sm:py-3 rounded-full shadow-2xl z-[52] max-w-[95vw]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-white/40" />
                <span className="text-white/80 text-[10px] sm:text-xs font-bold uppercase tracking-widest hidden sm:inline-block">Interactive Scene</span>
              </div>
              <div className="hidden sm:block w-px h-6 bg-white/10" />

              <button
                onClick={() => setIsRotating(!isRotating)}
                className={`px-3 py-1.5 font-semibold text-[10px] sm:text-xs uppercase tracking-wider border rounded-lg transition-all ${
                  isRotating ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-black/40 text-white/80 border-white/10 hover:bg-black/80 hover:text-white'
                }`}
              >
                ⟳ Rotate
              </button>
              <button
                onClick={() => {
                  if (orbitRef.current) {
                    orbitRef.current.reset();
                  }
                }}
                className="px-3 py-1.5 font-semibold text-[10px] sm:text-xs uppercase tracking-wider bg-black/40 hover:bg-black/80 border border-white/10 rounded-lg text-white/80 hover:text-white transition-all"
              >
                ↺ Reset
              </button>

              <div className="hidden sm:block w-px h-6 bg-white/10" />
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-1 text-white/50" title="Drag to Rotate">
                    <Maximize className="w-3 h-3" />
                    <span className="text-[9px] uppercase font-bold tracking-tighter">Drag</span>
                 </div>
                 <div className="hidden sm:flex items-center gap-1 text-white/50" title="Scroll to Zoom">
                    <ZoomIn className="w-3 h-3" />
                    <span className="text-[9px] uppercase font-bold tracking-tighter">Zoom</span>
                 </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
