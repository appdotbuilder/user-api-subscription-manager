import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/utils/trpc';
import { Plus, Phone, User as UserIcon, Calendar, Clock, MessageSquare, Bot, UserIcon as PersonIcon, Wrench, Zap } from 'lucide-react';
import type { 
  User, 
  CallSession, 
  Turn,
  CreateCallSessionInput,
  CreateTurnInput,
  TurnRole
} from '../../../server/src/schema';

interface CallSessionManagementProps {
  users: User[];
  onRefresh: () => void;
}

export function CallSessionManagement({ users, onRefresh }: CallSessionManagementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userCallSessions, setUserCallSessions] = useState<CallSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [sessionTurns, setSessionTurns] = useState<Turn[]>([]);
  
  // Form state for creating new call sessions
  const [createSessionFormData, setCreateSessionFormData] = useState<CreateCallSessionInput>({
    twilio_call_id: '',
    user_id: 0,
    start_time: new Date()
  });

  // Form state for creating new turns
  const [createTurnFormData, setCreateTurnFormData] = useState<CreateTurnInput>({
    call_session_id: 0,
    role: 'user',
    text: null,
    latency_ms: null
  });

  // Load call sessions for selected user
  const loadUserCallSessions = useCallback(async (userId: number) => {
    setIsLoading(true);
    try {
      const sessions = await trpc.getCallSessionsByUser.query({ userId });
      setUserCallSessions(sessions);
    } catch (error) {
      console.error('Failed to load call sessions:', error);
      setUserCallSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load turns for selected call session
  const loadSessionTurns = useCallback(async (sessionId: number) => {
    setIsLoading(true);
    try {
      const turns = await trpc.getTurnsByCallSession.query({ callSessionId: sessionId });
      setSessionTurns(turns);
    } catch (error) {
      console.error('Failed to load turns:', error);
      setSessionTurns([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadUserCallSessions(selectedUserId);
      setSelectedSessionId(null);
      setSessionTurns([]);
    } else {
      setUserCallSessions([]);
      setSelectedSessionId(null);
      setSessionTurns([]);
    }
  }, [selectedUserId, loadUserCallSessions]);

  useEffect(() => {
    if (selectedSessionId) {
      loadSessionTurns(selectedSessionId);
    } else {
      setSessionTurns([]);
    }
  }, [selectedSessionId, loadSessionTurns]);

  // Generate Twilio Call ID
  const generateTwilioCallId = () => {
    return 'CA' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleCreateCallSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    
    setIsLoading(true);
    try {
      const sessionData = {
        ...createSessionFormData,
        user_id: selectedUserId,
        twilio_call_id: createSessionFormData.twilio_call_id || generateTwilioCallId()
      };
      
      await trpc.createCallSession.mutate(sessionData);
      await loadUserCallSessions(selectedUserId);
      
      setCreateSessionFormData({
        twilio_call_id: '',
        user_id: 0,
        start_time: new Date()
      });
      onRefresh();
    } catch (error) {
      console.error('Failed to create call session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTurn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId) return;
    
    setIsLoading(true);
    try {
      const turnData = {
        ...createTurnFormData,
        call_session_id: selectedSessionId
      };
      
      await trpc.createTurn.mutate(turnData);
      await loadSessionTurns(selectedSessionId);
      
      setCreateTurnFormData({
        call_session_id: 0,
        role: 'user',
        text: null,
        latency_ms: null
      });
    } catch (error) {
      console.error('Failed to create turn:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async (sessionId: number) => {
    setIsLoading(true);
    try {
      await trpc.endCallSession.mutate({
        id: sessionId,
        end_time: new Date()
      });
      if (selectedUserId) {
        await loadUserCallSessions(selectedUserId);
      }
      onRefresh();
    } catch (error) {
      console.error('Failed to end call session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectedUser = () => {
    return users.find(user => user.id === selectedUserId);
  };

  const getSelectedSession = () => {
    return userCallSessions.find(session => session.id === selectedSessionId);
  };

  const formatDuration = (startTime: Date, endTime?: Date | null) => {
    const end = endTime || new Date();
    const duration = Math.floor((end.getTime() - startTime.getTime()) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getRoleIcon = (role: TurnRole) => {
    switch (role) {
      case 'user': return <PersonIcon className="w-4 h-4" />;
      case 'assistant': return <Bot className="w-4 h-4" />;
      case 'tool': return <Wrench className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: TurnRole) => {
    switch (role) {
      case 'user': return 'bg-blue-100 text-blue-800';
      case 'assistant': return 'bg-green-100 text-green-800';
      case 'tool': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
              <Label>Choose a user to manage their call sessions</Label>
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
                  Managing call sessions for: <strong>{getSelectedUser()?.name}</strong>
                </p>
                <p className="text-xs text-gray-600">{getSelectedUser()?.email}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedUserId && (
        <>
          {/* Create Call Session Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="w-5 h-5 mr-2" />
                Start New Call Session
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCallSession} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="twilio-call-id">Twilio Call ID (optional)</Label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <Input
                      id="twilio-call-id"
                      placeholder="Leave empty to auto-generate"
                      value={createSessionFormData.twilio_call_id}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateSessionFormData((prev: CreateCallSessionInput) => ({ 
                          ...prev, 
                          twilio_call_id: e.target.value 
                        }))
                      }
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'Starting Call Session...' : 'Start Call Session'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Separator />

          {/* Call Sessions List */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Call Sessions for {getSelectedUser()?.name} ({userCallSessions.length})
            </h3>
            
            {isLoading ? (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading call sessions...</p>
                </CardContent>
              </Card>
            ) : userCallSessions.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No call sessions found. Start one above!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {userCallSessions
                  .sort((a: CallSession, b: CallSession) => b.start_time.getTime() - a.start_time.getTime())
                  .map((session: CallSession) => (
                  <Card 
                    key={session.id} 
                    className={`hover:shadow-md transition-shadow cursor-pointer ${
                      selectedSessionId === session.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedSessionId(session.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4" />
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                              {session.twilio_call_id}
                            </code>
                            <Badge variant={session.end_time ? 'secondary' : 'default'}>
                              {session.end_time ? 'Ended' : 'Active'}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {session.start_time.toLocaleDateString()} at {session.start_time.toLocaleTimeString()}
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              Duration: {formatDuration(session.start_time, session.end_time)}
                            </div>
                          </div>
                        </div>
                        
                        {!session.end_time && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              handleEndSession(session.id);
                            }}
                          >
                            End Call
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Turn Management */}
          {selectedSessionId && (
            <>
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  Conversation Turns for Session {getSelectedSession()?.twilio_call_id}
                </h3>
                
                {/* Create Turn Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-base">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Add Turn to Conversation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateTurn} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select 
                            value={createTurnFormData.role} 
                            onValueChange={(value: TurnRole) =>
                              setCreateTurnFormData((prev: CreateTurnInput) => ({ ...prev, role: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">👤 User</SelectItem>
                              <SelectItem value="assistant">🤖 Assistant</SelectItem>
                              <SelectItem value="tool">🔧 Tool</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Latency (ms)</Label>
                          <div className="relative">
                            <Zap className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                            <Input
                              type="number"
                              placeholder="Optional response time"
                              value={createTurnFormData.latency_ms || ''}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setCreateTurnFormData((prev: CreateTurnInput) => ({ 
                                  ...prev, 
                                  latency_ms: e.target.value ? parseInt(e.target.value) : null 
                                }))
                              }
                              min="0"
                              className="pl-10"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Message Text</Label>
                        <Textarea
                          placeholder="Enter the message content..."
                          value={createTurnFormData.text || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setCreateTurnFormData((prev: CreateTurnInput) => ({ 
                              ...prev, 
                              text: e.target.value || null 
                            }))
                          }
                          rows={3}
                        />
                      </div>
                      
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Adding Turn...' : 'Add Turn'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Turns List */}
                <div className="space-y-3">
                  {sessionTurns.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-6">
                        <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No conversation turns yet. Add one above!</p>
                      </CardContent>
                    </Card>
                  ) : (
                    sessionTurns
                      .sort((a: Turn, b: Turn) => a.created_at.getTime() - b.created_at.getTime())
                      .map((turn: Turn) => (
                      <Card key={turn.id} className="border-l-4 border-l-blue-200">
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-full ${getRoleColor(turn.role)}`}>
                              {getRoleIcon(turn.role)}
                            </div>
                            
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs capitalize">
                                  {turn.role}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {turn.created_at.toLocaleTimeString()}
                                </span>
                                {turn.latency_ms !== null && (
                                  <Badge variant="secondary" className="text-xs">
                                    {turn.latency_ms}ms
                                  </Badge>
                                )}
                              </div>
                              
                              {turn.text && (
                                <p className="text-sm leading-relaxed">
                                  {turn.text}
                                </p>
                              )}
                              
                              {!turn.text && (
                                <p className="text-sm text-gray-400 italic">
                                  No message content
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}