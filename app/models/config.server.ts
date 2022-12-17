export function getFlagsFromEnvironment() {
  return {
    SIGNUP_DISABLED: process.env.SIGNUP_DISABLED === "true",
    MAINTENANCE_MODE_ENABLED: process.env.MAINTENANCE_MODE_ENABLED === "true",
  };
}
