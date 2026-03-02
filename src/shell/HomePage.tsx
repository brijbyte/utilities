import { AppGrid } from "./AppGrid";
import { ThemeSwitcher } from "./ThemeSwitcher";

export function HomePage() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-end p-md">
        <ThemeSwitcher />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-2xl pb-3xl">
        <div className="text-center mb-3xl">
          <h1 className="text-xl text-text mb-xs">⚙ utilities</h1>
          <p className="text-xs text-text-muted">developer tools in the browser</p>
        </div>
        <AppGrid />
      </div>
    </div>
  );
}
