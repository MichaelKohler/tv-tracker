import { Form, useActionData, useNavigation } from "react-router";

import type { action } from "../routes/account";

const LOGOUT_ALL_DEVICES_INTENT = "logout-all-devices";

export function LogoutAllDevices() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoggingOut =
    navigation.formData?.get("intent") === LOGOUT_ALL_DEVICES_INTENT;
  const error = actionData?.errors?.logoutAllDevices;

  return (
    <>
      <hr className="my-8" />

      <h2 className="text-xl font-bold">Log out all devices</h2>
      <p className="my-4">
        This ends every session for your account, including this one. You will
        need to log in again on each device.
      </p>

      <Form method="post">
        <input type="hidden" name="intent" value={LOGOUT_ALL_DEVICES_INTENT} />
        <button
          type="submit"
          disabled={isLoggingOut}
          onClick={(e) => {
            if (!confirm("Are you sure you want to log out all devices?")) {
              e.preventDefault();
            }
          }}
          className="w-full rounded bg-mkerror py-2 px-4 text-center text-white hover:bg-mkerror-muted active:bg-mkerror-muted"
        >
          {isLoggingOut ? "Logging out..." : "Log out all devices"}
        </button>

        {error && (
          <p role="alert" className="mt-2 text-mkerror">
            {error}
          </p>
        )}
      </Form>
    </>
  );
}
