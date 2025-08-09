declare module 'pino/browser' {
  // Re-export the same surface as `pino`
  export * from 'pino';
  import Pino from 'pino';
  export default Pino;
}