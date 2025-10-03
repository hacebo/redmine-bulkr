import { getTimeEntryPreferences } from './actions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TimeEntryPreferencesForm } from '@/components/forms/time-entry-preferences-form';

export default async function PreferencesPage() {
  const preferences = await getTimeEntryPreferences();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Time Entry Preferences</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Time Entry Settings</CardTitle>
          <CardDescription>
            Configure how time entries work in your application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TimeEntryPreferencesForm initialPreferences={preferences} />
        </CardContent>
      </Card>
    </div>
  );
}

