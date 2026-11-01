import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { startRegistration } from "@simplewebauthn/browser";

import { PasskeyRegistration } from "./passkey-registration";

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  useActionData: vi.fn<() => unknown>(),
  useRevalidator: vi
    .fn<() => { revalidate: () => Promise<void> }>()
    .mockReturnValue({ revalidate: vi.fn<() => Promise<void>>() }),
}));

vi.mock("@simplewebauthn/browser", () => ({
  startAuthentication: vi.fn<() => Promise<unknown>>(),
  startRegistration: vi.fn<() => Promise<unknown>>(),
}));

describe("PasskeyRegistration", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<() => Promise<Response>>()
        .mockResolvedValue(new Response(JSON.stringify({ challenge: "abc" })))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should explain the PIN requirement when the authenticator refuses registration", async () => {
    vi.mocked(startRegistration).mockRejectedValue(
      Object.assign(new Error("not allowed"), { name: "NotAllowedError" })
    );

    render(<PasskeyRegistration isEnabled hasPassword hasPasskeys={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Add Passkey" }));
    fireEvent.change(screen.getByLabelText("Passkey Name"), {
      target: { value: "YubiKey" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Register Passkey" }));

    expect(
      await screen.findByText(
        "Registration canceled or timed out. Security keys need a PIN to be used as a passkey."
      )
    ).toBeInTheDocument();
  });
});
