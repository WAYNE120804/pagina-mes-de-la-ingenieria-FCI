export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
  meta?: unknown;
};

export function successResponse<T>(
  message: string,
  data?: T,
  meta?: unknown
): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
    meta,
  };
}

export function errorResponse(
  message: string,
  code?: string,
  details?: unknown
) {
  return {
    success: false,
    message,
    error: message,
    code,
    details,
  };
}
