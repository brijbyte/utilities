import { WifiOff } from "lucide-react";
import { useOnline } from "../useOnline";
import { AppGrid } from "./AppGrid";
import { AppInfo } from "./AppInfo";

export function HomePage() {
  const online = useOnline();

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-end items-center gap-3 p-3">
        {!online && (
          <span className="flex items-center gap-1 text-danger text-xs">
            <WifiOff size={14} />
            <span className="hidden sm:inline">Offline</span>
          </span>
        )}
        <AppInfo />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-10">
        <div className="text-center mb-10">
          <h1 className="text-xl text-text mb-1">⚙ utilities</h1>
          <p className="text-xs text-text-muted">
            developer tools in the browser
          </p>
        </div>
        <AppGrid />
      </div>
    </div>
  );
}
