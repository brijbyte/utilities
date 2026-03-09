import { useEffect, useState } from "react";
import { Store } from "./utils/store";
import { StoreContext, useStoreState } from "./utils/context";
import { installProxyFetch, uninstallProxyFetch } from "./utils/proxy-fetch";
import { Toolbar } from "./components/Toolbar";
import { MessageThread } from "./components/MessageThread";
import { ChatInput } from "./components/ChatInput";
import { LoginView } from "./components/LoginView";
import { SessionsView } from "./components/SessionsView";
import { SettingsView } from "./components/SettingsView";

function AppContent() {
  const state = useStoreState();

  if (!state.ready) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        Loading…
      </div>
    );
  }

  if (state.view === "login") return <LoginView />;
  if (state.view === "sessions") return <SessionsView />;
  if (state.view === "settings") return <SettingsView />;

  // Chat view
  return (
    <div className="flex flex-col h-full">
      <Toolbar />
      <MessageThread />
      <ChatInput />
    </div>
  );
}

export default function ChatApp() {
  const [store] = useState(() => new Store());

  useEffect(() => {
    installProxyFetch();
    store.init();
    return () => {
      store.dispose();
      uninstallProxyFetch();
    };
  }, [store]);

  return (
    <StoreContext.Provider value={store}>
      <div className="h-full flex flex-col bg-bg text-text overflow-hidden">
        <AppContent />
      </div>
    </StoreContext.Provider>
  );
}
