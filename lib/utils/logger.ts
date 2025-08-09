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
        "req.headers['set-cookie']",
        "request.headers['set-cookie']",
        "headers['set-cookie']",
        "cookie",
        "authorization",
        "req.headers['x-api-key']",
        "request.headers['x-api-key']",
        "headers['x-api-key']",
        "req.headers['api-key']",
        "headers['api-key']",
        "req.headers.apikey",
        "headers.apikey",
      ],
      remove: true,
    },
  });
};

export const logger = createLogger();
