
import AuthLayout from "../features/auth/AuthLayout";
import Register from "../features/auth/Register";

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  return (
    <AuthLayout
      title="Create your workspace"
      subtitle="Start managing projects, tasks and team capacity with AI."
    >
      <Register onSwitchToLogin={onSwitchToLogin} />
    </AuthLayout>
  );
}

export default RegisterPage;
