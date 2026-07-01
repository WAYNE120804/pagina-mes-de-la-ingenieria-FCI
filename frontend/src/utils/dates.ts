export const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
};

function padDatePart(value) {
  return String(value).padStart(2, '0');
}

const BOGOTA_OFFSET_MINUTES = -5 * 60;
const BOGOTA_OFFSET = '-05:00';
const LOCAL_DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/;

export const toDateTimeLocalValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const bogotaDate = new Date(date.getTime() + BOGOTA_OFFSET_MINUTES * 60000);

  return `${bogotaDate.getUTCFullYear()}-${padDatePart(bogotaDate.getUTCMonth() + 1)}-${padDatePart(bogotaDate.getUTCDate())}T${padDatePart(bogotaDate.getUTCHours())}:${padDatePart(bogotaDate.getUTCMinutes())}`;
};

export const fromDateTimeLocalValue = (value) => {
  if (!value) return '';
  const normalized = String(value).trim();
  const date = new Date(
    LOCAL_DATE_TIME_PATTERN.test(normalized) ? `${normalized}${BOGOTA_OFFSET}` : normalized
  );
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
};

export const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleString('es-CO', { timeZone: 'America/Bogota' });
};

export const formatDateTimeLong = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const todayISO = () => new Date().toISOString().slice(0, 10);
