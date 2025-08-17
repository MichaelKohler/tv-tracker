import { useEffect, useState } from "react";
import { Form, Link, useMatches } from "react-router";

import { useOptionalUser } from "../utils";

export default function Header({
  renderLoginButtons = true,
  features,
}: {
  renderLoginButtons?: boolean;
  features: {
    upcomingRoute: boolean;
    recentlyWatchedRoute: boolean;
    statsRoute: boolean;
    maintenanceMode: boolean;
  };
}) {
  const user = useOptionalUser();
  const matches = useMatches();
  const latestRoute = matches[matches.length - 1].id;
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, [latestRoute]);

  return (
    <header
      className={`flex bg-mk p-4 text-white ${
        menuOpen ? "flex-col" : "flex-row"
      }`}
    >
      <h1 className="text-3xl font-bold">
        <Link to={user ? "/tv" : "/"}>
          tv<span className="text-mklight-300">.tracker</span>
        </Link>
      </h1>

      <section
        id="basic-navbar-nav"
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
                } text-3xl lg:text-base font-semibold hover:text-mklight-300 hover:transition-colors hover:duration-300 focus:text-mklight-300`}
              >
                TV
              </Link>
              {features.upcomingRoute && (
                <Link
                  to="/tv/upcoming"
                  className={`text-white-700 flex ${
                    menuOpen ? "border-b py-12" : "px-8 py-2"
                  } text-3xl lg:text-base font-semibold hover:text-mklight-300 hover:transition-colors hover:duration-300 focus:text-mklight-300`}
                >
                  Upcoming
                </Link>
              )}
              {features.recentlyWatchedRoute && (
                <Link
                  to="/tv/recent"
                  className={`text-white-700 flex ${
                    menuOpen ? "border-b py-12" : "px-8 py-2"
                  } text-3xl lg:text-base font-semibold hover:text-mklight-300 hover:transition-colors hover:duration-300 focus:text-mklight-300`}
                >
                  Recently watched
                </Link>
              )}
              {features.statsRoute && (
                <Link
                  to="/tv/stats"
                  className={`text-white-700 flex ${
                    menuOpen ? "border-b py-12" : "px-8 py-2"
                  } text-3xl lg:text-base font-semibold hover:text-mklight-300 hover:transition-colors hover:duration-300 focus:text-mklight-300`}
                >
                  Stats
                </Link>
              )}
              <Link
                to="/account"
                className={`text-white-700 flex ${
                  menuOpen ? "border-b py-12" : "px-8 py-2"
                } text-3xl lg:text-base font-semibold hover:text-mklight-300 hover:transition-colors hover:duration-300 focus:text-mklight-300`}
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
                  className="text-white-100 rounded bg-mk-tertiary py-2 px-4 hover:bg-mk-secondary active:bg-mk-secondary"
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
                  className="text-white-100 flex items-center justify-center rounded bg-mk-tertiary py-2 px-4 font-medium hover:bg-mk-secondary active:bg-mk-secondary"
                >
                  Sign up
                </Link>
                <Link
                  to="/login"
                  className="text-white-100 flex items-center justify-center rounded bg-mk-tertiary py-2 px-4 font-medium hover:bg-mk-secondary active:bg-mk-secondary"
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
        aria-controls="basic-navbar-nav"
        aria-expanded={menuOpen}
        aria-label="Toggle navigation"
        className="text-white-100 absolute top-3 right-3 h-10 w-10 rounded bg-mk-tertiary hover:bg-mk-secondary active:bg-mk-secondary lg:hidden"
      >
        {menuOpen ? "✕" : "☰"}
      </button>
    </header>
  );
}
