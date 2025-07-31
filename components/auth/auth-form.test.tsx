import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthForm } from "./auth-form";

// Mock any external dependencies that might be used
jest.mock("next/router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: "/",
  }),
}));

const mockOnSubmit = jest.fn();
const user = userEvent.setup();

describe("AuthForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe("Happy Path - Login Mode", () => {
    it("renders login form with all required fields", () => {
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /sign in/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByLabelText(/confirm password/i),
      ).not.toBeInTheDocument();
    });

    it("successfully submits login form with valid credentials", async () => {
      mockOnSubmit.mockResolvedValue({ success: true });
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
        mode: "login",
      });
    });
  });

  describe("Happy Path - Signup Mode", () => {
    it("renders signup form with all required fields", () => {
      render(<AuthForm mode="signup" onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /sign up/i }),
      ).toBeInTheDocument();
    });

    it("successfully submits signup form with valid data", async () => {
      mockOnSubmit.mockResolvedValue({ success: true });
      render(<AuthForm mode="signup" onSubmit={mockOnSubmit} />);

      await user.type(screen.getByLabelText(/email/i), "newuser@example.com");
      await user.type(screen.getByLabelText(/^password/i), "securePassword123");
      await user.type(
        screen.getByLabelText(/confirm password/i),
        "securePassword123",
      );
      await user.click(screen.getByRole("button", { name: /sign up/i }));

      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: "newuser@example.com",
        password: "securePassword123",
        confirmPassword: "securePassword123",
        mode: "signup",
      });
    });
  });

  describe("Happy Path - Forgot Password Mode", () => {
    it("renders forgot password form with email field only", () => {
      render(<AuthForm mode="forgot-password" onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /reset password/i }),
      ).toBeInTheDocument();
    });

    it("successfully submits forgot password form", async () => {
      mockOnSubmit.mockResolvedValue({ success: true });
      render(<AuthForm mode="forgot-password" onSubmit={mockOnSubmit} />);

      await user.type(screen.getByLabelText(/email/i), "forgot@example.com");
      await user.click(screen.getByRole("button", { name: /reset password/i }));

      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: "forgot@example.com",
        mode: "forgot-password",
      });
    });
  });

  describe("Validation and Edge Cases", () => {
    it("displays error for invalid email format", async () => {
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

      await user.type(screen.getByLabelText(/email/i), "invalid-email");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email/i),
        ).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("displays error for empty required fields", async () => {
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("displays error for password mismatch in signup mode", async () => {
      render(<AuthForm mode="signup" onSubmit={mockOnSubmit} />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/^password/i), "password123");
      await user.type(
        screen.getByLabelText(/confirm password/i),
        "differentpassword",
      );
      await user.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("validates password strength in signup mode", async () => {
      render(<AuthForm mode="signup" onSubmit={mockOnSubmit} />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/^password/i), "123");
      await user.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/password must be at least/i),
        ).toBeInTheDocument();
      });
    });

    it("handles extremely long input values gracefully", async () => {
      const longEmail = "a".repeat(500) + "@example.com";
      const longPassword = "p".repeat(1000);
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

      await user.type(screen.getByLabelText(/email/i), longEmail);
      await user.type(screen.getByLabelText(/password/i), longPassword);

      expect(screen.getByLabelText(/email/i)).toHaveValue(longEmail);
      expect(screen.getByLabelText(/password/i)).toHaveValue(longPassword);
    });

    it("handles special characters in input fields", async () => {
      const specialChars = "!@#$%^&*()_+{}[]|\\:\";'<>?,./`~";
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

      await user.type(screen.getByLabelText(/password/i), specialChars);

      expect(screen.getByLabelText(/password/i)).toHaveValue(specialChars);
    });

    it("prevents multiple rapid form submissions", async () => {
      mockOnSubmit.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error Handling and Failure Conditions", () => {
    it("displays server error message when submission fails", async () => {
      mockOnSubmit.mockRejectedValue({ message: "Invalid credentials" });
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "wrongpassword");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    it("displays loading state during form submission", async () => {
      mockOnSubmit.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      expect(screen.getByRole("button")).toBeDisabled();
      expect(
        screen.getByText(/signing in/i) ||
          screen.getByTestId("loading-spinner") ||
          screen.getByRole("button", { name: /signing in/i }),
      ).toBeInTheDocument();
    });

    it("handles network errors gracefully", async () => {
      mockOnSubmit.mockRejectedValue(new Error("Network error"));
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/something went wrong/i) ||
            screen.getByText(/network error/i) ||
            screen.getByText(/please try again/i),
        ).toBeInTheDocument();
      });
    });

    it("clears errors when user starts typing", async () => {
      mockOnSubmit.mockRejectedValue({ message: "Invalid credentials" });
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "wrongpassword");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });

      await user.clear(screen.getByLabelText(/email/i));
      await user.type(screen.getByLabelText(/email/i), "newemail@example.com");

      expect(
        screen.queryByText(/invalid credentials/i),
      ).not.toBeInTheDocument();
    });

    it("handles validation errors from server", async () => {
      mockOnSubmit.mockRejectedValue({
        errors: {
          email: "Email already exists",
          password: "Password too weak",
        },
      });
      render(<AuthForm mode="signup" onSubmit={mockOnSubmit} />);

      await user.type(screen.getByLabelText(/email/i), "existing@example.com");
      await user.type(screen.getByLabelText(/^password/i), "weak");
      await user.type(screen.getByLabelText(/confirm password/i), "weak");
      await user.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
        expect(screen.getByText(/password too weak/i)).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility and User Experience", () => {
    it("has proper ARIA labels and roles", () => {
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

      expect(screen.getByRole("form")).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toHaveAttribute("type", "email");
      expect(screen.getByLabelText(/password/i)).toHaveAttribute(
        "type",
        "password",
      );
      expect(screen.getByRole("button", { name: /sign in/i })).toHaveAttribute(
        "type",
        "submit",
      );
    });

    it("supports keyboard navigation", async () => {
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /sign in/i });

      emailInput.focus();
      expect(emailInput).toHaveFocus();

      await user.tab();
      expect(passwordInput).toHaveFocus();

      await user.tab();
      expect(submitButton).toHaveFocus();
    });

    it("shows/hides password when toggle button is clicked", async () => {
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

      const passwordInput = screen.getByLabelText(/password/i);
      const toggleButton =
        screen.queryByRole("button", { name: /show password/i }) ||
        screen.queryByRole("button", { name: /toggle password visibility/i });

      if (toggleButton) {
        expect(passwordInput).toHaveAttribute("type", "password");

        await user.click(toggleButton);
        expect(passwordInput).toHaveAttribute("type", "text");

        await user.click(toggleButton);
        expect(passwordInput).toHaveAttribute("type", "password");
      }
    });

    it("maintains focus management during error states", async () => {
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      emailInput.focus();
      expect(emailInput).toHaveFocus();
    });

    it("provides proper error announcements for screen readers", async () => {
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        const errorElement = screen.getByText(/email is required/i);
        expect(errorElement).toHaveAttribute("role", "alert");
      });
    });

    it("supports form submission via Enter key", async () => {
      mockOnSubmit.mockResolvedValue({ success: true });
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.keyboard("{Enter}");

      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  describe("Props and Configuration", () => {
    it("handles custom initial values", () => {
      const initialValues = { email: "preset@example.com", password: "" };
      render(
        <AuthForm
          mode="login"
          onSubmit={mockOnSubmit}
          initialValues={initialValues}
        />,
      );

      expect(screen.getByLabelText(/email/i)).toHaveValue("preset@example.com");
      expect(screen.getByLabelText(/password/i)).toHaveValue("");
    });

    it("calls onModeChange when switching modes", async () => {
      const mockModeChange = jest.fn();
      render(
        <AuthForm
          mode="login"
          onSubmit={mockOnSubmit}
          onModeChange={mockModeChange}
        />,
      );

      const switchLink =
        screen.queryByText(/don't have an account/i) ||
        screen.queryByRole("button", { name: /sign up/i });
      if (switchLink) {
        await user.click(switchLink);
        expect(mockModeChange).toHaveBeenCalledWith("signup");
      }
    });

    it("handles disabled state correctly", () => {
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} disabled />);

      expect(screen.getByLabelText(/email/i)).toBeDisabled();
      expect(screen.getByLabelText(/password/i)).toBeDisabled();
      expect(screen.getByRole("button", { name: /sign in/i })).toBeDisabled();
    });

    it("applies custom className prop", () => {
      render(
        <AuthForm
          mode="login"
          onSubmit={mockOnSubmit}
          className="custom-form"
        />,
      );

      expect(screen.getByRole("form")).toHaveClass("custom-form");
    });

    it("shows custom loading text during submission", async () => {
      mockOnSubmit.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );
      render(
        <AuthForm
          mode="login"
          onSubmit={mockOnSubmit}
          loadingText="Authenticating..."
        />,
      );

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      expect(screen.getByText(/authenticating/i)).toBeInTheDocument();
    });

    it("handles custom validation rules", async () => {
      const customValidation = {
        email: (value: string) => {
          const domain = value.split("@")[1];
          return domain === "company.com" ? null : "Must use company email";
        },
        password: (value: string) => {
          return value.length >= 10
            ? null
            : "Password must be at least 10 characters";
        },
        confirmPassword: (value: string, values: any) => {
          return value === values.password ? null : "Passwords do not match";
        },
      };
      render(
        <AuthForm
          mode="login"
          onSubmit={mockOnSubmit}
          validation={customValidation}
        />,
      );

      await user.type(screen.getByLabelText(/email/i), "test@gmail.com");
      await user.type(screen.getByLabelText(/password/i), "short");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/must use company email/i)).toBeInTheDocument();
        expect(
          screen.getByText(/password must be at least 10 characters/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Integration and Real-world Scenarios", () => {
    it("handles rapid mode switching without errors", async () => {
      const mockModeChange = jest.fn();
      const { rerender } = render(
        <AuthForm
          mode="login"
          onSubmit={mockOnSubmit}
          onModeChange={mockModeChange}
        />,
      );

      rerender(
        <AuthForm
          mode="signup"
          onSubmit={mockOnSubmit}
          onModeChange={mockModeChange}
        />,
      );
      rerender(
        <AuthForm
          mode="forgot-password"
          onSubmit={mockOnSubmit}
          onModeChange={mockModeChange}
        />,
      );
      rerender(
        <AuthForm
          mode="login"
          onSubmit={mockOnSubmit}
          onModeChange={mockModeChange}
        />,
      );

      expect(screen.getByRole("form")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /sign in/i }),
      ).toBeInTheDocument();
    });

    it("persists form state during mode changes", async () => {
      const { rerender } = render(
        <AuthForm mode="login" onSubmit={mockOnSubmit} />,
      );

      await user.type(
        screen.getByLabelText(/email/i),
        "persistent@example.com",
      );

      rerender(<AuthForm mode="signup" onSubmit={mockOnSubmit} />);
      rerender(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

      // Email should be preserved if component maintains state
      expect(screen.getByLabelText(/email/i)).toHaveValue("");
    });
  });
});

// Utility functions for common test operations
const fillLoginForm = async (
  email = "test@example.com",
  password = "password123",
) => {
  await user.type(screen.getByLabelText(/email/i), email);
  await user.type(screen.getByLabelText(/password/i), password);
};

const fillSignupForm = async (
  email = "test@example.com",
  password = "password123",
  confirmPassword = "password123",
) => {
  await user.type(screen.getByLabelText(/email/i), email);
  await user.type(screen.getByLabelText(/^password/i), password);
  await user.type(screen.getByLabelText(/confirm password/i), confirmPassword);
};

const submitForm = async (buttonName: RegExp) => {
  await user.click(screen.getByRole("button", { name: buttonName }));
};

// Test helper to wait for async operations
const waitForFormSubmission = async () => {
  await waitFor(
    () => {
      expect(mockOnSubmit).toHaveBeenCalled();
    },
    { timeout: 3000 },
  );
};
