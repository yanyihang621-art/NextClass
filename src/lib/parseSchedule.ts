/**
 * ═══════════════════════════════════════════════════════════════════════════
 * parseSchedule.ts — 课表 HTML 解析统一入口
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 架构：
 *   1. Fast-path：北化大正方系统专有解析器（通过 td id="day-period" 精准定位）
 *   2. Fallback ：通用 DOM 矩阵引擎（GenericMatrixParser — 二维降维打击）
 *
 * 外部消费者只需调用 smartParseSchedule() 即可，内部自动路由。
 */

import { findTimetable, genericMatrixParse } from './parsers/GenericMatrixParser';

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

// ─── 主入口 ─────────────────────────────────────────────────────────────────

/**
 * 解析课表 HTML 源码，返回标准化课程数组。
 *
 * 策略 A（Fast-path）：利用正方 td id 属性精准解析（北化大等）
 * 策略 B（Fallback） ：通用 DOM 矩阵引擎
 */
export function parseScheduleData(htmlString: string): ParsedCourse[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    // 定位课表主体 <table>（使用通用引擎的定位函数）
    const table = findTimetable(doc);
    if (!table) {
      console.warn('[parseSchedule] 未找到课表主体 <table>');
      return [];
    }

    // ── 策略 A：正方系统 Fast-path（td id="day-period"） ──
    const idBasedResult = parseByTdId(table);
    if (idBasedResult.length > 0) {
      console.log(`[parseSchedule] Fast-path 命中，解析到 ${idBasedResult.length} 条课程`);
      return deduplicateCourses(idBasedResult);
    }

    // ── 策略 B：通用矩阵引擎 Fallback ──
    console.log('[parseSchedule] Fast-path 未命中，切换到通用矩阵引擎');
    const genericResult = genericMatrixParse(htmlString);
    return deduplicateCourses(genericResult);
  } catch (e) {
    console.error('[parseSchedule] 解析异常:', e);
    return [];
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// Fast-path：北化大正方系统专有解析器
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

// ─── Fast-path 辅助函数 ──────────────────────────────────────────────────────

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
 * 备选：当 tooltip 解析不可用时，使用纯文本模式解析（仅用于 Fast-path 内部）
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

// ═════════════════════════════════════════════════════════════════════════════
// 自动识别教务系统类型
// ═════════════════════════════════════════════════════════════════════════════

/**
 * 通过分析 HTML 内容中的特征字符串，自动判断教务系统类型。
 *
 * 识别规则：
 *   - kbgrid_table / timetable_con / timetable1 → zhengfang (正方)
 *   - eams / tableList_tab / course-table → qiangzhi (强智)
 *   - kingosoft / jwglxt / jw_main → kingosoft (金智)
 *   - 未识别 → generic (通用兜底)
 */
export function detectSystemType(html: string): string {
  const lower = html.toLowerCase();

  // ── 正方教务系统特征 ──
  if (
    /kbgrid[_\-]?table/i.test(html) ||
    /class\s*=\s*["'][^"']*timetable_con/i.test(html) ||
    /class\s*=\s*["'][^"']*timetable1/i.test(html) ||
    /id\s*=\s*["']\d+-\d+["']/i.test(html)  // td id="1-1" 格式
  ) {
    console.log('[detectSystemType] Detected: zhengfang');
    return 'zhengfang';
  }

  // ── 强智教务系统特征 ──
  if (
    lower.includes('eams') ||
    lower.includes('tablelist_tab') ||
    lower.includes('course-table') ||
    lower.includes('/eams/') ||
    lower.includes('kingo')
  ) {
    console.log('[detectSystemType] Detected: qiangzhi');
    return 'qiangzhi';
  }

  // ── 金智教务系统特征 ──
  if (
    lower.includes('kingosoft') ||
    lower.includes('jwglxt') ||
    lower.includes('jw_main')
  ) {
    console.log('[detectSystemType] Detected: kingosoft');
    return 'kingosoft';
  }

  console.log('[detectSystemType] No match, falling back to generic');
  return 'generic';
}

// ═════════════════════════════════════════════════════════════════════════════
// 智能解析入口（统一对外 API）
// ═════════════════════════════════════════════════════════════════════════════

/**
 * 智能解析入口：所有教务系统统一入口。
 *
 * 流程：
 *   1. 先尝试 parseScheduleData（内含正方 Fast-path + 通用矩阵 Fallback）
 *   2. 无论 systemType 为何值，最终都走同一条路径
 *      （旧的 qiangzhi/kingosoft 占位解析器已被通用矩阵引擎取代）
 */
export function smartParseSchedule(
  input: string,
  systemType: string = 'auto'
): ParsedCourse[] {
  try {
    const trimmed = input.trim();

    const isFullPage = /<!doctype|<html|<head|<body/i.test(trimmed);
    const hasTable = /<table[\s>]/i.test(trimmed);

    if (!isFullPage && !hasTable) {
      console.warn('[parseSchedule] 输入不像有效的 HTML 内容');
      return [];
    }

    // 自动识别（仅用于日志，不再影响路由）
    if (systemType === 'auto') {
      detectSystemType(trimmed);
    }

    // 统一走 parseScheduleData：Fast-path 优先，Fallback 通用矩阵引擎
    const result = parseScheduleData(trimmed);

    if (result.length === 0 && isFullPage) {
      console.warn(
        '[parseSchedule] 完整页面中未找到课表数据。\n' +
        '正方系统 V9.0 的课表通过 AJAX 动态加载，"查看源代码" 中不含课表。\n' +
        '请改为：在已加载课表的页面按 F12 → 选择 #table1 元素 → 右键 "Copy outerHTML"'
      );
    }

    return result;
  } catch (e) {
    console.error('[parseSchedule] smartParseSchedule 异常:', e);
    return [];
  }
}
