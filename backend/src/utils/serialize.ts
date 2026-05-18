export function serializeData(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(serializeData);
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    if ('toJSON' in value && typeof value.toJSON === 'function') {
      return serializeData(value.toJSON());
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        serializeData(nestedValue),
      ])
    );
  }

  return value;
}
