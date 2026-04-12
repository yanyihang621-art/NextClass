export const getBeijingTime = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
  
  // Create a Date object that represents the Beijing time values
  // Note: This Date object is in the local timezone, but its getFullYear(), getMonth(), etc. 
  // will return the Beijing time values.
  return new Date(getPart('year'), getPart('month') - 1, getPart('day'), getPart('hour'), getPart('minute'), getPart('second'));
};

export const calculateCurrentWeek = (date: Date, startDateStr: string, totalWeeks: number) => {
  let semesterStart: Date;
  
  if (!startDateStr) {
    // If no start date is provided, assume the semester starts this week
    semesterStart = new Date(date);
    semesterStart.setHours(0, 0, 0, 0);
  } else {
    const parts = startDateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts.map(Number);
      semesterStart = new Date(year, month - 1, day);
      semesterStart.setHours(0, 0, 0, 0);
    } else {
      semesterStart = new Date(date);
      semesterStart.setHours(0, 0, 0, 0);
    }
  }

  const startDay = semesterStart.getDay();
  const offsetToMondayStart = startDay === 0 ? 6 : startDay - 1;
  const startMonday = new Date(semesterStart);
  startMonday.setDate(semesterStart.getDate() - offsetToMondayStart);
  startMonday.setHours(0, 0, 0, 0);
  
  const currentDay = date.getDay();
  const offsetToMondayCurrent = currentDay === 0 ? 6 : currentDay - 1;
  const currentMonday = new Date(date);
  currentMonday.setDate(date.getDate() - offsetToMondayCurrent);
  currentMonday.setHours(0, 0, 0, 0);
  
  const diffTime = currentMonday.getTime() - startMonday.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
  let currentWeek = Math.floor(diffDays / 7) + 1;
  
  return { semesterStart, currentWeek };
};

export const isCourseInWeek = (weeksStr: string, currentWeek: number): boolean => {
  if (!weeksStr) return true; // If no week info, default to showing the course
  
  const cleanStr = weeksStr.replace(/周/g, '').trim();
  const parts = cleanStr.split(',');

  for (const part of parts) {
    const isOddOnly = part.includes('(单)') || part.includes('单');
    const isEvenOnly = part.includes('(双)') || part.includes('双');
    
    // Remove the modifier string for parsing numbers
    const numStr = part.replace(/\(单\)|\(双\)|单|双|奇|偶|\(|\)/g, '').trim();
    
    if (numStr.includes('-')) {
      const [start, end] = numStr.split('-').map(n => parseInt(n, 10));
      if (!isNaN(start) && !isNaN(end)) {
        if (currentWeek >= start && currentWeek <= end) {
          if (isOddOnly && currentWeek % 2 === 0) continue;
          if (isEvenOnly && currentWeek % 2 !== 0) continue;
          return true;
        }
      }
    } else {
      const singleWeek = parseInt(numStr, 10);
      if (!isNaN(singleWeek) && currentWeek === singleWeek) {
        if (isOddOnly && currentWeek % 2 === 0) continue;
        if (isEvenOnly && currentWeek % 2 !== 0) continue;
        return true;
      }
    }
  }
  
  return false;
};

