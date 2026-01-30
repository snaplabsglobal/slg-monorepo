/**
 * 日期工具库 - 修复时区问题（DATE_TIMEZONE_FIX.md）
 * 核心：直接用字符串操作，不要 new Date() 做显示，避免 UTC→本地导致少一天。
 */

/**
 * 提取日期部分（忽略时区）
 * "2025-04-02T00:00:00.000Z" → "2025-04-02"
 */
function getDatePart(dateStr: string | Date | null | undefined): string {
  if (dateStr == null) return '';
  if (typeof dateStr === 'string') return dateStr.trim().substring(0, 10);
  if (dateStr instanceof Date && !Number.isNaN(dateStr.getTime())) return dateStr.toISOString().slice(0, 10);
  return '';
}

/**
 * 格式化日期显示（忽略时区）
 * 输入: "2025-04-02T00:00:00.000Z"
 * 输出: "2025/04/02"
 */
export function formatDate(dateStr: string | Date | null | undefined): string {
  const part = getDatePart(dateStr);
  if (!part) return '';
  return part.replace(/-/g, '/');
}

/**
 * 格式化为 YYYY-MM-DD（给 input[type="date"] 用）
 */
export function formatDateForInput(dateStr: string | Date | null | undefined): string {
  return getDatePart(dateStr);
}

/**
 * 格式化为本地化显示（中文）
 * 输入: "2025-04-02"
 * 输出: "2025年4月2日"
 */
export function formatDateChinese(dateStr: string | null | undefined): string {
  const part = getDatePart(dateStr);
  if (!part) return '';
  const [y, m, d] = part.split('-');
  return `${y}年${parseInt(m, 10)}月${parseInt(d, 10)}日`;
}

/**
 * 解析日期字符串（避免时区问题）
 * 输入: "2025-04-02"
 * 输出: Date 对象（本地时间零点）
 */
export function parseDate(dateStr: string | null | undefined): Date {
  const part = getDatePart(dateStr);
  if (!part) return new Date();
  const [year, month, day] = part.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * 比较两个日期（只比较日期部分，忽略时间）
 */
export function isSameDate(date1: string | null | undefined, date2: string | null | undefined): boolean {
  return getDatePart(date1) === getDatePart(date2);
}

/**
 * 获取今天的日期字符串 YYYY-MM-DD
 */
export function getTodayString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
