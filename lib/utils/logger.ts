import pino from "pino";

const createLogger = () => {
  return pino({
    level: process.env.LOG_LEVEL ?? "info",
    base: undefined,
    redact: {
      paths: [
        "req.headers.authorization",
        "request.headers.authorization",
        "headers.authorization",
        "headers.cookie",
        "cookie",
        "authorization",
      ],
      remove: true,
    },
  });
};

export const logger = createLogger();
