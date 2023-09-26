import React from "react";
import { Form, Link, useMatches } from "@remix-run/react";

import { useOptionalUser } from "../utils";

export default function Header({
  renderLoginButtons = true,
}: {
  renderLoginButtons?: boolean;
}) {
  const user = useOptionalUser();
  const matches = useMatches();
  const latestRoute = matches[matches.length - 1].id;
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [latestRoute]);

  return (
    <header
      className={`flex bg-slate-800 p-4 text-white ${
        menuOpen ? "flex-col" : "flex-row"
      }`}
    >
      <h1 className="text-3xl font-bold">
        <Link to="/">
          tv<span className="text-sky-200">.tracker</span>
        </Link>
      </h1>

      <section
        className={
          menuOpen
            ? "mt-9 min-h-screen w-full justify-between"
            : "hidden w-full items-center justify-between lg:flex"
        }
      >
        <nav
          className={`mt-0 flex ${menuOpen ? "flex-col" : "ml-20 flex-row"}`}
        >
          {user && (
            <>
              <Link
                to="/tv"
                className={`text-white-700 flex ${
                  menuOpen ? "border-b py-12" : "px-8 py-2"
                } text-3xl lg:text-base font-semibold hover:text-blue-300 hover:transition-colors hover:duration-300 focus:text-blue-300`}
              >
                TV
              </Link>
              <Link
                to="/tv/upcoming"
                className={`text-white-700 flex ${
                  menuOpen ? "border-b py-12" : "px-8 py-2"
                } text-3xl lg:text-base font-semibold hover:text-blue-300 hover:transition-colors hover:duration-300 focus:text-blue-300`}
              >
                Upcoming
              </Link>
              <Link
                to="/account"
                className={`text-white-700 flex ${
                  menuOpen ? "border-b py-12" : "px-8 py-2"
                } text-3xl lg:text-base font-semibold hover:text-blue-300 hover:transition-colors hover:duration-300 focus:text-blue-300`}
              >
                Account
              </Link>
            </>
          )}
        </nav>

        {renderLoginButtons && (
          <section className="mt-8 lg:mt-0">
            {user ? (
              <Form action="/logout" method="post">
                <button
                  type="submit"
                  className="text-white-100 rounded bg-slate-600 py-2 px-4 hover:bg-slate-500 active:bg-slate-500"
                >
                  Logout
                </button>
              </Form>
            ) : (
              <div
                className={`flex ${
                  menuOpen ? "flex-col space-y-4" : "flex-row space-x-4"
                }`}
              >
                <Link
                  to="/join"
                  className="text-white-100 flex items-center justify-center rounded bg-yellow-600 py-2 px-4 font-medium hover:bg-yellow-500 active:bg-yellow-500"
                >
                  Sign up
                </Link>
                <Link
                  to="/login"
                  className="text-white-100 flex items-center justify-center rounded bg-slate-600 py-2 px-4 font-medium hover:bg-slate-500 active:bg-slate-500"
                >
                  Log In
                </Link>
              </div>
            )}
          </section>
        )}
      </section>

      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="text-white-100 absolute top-3 right-3 h-10 w-10 rounded bg-slate-600 hover:bg-slate-500 active:bg-slate-500 lg:hidden"
      >
        {menuOpen ? "✕" : "☰"}
      </button>
    </header>
  );
}
