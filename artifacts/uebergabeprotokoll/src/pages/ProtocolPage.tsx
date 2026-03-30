import React, { useState } from "react";
import { ProtocolData, ZusatzvereinbarungEntry } from "../types";
import PersonList from "../components/PersonList";
import AutoGrowTextarea from "../components/AutoGrowTextarea";
import PhotoManager from "../components/PhotoManager";
import FloorEditor from "../components/FloorEditor";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Plus, Trash2, Pencil } from "lucide-react";
import { getTranslations, type SupportedLanguage } from "../i18n";
import type { Translations } from "../i18n/de-CH";

interface ProtocolPageProps {
  protocol: ProtocolData;
  updateProtocol: (fn: (p: ProtocolData) => ProtocolData) => void;
  language?: SupportedLanguage;
}

function CollapsibleSection({ title, children, defaultOpen = false }: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm"
      >
        {title}
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
      {children}
    </label>
  );
}

export default function ProtocolPage({ protocol, updateProtocol, language = "de-CH" }: ProtocolPageProps) {
  const tr = getTranslations(language) as Translations;
  const setField = (field: keyof ProtocolData, value: unknown) => {
    updateProtocol(p => ({ ...p, [field]: value }));
  };

  return (
    <div className="space-y-2">
      <CollapsibleSection title={tr.editor.generalInfo} defaultOpen={true}>
        <div className="px-1 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>{tr.editor.rentalObject}</FieldLabel>
              <Input
                value={protocol.mietobjekt}
                onChange={(e) => setField("mietobjekt", e.target.value)}
                placeholder={tr.editor.rentalObjectPlaceholder}
              />
            </div>
            <div>
              <FieldLabel>{tr.editor.handoverDate}</FieldLabel>
              <Input
                value={protocol.datum}
                onChange={(e) => setField("datum", e.target.value)}
                placeholder={tr.editor.datePlaceholder}
              />
            </div>
          </div>

          <div>
            <FieldLabel>{tr.common.address}</FieldLabel>
            <Input
              value={protocol.adresse}
              onChange={(e) => setField("adresse", e.target.value)}
              placeholder={tr.editor.addressPlaceholder}
            />
          </div>

          <div className="border border-border rounded-xl p-3 space-y-2 bg-card">
            <PersonList
              label={tr.editor.landlord}
              persons={protocol.uebergeber}
              onChange={(persons) => setField("uebergeber", persons)}
              language={language}
            />
          </div>

          <div className="border border-border rounded-xl p-3 space-y-2 bg-card">
            <PersonList
              label={tr.editor.tenant}
              persons={protocol.uebernehmer}
              onChange={(persons) => setField("uebernehmer", persons)}
              language={language}
            />
          </div>

          <div>
            <FieldLabel>{tr.editor.keyHandover}</FieldLabel>
            <Input
              value={protocol.schluessel}
              onChange={(e) => setField("schluessel", e.target.value)}
              placeholder={tr.editor.keyHandoverPlaceholder}
            />
          </div>
          <div>
            <FieldLabel>{tr.editor.keyDetails}</FieldLabel>
            <AutoGrowTextarea
              value={protocol.schluesselDetails}
              onChange={(e) => setField("schluesselDetails", e.target.value)}
              placeholder={tr.editor.keyDetailsPlaceholder}
            />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title={tr.editor.meterReadings}>
        <div className="px-1 space-y-4">
          <div className="space-y-3">
            {protocol.meterReadings.map((meter, i) => (
              <div key={i} className="flex items-center gap-2">
                <label className="text-sm font-medium w-20 shrink-0">{meter.type}</label>
                <Input
                  value={meter.stand}
                  onChange={(e) => {
                    const updated = [...protocol.meterReadings];
                    updated[i] = { ...meter, stand: e.target.value };
                    setField("meterReadings", updated);
                  }}
                  placeholder={tr.editor.meterReadingIn.replace("{{unit}}", meter.einheit)}
                  className="text-sm"
                />
                <span className="text-sm text-muted-foreground shrink-0">{meter.einheit}</span>
              </div>
            ))}
          </div>
          <div>
            <p className="text-sm font-medium mb-2">{tr.editor.meterPhotos}</p>
            <PhotoManager
              photos={protocol.meterPhotos ?? []}
              onChange={(photos) => setField("meterPhotos", photos)}
              roomName={tr.editor.meterReadings}
              language={language}
            />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title={tr.editor.kitchen}>
        <div className="px-1 space-y-3">
          {protocol.appliances.map((app, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 items-center">
              <label className="text-sm font-medium">{app.name}</label>
              <Input
                value={app.zustand}
                onChange={(e) => {
                  const updated = [...protocol.appliances];
                  updated[i] = { ...app, zustand: e.target.value };
                  setField("appliances", updated);
                }}
                placeholder={tr.editor.applianceCondition}
                className="text-sm"
              />
            </div>
          ))}
          <div>
            <FieldLabel>{tr.editor.kitchenCondition}</FieldLabel>
            <AutoGrowTextarea
              value={protocol.allgemeinerZustandKueche}
              onChange={(e) => setField("allgemeinerZustandKueche", e.target.value)}
              placeholder={tr.editor.kitchenConditionPlaceholder}
            />
          </div>
          <div>
            <FieldLabel>{tr.editor.kitchenPhotos}</FieldLabel>
            <PhotoManager
              photos={protocol.kitchenPhotos ?? []}
              onChange={(photos) => setField("kitchenPhotos", photos)}
              roomName={tr.editor.kitchen}
              language={language}
            />
          </div>
        </div>
      </CollapsibleSection>

      <div>
        <FloorEditor protocol={protocol} updateProtocol={updateProtocol} language={language} />
      </div>

      <ZusatzvereinbarungSection
        sectionTitle={protocol.zusatzvereinbarungTitle ?? tr.editor.defaultClauseTitle}
        entries={protocol.zusatzvereinbarungen ?? []}
        onTitleChange={val => updateProtocol(p => ({ ...p, zusatzvereinbarungTitle: val }))}
        onEntriesChange={entries => updateProtocol(p => ({ ...p, zusatzvereinbarungen: entries }))}
        tr={tr}
      />
    </div>
  );
}

