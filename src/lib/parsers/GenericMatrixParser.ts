/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GenericMatrixParser.ts — 通用 DOM 矩阵教务解析引擎
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 核心战略：
 *   1. 智能定位课表真身 (Target Table Localization)
 *   2. 二维矩阵降维打击 (2D Grid Construction)
 *   3. 数据清洗与组装   (Data Extraction & Mapping)
 *
 * 设计原则：极致容错，任何异常只返回空数组，绝不崩溃。
 */

import type { ParsedCourse } from '../parseSchedule';

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

export interface Course {
  id: string;
  name: string;
  teacher?: string;
  location?: string;
  weeks: number[];
  dayOfWeek: number;
  startNode: number;
  nodeCount: number;
  color?: string;
}

/** 矩阵单元格 */
interface MatrixCell {
  /** 单元格原始 HTML 内容 */
  html: string;
  /** 纯文本 */
  text: string;
  /** 该单元格的 rowSpan（仅主单元格） */
  rowSpan: number;
  /** 该单元格的 colSpan（仅主单元格） */
  colSpan: number;
  /** 是否被 rowSpan/colSpan 占位 */
  placeholder: boolean;
}

// ─── 颜色池 ──────────────────────────────────────────────────────────────────

const COLOR_POOL = [
  '#6d23f9', '#2196F3', '#4CAF50', '#FF9800', '#E91E63',
  '#00BCD4', '#8BC34A', '#FFC107', '#F44336', '#3F51B5',
  '#009688', '#9C27B0', '#795548', '#607D8B', '#FF5722',
];

// ─── 星期关键词映射 ───────────────────────────────────────────────────────────

const DAY_KEYWORDS: Record<string, number> = {
  '星期一': 1, '周一': 1, 'Mon': 1,
  '星期二': 2, '周二': 2, 'Tue': 2,
  '星期三': 3, '周三': 3, 'Wed': 3,
  '星期四': 4, '周四': 4, 'Thu': 4,
  '星期五': 5, '周五': 5, 'Fri': 5,
  '星期六': 6, '周六': 6, 'Sat': 6,
  '星期日': 7, '星期天': 7, '周日': 7, 'Sun': 7,
};

// ═════════════════════════════════════════════════════════════════════════════
// 战略一：智能定位课表真身
// ═════════════════════════════════════════════════════════════════════════════

/**
 * 在文档中智能定位真正的课表 <table>。
 * 策略：文本特征校验 → 兜底取 td 最多的表格。
 */
