import { MessageEncryption } from "./encryption";

// Listen for messages from the main thread
self.onmessage = async (event) => {
  const { messageId, encryptedContent, iv, encryptionKey } = event.data;

  try {
    // Import the encryption key
    const key = await MessageEncryption.importKey(encryptionKey);

    // Decrypt the content
    const decryptedContent = await MessageEncryption.decrypt(
      encryptedContent,
      iv,
      key,
    );

    // Post the decrypted content back to the main thread
    self.postMessage({ messageId, decryptedContent, success: true });
  } catch (error) {
    console.error(`Error decrypting message ${messageId} in worker:`, error);
    self.postMessage({
      messageId,
      decryptedContent: "This message could not be decrypted.",
      success: false,
      error: (error as Error).message,
    });
  }
};
