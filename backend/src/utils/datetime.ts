import { z } from 'zod';

const BOGOTA_OFFSET = '-05:00';
const LOCAL_DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/;

function withBogotaOffset(value: string) {
  const normalized = value.trim();
  return LOCAL_DATE_TIME_PATTERN.test(normalized) ? `${normalized}${BOGOTA_OFFSET}` : normalized;
}

export const bogotaDateTimeSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    return withBogotaOffset(value);
  }

  return value;
}, z.coerce.date());
