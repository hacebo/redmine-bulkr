import { requireUserForPage } from "@/lib/auth.server";
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
import { ClearAccountDataForm } from "@/components/forms/delete-account-form";

export default async function AccountSettingsPage() {
  const user = await requireUserForPage();

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
            <span className="text-sm font-medium">{user.email || 'Not available'}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">User ID:</span>
            <span className="text-sm font-mono text-xs">{user.userId}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Data Management</CardTitle>
          <CardDescription>
            Clear your stored data and logout
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Clearing your account data will permanently remove from Redmine-Bulkr:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Your encrypted Redmine credentials</li>
                <li>All stored configuration</li>
                <li>Log you out of all sessions</li>
              </ul>
              <p className="mt-2 font-semibold text-green-600 dark:text-green-400">
                Your Redmine data is safe: All time entries and your Redmine account will remain unchanged.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Note: Your Appwrite account will remain but without any stored data.
              </p>
              <p className="mt-1 font-semibold">
                This action cannot be undone.
              </p>
            </AlertDescription>
          </Alert>

          <ClearAccountDataForm />
        </CardContent>
      </Card>
    </div>
  );
}
