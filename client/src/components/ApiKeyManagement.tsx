import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { trpc } from '@/utils/trpc';
import { Plus, Key, User as UserIcon, Calendar, Eye, EyeOff, Copy, Edit2 } from 'lucide-react';
import type { 
  User, 
  ApiKey, 
  CreateApiKeyInput,
  UpdateApiKeyInput
} from '../../../server/src/schema';

interface ApiKeyManagementProps {
  users: User[];
  onRefresh: () => void;
}

export function ApiKeyManagement({ users, onRefresh }: ApiKeyManagementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userApiKeys, setUserApiKeys] = useState<ApiKey[]>([]);
  const [visibleKeys, setVisibleKeys] = useState<Set<number>>(new Set());
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  
  // Form state for creating new API keys
  const [createFormData, setCreateFormData] = useState<CreateApiKeyInput>({
    user_id: 0,
    key_hash: '',
    name: ''
  });

  // Form state for editing API keys
  const [editFormData, setEditFormData] = useState<Omit<UpdateApiKeyInput, 'id'>>({
    name: '',
    is_active: true
  });

  // Load API keys for selected user
  const loadUserApiKeys = useCallback(async (userId: number) => {
    setIsLoading(true);
    try {
      const keys = await trpc.getApiKeysByUser.query({ userId });
      setUserApiKeys(keys);
    } catch (error) {
      console.error('Failed to load API keys:', error);
      setUserApiKeys([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadUserApiKeys(selectedUserId);
    } else {
      setUserApiKeys([]);
    }
  }, [selectedUserId, loadUserApiKeys]);

  // Generate a mock API key (in production, this would be generated securely on the server)
  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'sk-';
    for (let i = 0; i < 48; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    
    setIsLoading(true);
    try {
      // Generate API key and hash it (in production, hashing would be done server-side)
      const apiKey = generateApiKey();
      const keyData = {
        ...createFormData,
        user_id: selectedUserId,
        key_hash: apiKey // In production, this would be hashed
      };
      
      await trpc.createApiKey.mutate(keyData);
      await loadUserApiKeys(selectedUserId);
      
      setCreateFormData({
        user_id: 0,
        key_hash: '',
        name: ''
      });
      onRefresh();
    } catch (error) {
      console.error('Failed to create API key:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditKey = (key: ApiKey) => {
    setEditingKey(key);
    setEditFormData({
      name: key.name,
      is_active: key.is_active
    });
  };

  const handleUpdateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKey) return;
    
    setIsLoading(true);
    try {
      await trpc.updateApiKey.mutate({
        id: editingKey.id,
        ...editFormData
      });
      if (selectedUserId) {
        await loadUserApiKeys(selectedUserId);
      }
      setEditingKey(null);
      onRefresh();
    } catch (error) {
      console.error('Failed to update API key:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditFormData({
      name: '',
      is_active: true
    });
  };

  const toggleKeyVisibility = (keyId: number) => {
    setVisibleKeys((prev: Set<number>) => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 8) + '•'.repeat(key.length - 12) + key.substring(key.length - 4);
  };

  const getSelectedUser = () => {
    return users.find(user => user.id === selectedUserId);
  };

  return (
    <div className="space-y-6">
      {/* User Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserIcon className="w-5 h-5 mr-2" />
            Select User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Choose a user to manage their API keys</Label>
              <Select 
                value={selectedUserId?.toString() || ''} 
                onValueChange={(value: string) => setSelectedUserId(parseInt(value) || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user: User) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedUserId && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm">
                  Managing API keys for: <strong>{getSelectedUser()?.name}</strong>
                </p>
                <p className="text-xs text-gray-600">{getSelectedUser()?.email}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedUserId && (
        <>
          {/* Create API Key Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="w-5 h-5 mr-2" />
                Create New API Key
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateApiKey} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api-key-name">API Key Name</Label>
                  <Input
                    id="api-key-name"
                    placeholder="e.g., Production API, Development Key"
                    value={createFormData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateApiKeyInput) => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </div>
                
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'Creating API Key...' : 'Generate API Key'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Separator />

          {/* API Keys List */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              API Keys for {getSelectedUser()?.name} ({userApiKeys.length})
            </h3>
            
            {isLoading ? (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading API keys...</p>
                </CardContent>
              </Card>
            ) : userApiKeys.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No API keys found for this user. Create one above!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {userApiKeys.map((key: ApiKey) => (
                  <Card key={key.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      {editingKey?.id === key.id ? (
                        /* Edit Form */
                        <form onSubmit={handleUpdateApiKey} className="space-y-4">
                          <div className="space-y-2">
                            <Label>API Key Name</Label>
                            <Input
                              value={editFormData.name}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setEditFormData((prev: any) => ({ ...prev, name: e.target.value }))
                              }
                              required
                            />
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={editFormData.is_active}
                              onCheckedChange={(checked: boolean) =>
                                setEditFormData((prev: any) => ({ ...prev, is_active: checked }))
                              }
                            />
                            <Label>Active</Label>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button type="submit" disabled={isLoading} size="sm">
                              {isLoading ? 'Saving...' : 'Save Changes'}
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>
                              Cancel
                            </Button>
                          </div>
                        </form>
                      ) : (
                        /* Display Mode */
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-lg font-semibold">{key.name}</h4>
                              <Badge variant={key.is_active ? 'default' : 'secondary'}>
                                {key.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditKey(key)}
                            >
                              <Edit2 className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-xs">API Key</Label>
                            <div className="flex items-center space-x-2">
                              <code className="flex-1 p-2 bg-gray-100 rounded text-sm font-mono">
                                {visibleKeys.has(key.id) ? key.key_hash : maskApiKey(key.key_hash)}
                              </code>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleKeyVisibility(key.id)}
                              >
                                {visibleKeys.has(key.id) ? 
                                  <EyeOff className="w-4 h-4" /> : 
                                  <Eye className="w-4 h-4" />
                                }
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(key.key_hash)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              Created {key.created_at.toLocaleDateString()}
                            </div>
                            {key.last_used_at && (
                              <div className="flex items-center">
                                <Key className="w-4 h-4 mr-1" />
                                Last used {key.last_used_at.toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}