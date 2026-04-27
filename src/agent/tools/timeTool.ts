// Returns current datetime — executed entirely in the browser, no network call needed
export function getCurrentTime(): string {
  const now = new Date();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return now.toLocaleString('zh-TW', { timeZone: tz, dateStyle: 'full', timeStyle: 'medium' });
}
