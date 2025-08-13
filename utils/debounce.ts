export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay: number,
) => {
  let timeout: NodeJS.Timeout | undefined;
  const debounced = (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };

  // Expose cancel so callers can clear pending timeout
  debounced.cancel = () => clearTimeout(timeout);
  return debounced;
};