/**
 * ═══════════════════════════════════════════════════════════════════════════
 * parseSchedule.ts — 正方教务系统课表 HTML 源码解析器（北化大适配版）
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 功能：将正方教务系统（含北京化工大学等变体）的课表页面 HTML 源码，
 *       解析为标准化的 ParsedCourse[] 数组。
 *
 * 适配重点：
 *   1. td 的 id 属性格式为 "day-period"（如 "1-1" = 星期一第1节）
 *   2. 每个 td 内可能有多个 <div class="timetable_con"> 块
 *   3. 课程名从 <span class="title"> 提取
 *   4. 周次、地点、教师等通过 glyphicon 图标的父级 tooltip 识别
 *   5. rowspan 控制连排课跨度
 */

// ─── 类型定义 ───────────────────────────────────────────────────────────────

/** 解析器输出的课程数据（与 CourseContext.Course 对应，但不含 id/color 等运行时字段） */
export interface ParsedCourse {
  name: string;        // 课程名称
  teacher: string;     // 教师姓名
  location: string;    // 上课地点
  weeks: string;       // 周次描述，如 "1-16周" / "1-8周(双)"
  day: number;         // 星期几 (1=周一 ... 7=周日)
  periodStart: number; // 起始节次
  periodEnd: number;   // 结束节次
}

/** 虚拟网格中每个单元格的占位信息 */
interface GridCell {
  occupied: boolean;
  /** 原始 <td> 元素引用（仅主单元格持有） */
  element?: HTMLTableCellElement;
  /** rowspan 的值（仅主单元格持有） */
  rowSpan?: number;
}

// ─── 主入口 ─────────────────────────────────────────────────────────────────

/**
 * 解析课表 HTML 源码，返回标准化课程数组
 */
export function parseScheduleData(
  htmlString: string,
  _systemType: string = 'zhengfang'
): ParsedCourse[] {
  const courses: ParsedCourse[] = [];

  // ── Step 1: 使用 DOMParser 解析 HTML ──────────────────────────────────
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // ── Step 2: 定位课表主体 <table> ──────────────────────────────────────
  const table = findScheduleTable(doc);
  if (!table) {
    console.warn('[parseSchedule] 未找到课表主体 <table>');
    return courses;
  }

  // ── Step 3: 尝试两种策略 ──────────────────────────────────────────────

  // 策略 A：利用 td id 属性（北化大格式，id="day-period"）
  const idBasedResult = parseByTdId(table);
  if (idBasedResult.length > 0) {
    return deduplicateCourses(idBasedResult);
  }

  // 策略 B：基于虚拟网格的通用解析（兜底）
  const gridBasedResult = parseByVirtualGrid(table);
  return deduplicateCourses(gridBasedResult);
}

// ═════════════════════════════════════════════════════════════════════════════
// 策略 A：基于 td id 属性的解析（北化大 / 新版正方系统）
// ═════════════════════════════════════════════════════════════════════════════

/**
 * 北化大正方系统中，每个课程单元格的 id 格式为 "day-period"，
 * 例如 id="1-1" 表示周一第1节，id="3-3" 表示周三第3节。
 * rowspan 表示该课占几个节次。
 * 每个 td 内可有多个 <div class="timetable_con"> 块，
 * 代表同一时段不同周次的课（或相同课不同阶段的安排）。
 */
function parseByTdId(table: HTMLTableElement): ParsedCourse[] {
  const courses: ParsedCourse[] = [];

  // 查找所有带 id 且格式为 "day-period" 的 td
  const courseCells = table.querySelectorAll('td[id]');

  for (const cell of Array.from(courseCells)) {
    const td = cell as HTMLTableCellElement;
    const idStr = td.getAttribute('id') || '';

    // id 格式: "day-period"，例如 "1-1", "2-3", "5-7"
    const idMatch = idStr.match(/^(\d+)-(\d+)$/);
    if (!idMatch) continue;

    const day = parseInt(idMatch[1], 10);
    const periodStart = parseInt(idMatch[2], 10);
    const rowSpan = td.rowSpan || 1;
    const periodEnd = periodStart + rowSpan - 1;

    // 查找该 td 内所有的 timetable_con 块
    const courseBlocks = td.querySelectorAll('.timetable_con');

    if (courseBlocks.length === 0) continue; // 空单元格

    for (const block of Array.from(courseBlocks)) {
      const parsed = parseTimetableConBlock(
        block as HTMLElement,
        day,
        periodStart,
        periodEnd
      );
      if (parsed) {
        courses.push(parsed);
      }
    }
  }

  return courses;
}

