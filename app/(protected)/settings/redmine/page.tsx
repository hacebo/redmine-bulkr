import { getRedmineCredentialsServer } from "@/lib/services/redmine-credentials-server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TestConnectionForm } from "@/components/forms/test-connection-form";
import { SaveCredentialsForm } from "@/components/forms/save-credentials-form";

export default async function RedmineSettingsPage() {
  const currentConfig = await getRedmineCredentialsServer();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Redmine Settings</h1>
      
      {currentConfig && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Current Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Redmine URL:</span>
              <Badge variant="outline">{currentConfig.baseUrl}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last Updated:</span>
              <span className="text-sm">{new Date(currentConfig.updatedAt || currentConfig.createdAt || '').toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>{currentConfig ? "Update" : "Connect to"} Redmine</CardTitle>
          <CardDescription>
            {currentConfig 
              ? "Update your Redmine credentials" 
              : "Enter your Redmine instance URL and API key to enable time tracking"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SaveCredentialsForm currentConfig={currentConfig} />

          {currentConfig && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Test Connection</h3>
                <p className="text-sm text-muted-foreground">
                  Verify that your credentials are working correctly
                </p>
                <TestConnectionForm />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}