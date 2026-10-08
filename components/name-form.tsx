"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** 変更があるときだけ Save を出す。key={name} で保存後の値に追従させる */
export function NameForm({
  id,
  name,
  label,
  saveLabel,
  disabled,
  saving,
  onSave,
}: {
  id: string;
  name: string;
  label: string;
  saveLabel: string;
  disabled: boolean;
  saving: boolean;
  onSave: (name: string) => void;
}) {
  const [draft, setDraft] = useState(name);
  const trimmed = draft.trim();
  const dirty = trimmed !== name && trimmed.length > 0;
  return (
    <form
      className="grid gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty) onSave(trimmed);
      }}
    >
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          disabled={disabled}
          maxLength={100}
          onChange={(e) => setDraft(e.target.value)}
        />
        {dirty && (
          <Button type="submit" disabled={disabled} loading={saving}>
            {saveLabel}
          </Button>
        )}
      </div>
    </form>
  );
}
