import { Outlet } from "react-router";

export default function TV() {
  return (
    <main className="my-8 mx-auto flex min-h-full w-full flex-col px-8">
      <div className="flex w-full flex-col">
        <Outlet />
      </div>
    </main>
  );
}
