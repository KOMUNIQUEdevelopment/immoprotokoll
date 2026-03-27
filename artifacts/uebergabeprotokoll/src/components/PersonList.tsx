import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Person, Gender } from "../types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PersonListProps {
  label: string;
  persons: Person[];
  onChange: (persons: Person[]) => void;
  roleLabel: (gender: Gender) => string;
}

export default function PersonList({ label, persons, onChange, roleLabel }: PersonListProps) {
  const addPerson = () => {
    onChange([...persons, { id: crypto.randomUUID(), name: "", gender: "m" }]);
  };

  const updatePerson = (id: string, updates: Partial<Person>) => {
    onChange(persons.map(p => p.id === id ? { ...p, ...updates } : p));
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
          title="Person hinzufügen"
        >
          <Plus size={13} />
          Person hinzufügen
        </button>
      </div>

      <div className="space-y-2">
        {persons.map((person) => (
          <div key={person.id} className="flex items-center gap-2">
            <Input
              value={person.name}
              onChange={(e) => updatePerson(person.id, { name: e.target.value })}
              placeholder="Vorname Nachname"
              className="flex-1 text-sm"
            />
            <div className="flex border border-border rounded-md overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => updatePerson(person.id, { gender: "m" })}
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  person.gender === "m"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-accent"
                }`}
                title="Männlich"
              >
                {roleLabel("m")}
              </button>
              <button
                type="button"
                onClick={() => updatePerson(person.id, { gender: "f" })}
                className={`px-2.5 py-1.5 text-xs font-medium border-l border-border transition-colors ${
                  person.gender === "f"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-accent"
                }`}
                title="Weiblich"
              >
                {roleLabel("f")}
              </button>
            </div>
            {persons.length > 1 && (
              <button
                type="button"
                onClick={() => removePerson(person.id)}
                className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                title="Entfernen"
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
