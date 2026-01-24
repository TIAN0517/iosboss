// ========================================
// 休假表解析服務
// ========================================

import { db } from './db';

// ========================================
// 類型定義
// ========================================

export interface ParsedSchedule {
  year: number;
  month: number;
  title: string;
  rawText: string;
  stations: StationSchedule[];
  createdAt: Date;
}

export interface StationSchedule {
  stationName: string;
  employees: EmployeeSchedule[];
}

export interface EmployeeSchedule {
  employeeName: string;
  dates: DateInfo[];
}

export interface DateInfo {
  date: Date;         // 實際日期
  displayDate: string; // 顯示格式 (如：12/12)
  isHalfDay: boolean;
  isMorning: boolean;  // 半天時標記：true=上午, false=下午
  note?: string;
}

// ========================================
// 休假表識別
// ========================================

/**
 * 檢測是否為休假表格式
 */
export function detectScheduleSheet(text: string): boolean {
  // 檢測關鍵詞
  const keywords = [
    /休假表|休假日|排班|值勤/,
    /\d{2,3}\s*年\s*\d{1,2}\s*月/,  // 114年12月
    /^\w+站\s*$/m,               // 站點名稱
    /\d{1,2}\/\d{1,2}/,           // 日期格式 12/12
  ];

  let matchCount = 0;
  for (const regex of keywords) {
    if (regex.test(text)) {
      matchCount++;
    }
  }

  // 至少匹配 2 個關鍵詞才認為是休假表
  return matchCount >= 2;
}

/**
 * 解析休假表
 */
export function parseScheduleSheet(text: string): ParsedSchedule | null {
  if (!detectScheduleSheet(text)) {
    return null;
  }

  // 解析年份和月份
  const { year, month } = parseYearMonth(text);
  if (!year || !month) {
    return null;
  }

  // 分割成各個站點
  const sections = splitByStation(text);

  // 解析每個站點的休假資料
  const stations: StationSchedule[] = [];
  for (const section of sections) {
    const stationSchedule = parseStationSection(section, year, month);
    if (stationSchedule) {
      stations.push(stationSchedule);
    }
  }

  // 生成標題
  const title = `${year}年${month}月休假表`;

  return {
    year,
    month,
    title,
    rawText: text,
    stations,
    createdAt: new Date(),
  };
}

// ========================================
// 內部解析函數
// ========================================

/**
 * 解析年份和月份
 * 支援格式：
 * - 114年12月
 * - 民國114年12月
 * - 2024年12月
 */
function parseYearMonth(text: string): { year: number | null, month: number | null } {
  // 民國年轉換
  const currentYear = new Date().getFullYear();
  const currentROCYear = currentYear - 1911;

  // 匹配各種年份格式
  const patterns = [
    /(\d{3,4})\s*年\s*(\d{1,2})\s*月/,  // 114年12月, 2024年12月
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);

      // 如果年份 < 200，假設是民國年
      if (year < 200) {
        year += 1911;
      }

      return { year, month };
    }
  }

  // 如果沒有找到，嘗試從 "114年" 推算（假設是當前或下一年）
  const rocYearMatch = text.match(/(\d{3})\s*年/);
  if (rocYearMatch) {
    const year = parseInt(rocYearMatch[1], 10) + 1911;
    return { year, month: null };
  }

  return { year: null, month: null };
}

/**
 * 按站點分割文本
 */
function splitByStation(text: string): string[] {
  const lines = text.split('\n').map((line) => line.trim()).filter((line) => line);

  const sections: string[] = [];
  let currentSection: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 檢測是否為站點標題（如：吉安站、美崙站）
    if (/^\w+站\s*$/.test(line) || /^[\u4e00-\u9fa5]+站\s*$/.test(line)) {
      // 保存之前的 section
      if (currentSection.length > 0) {
        sections.push(currentSection.join('\n'));
      }
      // 開始新 section
      currentSection = [line];
    } else if (line) {
      // 添加到當前 section
      currentSection.push(line);
    }
  }

  // 添加最後一個 section
  if (currentSection.length > 0) {
    sections.push(currentSection.join('\n'));
  }

  return sections;
}

/**
 * 解析單個站點區塊
 */
