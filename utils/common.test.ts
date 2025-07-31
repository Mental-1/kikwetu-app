import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import * as commonUtils from "./common";

describe("Performance and Edge Cases", () => {
  describe("debounce", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });
    it("should delay function execution", () => {
      const mockFn = jest.fn();
      const debouncedFn = commonUtils.debounce(mockFn, 100);
      debouncedFn();
      expect(mockFn).not.toHaveBeenCalled();
      jest.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
    it("should cancel previous calls", () => {
      const mockFn = jest.fn();
      const debouncedFn = commonUtils.debounce(mockFn, 100);
      debouncedFn();
      debouncedFn();
      debouncedFn();
      jest.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
});

describe("Parameterized Tests", () => {
  describe("validateEmail", () => {
    const validEmails = [
      "test@example.com",
      "user.name@domain.co.uk",
      "user+tag@example.org",
    ];
    const invalidEmails = [
      "invalid-email",
      "@example.com",
      "test@",
      "test..test@example.com",
    ];
    it.each(validEmails)("should validate %s as valid email", (email) => {
      expect(commonUtils.validateEmail(email)).toBe(true);
    });
    it.each(invalidEmails)("should validate %s as invalid email", (email) => {
      expect(commonUtils.validateEmail(email)).toBe(false);
    });
  });
});