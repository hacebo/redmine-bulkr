import { getCurrentUser } from "@/lib/currentUser";
import { deleteAccountAction } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export default async function AccountSettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Your Account</CardTitle>
          <CardDescription>Manage your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Email:</span>
            <span className="text-sm font-medium">{user.email}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">User ID:</span>
            <span className="text-sm font-mono text-xs">{user.id}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Account Created:</span>
            <span className="text-sm">{new Date(user.created_at || '').toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that affect your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Deleting your account will permanently remove from BulkRedmine:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Your local account information</li>
                <li>Your encrypted Redmine credentials</li>
                <li>All stored configuration</li>
              </ul>
              <p className="mt-2 font-semibold text-green-600 dark:text-green-400">
                Your Redmine data is safe: All time entries and your Redmine account will remain unchanged.
              </p>
              <p className="mt-1 font-semibold">
                This action cannot be undone.
              </p>
            </AlertDescription>
          </Alert>

          <form action={deleteAccountAction}>
            <Button type="submit" variant="destructive" className="w-full">
              Delete Account and All Data
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
