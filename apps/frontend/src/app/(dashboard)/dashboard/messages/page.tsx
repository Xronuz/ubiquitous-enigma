'use client';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare, Send, Search, CheckCheck, Check, Wifi, WifiOff,
  Trash2, ArrowLeft, Plus, Users, X, UserPlus,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { messagingApi } from '@/lib/api/messaging';
import { usersApi } from '@/lib/api/users';
import { useAuthStore } from '@/store/auth.store';
import { useSocket } from '@/hooks/use-socket';
import { getInitials, cn } from '@/lib/utils';
import { useConfirm } from '@/store/confirm.store';

// ─── Read receipt icon ─────────────────────────────────────────────────────
function ReadStatus({ isRead }: { isRead: boolean }) {
  return isRead
    ? <CheckCheck className="h-3 w-3 text-blue-300" />
    : <Check className="h-3 w-3 text-primary-foreground/60" />;
}

// ─── Single message bubble ─────────────────────────────────────────────────
function MessageBubble({ msg, isMine, showSender = false }: { msg: any; isMine: boolean; showSender?: boolean }) {
  return (
    <div className={cn('flex gap-2', isMine ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm shadow-sm',
        isMine
          ? 'bg-primary text-primary-foreground rounded-br-sm'
          : 'bg-muted rounded-bl-sm',
      )}>
        {showSender && !isMine && (
          <p className="text-[10px] font-semibold text-primary mb-1">
            {msg.sender?.firstName} {msg.sender?.lastName}
          </p>
        )}
        <p className="break-words whitespace-pre-wrap">{msg.content}</p>
        <div className={cn(
          'flex items-center gap-1 justify-end mt-1',
          isMine ? 'text-primary-foreground/70' : 'text-muted-foreground',
        )}>
          <span className="text-[10px]">
            {new Date(msg.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isMine && msg.isRead !== undefined && <ReadStatus isRead={msg.isRead} />}
        </div>
      </div>
    </div>
  );
}

// ─── Create group dialog ───────────────────────────────────────────────────
function CreateGroupDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (group: any) => void;
}) {
  const [groupName, setGroupName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const { data: usersData } = useQuery({
    queryKey: ['users', 'all-for-group'],
    queryFn: () => usersApi.getAll({ limit: 200 }),
    enabled: open,
  });
  const allUsers: any[] = (usersData as any)?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () => messagingApi.createGroup({
      name: groupName.trim(),
      participantIds: selected,
    }),
    onSuccess: (data) => {
      onCreated(data);
      setGroupName('');
      setSelected([]);
      setSearch('');
      onClose();
    },
  });

  const filtered = allUsers.filter(u =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Yangi guruh yaratish
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            placeholder="Guruh nomi *"
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
          />
          <Input
            placeholder="A'zolarni qidirish..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="max-h-52 overflow-y-auto space-y-1 border rounded-md p-2">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Topilmadi</p>
            ) : filtered.map((u: any) => (
              <label
                key={u.id}
                className="flex items-center gap-2 p-1.5 rounded hover:bg-accent cursor-pointer"
              >
                <Checkbox
                  checked={selected.includes(u.id)}
                  onCheckedChange={() => toggle(u.id)}
                />
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px]">{getInitials(u.firstName, u.lastName)}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{u.firstName} {u.lastName}</span>
                <span className="text-xs text-muted-foreground ml-auto">{u.role}</span>
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <p className="text-xs text-muted-foreground">{selected.length} ta a'zo tanlandi</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Bekor</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!groupName.trim() || selected.length === 0 || createMutation.isPending}
          >
            {createMutation.isPending ? 'Yaratilmoqda...' : 'Yaratish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function MessagesPage() {
  const confirm = useConfirm();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'direct' | 'group'>('direct');

  // Direct chat state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [search, setSearch] = useState('');

  // Group chat state
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupMessage, setGroupMessage] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const groupMessagesEndRef = useRef<HTMLDivElement>(null);

  // ── WebSocket connection ──────────────────────────────────────────────────
  const { on, isConnected } = useSocket({
    namespace: '/notifications',
    enabled: !!user,
  });

  useEffect(() => {
    const offDirect = on('message:new', (data: any) => {
      if (data?.senderId === selectedUserId || data?.receiverId === selectedUserId) {
        queryClient.invalidateQueries({ queryKey: ['messages', selectedUserId] });
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    const offGroup = on('group:message', (data: any) => {
      if (data?.conversationId) {
        queryClient.invalidateQueries({ queryKey: ['group-messages', data.conversationId] });
        queryClient.invalidateQueries({ queryKey: ['groups'] });
      }
    });

    const offGroupCreated = on('group:created', () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    });

    return () => { offDirect?.(); offGroup?.(); offGroupCreated?.(); };
  }, [on, selectedUserId, queryClient]);

  // ── Direct chat queries ───────────────────────────────────────────────────
  const { data: conversations = [], isLoading: convLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: messagingApi.getConversations,
    refetchInterval: 30_000,
    enabled: tab === 'direct',
  });

  const { data: messages, isLoading: msgLoading } = useQuery({
    queryKey: ['messages', selectedUserId],
    queryFn: () => messagingApi.getMessages(selectedUserId!),
    enabled: !!selectedUserId && tab === 'direct',
    refetchInterval: 10_000,
  });

  // ── Group chat queries ────────────────────────────────────────────────────
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: messagingApi.getGroups,
    refetchInterval: 30_000,
    enabled: tab === 'group',
  });

  const { data: groupMessages, isLoading: gmLoading } = useQuery({
    queryKey: ['group-messages', selectedGroupId],
    queryFn: () => messagingApi.getGroupMessages(selectedGroupId!),
    enabled: !!selectedGroupId && tab === 'group',
    refetchInterval: 10_000,
  });

  const msgList: any[] = messages?.data ?? [];
  const gmList: any[] = groupMessages?.data ?? [];

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (msgList.length > 0) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgList.length]);

  useEffect(() => {
    if (gmList.length > 0) groupMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gmList.length]);

  // ── Mark as read on select ────────────────────────────────────────────────
  useEffect(() => {
    if (selectedUserId) {
      messagingApi.markAsRead(selectedUserId).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  }, [selectedUserId, queryClient]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const deleteConvMutation = useMutation({
    mutationFn: (userId: string) => messagingApi.deleteConversation(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setSelectedUserId(null);
    },
  });

  const sendMutation = useMutation({
    mutationFn: () => messagingApi.sendMessage(selectedUserId!, messageText.trim()),
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const sendGroupMutation = useMutation({
    mutationFn: () => messagingApi.sendGroupMessage(selectedGroupId!, groupMessage.trim()),
    onSuccess: () => {
      setGroupMessage('');
      queryClient.invalidateQueries({ queryKey: ['group-messages', selectedGroupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  const leaveGroupMutation = useMutation({
    mutationFn: (groupId: string) => messagingApi.leaveGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setSelectedGroupId(null);
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleSend = () => {
    if (!messageText.trim() || !selectedUserId || sendMutation.isPending) return;
    sendMutation.mutate();
  };

  const handleGroupSend = () => {
    if (!groupMessage.trim() || !selectedGroupId || sendGroupMutation.isPending) return;
    sendGroupMutation.mutate();
  };

  const selectedConv = (conversations as any[]).find((c: any) => c.user?.id === selectedUserId);
  const selectedGroup = (groups as any[]).find((g: any) => g.id === selectedGroupId);

  const filteredConvs = (conversations as any[]).filter((c: any) => {
    if (!search) return true;
    const name = `${c.user?.firstName ?? ''} ${c.user?.lastName ?? ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const filteredGroups = (groups as any[]).filter((g: any) =>
    !groupSearch || g.name.toLowerCase().includes(groupSearch.toLowerCase()),
  );

  const showDirectChatOnMobile = !!selectedUserId && tab === 'direct';
  const showGroupChatOnMobile = !!selectedGroupId && tab === 'group';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" /> Xabarlar
          </h1>
          <p className="text-muted-foreground">Ichki xabar almashish tizimi</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {isConnected
              ? <><Wifi className="h-3.5 w-3.5 text-green-500" /> Online</>
              : <><WifiOff className="h-3.5 w-3.5 text-yellow-500" /> Polling</>
            }
          </div>
          {tab === 'group' && (
            <Button size="sm" onClick={() => setCreateGroupOpen(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Guruh yaratish
            </Button>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={v => { setTab(v as any); setSelectedUserId(null); setSelectedGroupId(null); }}>
        <TabsList className="mb-3">
          <TabsTrigger value="direct" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> Shaxsiy
          </TabsTrigger>
          <TabsTrigger value="group" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Guruhlar
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex gap-4 h-[calc(100vh-14rem)]">

        {/* ══════════════ LEFT PANEL ══════════════ */}
        {tab === 'direct' ? (
          /* Direct conversations list */
          <Card className={cn(
            'flex-shrink-0 flex flex-col overflow-hidden w-full md:w-72',
            showDirectChatOnMobile ? 'hidden md:flex' : 'flex',
          )}>
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Qidirish..."
                  className="pl-8 h-8 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {convLoading ? (
                <div className="p-3 space-y-3">
                  {Array(4).fill(0).map((_, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConvs.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {search ? 'Topilmadi' : 'Hali xabarlar yo\'q'}
                </div>
              ) : filteredConvs.map((conv: any) => {
                const u = conv.user ?? conv;
                const lastMsg = conv.lastMessage;
                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors text-left border-b last:border-0',
                      selectedUserId === u.id && 'bg-accent',
                    )}
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="text-xs">{getInitials(u.firstName, u.lastName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={cn('text-sm truncate', conv.unreadCount > 0 ? 'font-bold' : 'font-medium')}>
                          {u.firstName} {u.lastName}
                        </p>
                        {conv.unreadCount > 0 && (
                          <Badge className="h-5 min-w-5 px-1 flex items-center justify-center text-xs rounded-full">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className={cn('text-xs truncate', conv.unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                        {lastMsg?.content ?? '—'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        ) : (
          /* Groups list */
          <Card className={cn(
            'flex-shrink-0 flex flex-col overflow-hidden w-full md:w-72',
            showGroupChatOnMobile ? 'hidden md:flex' : 'flex',
          )}>
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Guruh qidirish..."
                  className="pl-8 h-8 text-sm"
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {groupsLoading ? (
                <div className="p-3 space-y-3">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {groupSearch ? 'Topilmadi' : (
                    <div>
                      <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>Hali guruhlar yo'q</p>
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-1 text-xs"
                        onClick={() => setCreateGroupOpen(true)}
                      >
                        + Guruh yaratish
                      </Button>
                    </div>
                  )}
                </div>
              ) : filteredGroups.map((g: any) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors text-left border-b last:border-0',
                    selectedGroupId === g.id && 'bg-accent',
                  )}
                >
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{g.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {g.participantCount} ta a'zo
                      {g.lastMessage ? ` · ${g.lastMessage.sender?.firstName}: ${g.lastMessage.content}` : ''}
                    </p>
                  </div>
                  {g.isAdmin && (
                    <Badge variant="secondary" className="text-[9px] px-1 shrink-0">Admin</Badge>
                  )}
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* ══════════════ RIGHT PANEL ══════════════ */}
        {tab === 'direct' ? (
          /* Direct chat panel */
          <Card className={cn('flex-1 flex flex-col overflow-hidden', !showDirectChatOnMobile && 'hidden md:flex')}>
            {!selectedUserId ? (
              <div className="flex-1 flex items-center justify-center text-center">
                <div>
                  <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-3 opacity-30" />
                  <p className="font-medium text-muted-foreground">Suhbatni tanlang</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">Chap paneldan foydalanuvchini bosing</p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-3 border-b flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 shrink-0" onClick={() => setSelectedUserId(null)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {selectedConv ? getInitials(selectedConv.user?.firstName, selectedConv.user?.lastName) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {selectedConv ? `${selectedConv.user?.firstName} ${selectedConv.user?.lastName}` : '...'}
                    </p>
                    <p className="text-xs text-muted-foreground">{selectedConv?.user?.role ?? ''}</p>
                  </div>
                  <Button
                    size="icon" variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    title="Suhbatni o'chirish"
                    onClick={async () => {
                      if (await confirm({ title: "Bu suhbatdagi barcha o'z xabarlaringizni o'chirasizmi?", variant: 'destructive', confirmText: "O'chirish" })) {
                        deleteConvMutation.mutate(selectedUserId!);
                      }
                    }}
                    disabled={deleteConvMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {msgLoading ? (
                    <div className="space-y-3">
                      {Array(4).fill(0).map((_, i) => (
                        <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
                          <Skeleton className="h-12 w-48 rounded-2xl" />
                        </div>
                      ))}
                    </div>
                  ) : msgList.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                      <div><MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>Suhbat boshlang</p></div>
                    </div>
                  ) : (
                    <>
                      {msgList.map((msg: any, i: number) => {
                        const isMine = msg.senderId === user?.id;
                        const msgDate = new Date(msg.createdAt).toLocaleDateString('uz-UZ');
                        const prevDate = i > 0 ? new Date(msgList[i - 1].createdAt).toLocaleDateString('uz-UZ') : null;
                        const showDate = i === 0 || msgDate !== prevDate;
                        return (
                          <div key={msg.id}>
                            {showDate && (
                              <div className="flex items-center gap-2 my-3">
                                <div className="flex-1 h-px bg-border" />
                                <span className="text-xs text-muted-foreground px-2">{msgDate}</span>
                                <div className="flex-1 h-px bg-border" />
                              </div>
                            )}
                            <MessageBubble msg={msg} isMine={isMine} />
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                <div className="p-3 border-t flex gap-2">
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Xabar yozing... (Enter = yuborish)"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                  />
                  <Button size="icon" onClick={handleSend} disabled={!messageText.trim() || sendMutation.isPending}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </Card>
        ) : (
          /* Group chat panel */
          <Card className={cn('flex-1 flex flex-col overflow-hidden', !showGroupChatOnMobile && 'hidden md:flex')}>
            {!selectedGroupId ? (
              <div className="flex-1 flex items-center justify-center text-center">
                <div>
                  <Users className="h-16 w-16 text-muted-foreground mx-auto mb-3 opacity-30" />
                  <p className="font-medium text-muted-foreground">Guruhni tanlang</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">Yoki yangi guruh yarating</p>
                  <Button size="sm" className="mt-3 gap-1.5" onClick={() => setCreateGroupOpen(true)}>
                    <Plus className="h-3.5 w-3.5" /> Guruh yaratish
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-3 border-b flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 shrink-0" onClick={() => setSelectedGroupId(null)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{selectedGroup?.name ?? '...'}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedGroup?.participantCount ?? 0} ta a'zo
                    </p>
                  </div>
                  <Button
                    size="sm" variant="ghost"
                    className="text-xs text-muted-foreground hover:text-destructive gap-1"
                    onClick={async () => {
                      if (await confirm({ title: 'Guruhdan chiqasizmi?', confirmText: 'Chiqish' })) leaveGroupMutation.mutate(selectedGroupId!);
                    }}
                    disabled={leaveGroupMutation.isPending}
                  >
                    <X className="h-3.5 w-3.5" /> Chiqish
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {gmLoading ? (
                    <div className="space-y-3">
                      {Array(4).fill(0).map((_, i) => (
                        <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
                          <Skeleton className="h-12 w-48 rounded-2xl" />
                        </div>
                      ))}
                    </div>
                  ) : gmList.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                      <div><Users className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>Hali xabarlar yo'q. Birinchi xabarni yuboring!</p></div>
                    </div>
                  ) : (
                    <>
                      {gmList.map((msg: any, i: number) => {
                        const isMine = msg.senderId === user?.id;
                        const msgDate = new Date(msg.createdAt).toLocaleDateString('uz-UZ');
                        const prevDate = i > 0 ? new Date(gmList[i - 1].createdAt).toLocaleDateString('uz-UZ') : null;
                        const showDate = i === 0 || msgDate !== prevDate;
                        return (
                          <div key={msg.id}>
                            {showDate && (
                              <div className="flex items-center gap-2 my-3">
                                <div className="flex-1 h-px bg-border" />
                                <span className="text-xs text-muted-foreground px-2">{msgDate}</span>
                                <div className="flex-1 h-px bg-border" />
                              </div>
                            )}
                            <MessageBubble msg={msg} isMine={isMine} showSender={true} />
                          </div>
                        );
                      })}
                      <div ref={groupMessagesEndRef} />
                    </>
                  )}
                </div>

                <div className="p-3 border-t flex gap-2">
                  <Input
                    value={groupMessage}
                    onChange={(e) => setGroupMessage(e.target.value)}
                    placeholder="Guruhga xabar yozing... (Enter = yuborish)"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGroupSend(); }
                    }}
                  />
                  <Button size="icon" onClick={handleGroupSend} disabled={!groupMessage.trim() || sendGroupMutation.isPending}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </Card>
        )}
      </div>

      {/* Create group dialog */}
      <CreateGroupDialog
        open={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        onCreated={(g) => {
          queryClient.invalidateQueries({ queryKey: ['groups'] });
          setSelectedGroupId(g.id);
        }}
      />
    </div>
  );
}
