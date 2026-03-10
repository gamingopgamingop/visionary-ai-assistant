import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App.tsx";
import "./index.css";
import { CLERK_PUBLISHABLE_KEY } from "./config/clerk";

const Root = () => {
  if (CLERK_PUBLISHABLE_KEY) {
    return (
      <ClerkProvider afterSignOutUrl="/" publishableKey={CLERK_PUBLISHABLE_KEY}>
        <App />
      </ClerkProvider>
    );
  }
  return <App />;
};

createRoot(document.getElementById("root")!).render(<Root />);
