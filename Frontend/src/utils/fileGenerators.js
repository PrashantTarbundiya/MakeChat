// File generation utilities for common formats

export const generatePDF = async (htmlContent, filename = 'document.pdf') => {
  // Option 1: Use @react-pdf/renderer (if installed)
  // Option 2: Use browser print with CSS for print
  // Option 3: Use jspdf + html2canvas (client-side)

  // For now: trigger print with print-specific CSS
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${filename}</title>
        <style>
          @media print {
            body { font-family: system-ui; margin: 0; padding: 20px; }
            @page { margin: 1cm; }
          }
          @media screen {
            body { font-family: system-ui; padding: 20px; }
          }
        </style>
      </head>
      <body>${htmlContent}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);

  return { filename, type: 'application/pdf', method: 'print' };
};

export const generateCSV = (data, filename = 'data.csv') => {
  // data can be: array of objects, array of arrays, or PapaParse unparse compatible
  let csvString;

  if (typeof Papa !== 'undefined' && Papa) {
    // Use PapaParse if available
    if (Array.isArray(data) && typeof data[0] === 'object' && !Array.isArray(data[0])) {
      csvString = Papa.unparse(data);
    } else {
      csvString = data.map(row => Array.isArray(row) ? row.join(',') : row).join('\n');
    }
  } else {
    // Fallback
    csvString = data.map(row => Array.isArray(row) ? row.join(',') : row).join('\n');
  }

  return {
    filename,
    type: 'text/csv',
    content: csvString,
    size: new Blob([csvString]).size
  };
};

export const generateJSON = (data, filename = 'data.json', pretty = true) => {
  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  return {
    filename,
    type: 'application/json',
    content,
    size: new Blob([content]).size
  };
};

export const generateXML = (data, filename = 'data.xml', rootElement = 'root') => {
  // data can be object or XML string
  let xmlString;

  if (typeof data === 'string') {
    xmlString = data;
  } else {
    // Simple object → XML converter
    const convert = (obj, nodeName = rootElement) => {
      if (Array.isArray(obj)) {
        return obj.map(item => convert(item, nodeName)).join('');
      }
      if (typeof obj === 'object' && obj !== null) {
        const entries = Object.entries(obj)
          .map(([key, value]) => {
            if (value === null) return `<${key}/>`;
            if (typeof value === 'object') return `<${key}>${convert(value)}</${key}>`;
            return `<${key}>${escapeXml(String(value))}</${key}>`;
          })
          .join('');
        return nodeName ? `<${nodeName}>${entries}</${nodeName}>` : entries;
      }
      return escapeXml(String(obj));
    };

    xmlString = `<?xml version="1.0" encoding="UTF-8"?>\n${convert(data)}`;
  }

  return {
    filename,
    type: 'application/xml',
    content: xmlString,
    size: new Blob([xmlString]).size
  };
};

export const generateText = (content, filename = 'document.txt') => ({
  filename,
  type: 'text/plain',
  content,
  size: new Blob([content]).size
});

export const generateHTML = (content, filename = 'document.html') => ({
  filename,
  type: 'text/html',
  content,
  size: new Blob([content]).size
});

export const generateMarkdown = (content, filename = 'document.md') => ({
  filename,
  type: 'text/markdown',
  content,
  size: new Blob([content]).size
});

export const generateYAML = (data, filename = 'data.yaml') => {
  // Requires js-yaml if complex; simple implementation here
  const convert = (obj, indent = 0) => {
    const spaces = '  '.repeat(indent);
    if (obj === null) return 'null';
    if (typeof obj === 'boolean') return obj ? 'true' : 'false';
    if (typeof obj === 'number') return String(obj);
    if (typeof obj === 'string') return obj;
    if (Array.isArray(obj)) {
      return obj.map(item => `\n${spaces}- ${convert(item, indent + 1)}`).join('');
    }
    if (typeof obj === 'object') {
      return Object.entries(obj)
        .map(([key, value]) => {
          const val = convert(value, indent + 1);
          if (val.includes('\n')) return `\n${spaces}${key}:\n${val.split('\n').map(l => spaces + '  ' + l).join('\n')}`;
          return `\n${spaces}${key}: ${val}`;
        })
        .join('');
    }
    return String(obj);
  };

  const content = convert(data);
  return { filename, type: 'text/yaml', content, size: new Blob([content]).size };
};

// Helper
const escapeXml = (str) =>
  str.replace(/[<>&'"]/g, c => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;'
  }[c]));

// ZIP bundler (multiple files)
export const generateZIP = async (files, filename = 'archive.zip') => {
  // files = [{ name: 'a.txt', content: '...' }, { name: 'b.json', content: {...} }]
  if (typeof JSZip === 'undefined') {
    console.warn('JSZip not loaded — cannot create ZIP');
    return null;
  }

  const zip = new JSZip();
  files.forEach(({ name, content, type = 'text/plain' }) => {
    const blob = typeof content === 'string' ? new Blob([content], { type }) : content;
    zip.file(name, blob);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  return {
    filename,
    type: 'application/zip',
    content: blob,
    size: blob.size
  };
};

export default {
  generatePDF,
  generateCSV,
  generateJSON,
  generateXML,
  generateText,
  generateHTML,
  generateMarkdown,
  generateYAML,
  generateZIP
};
