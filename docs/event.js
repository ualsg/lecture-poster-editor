const PosterEvent = (() => {
  const englishDate = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'];
  const pad = value => String(value).padStart(2, '0');

  function calendarDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return null;
    const date = new Date(value + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
  }

  function formatTime(value) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return '';
    const [hours, minutes] = value.split(':');
    const hour = Number(hours);
    return `${hour % 12 || 12}:${minutes} ${hour < 12 ? 'am' : 'pm'}`;
  }

  function schedule({date, time, legacyDate}) {
    if (legacyDate) return legacyDate;
    const eventDate = calendarDate(date);
    const eventTime = formatTime(time);
    if (!eventDate) return eventTime;
    const {weekday, day, month, year} = Object.fromEntries(
      englishDate.formatToParts(eventDate).map(part => [part.type, part.value])
    );
    const label = `${weekday} ${day} ${month} (${year})`;
    return eventTime ? `${label} at ${eventTime}` : label;
  }

  function migrateSchedule(value) {
    const legacyDate = value.trim();
    if (!legacyDate) return {date: '', time: '', legacyDate: ''};
    if (calendarDate(legacyDate)) return {date: legacyDate, time: '', legacyDate: ''};
    const match = /\b(\d{1,2})\s+([a-z]+)\s+\(?(\d{4})\b\)?/i.exec(legacyDate);
    if (!match) return {date: '', time: '', legacyDate};
    const [, day, monthName, year] = match;
    const month = months.findIndex(name => name.toLowerCase() === monthName.toLowerCase()) + 1;
    const date = `${year}-${pad(month)}-${pad(day)}`;
    if (!calendarDate(date)) return {date: '', time: '', legacyDate};
    const suffix = legacyDate.slice(match.index + match[0].length);
    const startTime = suffix.replace(/^[,\s]*(?:(?:from|at)\s+)?/i, '');
    const twelveHour = /^(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*([ap])\.?m\b/i.exec(startTime);
    if (twelveHour) {
      const [, hour, minutes = '00', period] = twelveHour;
      const time = `${pad(Number(hour) % 12 + (period.toLowerCase() === 'p' ? 12 : 0))}:${minutes}`;
      return {date, time, legacyDate: ''};
    }
    const twentyFourHour = /^([01]?\d|2[0-3]):([0-5]\d)\b/.exec(startTime);
    if (twentyFourHour) return {date, time: `${pad(twentyFourHour[1])}:${twentyFourHour[2]}`, legacyDate: ''};
    return {date, time: '', legacyDate: suffix.replace(/[\s,.]/g, '') ? legacyDate : ''};
  }

  function migrateSpeaker(speaker) {
    if (typeof speaker?.name !== 'string' || typeof speaker.speakerTitle === 'string') return speaker;
    const fullName = speaker.name.trim();
    const title = /^(?:(?:(?:(?:Associate|Assistant|Emeritus|Assoc\.|Asst\.)\s+)?Prof(?:essor)?\.?|Dr\.?|Ir\.?|Mrs?\.?|Ms\.?|Mx\.?)\s+)+/i.exec(fullName);
    return {...speaker, speakerTitle: title ? title[0].trim() : '', name: title ? fullName.slice(title[0].length) : fullName};
  }

  function speakerName(speaker) {
    return [speaker.speakerTitle, speaker.name].map(value => value?.trim()).filter(Boolean).join(' ');
  }

  function filename({date, speakers}) {
    const names = speakers.map(({name}) => name.normalize('NFKD').replace(/\p{M}/gu, '')
      .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')).filter(Boolean);
    const people = speakers.length >= 3 && names.length ? `${names[0]}-et-al` : names.join('-and-');
    return `ual-poster-${calendarDate(date) ? date : 'undated'}-${people || 'speaker'}`;
  }

  return {schedule, migrateSchedule, migrateSpeaker, speakerName, filename};
})();
