import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Send, ArrowLeft, Phone, MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { leadsService } from '../services/leadsService';
import { Lead } from '../types';

const initials = (name: string): string =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';

const avatarColors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500'];
const avatarColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return avatarColors[hash % avatarColors.length];
};

const formatRelativeTime = (iso: string): string => {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now.getTime() - 86400000);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

export const MessagesPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { showToast, refreshTrigger } = useApp();

  const [conversations, setConversations] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const leads = await leadsService.getLeads();
        setConversations(leads.filter(l => !!l.fbPsid));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshTrigger]);

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedConversations;
    return sortedConversations.filter(
      c => c.customerName.toLowerCase().includes(q) || c.inquiry.toLowerCase().includes(q)
    );
  }, [sortedConversations, search]);

  const selected = useMemo(() => conversations.find(c => c.id === id) || null, [conversations, id]);

  const thread = useMemo(() => {
    if (!selected) return [];
    return [...selected.followUps]
      .filter(fu => fu.channel === 'facebook')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [selected]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: 'end' });
  }, [thread.length, selected?.id]);

  const lastMessagePreview = (conv: Lead): string => {
    const fbMessages = [...conv.followUps].filter(fu => fu.channel === 'facebook').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return fbMessages[0]?.note || conv.inquiry || 'No messages yet';
  };

  const handleSend = async () => {
    if (!selected || !replyText.trim()) return;
    setIsSending(true);
    try {
      const updated = await leadsService.sendFacebookReply(selected.id, replyText.trim());
      if (updated) {
        setConversations(prev => prev.map(c => (c.id === updated.id ? updated : c)));
        setReplyText('');
      }
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Failed to send message', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden h-[calc(100vh-180px)] min-h-[520px] flex">
      {/* Conversation List */}
      <div className={`w-full sm:w-80 border-r border-gray-100 flex flex-col shrink-0 ${selected ? 'hidden sm:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-100 space-y-3">
          <h2 className="text-lg font-bold font-heading text-gray-900">Messages</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full text-sm pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-xs text-gray-500 text-center py-8">Loading...</p>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <MessageCircle className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm font-semibold text-gray-700">No conversations yet</p>
              <p className="text-xs text-gray-500 mt-1">
                Messages from your Facebook Page will show up here automatically.
              </p>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <button
                key={conv.id}
                type="button"
                onClick={() => navigate(`/messages/${conv.id}`)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  selected?.id === conv.id ? 'bg-red-50/60' : ''
                }`}
              >
                <div className={`w-10 h-10 rounded-full ${avatarColor(conv.customerName)} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                  {initials(conv.customerName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-900 truncate">{conv.customerName}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">{formatRelativeTime(conv.updatedAt || conv.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{lastMessagePreview(conv)}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Thread */}
      <div className={`flex-1 flex-col min-w-0 ${selected ? 'flex' : 'hidden sm:flex'}`}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <MessageCircle className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm font-semibold text-gray-700">Select a conversation</p>
            <p className="text-xs text-gray-500 mt-1">Pick someone from the list to see the conversation.</p>
          </div>
        ) : (
          <>
            {/* Thread Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => navigate('/messages')}
                className="sm:hidden p-1.5 -ml-1 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className={`w-9 h-9 rounded-full ${avatarColor(selected.customerName)} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                {initials(selected.customerName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900 truncate">{selected.customerName}</p>
                <p className="text-[11px] text-gray-400">via Facebook Messenger</p>
              </div>
              {selected.phone && (
                <a
                  href={`tel:${selected.phone}`}
                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg shrink-0"
                  title={`Call ${selected.phone}`}
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/60">
              {thread.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-8">No messages yet.</p>
              ) : (
                thread.map(fu => (
                  <div key={fu.id} className={`flex ${fu.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${
                      fu.direction === 'outbound'
                        ? 'bg-[#C1121F] text-white rounded-br-sm'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                    }`}>
                      <p className="whitespace-pre-wrap break-words">{fu.note}</p>
                      <p className={`text-[10px] mt-1 ${fu.direction === 'outbound' ? 'text-red-100' : 'text-gray-400'}`}>
                        {new Date(fu.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={threadEndRef} />
            </div>

            {/* Reply Box */}
            <div className="p-3 border-t border-gray-100 shrink-0">
              <div className="flex gap-2">
                <textarea
                  rows={1}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:outline-none resize-none"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isSending || !replyText.trim()}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#C1121F] hover:bg-[#9E0E19] rounded-lg shadow-xs transition-colors disabled:opacity-50 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">
                Facebook only allows replies within 24 hours of the customer's last message.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
