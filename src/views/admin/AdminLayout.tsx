import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  FolderTree,
  Tags,
  MessageSquare,
  MessagesSquare,
  Trophy,
  Layers,
  Mail,
  Settings,
  LogOut,
  ExternalLink,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { AdminStats, Post, Category, Tag, Comment, NewsletterSubscriber, SiteSettings } from '../../types';
import { AdminDashboardView } from './AdminDashboardView';
import { AdminPostsListView } from './AdminPostsListView';
import { AdminPostEditorView } from './AdminPostEditorView';
import { AdminCategoriesView } from './AdminCategoriesView';
import { AdminTagsView } from './AdminTagsView';
import { AdminCommentsView } from './AdminCommentsView';
import { AdminNewsletterView } from './AdminNewsletterView';
import { AdminSettingsView } from './AdminSettingsView';
import { AdminForumThreadsView } from './AdminForumThreadsView';
import { AdminSubforumsView } from './AdminSubforumsView';
import { AdminForumMembersView } from './AdminForumMembersView';
import { ForumService } from '../../services/forumService';

import { useNavigate } from 'react-router-dom';

interface AdminLayoutProps {
  stats: AdminStats;
  posts: Post[];
  categories: Category[];
  tags: Tag[];
  comments: Comment[];
  subscribers: NewsletterSubscriber[];
  settings: SiteSettings;
  onLogout: () => void;
  onNavigatePublic: (slug?: string) => void;
  onRefreshData: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  stats,
  posts,
  categories,
  tags,
  comments,
  subscribers,
  settings,
  onLogout,
  onNavigatePublic,
  onRefreshData,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [editingPostId, setEditingPostId] = useState<number | undefined>(undefined);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [forumThreadCount, setForumThreadCount] = useState<number>(() => ForumService.getThreads().length);
  const [forumSubCount, setForumSubCount] = useState<number>(() => ForumService.getSubforums().length);

  useEffect(() => {
    const refreshForumCounts = () => {
      setForumThreadCount(ForumService.getThreads().length);
      setForumSubCount(ForumService.getSubforums().length);
    };

    refreshForumCounts();

    const bc =
      typeof window !== 'undefined' && 'BroadcastChannel' in window
        ? new BroadcastChannel('nexus_forum_channel')
        : null;

    if (bc) {
      bc.onmessage = () => refreshForumCounts();
    }

    return () => {
      bc?.close();
    };
  }, []);

  const handleNavigateTab = (tab: string, param?: any) => {
    if (tab === 'posts') {
      setActiveTab('posts');
      setSidebarMobileOpen(false);
      window.history.pushState(null, '', '/admin/vesti');
      return;
    }
    if (tab === 'post_new') {
      setActiveTab('post_editor');
      setEditingPostId(undefined);
      setSidebarMobileOpen(false);
      window.history.pushState(null, '', '/admin/vesti/nova');
      return;
    }
    if (tab === 'post_edit') {
      setActiveTab('post_editor');
      setEditingPostId(param);
      setSidebarMobileOpen(false);
      window.history.pushState(null, '', `/admin/vesti/${param}/izmena`);
      return;
    }
    setActiveTab(tab);
    setSidebarMobileOpen(false);
  };