/**
 * 解析一个 <div class="timetable_con"> 块
 *
 * 块内结构示例：
 *   <span class="title"><font color="blue">课程名★</font></span>
 *   <p><span title="节/周">...<font>  (1-2节)1-8周</font></p>
 *   <p><span title="上课地点">...<font>  北区  二教C阶-102</font></p>
 *   <p><span title="教师 ">...<font>  教师名</font></p>
 *   ... 后续为教学班、考核方式等（我们不需要）
 */
function parseTimetableConBlock(
  block: HTMLElement,
  day: number,
  periodStart: number,
  periodEnd: number
): ParsedCourse | null {
  // ── 提取课程名 ────────────────────────────────────────────────────────
  let name = '';
  const titleEl = block.querySelector('.title');
  if (titleEl) {
    name = cleanText(titleEl.textContent || '');
  }
  if (!name) {
    // 备选：取块内第一行有意义的文本
    name = cleanText(block.textContent?.split('\n')[0] || '');
  }
  if (!name) return null;

  // 移除课程名后的课程类型标记 ★◇●○
  name = name.replace(/[★◇●○☆◆■□▲△▽▼※]$/, '').trim();

  // ── 通过 tooltip title 属性提取字段 ───────────────────────────────────
  let weeks = '';
  let location = '';
  let teacher = '';

  const paragraphs = block.querySelectorAll('p');
  for (const p of Array.from(paragraphs)) {
    const tooltip = p.querySelector('span[data-toggle="tooltip"]');
    const tooltipTitle = tooltip?.getAttribute('title')?.trim() || '';

    // 获取该段落的文本内容（从 font 元素或直接文本）
    let fieldText = '';
    const fonts = p.querySelectorAll('font');
    if (fonts.length > 0) {
      // 取最后一个 font 的文本（tooltip 对应的 font 通常是图标，实际值在后面的 font）
      fieldText = cleanText(Array.from(fonts).map(f => f.textContent || '').join(''));
    } else {
      fieldText = cleanText(p.textContent || '');
    }

    if (tooltipTitle.includes('节/周') || tooltipTitle.includes('节\\周')) {
      // 周次/节次信息，如 "(1-2节)1-8周" 或 "(3-5节)1-17周"
      weeks = extractWeeks(fieldText);
    } else if (tooltipTitle.includes('上课地点') || tooltipTitle.includes('地点')) {
      location = fieldText.trim();
    } else if (tooltipTitle.includes('教师')) {
      teacher = fieldText.trim();
    }
    // 教学班名称、考核方式、学分等不提取
  }

  // ── 如果 tooltip 解析没有结果，尝试用文本模式 fallback ──────────────
  if (!weeks && !location && !teacher) {
    const fallback = parseCourseBlockByText(block, day, periodStart, periodEnd);
    if (fallback) return fallback;
  }

  // ── 从周次字段中提取覆盖节次（如果有） ────────────────────────────────
  // 某些情况下，周次字段中的 "(3-5节)" 可能与位置推算的节次不一致
  // 我们优先使用 td 的 rowspan 推算的节次（因为更可靠），但记录原始信息
  let actualPeriodStart = periodStart;
  let actualPeriodEnd = periodEnd;

  // 尝试从节/周文本中提取节次，如 "(7-8节)14周"
  const allText = block.textContent || '';
  const periodInText = allText.match(/\((\d+)-(\d+)节\)/);
  if (periodInText) {
    const textStart = parseInt(periodInText[1], 10);
    const textEnd = parseInt(periodInText[2], 10);
    // 如果文本中的节次范围与 rowspan 推算一致或更合理，使用文本值
    if (textStart >= 1 && textEnd >= textStart && textEnd <= 13) {
      actualPeriodStart = textStart;
      actualPeriodEnd = textEnd;
    }
  }

  return {
    name,
    teacher,
    location,
    weeks: weeks || '',
    day,
    periodStart: actualPeriodStart,
    periodEnd: actualPeriodEnd,
  };
}

