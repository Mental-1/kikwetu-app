export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay: number,
) => {
  let timeout: NodeJS.Timeout | undefined;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};