import { renderToString } from "react-dom/server";

const storage = new Map<string, string>();

(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => void storage.set(key, value),
  removeItem: (key: string) => void storage.delete(key),
  clear: () => storage.clear(),
  key: () => null,
  length: 0,
} as Storage;

(globalThis as unknown as { window: unknown }).window = {
  location: { search: "", pathname: "/", href: "http://localhost/" },
  history: { replaceState: () => {} },
  addEventListener: () => {},
  removeEventListener: () => {},
  setTimeout: () => 0,
  clearTimeout: () => {},
};

const { default: LoginPage } = await import("../src/pages/LoginPage");
const { default: RegisterPage } = await import("../src/pages/RegisterPage");
const { default: ProfilePage } = await import("../src/pages/ProfilePage");
const { default: Settings } = await import("../src/pages/Settings");
const { default: HelpSupport } = await import("../src/pages/HelpSupport");
const { default: ForgotPassword } = await import(
  "../src/features/auth/ForgotPassword"
);
const { default: ResetPassword } = await import(
  "../src/features/auth/ResetPassword"
);
const { default: AuthProvider } = await import(
  "../src/features/auth/AuthProvider"
);
const { default: App } = await import("../src/app/App");
const { default: MemberModal } = await import(
  "../src/features/team/MemberModal"
);

const screens: [string, () => React.ReactElement, string?][] = [
  [
    "LoginPage",
    () => (
      <AuthProvider>
        <LoginPage onSwitchToRegister={() => {}} />
      </AuthProvider>
    ),
  ],
  [
    "RegisterPage",
    () => (
      <AuthProvider>
        <RegisterPage onSwitchToLogin={() => {}} />
      </AuthProvider>
    ),
  ],
  [
    "ProfilePage",
    () => (
      <AuthProvider>
        <ProfilePage />
      </AuthProvider>
    ),
  ],
  [
    "Settings",
    () => (
      <AuthProvider>
        <Settings onOpenProfile={() => {}} />
      </AuthProvider>
    ),
  ],
  ["HelpSupport", () => <HelpSupport />],
  ["ForgotPassword", () => <ForgotPassword onBackToLogin={() => {}} />],
  [
    "ResetPassword",
    () => <ResetPassword token="a-token" onBackToLogin={() => {}} />,
  ],
  ["App", () => <App />],
  [
    "MemberModal with the workspace owner",
    () => (
      <MemberModal
        member={{
          id: "m1",
          name: "Ada Lovelace",
          email: "ada@example.com",
          role: "OWNER",
          joinedAt: "Jan 2026",
          projectIds: [],
        }}
        projects={[]}
        onClose={() => {}}
        onSave={() => {}}
      />
    ),
    "Workspace Owner",
  ],
];

let failed = 0;

for (const [name, element, expected] of screens) {
  try {
    const html = renderToString(element());

    if (expected && !html.includes(expected)) {
      throw new Error(`the output does not contain "${expected}"`);
    }

    console.log(`  ok  ${name} rendered ${html.length} chars`);
  } catch (error) {
    failed += 1;

    console.error(`FAIL  ${name}: ${(error as Error).message}`);
  }
}

if (failed > 0) {
  process.exitCode = 1;
}