/**
 * 从节/周文本中提取周次信息
 * 输入示例: "(1-2节)1-8周" / "(3-5节)1-17周" / "(3-4节)1-3周,5-17周" / "(3-4节)4周"
 * 输出: "1-8周" / "1-17周" / "1-3周,5-17周" / "4周"
 */
function extractWeeks(text: string): string {
  // 移除节次部分 "(X-Y节)"，保留周次部分
  let cleaned = text.replace(/\(\d+-?\d*节\)\s*/, '').trim();

  // 如果清理后为空，尝试直接提取周次正则
  if (!cleaned) {
    const weekMatch = text.match(
      /(\d[\d,\-周（）\(\)单双奇偶]+)/
    );
    if (weekMatch) cleaned = weekMatch[0];
  }

  return cleaned;
}

/**
 * 备选：当 tooltip 解析不可用时，使用纯文本模式解析
 */
function parseCourseBlockByText(
  block: HTMLElement,
  day: number,
  periodStart: number,
  periodEnd: number
): ParsedCourse | null {
  const text = (block.textContent || '').trim();
  if (!text) return null;

  const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return null;

  let name = '';
  let teacher = '';
  let location = '';
  let weeks = '';

  const weeksRegex = /(\d[\d,\-]+周(?:\([单双奇偶]\))?|[单双奇偶]周)/;
  const locationRegex = /([A-Za-z0-9\u4e00-\u9fa5]*(?:楼|教室|实验室|机房|馆|中心|堂|院|场|厅|教)[A-Za-z0-9\u4e00-\u9fa5\-]*)/;
  const teacherRegex = /^[\u4e00-\u9fa5]{2,5}$/;

  for (const line of lines) {
    if (!name && /[\u4e00-\u9fa5]/.test(line) && line.length >= 2) {
      name = line.replace(/[★◇●○☆◆■□▲△▽▼※]$/, '').trim();
    } else if (weeksRegex.test(line) && !weeks) {
      const m = line.match(weeksRegex);
      if (m) weeks = m[0];
    } else if (locationRegex.test(line) && !location) {
      location = line.trim();
    } else if (teacherRegex.test(line) && !teacher) {
      teacher = line;
    }
  }

  if (!name) return null;

  return { name, teacher, location, weeks, day, periodStart, periodEnd };
}

// ═════════════════════════════════════════════════════════════════════════════
// 策略 B：基于虚拟网格的通用解析（兜底方案）
// ═════════════════════════════════════════════════════════════════════════════

