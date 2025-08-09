
import pino from 'pino/browser';

const logger = pino({ name: 'clipboard' });

export async function copyText(text: string): Promise<void> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for non-secure contexts / older browsers
      if (typeof document === "undefined") {
        throw new Error("Clipboard not available in this environment.");
      }
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      try {
        ta.select();
        // iOS/Safari selection support
        ta.setSelectionRange(0, ta.value.length);
        const ok = document.execCommand("copy");
        if (!ok) throw new Error("document.execCommand('copy') returned false");
      } finally {
        document.body.removeChild(ta);
      }
    }
  } catch (error) {
    logger.error({ error: error }, "Failed to copy text");
    throw new Error("Failed to copy text.", { cause: error as unknown });
  }
}