  const navItems = [
    { id: 'dashboard', label: 'Kontrolna Tabla', icon: LayoutDashboard },
    { id: 'posts', label: 'Sve Vesti', icon: FileText, badge: posts.length },
    { id: 'post_new', label: 'Nova Vest', icon: PlusCircle },
    { id: 'forum_threads', label: 'Forum Diskusije', icon: MessagesSquare, badge: forumThreadCount },
    { id: 'subforums', label: 'Kategorije & Potforumi', icon: Layers, badge: forumSubCount },
    { id: 'forum_members', label: 'Top Članovi (Karma)', icon: Trophy },
    { id: 'tags', label: 'Tagovi', icon: Tags, badge: tags.length },
    { id: 'comments', label: 'Komentari Vesti', icon: MessageSquare, badge: comments.filter(c => c.status === 'pending').length },
    { id: 'newsletter', label: 'Newsletter', icon: Mail, badge: subscribers.length },
    { id: 'settings', label: 'Podešavanja', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Top Admin Bar */}
      <header className="h-16 bg-[#141414] border-b border-[#262626] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
            className="md:hidden p-2 text-[#a1a1a1] hover:text-white"
          >
            {sidebarMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <span className="font-display text-xl font-bold tracking-wider text-white">
              NEXUS<span className="text-[#a855f7]">.</span>GG
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#22d3ee]/20 text-[#22d3ee] border border-[#22d3ee]/30">
              CMS Admin
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigatePublic()}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1c1c1c] hover:bg-[#262626] border border-[#262626] text-xs font-medium text-[#22d3ee] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Otvori Portal</span>
          </button>

          <div className="flex items-center gap-2 pl-3 border-l border-[#262626]">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
              alt="Admin"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-cover border border-[#3f3f46]"
            />
            <div className="hidden md:block text-left">
              <span className="text-xs font-semibold text-white block leading-none">
                Ivan Tomić
              </span>
              <span className="text-[10px] text-[#71717a]">Glavni Urednik</span>
            </div>
            <button
              onClick={onLogout}
              title="Odjavi se"
              className="p-2 text-[#71717a] hover:text-[#ef4444] transition-colors rounded-lg hover:bg-[#1c1c1c] ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 top-16 z-20 w-64 bg-[#111111] border-r border-[#262626] p-4 flex flex-col justify-between transition-transform duration-200 md:static md:translate-x-0 ${
            sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] px-3 block mb-2">
              Navigacija CMS-a
            </span>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive =
                activeTab === item.id ||
                (item.id === 'post_new' && activeTab === 'post_editor' && !editingPostId) ||
                (item.id === 'posts' && activeTab === 'post_editor' && editingPostId);

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigateTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-[#a855f7] text-white shadow-md'
                      : 'text-[#a1a1a1] hover:text-white hover:bg-[#18181b]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[#1c1c1c] text-[#71717a]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-[#262626] space-y-2">
            <button
              onClick={() => onNavigatePublic()}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#a1a1a1] hover:text-[#22d3ee] rounded-lg hover:bg-[#18181b] transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Nazad na Portal</span>
            </button>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#ef4444] rounded-lg hover:bg-[#ef4444]/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Odjavi se</span>
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {activeTab === 'dashboard' && (
            <AdminDashboardView
              stats={stats}
              recentPosts={posts}
              categories={categories}
              onNavigateTab={handleNavigateTab}
              onNavigatePublic={onNavigatePublic}
              onRefresh={onRefreshData}
            />
          )}

          {activeTab === 'posts' && (
            <AdminPostsListView
              posts={posts}
              categories={categories}
              onNavigateTab={handleNavigateTab}
              onNavigatePublic={onNavigatePublic}
              onRefresh={onRefreshData}
            />
          )}

          {activeTab === 'post_editor' && (
            <AdminPostEditorView
              editPostId={editingPostId}
              categories={categories}
              tags={tags}
              onNavigateBack={() => setActiveTab('posts')}
              onPostSaved={() => {
                onRefreshData();
                setActiveTab('posts');
              }}
            />
          )}

          {activeTab === 'forum_threads' && (
            <AdminForumThreadsView
              onNavigatePublic={onNavigatePublic}
              onRefresh={onRefreshData}
            />
          )}

          {activeTab === 'subforums' && (
            <AdminSubforumsView
              categories={categories}
              onRefresh={onRefreshData}
            />
          )}

          {activeTab === 'forum_members' && (
            <AdminForumMembersView
              onRefresh={onRefreshData}
            />
          )}

          {activeTab === 'categories' && (
            <AdminCategoriesView categories={categories} onRefresh={onRefreshData} />
          )}

          {activeTab === 'tags' && (
            <AdminTagsView tags={tags} onRefresh={onRefreshData} />
          )}

          {activeTab === 'comments' && (
            <AdminCommentsView comments={comments} posts={posts} onRefresh={onRefreshData} />
          )}

          {activeTab === 'newsletter' && (
            <AdminNewsletterView subscribers={subscribers} onRefresh={onRefreshData} />
          )}

          {activeTab === 'settings' && (
            <AdminSettingsView settings={settings} onRefresh={onRefreshData} />
          )}
        </main>
      </div>
    </div>
  );
};
