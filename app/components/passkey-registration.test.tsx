import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import { PasskeyRegistration } from "./passkey-registration";

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  useActionData: vi.fn<() => unknown>(),
  useRevalidator: vi
    .fn<() => { revalidate: () => Promise<void> }>()
    .mockReturnValue({ revalidate: vi.fn<() => Promise<void>>() }),
}));

const stubCredentialCreation = (create: () => Promise<Credential | null>) => {
  Object.defineProperty(navigator, "credentials", {
    configurable: true,
    value: { create },
  });
};

describe("PasskeyRegistration", () => {
  beforeEach(() => {
    vi.stubGlobal("PublicKeyCredential", vi.fn<() => void>());
    vi.stubGlobal(
      "fetch",
      vi
        .fn<() => Promise<Response>>()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ challenge: "abc", user: { id: "abc" } })
          )
        )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, "credentials");
  });

  it("should explain the PIN requirement when the authenticator refuses registration", async () => {
    stubCredentialCreation(() =>
      Promise.reject(new DOMException("not allowed", "NotAllowedError"))
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
