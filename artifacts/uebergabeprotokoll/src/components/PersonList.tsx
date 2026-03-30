import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Person } from "../types";
import { Input } from "@/components/ui/input";
import { getTranslations, type SupportedLanguage } from "../i18n";
import type { Translations } from "../i18n/de-CH";

interface PersonListProps {
  label: string;
  persons: Person[];
  onChange: (persons: Person[]) => void;
  language?: SupportedLanguage;
}

export default function PersonList({ label, persons, onChange, language = "de-CH" }: PersonListProps) {
  const tr = getTranslations(language) as Translations;

  const addPerson = () => {
    onChange([...persons, { id: crypto.randomUUID(), name: "", gender: "m" }]);
  };

  const updatePerson = (id: string, name: string) => {
    onChange(persons.map(p => p.id === id ? { ...p, name } : p));
  };

  const removePerson = (id: string) => {
    if (persons.length <= 1) return;
    onChange(persons.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </label>
        <button
          type="button"
          onClick={addPerson}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
          title={tr.person.addPerson}
        >
          <Plus size={13} />
          {tr.person.addPerson}
        </button>
      </div>

      <div className="space-y-2">
        {persons.map((person) => (
          <div key={person.id} className="flex items-center gap-2">
            <Input
              value={person.name}
              onChange={(e) => updatePerson(person.id, e.target.value)}
              placeholder={tr.person.namePlaceholder}
              className="flex-1 text-sm"
            />
            {persons.length > 1 && (
              <button
                type="button"
                onClick={() => removePerson(person.id)}
                className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                title={tr.person.removePerson}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
