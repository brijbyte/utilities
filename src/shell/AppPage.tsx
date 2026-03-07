import { Outlet } from "react-router";
import { Header } from "./Header";

export function AppPage() {
  return (
    <div className="h-full flex flex-col">
      <Header />
      <main className="flex-1 min-h-0">
        <Outlet />
      </main>
    </div>
  );
}
