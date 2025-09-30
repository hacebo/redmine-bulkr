import { saveRedmineCredentialAction } from "./actions";
import { getCurrentUser } from "@/lib/currentUser";
import { db } from "@/lib/db";
import { redmineCredentials } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function RedmineSettingsPage() {
  const user = await getCurrentUser();
  
  let currentConfig = null;
  if (user) {
    const credRows = await db
      .select()
      .from(redmineCredentials)
      .where(eq(redmineCredentials.userId, user.id))
      .limit(1);
    
    if (credRows.length > 0) {
      currentConfig = {
        baseUrl: credRows[0].baseUrl,
        redmineUserId: credRows[0].redmineUserId,
        updatedAt: credRows[0].updatedAt,
      };
    }
  }

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
              <span className="text-sm text-muted-foreground">Redmine User ID:</span>
              <Badge variant="outline">{currentConfig.redmineUserId}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last Updated:</span>
              <span className="text-sm">{new Date(currentConfig.updatedAt).toLocaleDateString()}</span>
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
        <CardContent>
          <form action={saveRedmineCredentialAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="baseUrl">Redmine URL</Label>
              <Input
                id="baseUrl"
                name="baseUrl"
                type="url"
                placeholder="https://redmine.company.com"
                defaultValue={currentConfig?.baseUrl || ""}
                required
              />
              <p className="text-sm text-muted-foreground">
                Your Redmine instance URL
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">Redmine API Key</Label>
              <Input
                id="apiKey"
                name="apiKey"
                type="password"
                placeholder={currentConfig ? "Enter new API key to update" : "Your Redmine API key"}
                required
              />
              <p className="text-sm text-muted-foreground">
                Find your API key in your Redmine account settings
              </p>
            </div>

            <Button type="submit" className="w-full">
              {currentConfig ? "Update Credentials" : "Save Credentials"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}