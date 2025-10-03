'use client';

import { Switch } from '@/components/ui/switch';
import { useState } from 'react';

interface PreferenceSwitchProps {
  name: string;
  id: string;
  defaultChecked: boolean;
}

export function PreferenceSwitch({ name, id, defaultChecked }: PreferenceSwitchProps) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={setChecked}
      />
      <input
        type="hidden"
        name={name}
        value={checked ? 'on' : 'off'}
      />
    </>
  );
}

