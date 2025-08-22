import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, DollarSign, Key, Phone, FileText } from 'lucide-react';
import type { 
  SubscriptionPlan, 
  CreateSubscriptionPlanInput 
} from '../../../server/src/schema';

interface SubscriptionPlanManagementProps {
  subscriptionPlans: SubscriptionPlan[];
  onCreatePlan: (planData: CreateSubscriptionPlanInput) => Promise<SubscriptionPlan>;
  onRefresh: () => void;
}

export function SubscriptionPlanManagement({ subscriptionPlans, onCreatePlan, onRefresh }: SubscriptionPlanManagementProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state for creating new plans
  const [formData, setFormData] = useState<CreateSubscriptionPlanInput>({
    name: '',
    description: null,
    price: 0,
    max_api_keys: null,
    max_monthly_calls: null
  });

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onCreatePlan(formData);
      setFormData({
        name: '',
        description: null,
        price: 0,
        max_api_keys: null,
        max_monthly_calls: null
      });
    } catch (error) {
      console.error('Failed to create subscription plan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatLimits = (plan: SubscriptionPlan) => {
    const limits = [];
    if (plan.max_api_keys !== null) {
      limits.push(`${plan.max_api_keys} API keys`);
    }
    if (plan.max_monthly_calls !== null) {
      limits.push(`${plan.max_monthly_calls.toLocaleString()} calls/month`);
    }
    return limits.length > 0 ? limits.join(' • ') : 'Unlimited';
  };

  const getPlanColor = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes('free') || name.includes('basic')) return 'secondary';
    if (name.includes('pro') || name.includes('premium')) return 'default';
    if (name.includes('enterprise') || name.includes('business')) return 'destructive';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      {/* Create Plan Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Create New Subscription Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreatePlan} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan-name">Plan Name</Label>
                <Input
                  id="plan-name"
                  placeholder="e.g., Pro, Enterprise, Basic"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateSubscriptionPlanInput) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="plan-price">Monthly Price ($)</Label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    id="plan-price"
                    type="number"
                    placeholder="9.99"
                    value={formData.price}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateSubscriptionPlanInput) => ({ 
                        ...prev, 
                        price: parseFloat(e.target.value) || 0 
                      }))
                    }
                    step="0.01"
                    min="0"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="plan-description">Description</Label>
              <Textarea
                id="plan-description"
                placeholder="Describe the features and benefits of this plan..."
                value={formData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateSubscriptionPlanInput) => ({ 
                    ...prev, 
                    description: e.target.value || null 
                  }))
                }
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max-api-keys">Max API Keys</Label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    id="max-api-keys"
                    type="number"
                    placeholder="Leave empty for unlimited"
                    value={formData.max_api_keys || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateSubscriptionPlanInput) => ({ 
                        ...prev, 
                        max_api_keys: e.target.value ? parseInt(e.target.value) : null 
                      }))
                    }
                    min="1"
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max-monthly-calls">Max Monthly Calls</Label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    id="max-monthly-calls"
                    type="number"
                    placeholder="Leave empty for unlimited"
                    value={formData.max_monthly_calls || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateSubscriptionPlanInput) => ({ 
                        ...prev, 
                        max_monthly_calls: e.target.value ? parseInt(e.target.value) : null 
                      }))
                    }
                    min="1"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Creating Plan...' : 'Create Subscription Plan'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Plans List */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          Subscription Plans ({subscriptionPlans.length})
        </h3>
        
        {subscriptionPlans.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No subscription plans found. Create your first plan above!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {subscriptionPlans
              .sort((a: SubscriptionPlan, b: SubscriptionPlan) => a.price - b.price)
              .map((plan: SubscriptionPlan) => (
              <Card key={plan.id} className="hover:shadow-lg transition-shadow relative overflow-hidden">
                {plan.price === 0 && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary">Free</Badge>
                  </div>
                )}
                
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <Badge variant={getPlanColor(plan.name)}>
                      {plan.name.toLowerCase().includes('enterprise') ? '🏢' : 
                       plan.name.toLowerCase().includes('pro') ? '⭐' : '📦'}
                    </Badge>
                  </div>
                  
                  <div className="text-3xl font-bold">
                    ${plan.price.toFixed(2)}
                    <span className="text-sm font-normal text-gray-500">/month</span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {plan.description && (
                    <div className="flex items-start space-x-2">
                      <FileText className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                      <p className="text-sm text-gray-600">{plan.description}</p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Plan Limits:</h4>
                    <p className="text-sm text-gray-600">{formatLimits(plan)}</p>
                    
                    {(plan.max_api_keys !== null || plan.max_monthly_calls !== null) && (
                      <div className="space-y-1 text-xs text-gray-500">
                        {plan.max_api_keys !== null && (
                          <div className="flex items-center">
                            <Key className="w-3 h-3 mr-1" />
                            Up to {plan.max_api_keys} API keys
                          </div>
                        )}
                        {plan.max_monthly_calls !== null && (
                          <div className="flex items-center">
                            <Phone className="w-3 h-3 mr-1" />
                            Up to {plan.max_monthly_calls.toLocaleString()} calls per month
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-500">
                      Created {plan.created_at.toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}