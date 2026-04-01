import { useState } from 'react';
import {
  useApiKeyStatuses,
  useModels,
  useSaveApiKey,
  useDeleteApiKey,
  useSelectModel,
  useTestConnection,
} from '@/hooks/use-settings';
import { setUsername as setUsernameApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, X, Loader2 } from 'lucide-react';

const PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...' },
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-...' },
  { id: 'gemini', name: 'Google Gemini', placeholder: 'AIza...' },
  { id: 'openrouter', name: 'OpenRouter', placeholder: 'sk-or-...' },
] as const;

function UsernameSection() {
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const res = await setUsernameApi({ username });
      setSuccess(`Username set to "${res.username}"`);
    } catch (err) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Failed to set username'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Username
          <Badge variant="outline">Required for sites</Badge>
        </CardTitle>
        <CardDescription>
          Your username determines your public site URLs. Must be 3-50 characters, lowercase
          letters, numbers, and hyphens.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        <div className="flex gap-2">
          <Input
            placeholder="your-username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            className="max-w-xs"
          />
          <Button onClick={handleSave} disabled={!username || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProviderCard({
  providerId,
  providerName,
  placeholder,
}: {
  providerId: string;
  providerName: string;
  placeholder: string;
}) {
  const { data: statuses } = useApiKeyStatuses();
  const { data: modelList } = useModels(providerId);
  const saveKey = useSaveApiKey();
  const deleteKey = useDeleteApiKey();
  const selectModel = useSelectModel();
  const testConn = useTestConnection();

  const status = statuses?.find((s) => s.provider === providerId);
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState('');

  const handleSaveKey = async () => {
    setError('');
    try {
      await saveKey.mutateAsync({ provider: providerId, api_key: keyInput });
      setKeyInput('');
    } catch (err) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Failed to save key'
      );
    }
  };

  const handleDelete = async () => {
    setError('');
    try {
      await deleteKey.mutateAsync(providerId);
    } catch {
      setError('Failed to delete key');
    }
  };

  const handleSelectModel = async (model: string) => {
    try {
      await selectModel.mutateAsync({ provider: providerId, data: { model } });
    } catch {
      setError('Failed to select model');
    }
  };

  const handleTest = async () => {
    setError('');
    try {
      const result = await testConn.mutateAsync({ provider: providerId });
      if (result.status === 'error') {
        setError(result.message || 'Connection test failed');
      }
    } catch {
      setError('Connection test failed');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">{providerName}</span>
          {status?.is_set ? (
            <Badge variant="default">
              <Check className="mr-1 h-3 w-3" />
              Configured
            </Badge>
          ) : (
            <Badge variant="outline">Not set</Badge>
          )}
        </div>
        {status?.is_set && (
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testConn.isPending}
            >
              {testConn.isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : null}
              Test
            </Button>
            {testConn.isSuccess && testConn.data?.status === 'ok' && (
              <Badge variant="default" className="self-center">
                <Check className="mr-1 h-3 w-3" /> OK
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={handleDelete}>
              <X className="mr-1 h-3 w-3" />
              Remove
            </Button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!status?.is_set && (
        <div className="flex gap-2">
          <Input
            type="password"
            placeholder={placeholder}
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            className="max-w-sm"
          />
          <Button onClick={handleSaveKey} disabled={!keyInput || saveKey.isPending} size="sm">
            {saveKey.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Save
          </Button>
        </div>
      )}

      {status?.is_set && modelList && modelList.models.length > 0 && (
        <div className="flex items-center gap-2">
          <Label className="text-sm">Model:</Label>
          <Select
            value={status.selected_model || ''}
            onValueChange={handleSelectModel}
          >
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {modelList.models.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name || m.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Settings</h2>

      <UsernameSection />

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Configure LLM provider API keys for profile synthesis and job posting extraction.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {PROVIDERS.map((provider, i) => (
            <div key={provider.id}>
              {i > 0 && <Separator className="mb-6" />}
              <ProviderCard
                providerId={provider.id}
                providerName={provider.name}
                placeholder={provider.placeholder}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