function parseByVirtualGrid(table: HTMLTableElement): ParsedCourse[] {
  const courses: ParsedCourse[] = [];
  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length < 2) return courses;

  const { dayColumnMap, dataStartRow } = analyzeHeader(rows);
  if (Object.keys(dayColumnMap).length === 0) return courses;

  const dataRows = rows.slice(dataStartRow);

  // 过滤掉包含 "其它课程" 的尾行
  const filteredRows = dataRows.filter(tr => {
    const text = tr.textContent || '';
    return !text.includes('其它课程');
  });

  // 计算最大列数
  const maxCols = Math.max(
    ...rows.map(row => {
      let count = 0;
      row.querySelectorAll('td, th').forEach(cell => {
        count += (cell as HTMLTableCellElement).colSpan || 1;
      });
      return count;
    })
  );

  // 虚拟网格
  const grid: GridCell[][] = Array.from({ length: filteredRows.length }, () =>
    Array.from({ length: maxCols }, () => ({ occupied: false }))
  );

  // 节次计数器：跟踪每行对应的实际节次
  // 因为"上午"/"下午"/"晚上"的 rowspan 会占一列，需要正确映射
  let currentPeriod = 1;
  const rowToPeriod: number[] = [];

  for (let rowIdx = 0; rowIdx < filteredRows.length; rowIdx++) {
    const tr = filteredRows[rowIdx];
    // 检查是否有 "festival" 类的节次指示（如 <span class="festival">1</span>）
    const festivalEl = tr.querySelector('.festival');
    if (festivalEl) {
      const periodNum = parseInt(festivalEl.textContent || '', 10);
      if (!isNaN(periodNum)) {
        currentPeriod = periodNum;
      }
    }
    rowToPeriod[rowIdx] = currentPeriod;
    currentPeriod++;
  }

  // 遍历填充虚拟网格
  for (let rowIdx = 0; rowIdx < filteredRows.length; rowIdx++) {
    const tr = filteredRows[rowIdx];
    const cells = Array.from(tr.querySelectorAll('td, th'));
    let gridCol = 0;

    for (const cell of cells) {
      const td = cell as HTMLTableCellElement;

      while (gridCol < maxCols && grid[rowIdx][gridCol].occupied) {
        gridCol++;
      }
      if (gridCol >= maxCols) break;

      const colSpan = td.colSpan || 1;
      const rowSpan = td.rowSpan || 1;

      for (let r = 0; r < rowSpan && (rowIdx + r) < filteredRows.length; r++) {
        for (let c = 0; c < colSpan && (gridCol + c) < maxCols; c++) {
          grid[rowIdx + r][gridCol + c] = {
            occupied: true,
            element: (r === 0 && c === 0) ? td : undefined,
            rowSpan: (r === 0 && c === 0) ? rowSpan : undefined,
          };
        }
      }

      // 解析单元格
      const dayOfWeek = dayColumnMap[gridCol];
      if (!dayOfWeek) {
        gridCol += colSpan;
        continue;
      }

      // 检查是否有 timetable_con 块
      const courseBlocks = td.querySelectorAll('.timetable_con');
      if (courseBlocks.length > 0) {
        const pStart = rowToPeriod[rowIdx] || (rowIdx + 1);
        const pEnd = pStart + rowSpan - 1;

        for (const block of Array.from(courseBlocks)) {
          const parsed = parseTimetableConBlock(
            block as HTMLElement,
            dayOfWeek,
            pStart,
            pEnd
          );
          if (parsed) courses.push(parsed);
        }
      } else {
        // 纯文本解析
        const textContent = getCellText(td);
        if (!isEmptyCell(textContent)) {
          const pStart = rowToPeriod[rowIdx] || (rowIdx + 1);
          const pEnd = pStart + rowSpan - 1;
          const fallback = parseCourseBlockByText(td, dayOfWeek, pStart, pEnd);
          if (fallback) courses.push(fallback);
        }
      }

      gridCol += colSpan;
    }
  }

  return courses;
}

// ─── 辅助函数 ───────────────────────────────────────────────────────────────

/**
 * 在文档中查找包含课表数据的主 <table>
 */
function findScheduleTable(doc: Document): HTMLTableElement | null {
  const tables = Array.from(doc.querySelectorAll('table'));

  // 策略 1：通过 id 匹配（北化大 kbgrid_table_0）
  const kbTable = doc.querySelector('table[id^="kbgrid"]') as HTMLTableElement;
  if (kbTable) return kbTable;

  // 策略 2：包含"星期"关键字的表格
  const dayKeywords = ['星期一', '星期二', '星期三', '星期四', '星期五', '周一', '周二', '周三'];
  for (const table of tables) {
    const headerText = table.textContent || '';
    const matchCount = dayKeywords.filter(kw => headerText.includes(kw)).length;
    if (matchCount >= 3) {
      return table;
    }
  }

  // 策略 3：通过常见 id/class 定位
  const idPatterns = ['kbtable', 'kblist', 'kebiao', 'table1', 'timetable'];
  for (const pattern of idPatterns) {
    const found = doc.querySelector(`table[id*="${pattern}"], table[class*="${pattern}"]`) as HTMLTableElement;
    if (found) return found;
  }

  // 策略 4：找行列最多的表格
  let bestTable: HTMLTableElement | null = null;
  let maxCells = 0;
  for (const table of tables) {
    const cellCount = table.querySelectorAll('td').length;
    if (cellCount > maxCells) {
      maxCells = cellCount;
      bestTable = table;
    }
  }

  return maxCells >= 20 ? bestTable : null;
}

/**
 * 分析表头行，建立"虚拟网格列号 → 星期几"的映射
 */
