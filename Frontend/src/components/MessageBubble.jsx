import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import katex from 'katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, ChevronDown, ChevronRight, X, Maximize2, ZoomIn, ZoomOut, Download, Maximize, Sun, Moon, ArrowUp } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import mermaid from 'mermaid';
import { ChartView } from './Charts';
import Papa from 'papaparse';
import DataTable, { createTheme } from 'react-data-table-component';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import ReactPlayer from 'react-player';
import L from 'leaflet';
import { FileDownloadButton } from './FileDownloadButton';
import { generateCSV, generateJSON, generateXML, generateText, generateHTML, generateMarkdown, generateYAML, generatePDF } from '../utils/fileGenerators';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

createTheme('dark', {
  text: { primary: '#e5e7eb', secondary: '#9ca3af' },
  background: { default: '#1a1a1a' },
  context: { background: '#cb4b16', text: '#FFFFFF' },
  divider: { default: '#374151' },
  action: { button: 'rgba(0,0,0,.54)', hover: 'rgba(0,0,0,.08)', disabled: 'rgba(0,0,0,.12)' },
}, 'dark');

const CsvDataTable = ({ csvString }) => {
  const { data, columns } = useMemo(() => {
    let parsedData = [];
    let parsedColumns = [];
    try {
      Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          if (result.data && result.data.length > 0) {
            parsedData = result.data;
            parsedColumns = Object.keys(result.data[0]).map(key => ({
              name: key,
              selector: row => row[key],
              sortable: true,
              wrap: true,
            }));
          }
        }
      });
    } catch (e) {
      console.error('CSV parse error', e);
    }
    return { data: parsedData, columns: parsedColumns };
  }, [csvString]);

  // Generate different format contents
  const csvContent = data.length > 0 ? Papa.unparse(data) : csvString;
  const jsonContent = data.length > 0 ? JSON.stringify(data, null, 2) : csvString;
  const xmlContent = data.length > 0 ? convertCsvToXml(data) : csvString;

  if (!data || data.length === 0) return <div className="text-gray-400 text-sm p-4">Parsing CSV data...</div>;

  return (
    <div className="my-4 border border-gray-600 rounded-xl overflow-hidden">
      <div className="bg-gray-800 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-gray-300">📊 Data Grid</span>
        <div className="flex items-center gap-2">
          <FileDownloadButton
            filename="data.csv"
            type="text/csv"
            content={csvContent}
            description="Comma-separated values"
            size={new Blob([csvContent]).size}
          />
          <FileDownloadButton
            filename="data.json"
            type="application/json"
            content={jsonContent}
            description="JavaScript Object Notation"
            size={new Blob([jsonContent]).size}
          />
          <FileDownloadButton
            filename="data.xml"
            type="application/xml"
            content={xmlContent}
            description="eXtensible Markup Language"
            size={new Blob([xmlContent]).size}
          />
        </div>
      </div>
      <div className="bg-[#1a1a1a]">
        <DataTable
          columns={columns}
          data={data}
          pagination
          theme="dark"
          customStyles={{
            headRow: { style: { backgroundColor: '#1f2937', color: '#f3f4f6', fontWeight: 'bold', borderBottom: '1px solid #374151' } },
            cells: { style: { color: '#d1d5db' } },
            pagination: { style: { backgroundColor: '#1a1a1a', color: '#d1d5db', borderTop: '1px solid #374151' } }
          }}
          paginationPerPage={5}
          paginationRowsPerPageOptions={[5, 10, 20]}
        />
      </div>
    </div>
  );
};

