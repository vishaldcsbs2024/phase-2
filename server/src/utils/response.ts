export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error: string;
}

export const successResponse = <T>(data: T, message?: string): ApiResponse<T> => ({
  success: true,
  data,
  error: message || '',
});

export const errorResponse = (error: string, data: any = null): ApiResponse => ({
  success: false,
  data: data || null,
  error,
});
