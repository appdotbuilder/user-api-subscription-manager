import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/utils/trpc';

// Import types from server
import type { 
  User, 
  SubscriptionPlan, 
  ApiKey, 
  Voice, 
  CallSession, 
  Turn,
  CreateUserInput,
  CreateSubscriptionPlanInput,
  CreateApiKeyInput,
  CreateVoiceInput,
  CreateCallSessionInput,
  CreateTurnInput
} from '../../server/src/schema';

// Import components
import { UserManagement } from '@/components/UserManagement';
import { SubscriptionPlanManagement } from '@/components/SubscriptionPlanManagement';
import { ApiKeyManagement } from '@/components/ApiKeyManagement';
import { VoiceManagement } from '@/components/VoiceManagement';
import { CallSessionManagement } from '@/components/CallSessionManagement';
import { Dashboard } from '@/components/Dashboard';

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersData, plansData, voicesData] = await Promise.all([
        trpc.getUsers.query(),
        trpc.getSubscriptionPlans.query(),
        trpc.getVoices.query()
      ]);
      
      setUsers(usersData);
      setSubscriptionPlans(plansData);
      setVoices(voicesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handler functions for CRUD operations
  const handleCreateUser = async (userData: CreateUserInput) => {
    const newUser = await trpc.createUser.mutate(userData);
    setUsers((prev: User[]) => [...prev, newUser]);
    return newUser;
  };

  const handleCreateSubscriptionPlan = async (planData: CreateSubscriptionPlanInput) => {
    const newPlan = await trpc.createSubscriptionPlan.mutate(planData);
    setSubscriptionPlans((prev: SubscriptionPlan[]) => [...prev, newPlan]);
    return newPlan;
  };

  const handleCreateVoice = async (voiceData: CreateVoiceInput) => {
    const newVoice = await trpc.createVoice.mutate(voiceData);
    setVoices((prev: Voice[]) => [...prev, newVoice]);
    return newVoice;
  };

  const refreshData = useCallback(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading platform data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎙️ Voice Platform Management
          </h1>
          <p className="text-lg text-gray-600">
            Manage users, API keys, subscription plans, voices, and call sessions
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:grid-cols-6">
            <TabsTrigger value="dashboard" className="text-sm">📊 Dashboard</TabsTrigger>
            <TabsTrigger value="users" className="text-sm">👥 Users</TabsTrigger>
            <TabsTrigger value="plans" className="text-sm">💳 Plans</TabsTrigger>
            <TabsTrigger value="api-keys" className="text-sm">🔑 API Keys</TabsTrigger>
            <TabsTrigger value="voices" className="text-sm">🎵 Voices</TabsTrigger>
            <TabsTrigger value="calls" className="text-sm">📞 Call Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard 
              users={users}
              subscriptionPlans={subscriptionPlans}
              voices={voices}
              onRefresh={refreshData}
            />
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>👥 User Management</CardTitle>
                <CardDescription>
                  Create and manage user accounts with subscription plans
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserManagement
                  users={users}
                  subscriptionPlans={subscriptionPlans}
                  onCreateUser={handleCreateUser}
                  onRefresh={refreshData}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plans">
            <Card>
              <CardHeader>
                <CardTitle>💳 Subscription Plan Management</CardTitle>
                <CardDescription>
                  Configure subscription tiers and pricing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SubscriptionPlanManagement
                  subscriptionPlans={subscriptionPlans}
                  onCreatePlan={handleCreateSubscriptionPlan}
                  onRefresh={refreshData}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api-keys">
            <Card>
              <CardHeader>
                <CardTitle>🔑 API Key Management</CardTitle>
                <CardDescription>
                  Manage API keys for user authentication
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ApiKeyManagement
                  users={users}
                  onRefresh={refreshData}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="voices">
            <Card>
              <CardHeader>
                <CardTitle>🎵 Voice Library</CardTitle>
                <CardDescription>
                  Manage available voices for the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VoiceManagement
                  voices={voices}
                  onCreateVoice={handleCreateVoice}
                  onRefresh={refreshData}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calls">
            <Card>
              <CardHeader>
                <CardTitle>📞 Call Session Management</CardTitle>
                <CardDescription>
                  Track call sessions and conversation turns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CallSessionManagement
                  users={users}
                  onRefresh={refreshData}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;