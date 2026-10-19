import { useEffect, useRef, type ReactNode } from "react";
import { ClerkProvider, useClerk, SignIn, SignUp } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
// Keep signup intent across Clerk's external authentication redirects.
const signupIntent = new URLSearchParams(window.location.search);
if (signupIntent.get("invite")) sessionStorage.setItem("signup-invitation", signupIntent.get("invite")!);
if (signupIntent.get("demo") === "1") {
  sessionStorage.setItem("join-demo", "1");
  document.cookie = "app_demo=1; Path=/; SameSite=Lax";
}
export const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

const clerkAppearance = {
  theme: shadcn,
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#2563eb", colorForeground: "#0f172a", colorMutedForeground: "#475569",
    colorDanger: "#b91c1c", colorBackground: "#ffffff", colorInput: "#ffffff",
    colorInputForeground: "#0f172a", colorNeutral: "#334155",
    fontFamily: "Inter, system-ui, sans-serif", borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-slate-900", headerSubtitle: "text-slate-600",
    socialButtonsBlockButtonText: "text-slate-900", formFieldLabel: "text-slate-900",
    footerActionLink: "text-blue-700", footerActionText: "text-slate-600",
    dividerText: "text-slate-600", identityPreviewEditButton: "text-blue-700",
    formFieldSuccessText: "text-green-700", alertText: "text-red-700",
    logoBox: "justify-center", logoImage: "h-12", socialButtonsBlockButton: "border-slate-300",
    formButtonPrimary: "bg-blue-600 text-white", formFieldInput: "bg-white text-slate-900",
    footerAction: "bg-slate-50", dividerLine: "bg-slate-200", alert: "bg-red-50",
    otpCodeFieldInput: "text-slate-900", formFieldRow: "gap-2", main: "gap-4",
  },
};

function CacheInvalidator() {
  const { addListener } = useClerk();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => addListener(({ user }) => {
    const userId = user?.id ?? null;
    if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) queryClient.clear();
    prevUserIdRef.current = userId;
  }), [addListener]);
  return null;
}

export function ClerkProviderWithRoutes({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      signInFallbackRedirectUrl={`${basePath}/dashboard`}
      signUpFallbackRedirectUrl={`${basePath}/dashboard`}
      localization={{
        signIn: { start: { title: "Welcome back", subtitle: "Sign in to DoorSurvey Pro" } },
        signUp: { start: { title: "Create your account", subtitle: "Get started with DoorSurvey Pro" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <CacheInvalidator />
      {children}
    </ClerkProvider>
  );
}

export function SignInPage() {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
    <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
  </div>;
}

export function SignUpPage() {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
    <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
  </div>;
}
