/**
 * TFL Designer - 导出工具
 * 支持 Word (.docx), RTF, PDF 格式
 */

import type { TableShell, TreatmentArmSet } from '../types'

// 导出配置
export interface ExportOptions {
  format: 'word' | 'rtf' | 'pdf'
  pageSize: 'A4' | 'Letter'
  orientation: 'portrait' | 'landscape'
  margins: {
    top: number
    bottom: number
    left: number
    right: number
  }
  includePageNumbers: boolean
  fontSize: number
  fontFamily: string
}

const defaultOptions: ExportOptions = {
  format: 'word',
  pageSize: 'A4',
  orientation: 'portrait',
  margins: { top: 25, bottom: 25, left: 20, right: 20 },
  includePageNumbers: true,
  fontSize: 10,
  fontFamily: 'Courier New',
}

// ============ Table 导出 ============

/**
 * 将表格导出为文本格式 (用于 Word/RTF 嵌入)
 */
export function tableToText(
  table: TableShell,
  treatmentArmSet?: TreatmentArmSet,
  _options: Partial<ExportOptions> = {}
): string {
  const lines: string[] = []

  // 标题
  lines.push(`${table.shellNumber}`)
  lines.push(`${table.title}`)
  lines.push(`Population: ${table.population}`)
  lines.push('')

  // 列头
  const headerLine = buildHeaderLine(table, treatmentArmSet)
  lines.push(headerLine)
  lines.push('─'.repeat(headerLine.length))

  // 数据行
  table.rows.forEach(row => {
    const rowLine = buildRowLine(row, treatmentArmSet)
    lines.push(rowLine)
  })

  // 底部分隔线
  lines.push('─'.repeat(headerLine.length))

  // 页脚
  if (table.footer) {
    if (table.footer.source) {
      lines.push(`Source: ${table.footer.source}`)
    }
    if (table.footer.notes) {
      table.footer.notes.forEach(note => lines.push(note))
    }
  }

  return lines.join('\n')
}

function buildHeaderLine(_table: TableShell, treatmentArmSet?: TreatmentArmSet): string {
  const parts: string[] = ['                                    '] // 第一列占位
  
  if (treatmentArmSet?.arms) {
    treatmentArmSet.arms.forEach(arm => {
      parts.push(`${arm.name} (N=${arm.N || 'XX'})`.padEnd(15))
    })
  } else {
    parts.push('Placebo (N=XX)'.padEnd(15))
    parts.push('Treatment (N=XX)'.padEnd(15))
  }
  
  return parts.join('')
}

function buildRowLine(
  row: { label: string; level: number; stats?: { type: string }[] },
  treatmentArmSet?: TreatmentArmSet
): string {
  const indent = '  '.repeat(row.level)
  const label = row.label.trimStart()
  
  // 根据统计类型生成占位值
  let value = 'XX.XX'
  if (row.stats?.some(s => s.type === 'n_percent')) {
    value = 'XX (XX.X%)'
  } else if (row.stats?.some(s => s.type === 'header')) {
    value = ''
  } else if (row.stats?.some(s => s.type === 'n')) {
    value = 'XX'
  }

  const parts: string[] = [(indent + label).padEnd(36)]
  
  const armCount = treatmentArmSet?.arms?.length || 2
  for (let i = 0; i < armCount; i++) {
    parts.push(value.padEnd(15))
  }
  
  return parts.join('')
}

// ============ Word 文档生成 ============

/**
 * 生成 Word 文档 (简化版，实际需要 docx.js)
 */