// Helper to convert CSV data to XML
const convertCsvToXml = (data) => {
  if (!data || data.length === 0) return '<?xml version="1.0"?><root/>';
  const headers = Object.keys(data[0]);
  const rows = data.map(row => {
    const cols = headers.map(h => `<${h}>${escapeXml(String(row[h] || ''))}</${h}>`).join('');
    return `<row>${cols}</row>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><root>${rows}</root>`;
};

const escapeXml = (str) =>
  str.replace(/[<>&'"]/g, c => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;'
  }[c]));

// Convert chart JSON to CSV format
const convertChartToCSV = (chartData) => {
  const { xAxis, series } = chartData;
  if (!series) return '';

  const categories = xAxis?.data || [];
  const seriesList = Array.isArray(series) ? series : [series];

  // Headers
  const headers = ['Category', ...seriesList.map(s => s.name || 'Value')];
  const headerRow = headers.join(',');

  // Data rows
  const rows = categories.map((cat, idx) => {
    const values = seriesList.map(s => {
      const val = s.data?.[idx];
      return val !== undefined ? val : '';
    });
    return [cat, ...values].join(',');
  });

  return [headerRow, ...rows].join('\n');
};

// Convert chart JSON to XML format
const convertChartToXML = (chartData) => {
  const { xAxis, series } = chartData;
  const seriesList = Array.isArray(series) ? series : [series];

  const chartEl = `<chart>
  <xAxis type="${xAxis?.type || 'category'}">
    ${(xAxis?.data || []).map(v => `<data>${escapeXml(String(v))}</data>`).join('\n    ')}
  </xAxis>
  ${seriesList.map((s, i) => `
  <series index="${i}" name="${escapeXml(s.name || `Series ${i + 1}`)}" type="${s.type || 'line'}">
    ${(s.data || []).map(v => `<point>${v}</point>`).join('\n    ')}
  </series>`).join('')}
</chart>`.trim();

  return `<?xml version="1.0" encoding="UTF-8"?>\n${chartEl}`;
};

const MapEmbedRenderer = ({ jsonString }) => {
  let mapData;
  try {
    mapData = JSON.parse(jsonString);
  } catch (e) {
    return <div className="text-red-400 text-sm">Failed to parse map data JSON.</div>;
  }

  const { lat: aiLat, lng: aiLng, zoom: aiZoom = 13, markers: aiMarkers = [], query } = mapData;

  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(!!query);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    const geocode = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const results = await res.json();
        if (!cancelled && results && results.length > 0) {
          const place = results[0];
          setGeoData({
            lat: parseFloat(place.lat),
            lng: parseFloat(place.lon),
            displayName: place.display_name,
          });
        }
      } catch (err) {
        console.error('Geocoding failed, using AI coordinates:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    geocode();
    return () => { cancelled = true; };
  }, [query]);

  const finalLat = geoData?.lat ?? aiLat ?? 0;
  const finalLng = geoData?.lng ?? aiLng ?? 0;
  const zoom = aiZoom;
  const center = [finalLat, finalLng];

  const markers = geoData
    ? [{ lat: geoData.lat, lng: geoData.lng, popup: geoData.displayName || query }]
    : aiMarkers.length > 0
      ? aiMarkers
      : (aiLat && aiLng) ? [{ lat: aiLat, lng: aiLng, popup: query || 'Location' }] : [];

  if (loading) {
    return (
      <div className="my-4 rounded-xl overflow-hidden border border-gray-600 h-[300px] sm:h-[400px] w-full flex items-center justify-center bg-[#1a1a1a]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="text-gray-400 text-sm">Finding location...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-gray-600 h-[300px] sm:h-[400px] w-full relative z-0">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} className="h-full w-full z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((m, idx) => (
          <Marker key={idx} position={[m.lat, m.lng]}>
            {m.popup && <Popup>{m.popup}</Popup>}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

// Math block renderer for ```math and ```latex blocks
const MathBlock = ({ math, inline = false }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(math, containerRef.current, {
          throwOnError: false,
          displayMode: !inline,
          output: 'html',
          trust: true
        });
      } catch (err) {
        console.error('KaTeX rendering error:', err);
        containerRef.current.textContent = math;
      }
    }
  }, [math, inline]);

  return (
    <>
      <style>{`
        .katex-display {
          margin: 1.5rem 0 !important;
          font-size: 1.25em !important;
          text-align: center !important;
        }
        .katex {
          font-size: 1.1em !important;
        }
      `}</style>
      <div 
        ref={containerRef} 
        className={`my-6 overflow-x-auto py-4 text-xl sm:text-2xl ${
          !inline ? 'flex justify-center bg-white/5 rounded-xl border border-white/10 shadow-lg' : ''
        }`}
      />
    </>
  );
};

