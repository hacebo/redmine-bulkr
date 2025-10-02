import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/services/auth';
import { LoginForm } from '@/components/forms/login-form';

export default async function LoginPage() {
  const user = await getServerUser();
  
  if (user) {
    redirect('/time-tracking');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Welcome to BulkRedmine</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Sign in to manage your Redmine time entries
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}