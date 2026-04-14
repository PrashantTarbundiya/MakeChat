import React, { useState, useEffect, useRef, Component } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { Maximize2, X, ZoomIn, ZoomOut, Maximize, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, ChevronRight, RotateCcw } from 'lucide-react';

// Pre-fetch world map geometry if needed by the chart
let worldMapRegistered = false;
let fetchingMap = false;

// ─── Error Boundary to catch ECharts runtime crashes ───
class ChartErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Chart crashed:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="my-4 rounded-lg border border-red-500/30 bg-red-500/10 overflow-hidden">
          <div className="px-4 py-2 text-red-500 text-[11px] font-medium border-b border-red-500/20 flex items-center justify-between">
            <span>⚠️ Chart Rendering Failed</span>
            <span className="opacity-70">Click 'Regenerate' below to fix</span>
          </div>
          <pre className="p-4 text-gray-300 text-xs overflow-x-auto whitespace-pre-wrap max-h-40">
            {this.state.error?.message || 'Unknown error'}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Unsupported series types that will crash ECharts ───
const UNSUPPORTED_SERIES_TYPES = new Set([
  'violin', 'chord', 'scatter3D', 'bar3D', 'line3D',
  'surface', 'globe', 'parallel', 'map3D', 'lines3D',
  'flowGL', 'graphGL', 'scatterGL', 'linesGL'
]);

// Only 'world' map is registered
const ALLOWED_MAPS = new Set(['world']);

// ─── Deep-sanitize ECharts option before rendering ───
const sanitizeOption = (opt) => {
  if (!opt || typeof opt !== 'object') return opt;
  const sanitized = JSON.parse(JSON.stringify(opt)); // deep clone

  // Remove timeline (crashes because component not imported)
  delete sanitized.timeline;

  // Remove parallelAxis
  delete sanitized.parallelAxis;

  // Fix xAxis if it's set to type 'timeline'
  const fixAxis = (axis) => {
    if (!axis) return axis;
    if (Array.isArray(axis)) return axis.map(fixAxis);
    if (axis.type === 'timeline') axis.type = 'category';
    return axis;
  };
  sanitized.xAxis = fixAxis(sanitized.xAxis);
  sanitized.yAxis = fixAxis(sanitized.yAxis);

  // Sanitize series
  if (Array.isArray(sanitized.series)) {
    sanitized.series = sanitized.series.filter(s => {
      if (s && UNSUPPORTED_SERIES_TYPES.has(s.type)) {
        console.warn(`[Charts] Stripped unsupported series type: ${s.type}`);
        return false;
      }
      // Fix map names — only "world" is registered
      if (s && s.type === 'map' && s.map && !ALLOWED_MAPS.has(s.map)) {
        console.warn(`[Charts] Map "${s.map}" not registered, forcing "world"`);
        s.map = 'world';
      }
      return true;
    });

    // If all series were stripped, mark as invalid
    if (sanitized.series.length === 0) return null;
  }

  // Fix geo references
  if (sanitized.geo) {
    if (Array.isArray(sanitized.geo)) {
      sanitized.geo.forEach(g => {
        if (g.map && !ALLOWED_MAPS.has(g.map)) g.map = 'world';
      });
    } else if (sanitized.geo.map && !ALLOWED_MAPS.has(sanitized.geo.map)) {
      sanitized.geo.map = 'world';
    }
  }

  return sanitized;
};