function analyzeHeader(rows: HTMLTableRowElement[]): {
  dayColumnMap: Record<number, number>;
  dataStartRow: number;
  timeColumnIndex: number;
} {
  const dayColumnMap: Record<number, number> = {};
  let dataStartRow = 1;
  let timeColumnIndex = 0;

  const dayKeywordMap: Record<string, number> = {
    '星期一': 1, '周一': 1, 'Mon': 1, 'Monday': 1,
    '星期二': 2, '周二': 2, 'Tue': 2, 'Tuesday': 2,
    '星期三': 3, '周三': 3, 'Wed': 3, 'Wednesday': 3,
    '星期四': 4, '周四': 4, 'Thu': 4, 'Thursday': 4,
    '星期五': 5, '周五': 5, 'Fri': 5, 'Friday': 5,
    '星期六': 6, '周六': 6, 'Sat': 6, 'Saturday': 6,
    '星期日': 7, '星期天': 7, '周日': 7, 'Sun': 7, 'Sunday': 7,
  };

  for (let rowIdx = 0; rowIdx < Math.min(rows.length, 5); rowIdx++) {
    const row = rows[rowIdx];
    const cells = Array.from(row.querySelectorAll('td, th'));
    let gridCol = 0;

    for (const cell of cells) {
      const td = cell as HTMLTableCellElement;
      const text = (td.textContent || '').trim();
      const colSpan = td.colSpan || 1;

      // 跳过整行合并的标题行
      if (colSpan >= 7) {
        gridCol += colSpan;
        continue;
      }

      for (const [keyword, dayNum] of Object.entries(dayKeywordMap)) {
        if (text.includes(keyword)) {
          for (let c = 0; c < colSpan; c++) {
            dayColumnMap[gridCol + c] = dayNum;
          }
          break;
        }
      }

      if (/节次|时间|课次|时间段/.test(text)) {
        timeColumnIndex = gridCol;
      }

      gridCol += colSpan;
    }

    if (Object.keys(dayColumnMap).length >= 5) {
      dataStartRow = rowIdx + 1;
      break;
    }
  }

  // 默认映射
  if (Object.keys(dayColumnMap).length === 0) {
    console.warn('[parseSchedule] 使用默认列映射 (col 2-8 → 周一~日)');
    for (let i = 2; i <= 8; i++) {
      dayColumnMap[i] = i - 1;
    }
  }

  return { dayColumnMap, dataStartRow, timeColumnIndex };
}

/**
 * 清理文本：去除多余空白和特殊字符
 */
function cleanText(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')  // &nbsp;
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 获取 <td> 的文本内容，将 <br> 替换为换行符
 */
function getCellText(td: HTMLTableCellElement): string {
  const clone = td.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('br').forEach(br => {
    br.replaceWith('\n');
  });
  return clone.textContent || '';
}

/**
 * 判断单元格是否为空白
 */
function isEmptyCell(text: string): boolean {
  const cleaned = text
    .replace(/\u00a0/g, '')
    .replace(/\s/g, '')
    .replace(/[-—]/g, '');
  return cleaned.length === 0;
}

/**
 * 去重：相同课程相同时段只保留一条
 */
function deduplicateCourses(courses: ParsedCourse[]): ParsedCourse[] {
  const seen = new Set<string>();
  return courses.filter(c => {
    const key = `${c.name}|${c.day}|${c.periodStart}|${c.periodEnd}|${c.weeks}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── 对外入口 ───────────────────────────────────────────────────────────────

/**
 * 解析 HTML 片段（如从开发者工具复制的 outerHTML）
 */
export function parseScheduleFragment(htmlFragment: string): ParsedCourse[] {
  const wrappedHtml = `<!DOCTYPE html><html><body>${htmlFragment}</body></html>`;
  return parseScheduleData(wrappedHtml);
}

/**
 * 智能解析入口：自动判断输入类型并选择解析策略
 */
export function smartParseSchedule(
  input: string,
  systemType: string = 'zhengfang'
): ParsedCourse[] {
  const trimmed = input.trim();

  const isFullPage = /<!doctype|<html|<head|<body/i.test(trimmed);
  const hasTable = /<table[\s>]/i.test(trimmed);

  if (isFullPage || hasTable) {
    const result = parseScheduleData(trimmed, systemType);
    if (result.length === 0 && isFullPage) {
      console.warn(
        '[parseSchedule] 完整页面中未找到课表数据。\n' +
        '正方系统 V9.0 的课表通过 AJAX 动态加载，"查看源代码" 中不含课表。\n' +
        '请改为：在已加载课表的页面按 F12 → 选择 #table1 元素 → 右键 "Copy outerHTML"'
      );
    }
    return result;
  }

  console.warn('[parseSchedule] 输入不像有效的 HTML 内容');
  return [];
}
