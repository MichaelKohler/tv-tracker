import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { generateAuthenticationOptions } from "@simplewebauthn/server";

import { sessionStorage, setPasskeyChallenge } from "../session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const options = await generateAuthenticationOptions({
    rpID: process.env.RP_ID || "localhost",
    allowCredentials: [],
    userVerification: "preferred",
  });

  const session = await setPasskeyChallenge(request, options.challenge);

  return data(options, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}
