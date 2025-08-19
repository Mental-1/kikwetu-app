"use client";

interface ErrorModalProps {
  onRetry: () => void;
  errorMessage?: string | null;
}

const ErrorModal = ({ onRetry, errorMessage }: ErrorModalProps) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-background rounded-lg p-6 w-3/4 max-w-sm">
        <h2 className="text-center text-xl font-bold text-red-500">Failed</h2>
        <p className="text-center text-muted-foreground mt-2">
          {errorMessage || "Failed to load listings feed."}
        </p>
        <div className="my-4 border-b"></div>
        <button
          onClick={onRetry}
          className="w-full bg-primary text-white py-2 rounded-lg hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

export default ErrorModal;
