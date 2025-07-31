function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Simple encryption utility for messages
export class MessageEncryption {
  private static encoder = new TextEncoder();
  private static decoder = new TextDecoder();

  static async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"],
    );
  }

  static async exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey("raw", key);
    return arrayBufferToBase64(exported);
  }

  static async importKey(keyString: string): Promise<CryptoKey> {
    const keyData = base64ToArrayBuffer(keyString);
    return await crypto.subtle.importKey(
      "raw",
      keyData as ArrayBuffer,
      { name: "AES-GCM" },
      true,
      ["encrypt", "decrypt"],
    );
  }

  static async encrypt(
    message: string,
    key: CryptoKey,
  ): Promise<{ encrypted: string; iv: string }> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = this.encoder.encode(message);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encoded,
    );

    return {
      encrypted: arrayBufferToBase64(encrypted),
      iv: arrayBufferToBase64(iv.buffer),
    };
  }

  static async decrypt(
    encryptedData: string,
    iv: string,
    key: CryptoKey,
  ): Promise<string> {
    const encryptedBytes = base64ToArrayBuffer(encryptedData);
    const ivBytes = base64ToArrayBuffer(iv);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBytes,
      },
      key,
      encryptedBytes,
    );

    return this.decoder.decode(decrypted);
  }
}