export function findTimetable(doc: Document): HTMLTableElement | null {
  try {
    const tables = Array.from(doc.querySelectorAll('table'));
    if (tables.length === 0) return null;

    const featureKeywords = [
      '星期一', '星期二', '星期三', '星期四', '星期五',
      '周一', '周二', '周三', '周四', '周五',
    ];

    // 策略 A：文本特征校验 — 包含至少 3 个星期关键词
    for (const table of tables) {
      const text = table.textContent || '';
      let matchCount = 0;
      for (const kw of featureKeywords) {
        if (text.includes(kw)) matchCount++;
      }
      if (matchCount >= 3) return table;
    }

    // 策略 B：兜底 — 返回 <td> 最多的表格
    let best: HTMLTableElement | null = null;
    let maxTds = 0;
    for (const table of tables) {
      const count = table.querySelectorAll('td').length;
      if (count > maxTds) {
        maxTds = count;
        best = table;
      }
    }
    return maxTds >= 10 ? best : null;
  } catch (e) {
    console.error('[GenericMatrixParser] findTimetable error:', e);
    return null;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 战略二：二维矩阵降维打击
// ═════════════════════════════════════════════════════════════════════════════

/**
 * 将 <table> 展开为真实的二维矩阵，正确处理 rowSpan / colSpan 占位。
 */
export function buildMatrix(table: HTMLTableElement): MatrixCell[][] {
  try {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return [];

    // 预扫描确定矩阵尺寸
    const numRows = rows.length;
    let numCols = 0;
    for (const row of rows) {
      let count = 0;
      row.querySelectorAll('td, th').forEach(cell => {
        count += (cell as HTMLTableCellElement).colSpan || 1;
      });
      if (count > numCols) numCols = count;
    }
    if (numCols === 0) return [];

    // 初始化空矩阵
    const matrix: MatrixCell[][] = Array.from({ length: numRows }, () =>
      Array.from({ length: numCols }, () => ({
        html: '', text: '', rowSpan: 1, colSpan: 1, placeholder: false,
      }))
    );

    // 填充矩阵
    for (let r = 0; r < numRows; r++) {
      const cells = Array.from(rows[r].querySelectorAll('td, th'));
      let col = 0;

      for (const cell of cells) {
        const td = cell as HTMLTableCellElement;

        // 跳过已被占位的列
        while (col < numCols && matrix[r][col].placeholder) {
          col++;
        }
        if (col >= numCols) break;

        const rs = Math.max(td.rowSpan || 1, 1);
        const cs = Math.max(td.colSpan || 1, 1);

        // 获取内容：将 <br> 替换为换行
        const clone = td.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
        const text = (clone.textContent || '').trim();
        const html = td.innerHTML || '';

        // 主单元格
        matrix[r][col] = { html, text, rowSpan: rs, colSpan: cs, placeholder: false };

        // 标记 rowSpan / colSpan 占位
        for (let dr = 0; dr < rs && (r + dr) < numRows; dr++) {
          for (let dc = 0; dc < cs && (col + dc) < numCols; dc++) {
            if (dr === 0 && dc === 0) continue; // 主单元格已设
            matrix[r + dr][col + dc] = {
              html, text, rowSpan: rs, colSpan: cs, placeholder: true,
            };
          }
        }

        col += cs;
      }
    }

    return matrix;
  } catch (e) {
    console.error('[GenericMatrixParser] buildMatrix error:', e);
    return [];
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 战略三：数据清洗与组装
// ═════════════════════════════════════════════════════════════════════════════

/**
 * 解析周数字符串，支持多种格式：
 *  - "1-16周"        → [1..16]
 *  - "1,3,5,7周"     → [1,3,5,7]
 *  - "2-10周(双)"    → [2,4,6,8,10]
 *  - "1-9周(单)"     → [1,3,5,7,9]
 *  - "1-8周,10-16周" → [1..8, 10..16]
 *  - "1-3,5,7-9周"   → [1,2,3,5,7,8,9]
 */
export function parseWeeks(str: string): number[] {
  if (!str || !str.trim()) return [];
  try {
    const results = new Set<number>();

    // 标准化
    let s = str.replace(/\s+/g, '').replace(/（/g, '(').replace(/）/g, ')');

    // 按逗号或顿号分割多段（但保留 "X-Y" 内的连字符）
    // 先按中文逗号、英文逗号拆分大段
    const segments = s.split(/[,，]/);

    for (const seg of segments) {
      // 检测单双周标记
      const isOdd = /\(单\)|单周|奇/.test(seg);
      const isEven = /\(双\)|双周|偶/.test(seg);

      // 提取所有 "数字-数字" 或 "单独数字" 模式
      const rangeRegex = /(\d+)\s*[-–—~]\s*(\d+)/g;
      const singleRegex = /(\d+)/g;

      let match: RegExpExecArray | null;
      const rangeMatches: Array<[number, number]> = [];

      // 先提取范围
      const cleaned = seg.replace(/周.*$/, '').replace(/\(.*?\)/, '');
      while ((match = rangeRegex.exec(cleaned)) !== null) {
        rangeMatches.push([parseInt(match[1], 10), parseInt(match[2], 10)]);
      }

      if (rangeMatches.length > 0) {
        for (const [start, end] of rangeMatches) {
          for (let i = start; i <= end && i <= 30; i++) {
            if (isOdd && i % 2 === 0) continue;
            if (isEven && i % 2 === 1) continue;
            results.add(i);
          }
        }
      } else {
        // 没有范围，提取单独数字
        while ((match = singleRegex.exec(cleaned)) !== null) {
          const n = parseInt(match[1], 10);
          if (n >= 1 && n <= 30) results.add(n);
        }
      }
    }

    return Array.from(results).sort((a, b) => a - b);
  } catch (e) {
    console.error('[GenericMatrixParser] parseWeeks error:', e);
    return [];
  }
}

/**
 * 将周数数组格式化为紧凑字符串，如 [1,2,3,5,7,8] → "1-3,5,7-8"
 */
function weeksToString(weeks: number[]): string {
  if (weeks.length === 0) return '';
  const sorted = Array.from(new Set(weeks)).sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0], end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(',');
}

// ─── 课程信息提取正则 ────────────────────────────────────────────────────────

const WEEKS_REGEX = /(\d[\d,，\-–—~]+周(?:\([单双奇偶]\))?|[单双奇偶]周|\d+-\d+(?:\([单双奇偶]\))?)/;
const LOCATION_REGEX = /([A-Za-z0-9\u4e00-\u9fa5]*(?:楼|教室|实验室|机房|馆|中心|堂|院|场|厅|教|室|栋|区)[A-Za-z0-9\u4e00-\u9fa5\-]*|[A-Z]?\d{3,5}[A-Za-z]?|主教\d+|[东西南北]?\d+(?:号)?教?\d+)/;
const TEACHER_REGEX = /^[\u4e00-\u9fa5]{2,4}$/;

interface ExtractedInfo {
  name: string;
  teacher: string;
  location: string;
  weeksStr: string;
}

/**
 * 从单元格文本/HTML中提取课程信息。
 * 一个单元格可能包含多门课（用 <br><br> 或 "-----" 分隔）。
 */
function extractCourseInfos(text: string, html: string): ExtractedInfo[] {
  try {
    if (!text || text.trim().length === 0) return [];

    // 尝试按 <br> 分隔的多门课 — 先按双换行或分隔线拆分
    const blocks = html
      .split(/<br\s*\/?>\s*<br\s*\/?>/gi)
      .map(b => {
        const tmp = document.createElement('div');
        tmp.innerHTML = b;
        return (tmp.textContent || '').trim();
      })
      .filter(b => b.length > 0);

    // 如果 HTML 拆分无效，回退到文本按多换行拆分
    const courseBlocks = blocks.length > 1
      ? blocks
      : text.split(/\n{2,}|[-—]{3,}/).filter(b => b.trim().length > 0);

    const results: ExtractedInfo[] = [];

    for (const block of courseBlocks) {
      const lines = block.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) continue;

      let name = '';
      let teacher = '';
      let location = '';
      let weeksStr = '';

      for (const line of lines) {
        // 跳过纯数字行（课次侧边栏）
        if (/^\d{1,2}$/.test(line)) continue;
        // 跳过时间段标记
        if (/^(上午|下午|晚上|午间)$/.test(line)) continue;

        if (!weeksStr && WEEKS_REGEX.test(line)) {
          const m = line.match(WEEKS_REGEX);
          if (m) weeksStr = m[0];
          // 周次行可能同时包含地点，继续检测
        }

        if (!location && LOCATION_REGEX.test(line)) {
          const m = line.match(LOCATION_REGEX);
          if (m) location = m[0].trim();
        }

        if (!teacher && TEACHER_REGEX.test(line)) {
          teacher = line;
          continue;
        }

        // 课程名通常是第一行有意义的中文文本
        if (!name && /[\u4e00-\u9fa5]/.test(line) && line.length >= 2) {
          // 排除明显是周次或地点的行
          if (!WEEKS_REGEX.test(line) || line.length > 15) {
            name = line.replace(/[★◇●○☆◆■□▲△▽▼※]$/, '').trim();
          }
        }
      }

      if (name) {
        results.push({ name, teacher, location, weeksStr });
      }
    }

    return results;
  } catch (e) {
    console.error('[GenericMatrixParser] extractCourseInfos error:', e);
    return [];
  }
}

// ─── 表头分析 ────────────────────────────────────────────────────────────────

interface HeaderInfo {
  dayColMap: Record<number, number>; // colIndex → dayOfWeek (1-7)
  dataStartRow: number;             // 数据起始行
  periodColIndex: number;           // 节次列索引 (-1 if none)
}

function analyzeMatrixHeader(matrix: MatrixCell[][]): HeaderInfo {
  const info: HeaderInfo = { dayColMap: {}, dataStartRow: 1, periodColIndex: -1 };

  try {
    // 扫描前 4 行寻找星期表头
    const scanRows = Math.min(matrix.length, 4);
    for (let r = 0; r < scanRows; r++) {
      let found = 0;
      for (let c = 0; c < matrix[r].length; c++) {
        const text = matrix[r][c].text;
        if (matrix[r][c].placeholder) continue;

        // 检测节次列
        if (/节次|时间|课次|时段/.test(text)) {
          info.periodColIndex = c;
        }

        for (const [kw, day] of Object.entries(DAY_KEYWORDS)) {
          if (text.includes(kw)) {
            info.dayColMap[c] = day;
            found++;
            break;
          }
        }
      }

      if (found >= 3) {
        info.dataStartRow = r + 1;
        break;
      }
    }

    // 默认映射：假设第0列为节次，第1-7列为周一到周日
    if (Object.keys(info.dayColMap).length === 0 && matrix[0]?.length >= 6) {
      const offset = matrix[0].length >= 8 ? 1 : 0;
      for (let i = 0; i < 7 && (i + offset) < matrix[0].length; i++) {
        info.dayColMap[i + offset] = i + 1;
      }
      info.periodColIndex = offset > 0 ? 0 : -1;
    }
  } catch (e) {
    console.error('[GenericMatrixParser] analyzeMatrixHeader error:', e);
  }

  return info;
}

// ─── 推断节次 ────────────────────────────────────────────────────────────────

function inferPeriodForRow(matrix: MatrixCell[][], row: number, periodCol: number): number {
  try {
    if (periodCol >= 0 && row < matrix.length) {
      const text = matrix[row][periodCol]?.text || '';
      const m = text.match(/(\d+)/);
      if (m) return parseInt(m[1], 10);
    }
  } catch { /* ignore */ }
  return -1;
}

// ═════════════════════════════════════════════════════════════════════════════
// 主入口
// ═════════════════════════════════════════════════════════════════════════════

/**
 * 通用教务 HTML 解析入口。
 * 返回 ParsedCourse[] 以兼容现有导入管线。
 */
export function genericMatrixParse(htmlString: string): ParsedCourse[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const table = findTimetable(doc);
    if (!table) {
      console.warn('[GenericMatrixParser] 未找到课表 <table>');
      return [];
    }

    const matrix = buildMatrix(table);
    if (matrix.length === 0) {
      console.warn('[GenericMatrixParser] 矩阵构建失败');
      return [];
    }

    const header = analyzeMatrixHeader(matrix);
    if (Object.keys(header.dayColMap).length === 0) {
      console.warn('[GenericMatrixParser] 无法识别星期表头');
      return [];
    }

    const courses: ParsedCourse[] = [];
    const seen = new Set<string>();

    // 构建行 → 节次映射
    const rowPeriodMap: number[] = [];
    let currentPeriod = 1;
    for (let r = header.dataStartRow; r < matrix.length; r++) {
      const inferred = inferPeriodForRow(matrix, r, header.periodColIndex);
      if (inferred > 0) currentPeriod = inferred;
      rowPeriodMap[r] = currentPeriod;
      currentPeriod++;
    }

    // 遍历数据区域
    for (let r = header.dataStartRow; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        const cell = matrix[r][c];

        // 跳过占位单元格和空单元格
        if (cell.placeholder) continue;
        if (!cell.text || cell.text.trim().length === 0) continue;

        // 跳过非课程列（节次列、时间段标记列）
        const dayOfWeek = header.dayColMap[c];
        if (!dayOfWeek) continue;

        // 跳过纯数字（节次数字）或时间段标记
        const trimmed = cell.text.replace(/\s+/g, '');
        if (/^\d{1,2}$/.test(trimmed)) continue;
        if (/^(上午|下午|晚上|午间|第.{1,2}节)$/.test(trimmed)) continue;

        const periodStart = rowPeriodMap[r] || (r - header.dataStartRow + 1);
        const nodeCount = cell.rowSpan || 1;
        const periodEnd = periodStart + nodeCount - 1;

        // 提取课程信息
        const infos = extractCourseInfos(cell.text, cell.html);

        for (const info of infos) {
          const dedupeKey = `${info.name}|${dayOfWeek}|${periodStart}|${periodEnd}|${info.weeksStr}`;
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);

          courses.push({
            name: info.name,
            teacher: info.teacher,
            location: info.location,
            weeks: info.weeksStr || '',
            day: dayOfWeek,
            periodStart,
            periodEnd,
          });
        }
      }
    }

    return courses;
  } catch (e) {
    console.error('[GenericMatrixParser] 解析失败:', e);
    return [];
  }
}

/**
 * 解析并输出为 Course[] 格式（带 id、weeks 数组、颜色等）。
 */
export function genericMatrixParseToCourses(htmlString: string): Course[] {
  try {
    const parsed = genericMatrixParse(htmlString);
    let colorIdx = 0;
    const nameColorMap = new Map<string, string>();

    return parsed.map(p => {
      // 同名课程使用同一颜色
      if (!nameColorMap.has(p.name)) {
        nameColorMap.set(p.name, COLOR_POOL[colorIdx % COLOR_POOL.length]);
        colorIdx++;
      }

      const weeks = parseWeeks(p.weeks);

      return {
        id: crypto.randomUUID(),
        name: p.name,
        teacher: p.teacher || undefined,
        location: p.location || undefined,
        weeks: weeks.length > 0 ? weeks : Array.from({ length: 16 }, (_, i) => i + 1),
        dayOfWeek: p.day,
        startNode: p.periodStart,
        nodeCount: p.periodEnd - p.periodStart + 1,
        color: nameColorMap.get(p.name),
      };
    });
  } catch (e) {
    console.error('[GenericMatrixParser] parseToCourses error:', e);
    return [];
  }
}

// ─── 工具函数导出 ────────────────────────────────────────────────────────────

export { weeksToString };
