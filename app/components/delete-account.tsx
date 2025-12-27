import { Link } from "react-router";

interface DeleteAccountProps {
  isEnabled: boolean;
}

export function DeleteAccount({ isEnabled }: DeleteAccountProps) {
  return (
    <>
      <hr className="my-8" />

      <h2 className="text-xl font-bold">Delete account</h2>
      {isEnabled ? (
        <>
          <p className="my-4">
            Deleting your account will also delete all your saved data. Once
            deleted, this data can&apos;t be restored.
          </p>
          <Link
            to="/deletion"
            className="rounded bg-mkerror py-2 px-4 text-center text-white hover:bg-mkerror-muted active:bg-mkerror-muted"
          >
            Delete my account and all data
          </Link>
        </>
      ) : (
        <p className="my-4">
          The account deletion functionality is currently disabled. Please try
          again later.
        </p>
      )}
    </>
  );
}
