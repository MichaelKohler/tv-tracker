import { Link } from "@remix-run/react";
import { useOptionalUser } from "~/utils";

export default function Index() {
  const user = useOptionalUser();

  return (
    <main className="flex w-full flex-col bg-white">
      <div className="flex min-h-screen w-full flex-col justify-center bg-gradient-to-b from-slate-800 to-slate-700 px-8 text-center text-white">
        <h1 className="font-title text-6xl">What have you watched?</h1>
        <p className="mt-9 text-2xl">Track your watched TV shows</p>
        {!user && (
          <div className="mt-9 flex flex-row justify-center space-x-4 lg:hidden">
            <Link
              to="/join"
              className="text-white-100 flex items-center justify-center rounded bg-slate-600 py-2 px-4 font-medium hover:bg-slate-500 active:bg-yellow-500"
            >
              Sign up
            </Link>
            <Link
              to="/login"
              className="flex items-center justify-center rounded bg-slate-600 px-4 py-2 font-medium text-white hover:bg-slate-500 active:bg-slate-500"
            >
              Log In
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
