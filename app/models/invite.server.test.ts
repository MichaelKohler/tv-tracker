import { prisma } from "../__mocks__/db.server";
import { redeemInviteCode } from "./invite.server";

vi.mock("../db.server");

describe("Invite Model", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("redeemInviteCode should delete existing invite", async () => {
    prisma.invite.findUnique.mockResolvedValue({ id: "123" });

    const valid = await redeemInviteCode("123");

    expect(valid).toBeTruthy();
    expect(prisma.invite.delete).toBeCalledWith({
      where: {
        id: "123",
      },
    });
  });

  it("redeemInviteCode should return false if no invite found", async () => {
    prisma.invite.findUnique.mockResolvedValue(null);

    const valid = await redeemInviteCode("123");

    expect(valid).toBeFalsy();
    expect(prisma.invite.delete).not.toBeCalled();
  });

  it("redeemInviteCode should return true even if invite can not be deleted", async () => {
    prisma.invite.findUnique.mockResolvedValue({ id: "123" });
    prisma.invite.delete.mockImplementation(() => {
      throw new Error("oh no");
    });

    const valid = await redeemInviteCode("123");

    expect(valid).toBeTruthy();
  });
});
