// Utilities to extract downloadable data from rendered DOM/content

/**
 * Extract table data from HTML string and generate downloadable files
 */
export const extractTableData = (htmlString) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const tables = doc.querySelectorAll('table');

  const results = [];

  tables.forEach((table, index) => {
    const rows = Array.from(table.querySelectorAll('tr'));
    const data = rows.map(row => {
      const cells = row.querySelectorAll('th, td');
      return Array.from(cells).map(cell => cell.textContent.trim());
    });

    // Convert to CSV
    const csvContent = data.map(row => row.join(',')).join('\n');

    // Convert to JSON (array of objects if header row exists)
    let jsonContent = data;
    if (data.length > 0) {
      const headers = data[0];
      const rowsData = data.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, i) => {
          obj[header || `col${i}`] = row[i] || '';
        });
        return obj;
      });
      jsonContent = rowsData;
    }

    results.push({
      id: `table-${index}`,
      csv: csvContent,
      json: JSON.stringify(jsonContent, null, 2),
      headers: data[0] || [],
      rowCount: data.length - 1
    });
  });

  return results;
};

/**
 * Extract code blocks from markdown/HTML content
 */
export const extractCodeBlocks = (htmlString) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const codeBlocks = doc.querySelectorAll('pre code, code');

  const results = [];
  codeBlocks.forEach((block, index) => {
    const className = block.className || '';
    const match = /language-(\w+)/.exec(className);
    const language = match ? match[1] : 'txt';
    const code = block.textContent;

    results.push({
      id: `code-${index}`,
      language,
      code,
      filename: `code-snippet.${getFileExtension(language)}`
    });
  });

  return results;
};

const getFileExtension = (language) => {
  const extensions = {
    javascript: 'js',
    js: 'js',
    typescript: 'ts',
    ts: 'ts',
    python: 'py',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    csharp: 'cs',
    go: 'go',
    rust: 'rs',
    ruby: 'rb',
    php: 'php',
    sql: 'sql',
    html: 'html',
    css: 'css',
    json: 'json',
    yaml: 'yaml',
   yml: 'yaml',
    xml: 'xml',
    markdown: 'md',
    md: 'md',
    bash: 'sh',
    shell: 'sh',
    powershell: 'ps1',
    diff: 'diff',
    git: 'git',
    plaintext: 'txt',
    text: 'txt',
    mermaid: 'mmd',
    chart: 'json',
    csv: 'csv'
  };
  return extensions[language.toLowerCase()] || 'txt';
};

/**
 * Extract data from chart JSON blocks
 */
export const extractChartData = (codeString) => {
  try {
    // Try to parse as JSON
    const cleaned = codeString
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')
      .replace(/'/g, '"');

    const chartData = JSON.parse(cleaned);

    // Extract series data
    if (chartData.series) {
      return {
        csv: convertChartToCSV(chartData),
        json: JSON.stringify(chartData, null, 2),
        xlsx: null // Would need xlsx library
      };
    }

    return null;
  } catch (e) {
    return null;
  }
};

const convertChartToCSV = (chartData) => {
  const { xAxis, series } = chartData;

  // Build headers
  const headers = ['Category'];
  const dataKeys = Array.isArray(series) ? series.map((s, i) => s.name || `Series ${i + 1}`) : [series.name || 'Value'];
  headers.push(...dataKeys);

  // Build rows
  const categories = xAxis?.data || [];
  const rows = categories.map((cat, idx) => {
    const row = [cat];
    const seriesList = Array.isArray(series) ? series : [series];
    seriesList.forEach(s => {
      const dataPoint = s.data?.[idx];
      row.push(dataPoint !== undefined ? dataPoint : '');
    });
    return row.join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};

/**
 * Create a context menu for extracting/downloading content
 */
export const createDownloadContextMenu = (element, onSelect) => {
  const menu = document.createElement('div');
  menu.className = 'fixed z-[10000] bg-[#1a1a1a] border border-white/20 rounded-lg shadow-2xl py-1 min-w-[180px]';
  menu.style.display = 'none';

  const options = [
    { label: '📄 Download as PDF', action: 'pdf' },
    { label: '📊 Export as CSV', action: 'csv' },
    { label: '📋 Copy as JSON', action: 'json' },
    { label: '📝 Copy as HTML', action: 'html' },
    { label: '💾 Download as DOCX', action: 'docx' },
    { label: '📈 Download as XLSX', action: 'xlsx' },
    { label: '📄 Download as XML', action: 'xml' },
    { label: '📁 Download as ZIP (all)', action: 'zip' }
  ];

  options.forEach(opt => {
    const item = document.createElement('button');
    item.className = 'w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-2 transition-colors';
    item.innerHTML = `<span>${opt.action === 'zip' ? '📦' : opt.label.split(' ')[0]}</span><span>${opt.label.split(' ').slice(1).join(' ')}</span>`;
    item.onclick = () => {
      onSelect(opt.action);
      menu.remove();
    };
    menu.appendChild(item);
  });

  document.body.appendChild(menu);

  const position = element.getBoundingClientRect();
  menu.style.top = `${position.bottom + 4}px`;
  menu.style.left = `${position.left}px`;
  menu.style.display = 'block';

  // Close on outside click
  const closeHandler = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler), 0);
};

/**
 * Generate a download button for any content type
 */
export const generateDownloadButton = (content, options = {}) => {
  const {
    filename = 'download',
    format = 'txt',
    content: explicitContent,
    mimeType = getMimeType(format)
  } = options;

  const data = explicitContent !== undefined ? explicitContent : content;

  return {
    filename: `${filename}.${getExtension(format)}`,
    type: mimeType,
    content: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
    size: new Blob([typeof data === 'string' ? data : JSON.stringify(data)]).size
  };
};

const getMimeType = (format) => {
  const types = {
    pdf: 'application/pdf',
    csv: 'text/csv',
    json: 'application/json',
    xml: 'application/xml',
    txt: 'text/plain',
    html: 'text/html',
    md: 'text/markdown',
    yaml: 'text/yaml',
    yml: 'text/yaml',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    zip: 'application/zip',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    svg: 'image/svg+xml',
    js: 'application/javascript',
    ts: 'application/typescript',
    py: 'text/x-python',
    sh: 'application/x-sh',
    ps1: 'application/x-powershell'
  };
  return types[format.toLowerCase()] || 'text/plain';
};

const getExtension = (format) => {
  const exts = {
    pdf: 'pdf',
    csv: 'csv',
    json: 'json',
    xml: 'xml',
    txt: 'txt',
    html: 'html',
    md: 'md',
    markdown: 'md',
    yaml: 'yaml',
    yml: 'yaml',
    docx: 'docx',
    xlsx: 'xlsx',
    zip: 'zip',
    png: 'png',
    jpg: 'jpg',
    jpeg: 'jpg',
    svg: 'svg',
    js: 'js',
    ts: 'ts',
    py: 'py',
    sh: 'sh',
    ps1: 'ps1'
  };
  return exts[format.toLowerCase()] || format;
};

export default {
  extractTableData,
  extractCodeBlocks,
  extractChartData,
  createDownloadContextMenu,
  generateDownloadButton
};
