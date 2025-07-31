"use server";

export async function updateAccount(formData: any) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout

  try {
    const response = await fetch("/api/account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
      signal: controller.signal,
    });

    clearTimeout(timeoutId); // Clear timeout if fetch completes within time

    if (!response.ok) {
      let errorMessage = "Failed to update account";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Fall back to default message if JSON parsing fails
      }
      throw new Error(errorMessage);
    }
    return { success: true, message: "Your account has been updated." };
  } catch (error) {
    clearTimeout(timeoutId); // Ensure timeout is cleared on error as well
    console.error(error);
    if (error instanceof DOMException && error.name === "AbortError") {
      return { success: false, message: "Request timed out. Please try again." };
    } else if (error instanceof TypeError) {
      // This typically catches network errors (e.g., offline, CORS issues)
      return { success: false, message: "Network error. Please check your internet connection." };
    }
    return { success: false, message: (error as Error).message || "An unexpected error occurred." };
  }
}