interface ZusatzvereinbarungSectionProps {
  sectionTitle: string;
  entries: ZusatzvereinbarungEntry[];
  onTitleChange: (val: string) => void;
  onEntriesChange: (entries: ZusatzvereinbarungEntry[]) => void;
  tr: Translations;
}

function ZusatzvereinbarungSection({ sectionTitle, entries, onTitleChange, onEntriesChange, tr }: ZusatzvereinbarungSectionProps) {
  const [open, setOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(sectionTitle);

  const addEntry = () => {
    const newEntry: ZusatzvereinbarungEntry = {
      id: crypto.randomUUID(),
      title: tr.editor.newSection,
      content: "",
    };
    onEntriesChange([...entries, newEntry]);
  };

  const removeEntry = (id: string, title: string) => {
    const label = title.trim() || tr.editor.deleteSection;
    if (!window.confirm(`„${label}" ${tr.editor.deleteSection.toLowerCase()}?`)) return;
    onEntriesChange(entries.filter(e => e.id !== id));
  };

  const updateEntry = (id: string, patch: Partial<ZusatzvereinbarungEntry>) => {
    onEntriesChange(entries.map(e => e.id === id ? { ...e, ...patch } : e));
  };

  const commitTitle = () => {
    if (titleDraft.trim()) onTitleChange(titleDraft.trim());
    setEditingTitle(false);
  };

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTitleDraft(sectionTitle);
    setEditingTitle(true);
  };

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => !editingTitle && setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm"
      >
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={e => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => {
              e.stopPropagation();
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") { setTitleDraft(sectionTitle); setEditingTitle(false); }
            }}
            className="flex-1 bg-transparent border-b border-primary-foreground/50 outline-none text-sm font-semibold text-left"
          />
        ) : (
          <span className="flex-1 text-left truncate">{sectionTitle}</span>
        )}
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {!editingTitle && (
            <span
              role="button"
              onClick={startEdit}
              className="p-1 rounded hover:bg-primary-foreground/10 transition-colors"
              title={tr.common.edit}
            >
              <Pencil size={13} className="opacity-70" />
            </span>
          )}
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {open && (
        <div className="mt-3 space-y-4 px-1">
          {entries.map((entry, idx) => (
            <div key={entry.id} className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
                <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
                <Input
                  value={entry.title}
                  onChange={e => updateEntry(entry.id, { title: e.target.value })}
                  className="flex-1 h-7 text-sm font-semibold border-0 bg-transparent shadow-none focus-visible:ring-0 px-0"
                  placeholder={tr.editor.sectionTitle}
                />
                <button
                  type="button"
                  onClick={() => removeEntry(entry.id, entry.title)}
                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  title={tr.editor.deleteSection}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="px-3 py-2">
                <AutoGrowTextarea
                  value={entry.content}
                  onChange={e => updateEntry(entry.id, { content: e.target.value })}
                  placeholder={tr.editor.sectionContent}
                  className="text-sm leading-relaxed"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addEntry}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus size={15} />
            {tr.editor.addAdditionalClause}
          </button>
        </div>
      )}
    </div>
  );
}
