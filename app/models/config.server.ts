export function getFlagsFromEnvironment() {
  return {
    SIGNUP_DISABLED: process.env.SIGNUP_DISABLED === "true",
  };
}
