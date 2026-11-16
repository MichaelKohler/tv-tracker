import Mail from "nodemailer/lib/mailer";
import type { MockInstance } from "vite-plus/test";

import { sendPasskeyCreatedMail, sendPasswordResetMail } from "./mail.server";

const loggedEntries = (spy: MockInstance<(...data: unknown[]) => void>) =>
  spy.mock.calls.map(([output]) => JSON.parse(String(output)));

describe("mail.server", () => {
  const originalEnv = process.env;
  let mockSendMail: MockInstance<(options: Mail.Options) => Promise<unknown>>;
  let consoleLog: MockInstance<(...data: unknown[]) => void>;
  let consoleError: MockInstance<(...data: unknown[]) => void>;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "587",
      SMTP_EMAIL: "noreply@example.com",
      SMTP_PASSWORD: "password123",
      RP_ORIGIN: "https://tvtracker.example.com",
    };

    mockSendMail = vi.spyOn(
      Mail.prototype,
      "sendMail"
    ) as unknown as typeof mockSendMail;
    mockSendMail.mockResolvedValue({});
    consoleLog = vi.spyOn(console, "log");
    consoleError = vi.spyOn(console, "error");
  });

  afterEach(() => {
    process.env = originalEnv;
    mockSendMail.mockRestore();
  });

  describe("sendPasswordResetMail", () => {
    it("should send password reset email with correct HTML and text content", async () => {
      mockSendMail.mockResolvedValue({});

      await sendPasswordResetMail({
        email: "user@example.com",
        token: "reset-token-123",
      });

      expect((mockSendMail.mock.contexts[0] as Mail).options).toEqual({
        host: "smtp.example.com",
        port: "587",
        secure: false,
        auth: {
          user: "noreply@example.com",
          pass: "password123",
        },
      });

      expect(mockSendMail).toHaveBeenCalledWith({
        from: "tv-tracker <noreply@example.com>",
        to: "user@example.com <user@example.com>",
        subject: "Password Reset Request",
        text: expect.stringContaining("reset-token-123"),
        html: expect.stringContaining("reset-token-123"),
      });

      const call = mockSendMail.mock.calls[0]![0]!;
      expect(call.html).toContain("Password Reset Request");
      expect(call.html).toContain("reset-token-123");
      expect(call.html).toContain("https://tvtracker.example.com");
      expect(call.html).toContain("#1f3352");
      expect(call.text).toContain("reset-token-123");
      expect(call.text).toContain("https://tvtracker.example.com");

      expect(loggedEntries(consoleLog)).toContainEqual(
        expect.objectContaining({
          message: "Password reset email sent successfully",
          context: { email: "user@example.com" },
        })
      );
    });

    it("should use default origin when RP_ORIGIN is not set", async () => {
      mockSendMail.mockResolvedValue({});
      delete process.env.RP_ORIGIN;

      await sendPasswordResetMail({
        email: "user@example.com",
        token: "reset-token-123",
      });

      const call = mockSendMail.mock.calls[0]![0]!;
      expect(call.html).toContain("http://localhost:5173");
      expect(call.text).toContain("http://localhost:5173");
    });

    it("should log and rethrow the error when email sending fails", async () => {
      const error = new Error("SMTP error");
      mockSendMail.mockRejectedValue(error);

      await expect(
        sendPasswordResetMail({
          email: "user@example.com",
          token: "reset-token-123",
        })
      ).rejects.toThrow(error);

      expect(loggedEntries(consoleError)).toContainEqual(
        expect.objectContaining({
          message: "Failed to send password reset email",
          context: {
            email: "user@example.com",
            smtpHost: "smtp.example.com",
            smtpPort: "587",
          },
          error: expect.objectContaining({ message: error.message }),
        })
      );
    });

    it("should not send email when SMTP is not configured", async () => {
      process.env.SMTP_HOST = "";

      await sendPasswordResetMail({
        email: "user@example.com",
        token: "reset-token-123",
      });

      expect(mockSendMail).not.toHaveBeenCalled();
      expect(loggedEntries(consoleLog)).toContainEqual(
        expect.objectContaining({
          message:
            "SMTP not configured - password reset email will not be sent",
          context: expect.objectContaining({ email: "user@example.com" }),
        })
      );
    });
  });

  describe("sendPasskeyCreatedMail", () => {
    it("should send passkey created email with correct HTML and text content", async () => {
      mockSendMail.mockResolvedValue({});

      const createdAt = new Date("2025-01-01T12:00:00Z");

      await sendPasskeyCreatedMail({
        email: "user@example.com",
        passkeyName: "My YubiKey",
        createdAt,
      });

      expect((mockSendMail.mock.contexts[0] as Mail).options).toEqual({
        host: "smtp.example.com",
        port: "587",
        secure: false,
        auth: {
          user: "noreply@example.com",
          pass: "password123",
        },
      });

      expect(mockSendMail).toHaveBeenCalledWith({
        from: "tv-tracker <noreply@example.com>",
        to: "user@example.com <user@example.com>",
        subject: "New Passkey Added to Your Account",
        text: expect.stringContaining("My YubiKey"),
        html: expect.stringContaining("My YubiKey"),
      });

      const call = mockSendMail.mock.calls[0]![0]!;
      expect(call.html).toContain("New Passkey Added");
      expect(call.html).toContain("My YubiKey");
      expect(call.html).toContain("https://tvtracker.example.com");
      expect(call.html).toContain("#1f3352");
      expect(call.text).toContain("My YubiKey");
      expect(call.text).toContain("https://tvtracker.example.com");

      expect(loggedEntries(consoleLog)).toContainEqual(
        expect.objectContaining({
          message: "Passkey created email sent successfully",
          context: { email: "user@example.com", passkeyName: "My YubiKey" },
        })
      );
    });

    it("should use default origin when RP_ORIGIN is not set", async () => {
      mockSendMail.mockResolvedValue({});
      delete process.env.RP_ORIGIN;

      const createdAt = new Date("2025-01-01T12:00:00Z");

      await sendPasskeyCreatedMail({
        email: "user@example.com",
        passkeyName: "My iPhone",
        createdAt,
      });

      const call = mockSendMail.mock.calls[0]![0]!;
      expect(call.html).toContain("http://localhost:5173");
      expect(call.text).toContain("http://localhost:5173");
    });

    it("should log error when email sending fails", async () => {
      const error = new Error("SMTP connection failed");
      mockSendMail.mockRejectedValue(error);

      const createdAt = new Date("2025-01-01T12:00:00Z");

      await sendPasskeyCreatedMail({
        email: "user@example.com",
        passkeyName: "My Passkey",
        createdAt,
      });

      expect(loggedEntries(consoleError)).toContainEqual(
        expect.objectContaining({
          message: "Failed to send passkey created email",
          context: {
            email: "user@example.com",
            passkeyName: "My Passkey",
            smtpHost: "smtp.example.com",
            smtpPort: "587",
          },
          error: expect.objectContaining({ message: error.message }),
        })
      );
    });

    it("should not send email when SMTP is not configured", async () => {
      process.env.SMTP_HOST = "";

      const createdAt = new Date("2025-01-01T12:00:00Z");

      await sendPasskeyCreatedMail({
        email: "user@example.com",
        passkeyName: "My Passkey",
        createdAt,
      });

      expect(mockSendMail).not.toHaveBeenCalled();
      expect(loggedEntries(consoleLog)).toContainEqual(
        expect.objectContaining({
          message:
            "SMTP not configured - passkey created email will not be sent",
          context: expect.objectContaining({ email: "user@example.com" }),
        })
      );
    });

    it("should strip HTML tags from passkeyName to prevent XSS", async () => {
      mockSendMail.mockResolvedValue({});

      const createdAt = new Date("2025-01-01T12:00:00Z");

      await sendPasskeyCreatedMail({
        email: "user@example.com",
        passkeyName: '<script>alert("xss")</script>My Key',
        createdAt,
      });

      const call = mockSendMail.mock.calls[0]![0]!;
      expect(call.html).not.toContain("<script>");
      expect(call.html).toContain("My Key");
    });

    it("should format date correctly in email content", async () => {
      mockSendMail.mockResolvedValue({});

      const createdAt = new Date("2025-01-15T14:30:00Z");

      await sendPasskeyCreatedMail({
        email: "user@example.com",
        passkeyName: "Security Key",
        createdAt,
      });

      const call = mockSendMail.mock.calls[0]![0]!;
      const expectedDate = createdAt.toLocaleString("en-US", {
        dateStyle: "full",
        timeStyle: "long",
      });

      expect(call.html).toContain(expectedDate);
      expect(call.text).toContain(expectedDate);
    });
  });
});
