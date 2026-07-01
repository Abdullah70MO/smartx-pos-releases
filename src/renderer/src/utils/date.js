function getCalendarType() {
  return localStorage.getItem('calendarType') || 'gregorian'
}

function getTimeFormat() {
  return localStorage.getItem('timeFormat') || '12'
}

function getCalendarLocale() {
  return getCalendarType() === 'hijri' ? 'ar-SA-u-ca-islamic' : 'ar-SA-u-ca-gregory'
}

export function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    calendar: getCalendarType() === 'hijri' ? 'islamic' : 'gregory'
  }).format(new Date(value))
}

export function formatTime(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
    hour: 'numeric', minute: '2-digit',
    hour12: getTimeFormat() !== '24'
  }).format(new Date(value))
}

export function formatDateTime(value) {
  if (!value) return '-'
  return `${formatDate(value)} ${formatTime(value)}`
}

export function getCalendarTypeLabel() {
  return getCalendarType() === 'hijri' ? 'هجري' : 'ميلادي'
}