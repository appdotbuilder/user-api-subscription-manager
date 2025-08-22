import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Mic, Hash, FileText, Calendar, Play } from 'lucide-react';
import type { 
  Voice, 
  CreateVoiceInput 
} from '../../../server/src/schema';

interface VoiceManagementProps {
  voices: Voice[];
  onCreateVoice: (voiceData: CreateVoiceInput) => Promise<Voice>;
  onRefresh: () => void;
}

export function VoiceManagement({ voices, onCreateVoice, onRefresh }: VoiceManagementProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state for creating new voices
  const [formData, setFormData] = useState<CreateVoiceInput>({
    name: '',
    identifier: '',
    description: null
  });

  const handleCreateVoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onCreateVoice(formData);
      setFormData({
        name: '',
        identifier: '',
        description: null
      });
    } catch (error) {
      console.error('Failed to create voice:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate identifier from name
  const generateIdentifier = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData((prev: CreateVoiceInput) => ({
      ...prev,
      name,
      identifier: prev.identifier || generateIdentifier(name)
    }));
  };

  const getVoiceTypeFromName = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('male') && !lowerName.includes('female')) return '👨';
    if (lowerName.includes('female') && !lowerName.includes('male')) return '👩';
    if (lowerName.includes('child')) return '🧒';
    if (lowerName.includes('robot') || lowerName.includes('synthetic')) return '🤖';
    return '🎙️';
  };

  const getVoiceLanguage = (name: string, identifier: string) => {
    const text = (name + ' ' + identifier).toLowerCase();
    if (text.includes('en') || text.includes('english')) return 'EN';
    if (text.includes('es') || text.includes('spanish')) return 'ES';
    if (text.includes('fr') || text.includes('french')) return 'FR';
    if (text.includes('de') || text.includes('german')) return 'DE';
    if (text.includes('it') || text.includes('italian')) return 'IT';
    if (text.includes('pt') || text.includes('portuguese')) return 'PT';
    if (text.includes('zh') || text.includes('chinese')) return 'ZH';
    if (text.includes('ja') || text.includes('japanese')) return 'JA';
    if (text.includes('ko') || text.includes('korean')) return 'KO';
    return 'UN'; // Unknown
  };

  return (
    <div className="space-y-6">
      {/* Create Voice Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Add New Voice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateVoice} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="voice-name">Voice Name</Label>
                <div className="relative">
                  <Mic className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    id="voice-name"
                    placeholder="e.g., Sarah (Female), Marcus (Male)"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleNameChange(e.target.value)
                    }
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="voice-identifier">Voice Identifier</Label>
                <div className="relative">
                  <Hash className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    id="voice-identifier"
                    placeholder="e.g., sarah_female_en, marcus_male_en"
                    value={formData.identifier}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateVoiceInput) => ({ ...prev, identifier: e.target.value }))
                    }
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="voice-description">Description</Label>
              <Textarea
                id="voice-description"
                placeholder="Describe the voice characteristics, accent, tone, etc..."
                value={formData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateVoiceInput) => ({ 
                    ...prev, 
                    description: e.target.value || null 
                  }))
                }
                rows={3}
              />
            </div>
            
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Adding Voice...' : 'Add Voice to Library'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Voices List */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          Voice Library ({voices.length})
        </h3>
        
        {voices.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Mic className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No voices in the library. Add your first voice above!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {voices
              .sort((a: Voice, b: Voice) => a.name.localeCompare(b.name))
              .map((voice: Voice) => (
              <Card key={voice.id} className="hover:shadow-lg transition-shadow group">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{getVoiceTypeFromName(voice.name)}</span>
                      <CardTitle className="text-lg">{voice.name}</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {getVoiceLanguage(voice.name, voice.identifier)}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <Hash className="w-3 h-3 text-gray-400" />
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                        {voice.identifier}
                      </code>
                    </div>
                    
                    {voice.description && (
                      <div className="flex items-start space-x-2 text-sm">
                        <FileText className="w-3 h-3 mt-0.5 text-gray-400 flex-shrink-0" />
                        <p className="text-gray-600 text-xs leading-relaxed">
                          {voice.description}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Demo button placeholder */}
                  <div className="pt-2 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Preview Voice
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      Added {voice.created_at.toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Statistics */}
      {voices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Library Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{voices.length}</div>
                <div className="text-sm text-gray-500">Total Voices</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {new Set(voices.map(v => getVoiceLanguage(v.name, v.identifier))).size}
                </div>
                <div className="text-sm text-gray-500">Languages</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {voices.filter(v => v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('female')).length}
                </div>
                <div className="text-sm text-gray-500">Male Voices</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-pink-600">
                  {voices.filter(v => v.name.toLowerCase().includes('female')).length}
                </div>
                <div className="text-sm text-gray-500">Female Voices</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}