const ChartView = ({ data }) => {
  const [mapLoaded, setMapLoaded] = useState(worldMapRegistered);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const chartRef = useRef(null);

  useEffect(() => {
    const optionStr = JSON.stringify(data);
    const usesMap = optionStr.includes('"map"');

    if (usesMap && !worldMapRegistered && !fetchingMap) {
      fetchingMap = true;
      fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
        .then(res => res.json())
        .then(geoJson => {
          echarts.registerMap('world', geoJson);
          worldMapRegistered = true;
          setMapLoaded(true);
        })
        .catch(err => {
          console.error('Failed to load map data:', err);
          setError('Failed to load map data for rendering.');
        })
        .finally(() => { fetchingMap = false; });
    } else if (usesMap && worldMapRegistered) {
      setMapLoaded(true);
    }
  }, [data]);

  if (!data || typeof data !== 'object') {
    return <div className="my-4 text-red-400 text-xs bg-red-500/10 p-4 rounded-xl">Invalid chart data</div>;
  }

  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [extraNodes, setExtraNodes] = useState([]);
  const [extraLinks, setExtraLinks] = useState([]);

  // Helper: normalize a single graph node so `name` is always set and unique
  const normalizeNode = (node) => {
    const name = node.name || node.id || `node_${Math.random().toString(36).substr(2, 8)}`;
    return { ...node, name, id: undefined }; // ECharts graph uses `name` as the key, `id` can conflict
  };

  // Helper: deduplicate nodes by `name`, keeping the first occurrence
  const deduplicateNodes = (nodes) => {
    const seen = new Set();
    return nodes.filter(n => {
      if (seen.has(n.name)) return false;
      seen.add(n.name);
      return true;
    });
  };

  // Helper: normalize link source/target to use node `name` values
  const normalizeLinks = (links, nodeNameSet) => {
    return links.filter(l => {
      const src = l.source?.name || l.source;
      const tgt = l.target?.name || l.target;
      return nodeNameSet.has(src) && nodeNameSet.has(tgt);
    }).map(l => ({
      ...l,
      source: l.source?.name || l.source,
      target: l.target?.name || l.target
    }));
  };

  // Generate sub-nodes for graph charts
  const expandGraphNode = (nodeName, baseNodes, baseLinks) => {
    if (expandedNodes.has(nodeName)) return;

    const nodeData = baseNodes.find(n => n.name === nodeName);
    if (!nodeData) return;

    // Collect all existing names (base + already-added extras)
    const existingNames = new Set(baseNodes.map(n => n.name));
    extraNodes.forEach(n => existingNames.add(n.name));

    const aspects = ['Origins', 'Impact', 'Key Figures', 'Timeline', 'Legacy', 'Details'];
    const relations = ['aspect of', 'part of', 'related to', 'influenced by'];

    const count = Math.min(3, aspects.length);
    const shuffled = [...aspects].sort(() => Math.random() - 0.5);

    const newNodes = [];
    const newLinks = [];

    for (let i = 0; i < count; i++) {
      const subName = `${nodeName}_sub_${i}`;
      if (existingNames.has(subName)) continue; // skip duplicates
      existingNames.add(subName);

      newNodes.push({
        name: subName,
        label: { show: true, formatter: `${shuffled[i]} of ${nodeName}`, fontSize: 10 },
        value: (nodeData.value || 1) * 0.8,
        category: (nodeData.category || 0) + 1,
        description: `Dynamic exploration of ${shuffled[i].toLowerCase()}`,
        symbolSize: 25,
        itemStyle: { borderColor: 'rgba(255,255,255,0.4)', borderWidth: 1, opacity: 0.85, shadowBlur: 10 }
      });
      newLinks.push({
        source: nodeName,
        target: subName,
        label: { show: true, formatter: relations[i % relations.length], fontSize: 9 },
        lineStyle: { width: 1.5, type: 'dashed' }
      });
    }

    if (newNodes.length > 0) {
      setExtraNodes(prev => [...prev, ...newNodes]);
      setExtraLinks(prev => [...prev, ...newLinks]);
    }

    setExpandedNodes(prev => new Set([...prev, nodeName]));
  };

  const handleChartClick = (params) => {
    if (params.seriesType === 'graph' && params.dataType === 'node') {
      // Use the original data series (pre-merge) so we don't double-count extras
      const origSeries = data?.series?.[params.seriesIndex];
      if (!origSeries) return;
      const baseNodes = (origSeries.data || []).map(normalizeNode);
      const baseLinks = origSeries.links || origSeries.edges || [];
      expandGraphNode(params.name, baseNodes, baseLinks);
    } else {
      setIsFullscreen(true);
    }
  };

  const resetGraph = (e) => {
    e.stopPropagation();
    setExtraNodes([]);
    setExtraLinks([]);
    setExpandedNodes(new Set());
  };

  let processedData = data;
  if (data.labels && data.values) {
    const isPie = data.type === 'pie' || data.type === 'donut';
    processedData = {
      backgroundColor: 'transparent',
      title: { text: data.title || '', textStyle: { color: isDarkTheme ? '#fff' : '#000' } },
      tooltip: { trigger: isPie ? 'item' : 'axis' },
      xAxis: isPie ? undefined : { type: 'category', data: data.labels },
      yAxis: isPie ? undefined : { type: 'value' },
      series: [
        {
          type: isPie ? 'pie' : data.type === 'line' ? 'line' : 'bar',
          data: isPie ? data.values.map((v, i) => ({ value: v, name: data.labels[i] })) : data.values,
          radius: data.type === 'donut' ? ['40%', '70%'] : isPie ? '50%' : undefined
        }
      ]
    };
  }

  // Inject dynamic graph expansions with full deduplication
  if (processedData && processedData.series) {
    processedData = {
      ...processedData,
      series: processedData.series.map(s => {
        if (s.type === 'graph') {
          // 1) Normalize all base nodes
          const baseNodes = (s.data || []).map(normalizeNode);
          // 2) Merge with extras and deduplicate
          const mergedNodes = deduplicateNodes([...baseNodes, ...extraNodes]);
          // 3) Build a set of valid node names
          const validNames = new Set(mergedNodes.map(n => n.name));
          // 4) Normalize links and drop any pointing to missing nodes
          const baseLinks = s.links || s.edges || [];
          const mergedLinks = normalizeLinks([...baseLinks, ...extraLinks], validNames);
          // 5) Apply expanded-node styling
          const styledNodes = mergedNodes.map(n => {
            if (expandedNodes.has(n.name)) {
              return {
                ...n,
                itemStyle: { ...(n.itemStyle || {}), borderColor: '#f59e0b', borderWidth: 3, shadowBlur: 20, shadowColor: 'rgba(245,158,11,0.5)' }
              };
            }
            return n;
          });
          return { ...s, data: styledNodes, links: mergedLinks, edges: undefined };
        }
        return s;
      })
    };
  }

  // ─── Sanitize option to strip unsupported features ───
  const sanitizedData = sanitizeOption(processedData);

  if (!sanitizedData) {
    return (
      <div className="my-4 rounded-lg border border-red-500/30 bg-red-500/10 overflow-hidden">
        <div className="px-4 py-2 text-red-500 text-[11px] font-medium border-b border-red-500/20 flex items-center justify-between">
          <span>⚠️ Unsupported Chart Type</span>
          <span className="opacity-70">Click 'Regenerate' below to fix</span>
        </div>
        <pre className="p-4 text-gray-300 text-xs overflow-x-auto whitespace-pre-wrap max-h-40">{JSON.stringify(data, null, 2)}</pre>
      </div>
    );
  }

  // Deep clone to inject roam settings
  const toggleRoam = (obj, enable) => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => toggleRoam(item, enable));
    const newObj = { ...obj };
    if (newObj.type === 'map' || newObj.type === 'graph' || newObj.type === 'tree' || newObj.type === 'treemap') {
      newObj.roam = enable;
    }
    for (const key in newObj) {
      if (typeof newObj[key] === 'object') newObj[key] = toggleRoam(newObj[key], enable);
    }
    return newObj;
  };

  const enhancedOption = {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: 'Inter, sans-serif' },
    ...toggleRoam(sanitizedData, isFullscreen) // ONLY roam in fullscreen
  };

  const isMap = JSON.stringify(enhancedOption).includes('"map"');

  // Extract title to render natively so it stays pinned during zoom
  const fullscreenTitleText = Array.isArray(enhancedOption.title) 
      ? enhancedOption.title[0]?.text 
      : enhancedOption.title?.text || '';

  const optionForFullscreen = { 
    ...enhancedOption, 
    backgroundColor: 'transparent',
    title: undefined // Remove from ECharts so it doesn't duplicate and zoom
  };

  if (isMap && !mapLoaded && !error) {
    return (
      <div className="my-4 rounded-xl border border-white/10 bg-[#1a1a1a] p-8 flex items-center justify-center h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <span className="text-gray-400 text-sm">Loading map data...</span>
        </div>
      </div>
    );
  }

  if (error) return <div className="my-4 text-red-400 text-xs bg-red-500/10 p-4 rounded-xl">{error}</div>;

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };
  const handleMouseMove = (e) => {
    if (!isPanning) return;
    setPanOffset({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
  };
  const handleMouseUp = () => setIsPanning(false);

  // Validate basic structure
  let isValid = true;
  if (!enhancedOption.series && enhancedOption.dataset === undefined) isValid = false;
  if (typeof enhancedOption.xAxis === 'string' || typeof enhancedOption.yAxis === 'string') isValid = false;

  if (!isValid) {
    return (
      <div className="my-4 rounded-lg border border-red-500/30 bg-red-500/10 overflow-hidden relative group">
        <div className="px-4 py-2 text-red-500 text-[11px] font-medium border-b border-red-500/20 flex items-center justify-between">
          <span>⚠️ Invalid Chart Data Format</span>
          <span className="opacity-70">Click 'Regenerate' below to fix</span>
        </div>
        <pre className="p-4 text-gray-300 text-xs overflow-x-auto whitespace-pre-wrap max-h-40">{JSON.stringify(data, null, 2)}</pre>
      </div>
    );
  }

  return (
    <>
      <div 
        className="relative group my-4 rounded-xl border border-white/10 overflow-hidden p-2 cursor-pointer transition-colors duration-300"
        style={{ backgroundColor: isDarkTheme ? '#1a1a1a' : '#ffffff' }}
        onClick={() => setIsFullscreen(true)}
      >
        <ChartErrorBoundary>
          <div className="w-full h-full">
            <ReactECharts
              option={enhancedOption}
              style={{ height: '400px', width: '100%' }}
              theme={isDarkTheme ? 'dark' : 'light'}
              opts={{ renderer: 'svg' }}
              notMerge={true}
              lazyUpdate={true}
              onEvents={{ click: handleChartClick }}
            />
          </div>
        </ChartErrorBoundary>
        <button 
          onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }}
          className="absolute top-4 right-4 p-1.5 bg-black/60 hover:bg-black/80 rounded-md text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity backdrop-blur-sm flex items-center gap-1 z-10"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase font-bold tracking-wider">Expand</span>
        </button>

        {expandedNodes.size > 0 && (
          <button 
            onClick={resetGraph}
            className="absolute top-4 right-24 p-1.5 bg-black/60 hover:bg-black/80 rounded-md text-amber-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity backdrop-blur-sm flex items-center gap-1 z-10"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Reset</span>
          </button>
        )}
      </div>

      <AnimatePresence>
        {isFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center p-1 sm:p-4 backdrop-blur-md"
            onClick={() => setIsFullscreen(false)}
          >
            <button 
               className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[10000]"
               onClick={() => setIsFullscreen(false)}
            >
              <X className="w-6 h-6" />
            </button>

            {/* Pinned Title Layer */}
            {fullscreenTitleText && (
              <div className={`absolute top-6 sm:top-8 left-6 sm:left-10 z-[10001] text-lg sm:text-3xl font-bold bg-[#1a1a1a]/40 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 shadow-lg ${isDarkTheme ? 'text-white' : 'text-gray-800'}`}>
                {fullscreenTitleText}
              </div>
            )}

            <div 
              className={`w-full max-w-[100vw] sm:max-w-[95vw] h-[92vh] sm:h-[85vh] rounded-none sm:rounded-xl border-0 sm:border shadow-2xl relative transition-colors duration-300 ${isDarkTheme ? 'bg-[#1a1a1a] sm:border-white/10' : 'bg-white sm:border-gray-200'} ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div 
                className="transition-transform ease-out w-full h-full"
                style={{ 
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                  transitionDuration: isPanning ? '0ms' : '200ms'
                }}
              >
                <ChartErrorBoundary>
                  <ReactECharts
                    ref={chartRef}
                    option={optionForFullscreen}
                    style={{ height: '100%', width: '100%' }}
                    theme={isDarkTheme ? 'dark' : 'light'}
                    opts={{ renderer: 'svg' }}
                    notMerge={true}
                    lazyUpdate={true}
                    onEvents={{ click: handleChartClick }}
                  />
                </ChartErrorBoundary>
              </div>
            </div>

            {/* Exactly the same Toolbar as MermaidDiagram */}
            <div 
              className="absolute bottom-3 sm:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-0.5 sm:gap-1 bg-[#252525] border border-white/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-2xl z-[10000] max-w-[95vw] overflow-x-auto"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} 
                className="p-1.5 sm:p-2 hover:bg-blue-500/20 hover:text-blue-400 rounded-full text-gray-300 transition-colors flex-shrink-0"
              >
                <ZoomOut className="w-3.5 sm:w-4 h-3.5 sm:h-4"/>
              </button>
              <span className="text-gray-200 text-[10px] sm:text-xs font-medium w-8 sm:w-10 text-center select-none flex-shrink-0">
                {Math.round(zoom * 100)}%
              </span>
              <button 
                onClick={() => setZoom(z => Math.min(4, z + 0.25))} 
                className="p-1.5 sm:p-2 hover:bg-blue-500/20 hover:text-blue-400 rounded-full text-gray-300 transition-colors flex-shrink-0"
              >
                <ZoomIn className="w-3.5 sm:w-4 h-3.5 sm:h-4"/>
              </button>
              <div className="w-px h-4 sm:h-5 bg-white/10 mx-0.5 sm:mx-1 flex-shrink-0" />
              <button 
                onClick={() => { setZoom(1); setPanOffset({x:0, y:0}); }}
                className="p-1.5 sm:p-2 hover:bg-emerald-500/20 hover:text-emerald-400 rounded-full text-gray-300 transition-colors flex-shrink-0"
              >
                <Maximize className="w-3.5 sm:w-4 h-3.5 sm:h-4"/>
              </button>
              <button 
                onClick={() => setIsDarkTheme(d => !d)}
                className="p-1.5 sm:p-2 hover:bg-amber-500/20 hover:text-amber-400 rounded-full text-gray-300 transition-colors flex-shrink-0"
              >
                {isDarkTheme ? <Sun className="w-3.5 sm:w-4 h-3.5 sm:h-4"/> : <Moon className="w-3.5 sm:w-4 h-3.5 sm:h-4"/>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export { ChartView };
export default ChartView;
