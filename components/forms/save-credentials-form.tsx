'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { saveRedmineCredentialAction } from '@/app/(protected)/settings/redmine/actions';

interface SaveCredentialsFormProps {
  currentConfig?: { baseUrl: string; apiKey?: string } | null;
}

export function SaveCredentialsForm({ currentConfig }: SaveCredentialsFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const { pending } = useFormStatus();
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    const result = await saveRedmineCredentialAction(formData);
    
    if (result.success) {
      toast.success(result.message || 'Credentials saved successfully!');
      if (result.redirect) {
        router.push(result.redirect);
      }
    } else {
      toast.error(result.error || 'Failed to save credentials');
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
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
      
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Saving...' : (currentConfig ? "Update Credentials" : "Save Credentials")}
      </Button>
    </form>
  );
}
