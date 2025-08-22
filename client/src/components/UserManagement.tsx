import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import { Plus, Mail, User as UserIcon, Calendar, Edit2 } from 'lucide-react';
import type { 
  User, 
  SubscriptionPlan, 
  CreateUserInput, 
  UpdateUserInput 
} from '../../../server/src/schema';

interface UserManagementProps {
  users: User[];
  subscriptionPlans: SubscriptionPlan[];
  onCreateUser: (userData: CreateUserInput) => Promise<User>;
  onRefresh: () => void;
}

export function UserManagement({ users, subscriptionPlans, onCreateUser, onRefresh }: UserManagementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form state for creating new users
  const [createFormData, setCreateFormData] = useState<CreateUserInput>({
    email: '',
    name: '',
    subscription_plan_id: null
  });

  // Form state for editing existing users
  const [editFormData, setEditFormData] = useState<Omit<UpdateUserInput, 'id'>>({
    email: '',
    name: '',
    subscription_plan_id: null
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onCreateUser(createFormData);
      setCreateFormData({
        email: '',
        name: '',
        subscription_plan_id: null
      });
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      email: user.email,
      name: user.name,
      subscription_plan_id: user.subscription_plan_id
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setIsLoading(true);
    try {
      await trpc.updateUser.mutate({
        id: editingUser.id,
        ...editFormData
      });
      setEditingUser(null);
      onRefresh();
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditFormData({
      email: '',
      name: '',
      subscription_plan_id: null
    });
  };

  const getPlanName = (planId: number | null) => {
    if (!planId) return 'No subscription';
    const plan = subscriptionPlans.find(p => p.id === planId);
    return plan?.name || 'Unknown plan';
  };

  const getPlanPrice = (planId: number | null) => {
    if (!planId) return 0;
    const plan = subscriptionPlans.find(p => p.id === planId);
    return plan?.price || 0;
  };

  return (
    <div className="space-y-6">
      {/* Create User Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Create New User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-email">Email Address</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    id="create-email"
                    type="email"
                    placeholder="user@example.com"
                    value={createFormData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                    }
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="create-name">Full Name</Label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    id="create-name"
                    placeholder="John Doe"
                    value={createFormData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateUserInput) => ({ ...prev, name: e.target.value }))
                    }
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="create-plan">Subscription Plan</Label>
              <Select 
                value={createFormData.subscription_plan_id?.toString() || 'none'} 
                onValueChange={(value: string) =>
                  setCreateFormData((prev: CreateUserInput) => ({ 
                    ...prev, 
                    subscription_plan_id: value === 'none' ? null : parseInt(value) 
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a subscription plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No subscription</SelectItem>
                  {subscriptionPlans.map((plan: SubscriptionPlan) => (
                    <SelectItem key={plan.id} value={plan.id.toString()}>
                      {plan.name} - ${plan.price.toFixed(2)}/month
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Creating User...' : 'Create User'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Users List */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          All Users ({users.length})
        </h3>
        
        {users.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No users found. Create your first user above!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {users.map((user: User) => (
              <Card key={user.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  {editingUser?.id === user.id ? (
                    /* Edit Form */
                    <form onSubmit={handleUpdateUser} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Email Address</Label>
                          <Input
                            type="email"
                            value={editFormData.email}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setEditFormData((prev: any) => ({ ...prev, email: e.target.value }))
                            }
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Full Name</Label>
                          <Input
                            value={editFormData.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setEditFormData((prev: any) => ({ ...prev, name: e.target.value }))
                            }
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Subscription Plan</Label>
                        <Select 
                          value={editFormData.subscription_plan_id?.toString() || 'none'} 
                          onValueChange={(value: string) =>
                            setEditFormData((prev: any) => ({ 
                              ...prev, 
                              subscription_plan_id: value === 'none' ? null : parseInt(value) 
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No subscription</SelectItem>
                            {subscriptionPlans.map((plan: SubscriptionPlan) => (
                              <SelectItem key={plan.id} value={plan.id.toString()}>
                                {plan.name} - ${plan.price.toFixed(2)}/month
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-lg font-semibold">{user.name}</h4>
                          <Badge variant={user.subscription_plan_id ? 'default' : 'secondary'}>
                            {getPlanName(user.subscription_plan_id)}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-1" />
                            {user.email}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            Joined {user.created_at.toLocaleDateString()}
                          </div>
                        </div>
                        
                        {user.subscription_plan_id && (
                          <p className="text-sm font-medium text-green-600">
                            ${getPlanPrice(user.subscription_plan_id).toFixed(2)}/month
                          </p>
                        )}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}