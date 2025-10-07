import { requireUserForPage } from "@/lib/auth.server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AccountSettingsPage() {
  const user = await requireUserForPage();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Your Account</CardTitle>
          <CardDescription>View your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Email:</span>
            <span className="text-sm font-medium">{user.email || 'Not available'}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">User ID:</span>
            <span className="text-sm font-mono text-xs">{user.userId}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