function parseStationSection(section: string, year: number, month: number): StationSchedule | null {
  const lines = section.split('\n').map((line) => line.trim()).filter((line) => line);

  if (lines.length === 0) {
    return null;
  }

  // 第一行應該是站點名稱
  const stationName = lines[0].replace(/站\s*$/, '');
  if (!stationName) {
    return null;
  }

  // 解析員工休假資料（處理跨行）
  const employees: EmployeeSchedule[] = [];
  let currentEmployee: EmployeeSchedule | null = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || /^\d{2,3}\s*年/.test(line)) {
      continue; // 跳過標題行
    }

    // 檢查這行是否以員工名稱開頭
    const hasName = /^[^\d]+/.test(line);

    if (hasName) {
      // 保存之前的員工
      if (currentEmployee) {
        employees.push(currentEmployee);
      }
      // 解析新的員工
      currentEmployee = parseEmployeeLine(line, year, month);
    } else if (currentEmployee) {
      // 這行沒有員工名稱，可能是上一個員工的日期延續
      // 直接解析這行的日期
      const datePattern = /(\d{1,2})\/(\d{1,2})/g;
      let match;

      while ((match = datePattern.exec(line)) !== null) {
        const day = parseInt(match[1], 10);
        const dateObj = new Date(year, month - 1, day);

        currentEmployee.dates.push({
          date: dateObj,
          displayDate: match[0],
          isHalfDay: false,
          isMorning: false,
        });
      }
    }
  }

  // 保存最後一個員工
  if (currentEmployee) {
    employees.push(currentEmployee);
  }

  return {
    stationName,
    employees,
  };
}

/**
 * 解析員工休假行
 * 支援格式：
 * - 阿銘 12/12、12/19、12/26、12/30
 * - 阿樂12/7 半天（上午）12/10、12/16 12/23
 * - 阿樂12/7 半天（上午）
 *   12/10 12/16 12/23 12/28 (跨行)
 * - 小魏12/2、12/3、12/15、12/29
 * - 美美 12/6、12/7、12/13、12/27（半天）
 * - 劭宇 12/28、 他 12/28
 */
function parseEmployeeLine(line: string, year: number, month: number): EmployeeSchedule | null {
  // 清理文本：移除特殊字符和多余空格
  const cleanLine = line.replace(/、/g, ' ').replace(/\s+/g, ' ').trim();

  // 匹配員工名稱（開頭到第一個數字前）
  const nameMatch = cleanLine.match(/^([^\d]+)/);
  if (!nameMatch) {
    return null;
  }

  let employeeName = nameMatch[1].trim();
  let remainingText = cleanLine.substring(employeeName.length).trim();

  // 處理特殊情況：如果名字以"他"結尾，可能是"阿毛"的OCR錯誤
  if (employeeName === '他') {
    employeeName = '阿毛';
  }

  if (!remainingText) {
    return null;
  }

  // 解析日期
  const dates: DateInfo[] = [];

  // 先匹配所有可能的日期和半天標記
  // 模式：日期，然后可选地跟着"半天"和"上午/下午"
  const datePattern = /(\d{1,2})\/(\d{1,2})/g;
  const halfDayPattern = /半天?\s*(?:（?\(?(上午|下午)\)?）?)/g;

  let match;
  const dateMatches: Array<{index: number, day: number, str: string}> = [];

  // 收集所有日期匹配
  while ((match = datePattern.exec(remainingText)) !== null) {
    dateMatches.push({
      index: match.index,
      day: parseInt(match[1], 10),
      str: match[0],
    });
  }

  // 检查每个日期后面是否有半天标记
  let lastHalfDayInfo: {isHalfDay: boolean, isMorning: boolean} | null = null;

  // 先扫描整个文本的半天标记
  const halfDayMatches: Array<{index: number, isMorning: boolean}> = [];
  let hdMatch;
  // 重置正则表达式的 lastIndex
  halfDayPattern.lastIndex = 0;
  while ((hdMatch = halfDayPattern.exec(remainingText)) !== null) {
    halfDayMatches.push({
      index: hdMatch.index,
      isMorning: hdMatch[1] === '上午',
    });
  }

  // 为每个日期分配半天标记
  for (let i = 0; i < dateMatches.length; i++) {
    const dateMatch = dateMatches[i];
    let isHalfDay = false;
    let isMorning = false;

    // 检查这个日期后面（到下一个日期前）是否有半天标记
    const nextDateIndex = i < dateMatches.length - 1 ? dateMatches[i + 1].index : remainingText.length;
    const searchRange = remainingText.slice(dateMatch.index, nextDateIndex);

    if (searchRange.includes('半天')) {
      isHalfDay = true;
      isMorning = searchRange.includes('上午');
    }

    const dateObj = new Date(year, month - 1, dateMatch.day);

    dates.push({
      date: dateObj,
      displayDate: dateMatch.str,
      isHalfDay,
      isMorning,
      note: isHalfDay ? (isMorning ? '上午半天' : '下午半天') : undefined,
    });
  }

  if (dates.length === 0) {
    return null;
  }

  return {
    employeeName,
    dates,
  };
}

