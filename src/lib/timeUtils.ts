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
