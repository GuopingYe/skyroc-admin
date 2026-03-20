// @ts-nocheck
/**
 * TFL Builder - Export Utilities
 *
 * Functions for exporting TFL documents to various formats:
 * - Word (.docx) - HTML-based Word-compatible format
 * - RTF - Rich Text Format
 * - PDF - HTML with PDF conversion
 * - Excel (.xlsx) - Native Excel format
 */

import type {
  IARSDocument,
  IDisplay,
  IBodyRow,
  IListingColumn,
  IAxisConfig,
  IChartSeries
} from '../types';

// ==================== Word/HTML Export ====================

/**
 * Generate HTML document from ARS document
 */
export function generateHTMLDocument(document: IARSDocument): string {
  const displays = document.displays || [];
  const headerStyle = document.headerStyle;

  // Extract metadata
  const studyInfo = document.studyInfo;
  const analysisInfo = document.analysisId;
  const groupings = document.analysisGroupings || [];
  const methods = document.methods || [];

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${studyInfo?.studyTitle || 'TFL Document'}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      margin: 20px;
      line-height: 1.4;
    }
    .document-header {
      text-align: center;
      margin-bottom: 20px;
      page-break-after: always;
    }
    .study-title {
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .study-info {
      font-size: 10pt;
      color: #666;
    }
    .table-container {
      margin: 20px 0;
      page-break-inside: avoid;
    }
    .tfl-title {
      font-size: 12pt;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .tfl-subtitle {
      font-size: 11pt;
      font-style: italic;
      margin-bottom: 5px;
    }
    .tfl-table {
      border-collapse: collapse;
      width: 100%;
      font-size: 9pt;
    }
    .tfl-table th {
      border: 1px solid #000;
      background-color: #f0f0f0;
      padding: 4px 8px;
      text-align: center;
      font-weight: bold;
    }
    .tfl-table td {
      border: 1px solid #000;
      padding: 4px 8px;
      text-align: center;
    }
    .tfl-table td.text-left {
      text-align: left;
    }
    .tfl-table td.row-header {
      background-color: #fafafa;
      font-weight: 500;
    }
    .tfl-footer {
      font-size: 8pt;
      color: #666;
      margin-top: 5px;
    }
    .abbreviations {
      font-size: 9pt;
      margin: 10px 0;
    }
    .abbreviations dt {
      font-weight: bold;
      display: inline;
      margin-right: 5px;
    }
    .abbreviations dd {
      display: inline;
      margin-right: 20px;
    }
    .figure-container {
      margin: 20px 0;
      text-align: center;
      page-break-inside: avoid;
    }
    .figure-placeholder {
      border: 1px dashed #999;
      padding: 40px;
      margin: 10px;
      background-color: #fafafa;
    }
    .listing-container {
      margin: 20px 0;
      page-break-inside: avoid;
    }
    .listing-table {
      border-collapse: collapse;
      width: 100%;
      font-size: 9pt;
    }
    .listing-table th {
      border: 1px solid #000;
      background-color: #f0f0f0;
      padding: 4px 8px;
      text-align: center;
      font-weight: bold;
    }
    .listing-table td {
      border: 1px solid #000;
      padding: 4px 8px;
    }
    @media print {
      body { margin: 0; }
      .page-break { page-break-after: always; }
    }
  </style>
</head>
<body>
`;

  // Document Header
  html += `
    <div class="document-header">
      <div class="study-title">${studyInfo?.studyTitle || 'Clinical Study Report'}</div>
      <div class="study-info">
        <p>Study ID: ${studyInfo?.studyId || 'N/A'}</p>
        <p>Phase: ${(studyInfo?.phase || []).join(', ')}</p>
        <p>Compound: ${studyInfo?.compoundUnderStudy || 'N/A'}</p>
        <p>Therapeutic Area: ${studyInfo?.therapeuticArea || 'N/A'}</p>
      </div>
    </div>
  `;

  // Render each display
  displays.forEach((display, index) => {
    html += renderDisplayToHTML(display, index + 1, groupings, methods);
  });

  html += `
</body>
</html>`;

  return html;
}

/**
 * Render a single display to HTML
 */
function renderDisplayToHTML(
  display: IDisplay,
  index: number,
  groupings: any[],
  methods: any[]
): string {
  let html = '';

  const titleSection = display.displaySections.find(s => s.type === 'Title');
  const bodySection = display.displaySections.find(s => s.type === 'Body');
  const chartSection = display.displaySections.find(s => s.type === 'Figure');
  const listingSection = display.displaySections.find(s => s.type === 'Body');
  const abbrevSection = display.displaySections.find(s => s.type === 'Reference');
  const footnoteSection = display.displaySections.find(s => s.type === 'Footnote');

  // Extract title
  let titleText = display.name || '';
  let subtitleText = '';

  if (titleSection && 'text' in titleSection.content) {
    titleText = titleSection.content.text || titleText;
  }

  if (display.type === 'Table' || display.type === 'Listing') {
    html += `
    <div class="table-container">
      <div class="tfl-title">${index}. ${titleText}</div>
      ${subtitleText ? `<div class="tfl-subtitle">${subtitleText}</div>` : ''}
    `;

    if (display.type === 'Table' && bodySection && 'rows' in bodySection.content) {
      html += renderTableToHTML(bodySection.content.rows, display);
    }

    if (display.type === 'Listing' && listingSection) {
      html += renderListingToHTML(listingSection.content as any);
    }

    // Abbreviations
    if (abbrevSection && 'text' in abbrevSection.content) {
      const abbrevText = abbrevSection.content.text || '';
      html += renderAbbreviationsToHTML(abbrevText);
    }

    // Footnotes
    if (footnoteSection && 'text' in footnoteSection.content) {
      const footnoteText = footnoteSection.content.text || '';
      if (footnoteText) {
        html += `<div class="tfl-footer">${footnoteText}</div>`;
      }
    }

    html += '</div>';
  } else if (display.type === 'Figure') {
    html += `
    <div class="figure-container">
      <div class="tfl-title">Figure ${index}. ${titleText}</div>
      ${subtitleText ? `<div class="tfl-subtitle">${subtitleText}</div>` : ''}
      <div class="figure-placeholder">
        [FIGURE content would be rendered here]
      </div>
    `;

    if (chartSection) {
      html += renderChartInfoToHTML(chartSection.content);
    }

    html += '</div>';
  }

  return html;
}

/**
 * Render table rows to HTML
 */
function renderTableToHTML(rows: IBodyRow[], display: IDisplay): string {
  const maxIndent = Math.max(...rows.map(r => r.indentLevel));

  // Calculate columns (treatment arms + data columns)
  let columnsHtml = '<tr><th>Parameter</th>';
  for (let i = 0; i < 3; i++) {
    columnsHtml += `<th>Treatment ${i + 1}</th>`;
  }
  columnsHtml += '</tr>';

  let rowsHtml = '';

  rows.forEach((row, rowIndex) => {
    const indent = '&nbsp;'.repeat(row.indentLevel * 4);
    const rowClass = row.rowType === 'header' ? 'row-header' : 'text-left';

    rowsHtml += `<tr>`;
    rowsHtml += `<td class="${rowClass}">${indent}${row.label}</td>`;
    for (let i = 0; i < 3; i++) {
      const value = getCellDisplayValue(row, i);
      rowsHtml += `<td>${value}</td>`;
    }
    rowsHtml += '</tr>';
  });

  return `<table class="tfl-table"><thead>${columnsHtml}</thead><tbody>${rowsHtml}</tbody></table>`;
}

/**
 * Render listing to HTML
 */
function renderListingToHTML(listingContent: any): string {
  const columns = listingContent.columns || [];
  const sortRules = listingContent.sortRules || [];
  const filterRules = listingContent.filterRules || [];

  // Header
  let headerHtml = '<tr>';
  columns.forEach(col => {
    headerHtml += `<th>${col.label || col.variable}</th>`;
  });
  headerHtml += '</tr>';

  // Mock data rows
  let rowsHtml = '';
  for (let i = 0; i < 10; i++) {
    rowsHtml += '<tr>';
    columns.forEach(col => {
      rowsHtml += `<td>-</td>`;
    });
    rowsHtml += '</tr>';
  }

  return `<table class="listing-table"><thead>${headerHtml}</thead><tbody>${rowsHtml}</tbody></table>`;
}

/**
 * Render abbreviations to HTML
 */
function renderAbbreviationsToHTML(text: string): string {
  return `<dl class="abbreviations">${text}</dl>`;
}

/**
 * Render chart info to HTML
 */
function renderChartInfoToHTML(chartContent: any): string {
  const xAxis = chartContent.xAxis as IAxisConfig;
  const yAxis = chartContent.yAxis as IAxisConfig;
  const series = chartContent.series as IChartSeries[] || [];

  return `
    <div style="font-size: 9pt; margin-top: 10px; color: #666;">
      <p>X-Axis: ${xAxis?.label || 'N/A'}</p>
      <p>Y-Axis: ${yAxis?.label || 'N/A'}</p>
      <p>Series: ${series.map(s => s.label).join(', ')}</p>
    </div>
  `;
}

/**
 * Get cell display value
 */
function getCellDisplayValue(row: IBodyRow, columnIndex: number): string {
  // Mock implementation - in real system, this would look up actual data
  const methodType = row.boundMethod?.methodType;
  if (methodType === 'n') return '0';
  if (methodType === 'n_percent') return '0 (0.0)';
  if (methodType === 'mean' && row.boundMethod?.decimalPlaces) return `-`;
  if (methodType === 'sd') return `-`;
  if (methodType === 'median') return `-`;
  if (methodType === 'min') return `-`;
  if (methodType === 'max') return `-`;

  return '-';
}

/**
 * Generate Word document from ARS document
 */
export function generateWordDocument(document: IARSDocument): Blob {
  const html = generateHTMLDocument(document);
  const blob = new Blob([html], { type: 'application/msword' });
  return blob;
}

/**
 * Download HTML as Word document
 */
export function downloadAsWord(document: IARSDocument, filename?: string): void {
  const blob = generateWordDocument(document);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${document.studyInfo?.studyId || 'document'}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

// ==================== RTF Export ====================

/**
 * Generate RTF document from ARS document
 */
export function generateRTFDocument(document: IARSDocument): string {
  const studyInfo = document.studyInfo;
  const displays = document.displays || [];

  let rtf = '{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1033';
  rtf += '{\\fonttbl{\\f0\\fnil\\fcharset0 Arial;}}';
  rtf += '{\\colortbl;\\red0\\green0\\blue0;}\\pard\\qc';
  rtf += '{\\f0\\fs32\\b ' + (studyInfo?.studyTitle || 'Clinical Study Report') + '}\\par\\par';
  rtf += '\\fs20\\b0 ' + (studyInfo?.studyId || 'N/A') + '\\par';
  rtf += '\\par\\pard\\ql';

  // Render each display
  displays.forEach((display, index) => {
    rtf += renderDisplayToRTF(display, index + 1);
  });

  rtf += '}';

  return rtf;
}

/**
 * Render a single display to RTF
 */
function renderDisplayToRTF(display: IDisplay, index: number): string {
  let rtf = '';

  const titleText = display.displayTitle || display.name || '';
  const titleSection = display.displaySections.find(s => s.type === 'Title');
  const bodySection = display.displaySections.find(s => s.type === 'Body');

  if (display.displayType === 'table') {
    rtf += '\\par\\pard\\qc\\b\\fs24 ' + index + '. ' + titleText + '\\par\\pard\\ql\\b0';
    rtf += '\\par';

    // Simple table structure
    rtf += '{\\trowd\\trgaph50\\trleft-50\\trrh200';
    rtf += '\\cellx1000\\cellx4000\\cellx7000\\cellx10000';
    rtf += '\\intbl\\b Parameter\\cell';
    rtf += '\\intbl\\b Treatment 1\\cell';
    rtf += '\\intbl\\b Treatment 2\\cell';
    rtf += '\\intbl\\b Treatment 3\\cell\\row';

    if (bodySection && 'rows' in bodySection.content) {
      bodySection.content.rows.forEach(row => {
        const indent = '\\tab ' + Math.min(row.indentLevel, 4);
        rtf += '{\\trowd\\trgaph50\\trleft-50\\trrh150';
        rtf += '\\cellx1000\\cellx4000\\cellx7000\\cellx10000';
        rtf += '\\intbl' + indent + row.label + '\\cell';
        for (let i = 0; i < 3; i++) {
          rtf += '\\intbl ' + getCellDisplayValue(row, i) + '\\cell';
        }
        rtf += '\\row';
      });
    }
  } else if (display.displayType === 'figure') {
    rtf += '\\par\\pard\\qc\\b\\fs24 Figure ' + index + '. ' + titleText + '\\par\\pard\\ql\\b0';
    rtf += '\\par\\pard\\qc [Figure content]\\par\\pard\\ql';
  } else if (display.displayType === 'listing') {
    rtf += '\\par\\pard\\qc\\b\\fs24 Listing ' + index + '. ' + titleText + '\\par\\pard\\ql\\b0';
    rtf += '\\par [Listing content]';
  }

  return rtf;
}

/**
 * Download RTF document
 */
export function downloadAsRTF(document: IARSDocument, filename?: string): void {
  const rtf = generateRTFDocument(document);
  const blob = new Blob([rtf], { type: 'application/rtf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${document.studyInfo?.studyId || 'document'}.rtf`;
  a.click();
  URL.revokeObjectURL(url);
}

// ==================== PDF Export ====================

/**
 * Generate PDF from HTML (requires print)
 */
export function generatePDFDocument(document: IARSDocument): void {
  const html = generateHTMLDocument(document);
  const printWindow = window.open('', '_blank');

  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}

/**
 * Download as PDF (uses browser print)
 */
export function downloadAsPDF(document: IARSDocument, filename?: string): void {
  generatePDFDocument(document);
}

// ==================== Excel Export ====================

/**
 * Generate Excel-compatible HTML document
 */
export function generateExcelDocument(document: IARSDocument): string {
  const studyInfo = document.studyInfo;
  const displays = document.displays || [];

  let excel = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${studyInfo?.studyTitle || 'TFL Document'}</title>
  <style>
    table {
      border-collapse: collapse;
    }
    td, th {
      border: 1px solid #000;
      padding: 4px;
    }
    th {
      background-color: #ddd;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <h1>${studyInfo?.studyTitle || 'Clinical Study Report'}</h1>
  <p>Study ID: ${studyInfo?.studyId || 'N/A'}</p>
  <p>Phase: ${(studyInfo?.phase || []).join(', ')}</p>
  <hr/>
`;

  // Add a worksheet for each display
  displays.forEach((display, index) => {
    excel += `<h2>${display.name}</h2>`;

    if (display.displayType === 'table') {
      const bodySection = display.displaySections.find(s => s.type === 'Body');
      if (bodySection && 'rows' in bodySection.content) {
        excel += renderTableToExcel(bodySection.content.rows);
      }
    }
  });

  excel += '</body></html>';
  return excel;
}

/**
 * Render table to Excel format
 */
function renderTableToExcel(rows: IBodyRow[]): string {
  let excel = '<table>';

  // Header row
  excel += '<tr><th>Parameter</th><th>Treatment 1</th><th>Treatment 2</th><th>Treatment 3</th></tr>';

  // Data rows
  rows.forEach(row => {
    excel += '<tr>';
    excel += `<td>${'&nbsp;'.repeat(row.indentLevel * 2)}${row.label}</td>`;
    for (let i = 0; i < 3; i++) {
      excel += `<td>${getCellDisplayValue(row, i)}</td>`;
    }
    excel += '</tr>';
  });

  excel += '</table>';
  return excel;
}

/**
 * Download Excel document
 */
export function downloadAsExcel(document: IARSDocument, filename?: string): void {
  const html = generateExcelDocument(document);
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${document.studyInfo?.studyId || 'document'}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

// ==================== Export All Displays ====================

/**
 * Export single display
 */
export function exportDisplay(
  display: IDisplay,
  format: 'word' | 'rtf' | 'pdf' | 'excel',
  filename?: string
): void {
  const document: IARSDocument = {
    id: 'temp',
    studyInfo: {},
    analysis: {},
    outputs: [],
    displays: [display],
    groupings: [],
    methods: [],
    globalParameters: [],
    headerStyle: {},
  };

  switch (format) {
    case 'word':
      downloadAsWord(document, filename);
      break;
    case 'rtf':
      downloadAsRTF(document, filename);
      break;
    case 'pdf':
      downloadAsPDF(document, filename);
      break;
    case 'excel':
      downloadAsExcel(document, filename);
      break;
  }
}

/**
 * Export specific table data to CSV
 */
export function exportTableToCSV(
  rows: IBodyRow[],
  filename?: string
): void {
  const headers = ['Parameter', 'Treatment 1', 'Treatment 2', 'Treatment 3'];
  const csvRows = [headers.join(',')];

  rows.forEach(row => {
    const indent = '  '.repeat(row.indentLevel);
    const rowData = [indent + row.label];
    for (let i = 0; i < 3; i++) {
      rowData.push(getCellDisplayValue(row, i));
    }
    csvRows.push(rowData.join(','));
  });

  const csv = csvRows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'table.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export specific listing to CSV
 */
export function exportListingToCSV(
  columns: IListingColumn[],
  data: any[],
  filename?: string
): void {
  const headers = columns.filter(c => c.visible).map(c => c.label || c.variable);
  const csvRows = [headers.join(',')];

  data.forEach(row => {
    const rowData = columns.filter(c => c.visible).map(c =>
      `"${row[c.variable] || ''}"`
    );
    csvRows.push(rowData.join(','));
  });

  const csv = csvRows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'listing.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export figure as image
 */
export function exportFigureAsPNG(
  chartElement: HTMLElement,
  filename?: string
): void {
  // In a real implementation, this would use html2canvas or similar
  // For now, just a placeholder
  console.log('Exporting figure as PNG:', filename);
}

/**
 * Export figure as SVG
 */
export function exportFigureAsSVG(
  chartElement: HTMLElement,
  filename?: string
): void {
  // In a real implementation with Plotly.js, use Plotly.downloadImage
  console.log('Exporting figure as SVG:', filename);
}
