import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Users, CreditCard, Key, Mic } from 'lucide-react';
import type { User, SubscriptionPlan, Voice } from '../../../server/src/schema';

interface DashboardProps {
  users: User[];
  subscriptionPlans: SubscriptionPlan[];
  voices: Voice[];
  onRefresh: () => void;
}

export function Dashboard({ users, subscriptionPlans, voices, onRefresh }: DashboardProps) {
  // Calculate statistics
  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.subscription_plan_id !== null).length;
  const totalPlans = subscriptionPlans.length;
  const totalVoices = voices.length;

  // Group users by subscription plan
  const usersByPlan = subscriptionPlans.reduce((acc, plan) => {
    acc[plan.name] = users.filter(user => user.subscription_plan_id === plan.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Platform Overview</h2>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-blue-100">Total Users</CardTitle>
              <Users className="w-4 h-4 text-blue-100" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-blue-100">
              {activeUsers} with active subscriptions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-green-100">Subscription Plans</CardTitle>
              <CreditCard className="w-4 h-4 text-green-100" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPlans}</div>
            <p className="text-xs text-green-100">
              Available pricing tiers
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-purple-100">Voice Library</CardTitle>
              <Mic className="w-4 h-4 text-purple-100" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVoices}</div>
            <p className="text-xs text-purple-100">
              Available voice options
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-orange-100">Active Rate</CardTitle>
              <Key className="w-4 h-4 text-orange-100" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0}%
            </div>
            <p className="text-xs text-orange-100">
              Users with subscriptions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Plan Distribution */}
      {subscriptionPlans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Subscription Distribution</CardTitle>
            <CardDescription>
              Number of users by subscription plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subscriptionPlans.map((plan: SubscriptionPlan) => {
                const userCount = usersByPlan[plan.name] || 0;
                const percentage = totalUsers > 0 ? (userCount / totalUsers) * 100 : 0;
                
                return (
                  <div key={plan.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="min-w-16">
                        {plan.name}
                      </Badge>
                      <div>
                        <p className="font-medium">${plan.price.toFixed(2)}/month</p>
                        {plan.description && (
                          <p className="text-sm text-gray-500">{plan.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{userCount} users</p>
                      <p className="text-sm text-gray-500">{percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                );
              })}
              
              {/* Unsubscribed users */}
              {totalUsers - activeUsers > 0 && (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <Badge variant="secondary" className="min-w-16">
                      Free
                    </Badge>
                    <div>
                      <p className="font-medium">$0.00/month</p>
                      <p className="text-sm text-gray-500">No active subscription</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{totalUsers - activeUsers} users</p>
                    <p className="text-sm text-gray-500">
                      {totalUsers > 0 ? (((totalUsers - activeUsers) / totalUsers) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Status</CardTitle>
          <CardDescription>
            Current platform health and recent activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Platform is operational</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm">tRPC API connected</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-sm">Voice services available</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}