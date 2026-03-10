import {
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
} from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { CLERK_PUBLISHABLE_KEY } from "@/config/clerk";

const ClerkAuthInner = () => {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;

  if (isSignedIn) {
    return <UserButton afterSignOutUrl="/" />;
  }

  return (
    <div className="flex items-center gap-2">
      <SignInButton mode="modal">
        <Button variant="ghost" size="sm">Sign in</Button>
      </SignInButton>
      <SignUpButton mode="modal">
        <Button size="sm">Sign up</Button>
      </SignUpButton>
    </div>
  );
};

const ClerkAuth = () => {
  if (!CLERK_PUBLISHABLE_KEY) return null;
  return <ClerkAuthInner />;
};

export default ClerkAuth;
