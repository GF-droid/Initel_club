/**
 * 从 axios 错误里取出服务端返回的真实原因。
 *
 * NestJS 的错误信封是 `{ statusCode, message, timestamp, path }`，其中校验失败时
 * `message` 是**字符串数组**（每个字段一条）。之前各处 catch 只显示一句笼统的
 * "请稍后重试"，用户完全无法知道是哪个字段不合法 —— 这是排查困难的主要原因。
 */
export const apiErrorMessage = (error: unknown, fallback: string): string => {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (Array.isArray(message)) return message.join('；');
  if (typeof message === 'string' && message) return message;
  return fallback;
};