/* Try to parse potentially-malformed JSON from LLM */
const parseChartJSON = (raw) => {
  try { return JSON.parse(raw); } catch {}

  // Remove JS comments, trailing commas, unquoted keys
  let cleaned = raw
    .replace(/\/\/.*$/gm, '')                           // single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')                   // multi-line comments
    .replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')     // trailing commas
    .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');        // unquoted keys

  // Normalize single quotes to double quotes
  cleaned = cleaned.replace(/'/g, '"');

  try { return JSON.parse(cleaned); } catch {}
  return null;
};

const ChartBlockRenderer = ({ codeString, onSendMessage }) => {
  const [rawJson, setRawJson] = useState(codeString);
  const [editing, setEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const chartRef = useRef(null);

  const parsed = parseChartJSON(rawJson);

  // Generate export data from chart config
  const generateExportData = () => {
    if (!parsed) return null;
    const jsonContent = JSON.stringify(parsed, null, 2);
    const csvContent = convertChartToCSV(parsed);
    const xmlContent = convertChartToXML(parsed);
    return { json: jsonContent, csv: csvContent, xml: xmlContent };
  };

  const exportData = generateExportData();

  return (
    <div className="my-4">
      {/* Download toolbar */}
      {parsed && exportData && (
        <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider py-1">Export:</span>
          <FileDownloadButton
            filename="chart-data.json"
            type="application/json"
            content={exportData.json}
            description="Chart configuration"
            size={new Blob([exportData.json]).size}
          />
          <FileDownloadButton
            filename="chart-data.csv"
            type="text/csv"
            content={exportData.csv}
            description="Series data as CSV"
            size={new Blob([exportData.csv]).size}
          />
          <FileDownloadButton
            filename="chart-data.xml"
            type="application/xml"
            content={exportData.xml}
            description="Series data as XML"
            size={new Blob([exportData.xml]).size}
          />
        </div>
      )}

      {parsed ? (
        <div ref={chartRef}>
          <ChartView data={parsed} />
        </div>
      ) : (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 overflow-hidden">
          <div className="px-4 py-2 text-red-400 text-xs font-medium border-b border-red-500/20">
            ⚠️ Could not parse chart data
          </div>
          <div className="p-4">
            {errorMsg && <p className="text-[11px] text-red-300/80 mb-2">{errorMsg}</p>}
            {editing ? (
              <div className="space-y-2">
                <textarea
                  value={rawJson}
                  onChange={(e) => setRawJson(e.target.value)}
                  className="w-full h-32 bg-black/30 border border-white/20 rounded-lg p-2 text-[11px] text-gray-300 font-mono resize-y"
                  placeholder="Paste or fix JSON here..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const p = parseChartJSON(rawJson);
                      if (p) { setEditing(false); setErrorMsg(''); }
                      else setErrorMsg('Still invalid JSON. Check quotes, commas, and braces.');
                    }}
                    className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs rounded-lg"
                  >
                    ✓ Try Again
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-gray-400 text-xs rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] text-gray-500">The AI generated malformed JSON (possibly JS functions that break the parser).</p>
                <div className="flex gap-2 items-center">
                  {onSendMessage && (
                    <button
                      onClick={() => onSendMessage("The chart JSON you just generated contained syntax errors or JavaScript functions which prevent JSON parsing. Please return ONLY the strictly valid JSON option object block for the chart. Do not include function() or any JS logic. Use only ECharts string template formatters. Output only the chart code block.")}
                      className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs font-semibold rounded-lg transition-colors border border-purple-500/30"
                    >
                      🪄 Auto-Fix via AI
                    </button>
                  )}
                  <button
                    onClick={() => setEditing(true)}
                    className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs font-semibold rounded-lg transition-colors border border-yellow-500/30"
                  >
                    ✏️ Manual Fix
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
});

const MermaidDiagram = ({ chart, onSendMessage }) => {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const idRef = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);
  const renderCountRef = useRef(0);

  const sanitizeChart = (raw) => {
    return raw.replace(
      /(\w+)(\{|\[|\()((?:(?!\2).)*?[\[\]\{\}\(\)].*?)(}|\]|\))/g,
      (match, id, open, text, close) => {
        if (text.startsWith('"') && text.endsWith('"')) return match;
        return `${id}${open}"${text}"${close}`;
      }
    );
  };

  const renderMermaid = async (theme) => {
    renderCountRef.current += 1;
    const uniqueId = `${idRef.current}-${renderCountRef.current}`;
    mermaid.initialize({ startOnLoad: false, theme: theme === 'dark' ? 'dark' : 'default', securityLevel: 'loose' });

    // Create a temporary detached container so mermaid has a real DOM node
    const tempDiv = document.createElement('div');
    tempDiv.style.display = 'none';
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    document.body.appendChild(tempDiv);

    try {
      const { svg: renderedSvg } = await mermaid.render(uniqueId, chart);
      setSvg(renderedSvg);
      setError(false);
    } catch (err) {
      try {
        const sanitized = sanitizeChart(chart);
        const { svg: renderedSvg } = await mermaid.render(`${uniqueId}-retry`, sanitized);
        setSvg(renderedSvg);
        setError(false);
      } catch (retryErr) {
        console.error('Mermaid rendering failed', retryErr);
        setError(true);
      }
    } finally {
      // Remove the temp container and any leftover mermaid elements
      const leftover = document.getElementById(uniqueId);
      leftover?.remove();
      const leftoverRetry = document.getElementById(`${uniqueId}-retry`);
      leftoverRetry?.remove();
      tempDiv.remove();
    }
  };

  useEffect(() => {
    if (chart) renderMermaid(isDarkTheme ? 'dark' : 'default');
  }, [chart, isDarkTheme]);

  useEffect(() => {
    if (!isFullscreen) {
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
    }
  }, [isFullscreen]);

  // Attach native wheel listener with passive:false so preventDefault works
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isFullscreen) return;
    const onWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.ctrlKey ? -e.deltaY * 0.01 : -e.deltaY * 0.002;
      setZoom(z => Math.min(4, Math.max(0.25, z + delta)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isFullscreen]);

  const handleExportSVG = () => {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPNG = () => {
    const svgEl = document.createElement('div');
    svgEl.innerHTML = svg;
    const svgNode = svgEl.querySelector('svg');
    if (!svgNode) return;

    const canvas = document.createElement('canvas');
    const bbox = svgNode.getBoundingClientRect();
    const width = parseInt(svgNode.getAttribute('width') || svgNode.viewBox?.baseVal?.width || 1200);
    const height = parseInt(svgNode.getAttribute('height') || svgNode.viewBox?.baseVal?.height || 800);
    const scale = 2; // High DPI
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // Set background
    ctx.fillStyle = isDarkTheme ? '#1a1a1a' : '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const img = new Image();
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'diagram.png';
      a.click();
    };
    img.src = url;
  };

  const handleFitToScreen = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Pan handlers — mouse
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

  // Pan handlers — touch
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      panStartRef.current = { x: e.touches[0].clientX - panOffset.x, y: e.touches[0].clientY - panOffset.y };
    }
  };
  const handleTouchMove = (e) => {
    if (!isPanning || e.touches.length !== 1) return;
    e.preventDefault();
    setPanOffset({ x: e.touches[0].clientX - panStartRef.current.x, y: e.touches[0].clientY - panStartRef.current.y });
  };
  const handleTouchEnd = () => setIsPanning(false);

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 overflow-hidden relative group">
        <div className="px-4 py-2 text-yellow-500 text-[11px] font-medium border-b border-yellow-500/20 flex items-center justify-between">
          <span>⚠️ Diagram Syntax Failed</span>
          {onSendMessage ? (
            <button 
              onClick={() => onSendMessage("The Mermaid diagram you generated failed to render due to a syntax error. Please output ONLY the fully corrected mermaid diagram block with proper syntax. Use valid absolute dates for Gantts and valid node quotes.")}
              className="px-2 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 rounded border border-yellow-500/30 text-[10px] transition-colors"
            >
              🪄 Auto-Fix via AI
            </button>
          ) : (
            <span className="opacity-70">Click 'Regenerate' below to fix</span>
          )}
        </div>
        <pre className="p-4 text-gray-300 text-xs overflow-x-auto whitespace-pre-wrap">{chart}</pre>
      </div>
    );
  }

  return (
    <>
      <div className="relative group my-4">
        <div 
          onClick={() => setIsFullscreen(true)}
          dangerouslySetInnerHTML={{ __html: svg }} 
          className="flex justify-center bg-[#1e1e1e] p-4 rounded-lg border border-black/50 cursor-pointer hover:border-blue-500/50 transition-colors [&>svg]:max-w-full [&>svg]:h-auto" 
          title="Click to view full screen"
        />
        <button 
          onClick={() => setIsFullscreen(true)}
          className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-md text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity backdrop-blur-sm flex items-center gap-1"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase font-bold tracking-wider">Expand</span>
        </button>
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
              className="absolute top-2 right-2 sm:top-4 sm:right-4 p-1.5 sm:p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[10000]"
              onClick={() => setIsFullscreen(false)}
            >
              <X className="w-6 h-6" />
            </button>
            <div 
              className={`w-full max-w-[100vw] sm:max-w-[95vw] h-[92vh] sm:h-[85vh] overflow-hidden p-2 sm:p-8 rounded-none sm:rounded-xl border-0 sm:border shadow-2xl relative transition-colors duration-300 ${isDarkTheme ? 'bg-[#1a1a1a] sm:border-white/10' : 'bg-white sm:border-gray-200'} ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
              onClick={e => e.stopPropagation()}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              ref={containerRef}
            >
              <div 
                dangerouslySetInnerHTML={{ __html: svg }} 
                className="transition-all ease-out mx-auto [&>svg]:!w-full [&>svg]:!h-auto [&>svg]:!max-w-none select-none"
                style={{ 
                  width: `${Math.max(10, zoom * 100)}%`,
                  minWidth: `${zoom * 300}px`,
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                  transitionDuration: isPanning ? '0ms' : '200ms'
                }}
              />
            </div>
            
            {/* Enhanced Toolbar */}
            <div 
              className="absolute bottom-3 sm:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-0.5 sm:gap-1 bg-[#252525] border border-white/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-2xl z-[10000] max-w-[95vw] overflow-x-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Zoom controls */}
              <button 
                onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} 
                className="p-1.5 sm:p-2 hover:bg-blue-500/20 hover:text-blue-400 rounded-full text-gray-300 transition-colors flex-shrink-0"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 sm:w-4 h-3.5 sm:h-4"/>
              </button>
              <span className="text-gray-200 text-[10px] sm:text-xs font-medium w-8 sm:w-10 text-center select-none flex-shrink-0">
                {Math.round(zoom * 100)}%
              </span>
              <button 
                onClick={() => setZoom(z => Math.min(4, z + 0.25))} 
                className="p-1.5 sm:p-2 hover:bg-blue-500/20 hover:text-blue-400 rounded-full text-gray-300 transition-colors flex-shrink-0"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 sm:w-4 h-3.5 sm:h-4"/>
              </button>

              <div className="w-px h-4 sm:h-5 bg-white/10 mx-0.5 sm:mx-1 flex-shrink-0" />

              {/* Fit to screen */}
              <button 
                onClick={handleFitToScreen}
                className="p-1.5 sm:p-2 hover:bg-emerald-500/20 hover:text-emerald-400 rounded-full text-gray-300 transition-colors flex-shrink-0"
                title="Fit to Screen"
              >
                <Maximize className="w-3.5 sm:w-4 h-3.5 sm:h-4"/>
              </button>

              {/* Theme toggle */}
              <button 
                onClick={() => setIsDarkTheme(d => !d)}
                className="p-1.5 sm:p-2 hover:bg-amber-500/20 hover:text-amber-400 rounded-full text-gray-300 transition-colors flex-shrink-0"
                title={isDarkTheme ? 'Light Theme' : 'Dark Theme'}
              >
                {isDarkTheme ? <Sun className="w-3.5 sm:w-4 h-3.5 sm:h-4"/> : <Moon className="w-3.5 sm:w-4 h-3.5 sm:h-4"/>}
              </button>

              <div className="w-px h-4 sm:h-5 bg-white/10 mx-0.5 sm:mx-1 flex-shrink-0" />

              {/* Export buttons */}
              <button 
                onClick={handleExportPNG}
                className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 hover:bg-purple-500/20 hover:text-purple-400 rounded-full text-gray-300 transition-colors text-[10px] sm:text-xs font-medium flex-shrink-0"
                title="Export as PNG"
              >
                <Download className="w-3 sm:w-3.5 h-3 sm:h-3.5"/>
                PNG
              </button>
              <button 
                onClick={handleExportSVG}
                className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 hover:bg-purple-500/20 hover:text-purple-400 rounded-full text-gray-300 transition-colors text-[10px] sm:text-xs font-medium flex-shrink-0"
                title="Export as SVG"
              >
                <Download className="w-3 sm:w-3.5 h-3 sm:h-3.5"/>
                SVG
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export const MessageBubble = ({ content, role, versions, currentVersion, onVersionChange, onSendMessage }) => {
  const [copiedCode, setCopiedCode] = useState(null);
  const [showThinking, setShowThinking] = useState(false);
  const mediaRef = useRef(null);

  // Parse reasoning model response (thinking + answer + web search + canvas)
  const parseReasoningResponse = (text) => {
    let thinking = null;
    let webSearch = null;
    let canvas = null;
    let answer = text;

    // Extract thinking
    const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/i);
    if (thinkMatch) {
      thinking = thinkMatch[1].trim();
      answer = answer.replace(/<think>[\s\S]*?<\/think>/i, '');
    }

    // Extract web search
    const searchMatch = answer.match(/\[WEB SEARCH RESULTS\]([\s\S]*?)\[\/WEB SEARCH RESULTS\]/i);
    if (searchMatch) {
      webSearch = searchMatch[1].trim();
      answer = answer.replace(/\[WEB SEARCH RESULTS\][\s\S]*?\[\/WEB SEARCH RESULTS\]/i, '');
    }

    // Extract canvas
    const canvasMatch = answer.match(/\[CANVAS\]([\s\S]*?)\[\/CANVAS\]/i);
    if (canvasMatch) {
      canvas = canvasMatch[1].trim();
      answer = answer.replace(/\[CANVAS\][\s\S]*?\[\/CANVAS\]/i, '');
    }

    // Extract video
    let videos = [];
    const videoRegex = /\[VIDEO:(.*?)\]/gi;
    let videoMatch;
    while ((videoMatch = videoRegex.exec(answer)) !== null) {
      if (videoMatch[1]) videos.push(videoMatch[1].trim());
    }
    answer = answer.replace(videoRegex, '');

    return { thinking, webSearch, canvas, videos, answer: answer.trim() };
  };

  // Parse file download blocks
  const parseDownloadBlocks = (text) => {
    const downloads = [];
    
    // New JSON Format: handles [FILE_DOWNLOAD:{...}] or hallucinated ones like [DOCX_FILE_DOWNLOAD:{...}]
    // Updated regex to handle multiline JSON and complex nested objects
    const jsonRegex = /\[(?:[A-Z_]*)?DOWNLOAD:\s*(\{[\s\S]*?\})\s*\]/gi;
    let match;
    let lastIndex = 0;
    
    while ((match = jsonRegex.exec(text)) !== null) {
      try {
        const jsonStr = match[1].trim();
        // Try to parse JSON - handle potential errors gracefully
        const parsed = JSON.parse(jsonStr);
        
        // Validate that required fields exist
        if (parsed.filename && (parsed.url || parsed.content || parsed.data || parsed.base64)) {
          downloads.push(parsed);
        }
      } catch (e) {
        
        // Fallback: try to extract values if JSON parsing fails
        try {
          const urlMatch = /["']?url["']?\s*:\s*["']([^"']+)["']/i.exec(match[1]);
          const filenameMatch = /["']?filename["']?\s*:\s*["']([^"']+)["']/i.exec(match[1]);
          const typeMatch = /["']?type["']?\s*:\s*["']([^"']+)["']/i.exec(match[1]);
          
          if (urlMatch && filenameMatch) {
            downloads.push({
              filename: filenameMatch[1],
              url: urlMatch[1],
              type: typeMatch ? typeMatch[1] : 'application/octet-stream'
            });
          }
        } catch (fallbackError) {
          // Fallback parsing failed
        }
      }
    }

    // Legacy Key-Value Format: [DOWNLOAD:filename=report.pdf,type=application/pdf]
    const legacyRegex = /\[(?:[A-Z_]+)?DOWNLOAD:([^\]]+)\]/gi;
    while ((match = legacyRegex.exec(text)) !== null) {
      // Skip if this was already matched by JSON regex
      if (text.substring(match.index, match.index + match[0].length).includes('{')) continue;
      
      const params = match[1];
      const parsed = {};
      params.split(',').forEach(part => {
        const [key, value] = part.split('=');
        if (key && value) parsed[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
      });
      if (parsed.filename && (parsed.content || parsed.url || parsed.data || parsed.base64)) {
        downloads.push(parsed);
      }
    }
    
    return downloads;
  };

  const { thinking, webSearch, canvas, videos, answer } = parseReasoningResponse(content);
  const downloads = parseDownloadBlocks(answer);
  const isGeneratingFile = answer.includes('[FILE_GENERATING]') && downloads.length === 0;
  const cleanedAnswer = answer.replace(/\[FILE_GENERATING\]/g, '').replace(/\[(?:[A-Z_]*)?DOWNLOAD:\s*\{[\s\S]*?\}\s*\]/gi, '').replace(/\[(?:[A-Z_]+)?DOWNLOAD:[^\]]+\]/gi, '').trim();

  const handleCopyCode = (code, index) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(index);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDownloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (mediaRef.current) {
      const buttons = mediaRef.current.querySelectorAll('button[data-download]');
      buttons.forEach(btn => {
        btn.onclick = async (e) => {
          e.preventDefault();
          const url = btn.getAttribute('data-url');
          const filename = btn.getAttribute('data-filename');
          const fileContent = btn.getAttribute('data-content');
          const fileType = btn.getAttribute('data-type');

          if (fileContent) {
            const decodedContent = decodeURIComponent(fileContent);
            handleDownloadFile(decodedContent, filename, fileType);
          } else if (url) {
            try {
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              a.target = '_blank';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            } catch (error) {
              console.error('Download failed:', error);
              window.open(url, '_blank');
            }
          }
        };
      });
    }
  }, [content]);

  // Check if content contains HTML media elements, loader, or file download
  const hasMediaHTML = answer.includes('<video') || answer.includes('<audio') || answer.includes('media-container') || answer.includes('loader-box') || answer.includes('file-download');

  const GeneratingSpinner = () => (
    <div className="flex items-center gap-3 p-3 mt-3 bg-[#1e1e1e]/60 border border-white/5 rounded-xl text-blue-400 w-fit">
      <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
      <span className="text-sm font-medium">Generating structured document...</span>
    </div>
  );

  return (
    <div className={`rounded-2xl w-full overflow-x-auto ${role === 'user' ? 'bg-[#171717] border border-white/10 text-white px-3 py-1' : 'text-white px-2 py-1'
      }`}>
      {thinking && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-4 rounded-xl overflow-hidden border border-white/10 bg-white/5"
        >
          <button
            onClick={() => setShowThinking(!showThinking)}
            className="w-full px-4 py-3 text-left flex items-center justify-between group hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </div>
              <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Thinking Process</span>
            </div>
            <span className="text-gray-500 group-hover:text-gray-300">
              {showThinking ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
          </button>
          <AnimatePresence>
            {showThinking && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="px-4 pb-4 pt-1 text-sm text-gray-400 leading-relaxed font-mono border-t border-white/5">
                  {thinking}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
      {webSearch && (
        <div className="mb-4 border-l-4 border-teal-500 bg-teal-500/10 rounded-r-lg p-4">
          <div className="text-sm font-semibold text-teal-400 mb-2">🔍 Web Search Results</div>
          <div className="text-xs text-gray-400 whitespace-pre-wrap">{webSearch}</div>
        </div>
      )}
      {videos && videos.length > 0 && (
        <div className="flex flex-col gap-4 mb-4">
          {videos.map((vid, idx) => (
            <div key={idx} className="rounded-xl overflow-hidden shadow-lg border border-gray-600 bg-black aspect-video w-full max-w-3xl">
               <ReactPlayer url={vid} width="100%" height="100%" controls />
            </div>
          ))}
        </div>
      )}
      {canvas && (
        <div className="mb-4 border-l-4 border-pink-500 bg-pink-500/10 rounded-r-lg p-4">
          <div className="text-sm font-semibold text-pink-400 mb-2">🎨 Canvas Content</div>
          <div className="text-xs text-gray-300 whitespace-pre-wrap font-mono">{canvas}</div>
        </div>
      )}

      {hasMediaHTML ? (
        <div ref={mediaRef} dangerouslySetInnerHTML={{ __html: cleanedAnswer }} />
      ) : (
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const codeString = String(children).replace(/\n$/, '');
              const codeIndex = node?.position?.start?.line || 0;

              if (match && match[1].toLowerCase() === 'mermaid') {
                return <MermaidDiagram chart={codeString} onSendMessage={onSendMessage} />;
              }

              // Render inline chart from ```chart blocks
              if (match && match[1].toLowerCase() === 'chart') {
                return <ChartBlockRenderer codeString={codeString} onSendMessage={onSendMessage} />;
              }

              if (match && match[1].toLowerCase() === 'csv') {
                return <CsvDataTable csvString={codeString} />;
              }

              if (match && match[1].toLowerCase() === 'map') {
                return <MapEmbedRenderer jsonString={codeString} />;
              }

              if (match && match[1].toLowerCase() === 'json') {
                try {
                  const parsed = JSON.parse(codeString);
                  if (parsed && typeof parsed === 'object' && 'lat' in parsed && 'lng' in parsed && 'zoom' in parsed) {
                    return <MapEmbedRenderer jsonString={codeString} />;
                  }
                } catch (e) {}
              }

              if (match && (match[1].toLowerCase() === 'math' || match[1].toLowerCase() === 'latex')) {
                return <MathBlock math={codeString} />;
              }

              return !inline && match ? (
                <div className="relative group my-4">
                  <div className="flex items-center justify-between bg-[#1e1e1e] px-2 sm:px-4 py-2 rounded-t-lg border-b border-black/50">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                      </div>
                      <span className="text-[10px] sm:text-xs text-gray-400 ml-2">{match[1]}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyCode(codeString, codeIndex)}
                        className="flex items-center gap-1 px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
                        title="Copy code"
                      >
                        {copiedCode === codeIndex ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span className="hidden sm:inline">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span className="hidden sm:inline">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      className="!mt-0 !rounded-t-none !text-xs sm:!text-sm"
                      wrapLongLines={true}
                      customStyle={{ margin: 0, fontSize: 'inherit' }}
                      {...props}
                    >
                      {codeString}
                    </SyntaxHighlighter>
                  </div>
                </div>
              ) : (
                <code className="bg-gray-700 px-1.5 py-0.5 rounded text-sm break-all" {...props}>
                  {children}
                </code>
              );
            },
            p({ children }) {
              return <p className="mb-3 leading-relaxed break-words">{children}</p>;
            },
            ul({ children }) {
              return <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>;
            },
            ol({ children }) {
              return <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>;
            },
            h1({ children }) {
              return <h1 className="text-xl sm:text-2xl font-bold mb-3 mt-4">{children}</h1>;
            },
            h2({ children }) {
              return <h2 className="text-lg sm:text-xl font-bold mb-2 mt-3">{children}</h2>;
            },
            h3({ children }) {
              return <h3 className="text-base sm:text-lg font-bold mb-2 mt-2">{children}</h3>;
            },
            table({ children }) {
              return (
                <div className="overflow-x-auto my-4 rounded-lg border border-gray-600">
                  <table className="w-full border-collapse">
                    {children}
                  </table>
                </div>
              );
            },
            thead({ children }) {
              return <thead className="bg-gray-800">{children}</thead>;
            },
            tbody({ children }) {
              return <tbody className="bg-gray-900">{children}</tbody>;
            },
            tr({ children }) {
              return <tr className="border-b border-gray-600 hover:bg-gray-800/50">{children}</tr>;
            },
            th({ children }) {
              return (
                <th className="border-r border-gray-600 px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-white text-xs sm:text-sm">
                  {children}
                </th>
              );
            },
            td({ children }) {
              return <td className="border-r border-gray-600 px-2 sm:px-4 py-2 sm:py-3 text-gray-300 text-xs sm:text-sm">{children}</td>;
            },
            blockquote({ children }) {
              return (
                <blockquote className="border-l-4 border-blue-500 pl-4 italic my-3 text-gray-300">
                  {children}
                </blockquote>
              );
            },
            img({ src, alt }) {
              if (!src) return null;
              return (
                <div className="relative group inline-block">
                  <img
                    src={src}
                    alt={alt || 'Uploaded image'}
                    className="rounded-lg my-2 block max-w-full cursor-pointer"
                    style={{ maxWidth: '300px', height: 'auto', objectFit: 'cover' }}
                    loading="lazy"
                    onClick={() => window.open(src, '_blank')}
                  />
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      try {
                        // Always proxy the download to bypass CORS restrictions entirely
                        const fetchUrl = `${import.meta.env.VITE_API_URL}/api/upload/proxy?url=${encodeURIComponent(src)}`;
                          
                        const response = await fetch(fetchUrl);
                        if (!response.ok) throw new Error('Fetch failed');
                        
                        const blob = await response.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        
                        const a = document.createElement('a');
                        a.href = blobUrl;
                        // Extract filename from URL or default to image.png
                        const urlObj = new URL(src);
                        const pathname = urlObj.pathname;
                        const defaultFilename = pathname.substring(pathname.lastIndexOf('/') + 1) || 'image.png';
                        a.download = defaultFilename;
                        
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(blobUrl);
                      } catch (error) {
                        console.error('Image download failed, falling back to open:', error);
                        // Fallback if CORS prevents fetching the blob
                        const a = document.createElement('a');
                        a.href = src;
                        a.download = 'image.png';
                        a.target = '_blank';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm z-10 cursor-pointer hover:scale-110 active:scale-95"
                    title="Download Image"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              );
            },
            a({ href, children }) {
              if (href && href.includes('res.cloudinary.com')) {
                return <span className="text-gray-300">{children}</span>;
              }
              return <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>;
            },
          }}
        >
          {cleanedAnswer}
        </ReactMarkdown>
      )}

      {/* File downloads at the bottom of the chat bubble */}
      {downloads.length > 0 && downloads.map((file, idx) => {
        let dataAttr = '';
        if (file.content) {
          dataAttr = encodeURIComponent(file.content);
        } else if (file.data || file.base64) {
          dataAttr = `data:${file.type || 'application/octet-stream'};base64,${file.data || file.base64}`;
        }
        const isUrl = !!file.url;

        return (
          <div key={idx} className="mt-4 mb-1">
            <FileDownloadButton
              filename={file.filename || 'download'}
              type={file.type || 'application/octet-stream'}
              content={dataAttr}
              url={isUrl ? file.url : null}
              description={file.description || 'Download file'}
            />
          </div>
        );
      })}

      {/* Spinner for pending file generations */}
      {isGeneratingFile && <GeneratingSpinner />}
    </div>
  );
};