// ========================================
// 資料庫操作
// ========================================

/**
 * 保存解析的休假表
 */
export async function saveScheduleSheet(parsed: ParsedSchedule) {
  // 創建休假表記錄
  const schedule = await db.scheduleSheet.create({
    data: {
      year: parsed.year,
      month: parsed.month,
      title: parsed.title,
      rawText: parsed.rawText,
      status: 'pending',
    },
  });

  // 保存各站點的休假資料
  for (const station of parsed.stations) {
    const dbStation = await db.scheduleStation.create({
      data: {
        sheetId: schedule.id,
        stationName: station.stationName,
      },
    });

    // 保存員工休假資料
    for (const employee of station.employees) {
      for (const dateInfo of employee.dates) {
        await db.employeeSchedule.create({
          data: {
            stationId: dbStation.id,
            employeeName: employee.employeeName,
            scheduleDate: dateInfo.date,
            displayDate: dateInfo.displayDate,
            isHalfDay: dateInfo.isHalfDay,
            isMorning: dateInfo.isMorning,
            note: dateInfo.note,
          },
        });
      }
    }
  }

  return schedule;
}

/**
 * 獲取休假摘要
 */
export async function getScheduleSummary(sheetId: string) {
  const schedule = await db.scheduleSheet.findUnique({
    where: { id: sheetId },
    include: {
      stations: {
        include: {
          employees: {
            orderBy: { scheduleDate: 'asc' },
          },
        },
      },
    },
  });

  if (!schedule) {
    return null;
  }

  // 計算統計
  const summary = {
    totalDays: 0,
    totalEmployees: 0,
    byStation: [] as Array<{
      stationName: string;
      employeeCount: number;
      dayCount: number;
    }>,
  };

  for (const station of schedule.stations) {
    const employeeNames = new Set<string>();
    const days = new Set<string>();

    for (const employee of station.employees) {
      employeeNames.add(employee.employeeName);
      days.add(employee.displayDate);
    }

    summary.totalEmployees += employeeNames.size;
    summary.totalDays += days.size;

    summary.byStation.push({
      stationName: station.stationName,
      employeeCount: employeeNames.size,
      dayCount: days.size,
    });
  }

  return { schedule, summary };
}

/**
 * 格式化休假表為可讀文本
 */
export function formatScheduleSheet(sheetId: string): string {
  return db.scheduleSheet
    .findUnique({
      where: { id: sheetId },
      include: {
        stations: {
          include: {
            employees: {
            orderBy: { scheduleDate: 'asc' },
          },
        },
      },
    },
    })
    .then((schedule) => {
      if (!schedule) {
        return '';
      }

      let text = `${schedule.title}\n\n`;

      for (const station of schedule.stations) {
        text += `${station.stationName}站\n`;

        // 按員工分組
        const employeesByStaff = new Map<string, typeof station.employees>();
        for (const emp of station.employees) {
          if (!employeesByStaff.has(emp.employeeName)) {
            employeesByStaff.set(emp.employeeName, []);
          }
          employeesByStaff.get(emp.employeeName)!.push(emp);
        }

        // 輸出每個員工的休假
        for (const [empName, dates] of employeesByStaff) {
          const dateStr = dates
            .map((d) => `${d.displayDate}${d.isHalfDay ? '(' + d.note + ')' : ''}`)
            .join('、');
          text += `  ${empName} ${dateStr}\n`;
        }

        text += '\n';
      }

      return text;
    });
}
