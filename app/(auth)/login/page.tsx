import { redirect } from 'next/navigation';
import { getUserFromCookie } from '@/lib/auth.server';
import { LoginForm } from '@/components/forms/login-form';

export default async function LoginPage() {
  const user = await getUserFromCookie();
  
  if (user) {
    redirect('/time-tracking');
  }

  const enablePasswordLogin = process.env.ENABLE_PASSWORD_LOGIN === 'true';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Welcome to Redmine-Bulkr</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Sign in to manage your Redmine time entries
          </p>
        </div>
        <LoginForm enablePasswordLogin={enablePasswordLogin} />
      </div>
    </div>
  );
}