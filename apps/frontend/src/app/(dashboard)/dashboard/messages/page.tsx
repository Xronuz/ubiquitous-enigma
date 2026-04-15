'use client';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send, Search, CheckCheck, Check, Wifi, WifiOff, Trash2, ArrowLeft, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { messagingApi } from '@/lib/api/messaging';
import { useAuthStore } from '@/store/auth.store';
import { useSocket } from '@/hooks/use-socket';
import { getInitials, cn } from '@/lib/utils';

// ─── Read receipt icon ─────────────────────────────────────────────────────
function ReadStatus({ isRead }: { isRead: boolean }) {
  return isRead
    ? <CheckCheck className="h-3 w-3 text-blue-300" />
    : <Check className="h-3 w-3 text-primary-foreground/60" />;
}

// ─── Single message bubble ─────────────────────────────────────────────────
function MessageBubble({ msg, isMine }: { msg: any; isMine: boolean }) {
  return (
    <div className={cn('flex gap-2', isMine ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm shadow-sm',
        isMine
          ? 'bg-primary text-primary-foreground rounded-br-sm'
          : 'bg-muted rounded-bl-sm',
      )}>
        <p className="break-words whitespace-pre-wrap">{msg.content}</p>
        <div className={cn(
          'flex items-center gap-1 justify-end mt-1',
          isMine ? 'text-primary-foreground/70' : 'text-muted-foreground',
        )}>
          <span className="text-[10px]">
            {new Date(msg.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isMine && <ReadStatus isRead={msg.isRead} />}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function MessagesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── WebSocket connection ──────────────────────────────────────────────────
  const { on, isConnected } = useSocket({
    namespace: '/notifications',
    enabled: !!user,
  });

  useEffect(() => {
    const off = on('message:new', (data: any) => {
      // Refresh current thread if it matches
      if (data?.senderId === selectedUserId || data?.receiverId === selectedUserId) {
        queryClient.invalidateQueries({ queryKey: ['messages', selectedUserId] });
      }
      // Always refresh conversations list for unread count
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    return () => { off?.(); };
  }, [on, selectedUserId, queryClient]);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: conversations = [], isLoading: convLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: messagingApi.getConversations,
    refetchInterval: 30_000,
  });

  const { data: messages, isLoading: msgLoading } = useQuery({
    queryKey: ['messages', selectedUserId],
    queryFn: () => messagingApi.getMessages(selectedUserId!),
    enabled: !!selectedUserId,
    refetchInterval: 10_000, // polling fallback in case WS drops
  });

  const msgList: any[] = messages?.data ?? [];

  // ── Mark as read when conversation selected ───────────────────────────────
  useEffect(() => {
    if (selectedUserId) {
      messagingApi.markAsRead(selectedUserId).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  }, [selectedUserId, queryClient]);

  // ── Auto-scroll to bottom ─────────────────────────────────────────────────
  useEffect(() => {
    if (msgList.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [msgList.length]);

  // ── Delete mutations ──────────────────────────────────────────────────────
  const deleteConvMutation = useMutation({
    mutationFn: (userId: string) => messagingApi.deleteConversation(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', selectedUserId] });
      setSelectedUserId(null);
    },
  });

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMutation = useMutation({
    mutationFn: () => messagingApi.sendMessage(selectedUserId!, messageText.trim()),
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const handleSend = () => {
    if (!messageText.trim() || !selectedUserId || sendMutation.isPending) return;
    sendMutation.mutate();
  };

  const selectedConv = (conversations as any[]).find((c: any) => c.userId === selectedUserId);
  // On mobile, show chat panel when a conversation is selected
  const showChatOnMobile = !!selectedUserId;

  // ── Filter conversations by search ────────────────────────────────────────
  const filteredConvs = (conversations as any[]).filter((c: any) => {
    if (!search) return true;
    const name = `${c.firstName} ${c.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" /> Xabarlar
          </h1>
          <p className="text-muted-foreground">Ichki xabar almashish tizimi</p>
        </div>
        {/* WebSocket status indicator */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {isConnected
            ? <><Wifi className="h-3.5 w-3.5 text-green-500" /> Online</>
            : <><WifiOff className="h-3.5 w-3.5 text-yellow-500" /> Polling</>
          }
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-12rem)]">
        {/* ── Conversations list ────────────────────────────────────────── */}
        <Card className={cn(
          'flex-shrink-0 flex flex-col overflow-hidden',
          'w-full md:w-72',
          showChatOnMobile ? 'hidden md:flex' : 'flex',
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
            ) : (
              filteredConvs.map((conv: any) => (
                <button
                  key={conv.userId}
                  onClick={() => setSelectedUserId(conv.userId)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors text-left border-b last:border-0',
                    selectedUserId === conv.userId && 'bg-accent',
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs">
                        {getInitials(conv.firstName, conv.lastName)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={cn(
                        'text-sm truncate',
                        conv.unreadCount > 0 ? 'font-bold' : 'font-medium',
                      )}>
                        {conv.firstName} {conv.lastName}
                      </p>
                      {conv.unreadCount > 0 && (
                        <Badge className="h-5 min-w-5 px-1 flex items-center justify-center text-xs rounded-full">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className={cn(
                      'text-xs truncate',
                      conv.unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground',
                    )}>
                      {conv.lastMessage ?? '—'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* ── Chat panel ───────────────────────────────────────────────── */}
        <Card className={cn(
          'flex-1 flex flex-col overflow-hidden',
          !showChatOnMobile && 'hidden md:flex',
        )}>
          {!selectedUserId ? (
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="font-medium text-muted-foreground">Suhbatni tanlang</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Chap paneldan foydalanuvchini bosing
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-3 border-b flex items-center gap-3">
                {/* Back button — mobile only */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-8 w-8 shrink-0"
                  onClick={() => setSelectedUserId(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {selectedConv ? getInitials(selectedConv.firstName, selectedConv.lastName) : '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {selectedConv ? `${selectedConv.firstName} ${selectedConv.lastName}` : '...'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedConv?.role ?? ''}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  title="Suhbatni o'chirish"
                  onClick={() => {
                    if (confirm('Bu suhbatdagi barcha o\'z xabarlaringizni o\'chirasizmi?')) {
                      deleteConvMutation.mutate(selectedUserId!);
                    }
                  }}
                  disabled={deleteConvMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages */}
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
                    <div>
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>Suhbat boshlang</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Date separators + messages */}
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

              {/* Input */}
              <div className="p-3 border-t flex gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Xabar yozing... (Enter = yuborish)"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!messageText.trim() || sendMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