export async function generateWordDocument(
  tables: TableShell[],
  _treatmentArmSets: Map<string, TreatmentArmSet>,
  options: Partial<ExportOptions> = {}
): Promise<Blob> {
  const opts = { ...defaultOptions, ...options }
  
  // 生成 HTML 内容 (Word 可以打开 HTML)
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { 
      font-family: ${opts.fontFamily}; 
      font-size: ${opts.fontSize}pt;
      margin: ${opts.margins.top}mm ${opts.margins.right}mm ${opts.margins.bottom}mm ${opts.margins.left}mm;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    td, th { border: 1px solid #000; padding: 4px 8px; text-align: center; }
    th { background-color: #f0f0f0; font-weight: bold; }
    .label { text-align: left; }
    .indent-1 { padding-left: 20px; }
    .indent-2 { padding-left: 40px; }
    h1 { font-size: 14pt; text-align: center; }
    h2 { font-size: 12pt; text-align: center; }
    .footer { font-size: 9pt; margin-top: 10px; }
    .page-break { page-break-after: always; }
  </style>
</head>
<body>
`

  tables.forEach((table, index) => {
    html += generateTableHTML(table, _treatmentArmSets.get(table.treatmentArmSetId))
    if (index < tables.length - 1) {
      html += '<div class="page-break"></div>'
    }
  })

  html += '</body></html>'

  return new Blob([html], { type: 'application/msword' })
}

function generateTableHTML(table: TableShell, treatmentArmSet?: TreatmentArmSet): string {
  const arms = treatmentArmSet?.arms || [
    { id: 'col1', name: 'Placebo', N: 'XX' },
    { id: 'col2', name: 'Treatment', N: 'XX' },
  ]

  let html = `
<h1>${table.shellNumber}</h1>
<h2>${table.title}</h2>
<p style="text-align: center;">Population: ${table.population}</p>
<table>
  <thead>
    <tr>
      <th class="label" style="width: 40%;"></th>
      ${arms.map(arm => `<th>${arm.name}<br>(N=${arm.N || 'XX'})</th>`).join('')}
    </tr>
  </thead>
  <tbody>
`

  table.rows.forEach(row => {
    const indentClass = row.level > 0 ? `indent-${row.level}` : ''
    const fontWeight = row.level === 0 ? 'font-weight: bold;' : ''
    
    html += `
    <tr>
      <td class="label ${indentClass}" style="${fontWeight}">${row.label.trimStart()}</td>
      ${arms.map(() => `<td>${generatePlaceholderValue(row.stats)}</td>`).join('')}
    </tr>`
  })

  html += `
  </tbody>
</table>
`

  if (table.footer) {
    html += '<div class="footer">'
    if (table.footer.source) {
      html += `<p>Source: ${table.footer.source}</p>`
    }
    if (table.footer.notes) {
      table.footer.notes.forEach(note => {
        html += `<p>${note}</p>`
      })
    }
    html += '</div>'
  }

  return html
}

function generatePlaceholderValue(stats?: { type: string }[]): string {
  if (!stats || stats.length === 0) return '-'
  
  const types = stats.map(s => s.type)
  
  if (types.includes('header')) return ''
  if (types.includes('n_percent')) return 'XX (XX.X%)'
  if (types.includes('n') && types.includes('percent')) return 'XX (XX.X%)'
  if (types.includes('n')) return 'XX'
  if (types.includes('mean') && types.includes('sd')) return 'XX.XX (XX.XX)'
  if (types.includes('mean')) return 'XX.XX'
  if (types.includes('median')) return 'XX.XX'
  if (types.includes('range')) return '(XX.XX, XX.XX)'
  
  return 'XX.XX'
}

// ============ PDF 生成 ============

/**
 * 生成 PDF 文档 (简化版，实际需要 pdfmake/jsPDF)
 */
export async function generatePDFDocument(
  tables: TableShell[],
  treatmentArmSets: Map<string, TreatmentArmSet>,
  options: Partial<ExportOptions> = {}
): Promise<Blob> {
  // 使用 HTML 转 PDF 的简化方案
  const opts = { ...defaultOptions, ...options }
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { 
      size: ${opts.pageSize} ${opts.orientation};
      margin: ${opts.margins.top}mm ${opts.margins.right}mm ${opts.margins.bottom}mm ${opts.margins.left}mm;
    }
    body { 
      font-family: ${opts.fontFamily}; 
      font-size: ${opts.fontSize}pt;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    td, th { border: 1px solid #000; padding: 4px 8px; text-align: center; }
    th { background-color: #f0f0f0; }
    .label { text-align: left; }
  </style>
</head>
<body>
`

  tables.forEach(table => {
    html += generateTableHTML(table, treatmentArmSets.get(table.treatmentArmSetId))
  })

  html += '</body></html>'

  return new Blob([html], { type: 'text/html' })
}

// ============ 文件下载 ============

export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ============ RTF 生成 ============

/**
 * 生成 RTF 文档
 */
export function generateRTFDocument(
  tables: TableShell[],
  treatmentArmSets: Map<string, TreatmentArmSet>,
  options: Partial<ExportOptions> = {}
): string {
  const opts = { ...defaultOptions, ...options }
  
  let rtf = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0\\fmodern ${opts.fontFamily};}}
{\\colortbl;\\red0\\green0\\blue0;\\red128\\green128\\blue128;}
\\viewkind4\\uc1\\pard\\f0\\fs${opts.fontSize * 2}
`

  tables.forEach((table, index) => {
    rtf += generateTableRTF(table, treatmentArmSets.get(table.treatmentArmSetId))
    if (index < tables.length - 1) {
      rtf += '\\page'
    }
  })

  rtf += '}'
  return rtf
}

function generateTableRTF(table: TableShell, treatmentArmSet?: TreatmentArmSet): string {
  const arms = treatmentArmSet?.arms || [
    { id: 'col1', name: 'Placebo', N: 'XX' },
    { id: 'col2', name: 'Treatment', N: 'XX' },
  ]

  let rtf = ''
  
  // 标题
  rtf += `\\qc\\b ${escapeRTF(table.shellNumber)}\\b0\\par\n`
  rtf += `\\qc ${escapeRTF(table.title)}\\par\n`
  rtf += `\\qc Population: ${escapeRTF(table.population)}\\par\n`
  rtf += '\\par\n'

  // 表格
  rtf += '\\trowd\\trgaph100\n'
  
  // 列定义
  const colWidth = 2000
  rtf += `\\cellx${colWidth}` // 第一列
  arms.forEach((_, i) => {
    rtf += `\\cellx${colWidth + (i + 1) * 2000}`
  })
  rtf += '\n'

  // 表头行
  rtf += '\\intbl \\qc \\b \\cell\n'
  arms.forEach(arm => {
    rtf += `\\qc ${escapeRTF(arm.name)} (N=${arm.N || 'XX'})\\cell\n`
  })
  rtf += '\\row\n'

  // 数据行
  table.rows.forEach(row => {
    const prefix = row.level > 0 ? '  '.repeat(row.level) : ''
    rtf += row.level === 0 ? '\\intbl \\b ' : '\\intbl '
    rtf += escapeRTF(prefix + row.label.trimStart()) + '\\cell\n'
    
    arms.forEach(() => {
      rtf += `\\qc ${generatePlaceholderValue(row.stats)}\\cell\n`
    })
    rtf += '\\row\n'
  })

  // 页脚
  if (table.footer?.source) {
    rtf += `\\par\\ql Source: ${escapeRTF(table.footer.source)}\n`
  }
  if (table.footer?.notes) {
    table.footer.notes.forEach(note => {
      rtf += `\\ql ${escapeRTF(note)}\\par\n`
    })
  }

  rtf += '\\par\n'
  return rtf
}

function escapeRTF(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\n/g, '\\par\n')
}