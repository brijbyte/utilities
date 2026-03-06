import { WifiOff } from "lucide-react";
import { useOnline } from "../useOnline";
import { AppGrid } from "./AppGrid";
import { AppInfo } from "./AppInfo";

export function HomePage() {
  const online = useOnline();

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-end items-center gap-md p-md">
        {!online && (
          <span className="flex items-center gap-xs text-danger text-xs">
            <WifiOff size={14} />
            <span className="hidden sm:inline">Offline</span>
          </span>
        )}
        <AppInfo />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-2xl pb-3xl">
        <div className="text-center mb-3xl">
          <h1 className="text-xl text-text mb-xs">⚙ utilities</h1>
          <p className="text-xs text-text-muted">
            developer tools in the browser
          </p>
        </div>
        <AppGrid />
      </div>
    </div>
  );
}
