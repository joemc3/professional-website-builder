import { useState, useCallback } from 'react';
import { useProfile, usePatchProfile } from '@/hooks/use-profile';
import { useApiKeyStatuses } from '@/hooks/use-settings';
import { synthesizeProfile } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil, Check, X, Sparkles, FileText, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { Basics } from '@/types/api';

function EditableField({
  label,
  value,
  onSave,
  multiline = false,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const save = () => {
    onSave(draft);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="group flex items-start gap-2">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-sm">{value || <span className="italic text-muted-foreground">Not set</span>}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {multiline ? (
        <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} autoFocus />
      ) : (
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
      )}
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={save}>
          <Check className="mr-1 h-3 w-3" /> Save
        </Button>
        <Button size="sm" variant="ghost" onClick={cancel}>
          <X className="mr-1 h-3 w-3" /> Cancel
        </Button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { data: profile, isLoading, error } = useProfile();
  const patchProfile = usePatchProfile();
  const { data: apiKeyStatuses } = useApiKeyStatuses();
  const queryClient = useQueryClient();
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthStatus, setSynthStatus] = useState('');
  const [synthError, setSynthError] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  const configuredProviders = apiKeyStatuses?.filter((s) => s.is_set && s.selected_model) || [];

  const updateBasics = useCallback(
    (field: keyof Basics, value: string) => {
      patchProfile.mutate({
        basics: { ...profile?.data?.basics, [field]: value },
      });
    },
    [patchProfile, profile]
  );

  const handleSynthesize = useCallback(() => {
    if (!selectedModel) return;
    setSynthesizing(true);
    setSynthStatus('Starting...');
    setSynthError('');

    const cancel = synthesizeProfile(
      { model: selectedModel },
      (event, payload) => {
        if (event === 'status') {
          setSynthStatus((payload as { message: string }).message);
        } else if (event === 'section') {
          setSynthStatus(`Processing ${(payload as { section: string }).section}...`);
        } else if (event === 'complete') {
          setSynthesizing(false);
          setSynthStatus('');
          queryClient.invalidateQueries({ queryKey: ['profile'] });
        }
      },
      (err) => {
        setSynthesizing(false);
        setSynthError(err);
      }
    );

    return cancel;
  }, [selectedModel, queryClient]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error && (error as { response?: { status: number } })?.response?.status === 404) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="mb-1 text-lg font-medium">No profile yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Upload documents first, then synthesize your profile using AI.
            </p>

            {configuredProviders.length > 0 && (
              <div className="flex items-center gap-2">
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {configuredProviders.map((p) => (
                      <SelectItem key={p.provider} value={p.selected_model!}>
                        {p.selected_model} ({p.provider})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleSynthesize} disabled={!selectedModel || synthesizing}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {synthesizing ? 'Synthesizing...' : 'Synthesize Profile'}
                </Button>
              </div>
            )}

            {synthesizing && <p className="mt-3 text-sm text-muted-foreground">{synthStatus}</p>}
            {synthError && <p className="mt-3 text-sm text-destructive">{synthError}</p>}

            {configuredProviders.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Configure an API key in Settings first.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
        <Alert variant="destructive">
          <AlertDescription>Failed to load profile.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const data = profile?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
        <div className="flex items-center gap-2">
          {synthesizing && (
            <Badge variant="secondary">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              {synthStatus}
            </Badge>
          )}
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {configuredProviders.map((p) => (
                <SelectItem key={p.provider} value={p.selected_model!}>
                  {p.selected_model} ({p.provider})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSynthesize} disabled={!selectedModel || synthesizing}>
            <Sparkles className="mr-2 h-4 w-4" />
            Re-synthesize
          </Button>
        </div>
      </div>

      {synthError && (
        <Alert variant="destructive">
          <AlertDescription>{synthError}</AlertDescription>
        </Alert>
      )}

      {/* Basics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <EditableField label="Name" value={data?.basics?.name || ''} onSave={(v) => updateBasics('name', v)} />
          <EditableField label="Title" value={data?.basics?.title || ''} onSave={(v) => updateBasics('title', v)} />
          <EditableField label="Email" value={data?.basics?.email || ''} onSave={(v) => updateBasics('email', v)} />
          <EditableField label="Phone" value={data?.basics?.phone || ''} onSave={(v) => updateBasics('phone', v)} />
          <EditableField label="Location" value={data?.basics?.location || ''} onSave={(v) => updateBasics('location', v)} />
          <EditableField label="LinkedIn" value={data?.basics?.linkedin || ''} onSave={(v) => updateBasics('linkedin', v)} />
          <EditableField label="Website" value={data?.basics?.website || ''} onSave={(v) => updateBasics('website', v)} />
          <EditableField label="Summary" value={data?.basics?.summary || ''} onSave={(v) => updateBasics('summary', v)} multiline />
        </CardContent>
      </Card>

      {/* Skills */}
      {data?.skills && data.skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.skills.map((skill, i) => (
              <div key={i}>
                <p className="text-xs font-medium text-muted-foreground">{skill.category}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {skill.items?.map((item, j) => (
                    <Badge key={j} variant="secondary">{item}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Experience */}
      {data?.experience && data.experience.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.experience.map((exp, i) => (
              <div key={i}>
                {i > 0 && <Separator className="mb-4" />}
                <p className="font-medium">{exp.title}</p>
                <p className="text-sm text-muted-foreground">
                  {exp.company} · {exp.start_date} – {exp.current ? 'Present' : exp.end_date}
                </p>
                {exp.description && <p className="mt-1 text-sm">{exp.description}</p>}
                {exp.highlights && exp.highlights.length > 0 && (
                  <ul className="mt-1 list-inside list-disc text-sm">
                    {exp.highlights.map((h, j) => (
                      <li key={j}>{h}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Education */}
      {data?.education && data.education.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Education</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.education.map((edu, i) => (
              <div key={i}>
                {i > 0 && <Separator className="mb-4" />}
                <p className="font-medium">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</p>
                <p className="text-sm text-muted-foreground">
                  {edu.institution} · {edu.start_date} – {edu.end_date}
                </p>
                {edu.notes && <p className="mt-1 text-sm">{edu.notes}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Projects */}
      {data?.projects && data.projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.projects.map((proj, i) => (
              <div key={i}>
                {i > 0 && <Separator className="mb-4" />}
                <p className="font-medium">{proj.name}</p>
                {proj.role && <p className="text-sm text-muted-foreground">{proj.role}</p>}
                {proj.description && <p className="mt-1 text-sm">{proj.description}</p>}
                {proj.technologies && proj.technologies.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {proj.technologies.map((t, j) => (
                      <Badge key={j} variant="outline" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Certifications */}
      {data?.certifications && data.certifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Certifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.certifications.map((cert, i) => (
              <div key={i}>
                <p className="font-medium">{cert.name}</p>
                <p className="text-sm text-muted-foreground">
                  {cert.issuer}{cert.date_obtained ? ` · ${cert.date_obtained}` : ''}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
