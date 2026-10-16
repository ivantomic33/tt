import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ToastProvider, useToast } from './components/ui/Toast';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { AuthModal } from './components/auth/AuthModal';
import { SecurityAuditModal } from './components/security/SecurityAuditModal';
import { ErrorBoundary } from './components/security/ErrorBoundary';
import { HomeView } from './views/HomeView';
import { PostDetailView } from './views/PostDetailView';
import { CategoryView } from './views/CategoryView';
import { SearchView } from './views/SearchView';
import { BookmarksView } from './views/BookmarksView';
import { AboutView } from './views/AboutView';
import { ContactView } from './views/ContactView';
import { ForumHomeView } from './views/forum/ForumHomeView';
import { ThreadDetailView } from './views/forum/ThreadDetailView';
import { ProfileView } from './views/ProfileView';
import { ResetPasswordView } from './views/ResetPasswordView';
import { AdminLoginView } from './views/admin/AdminLoginView';

import { AdminLayout } from './views/admin/AdminLayout';
import Login from './pages/admin/Login';
import Register from './pages/admin/Register';
import Posts from './pages/admin/Posts';
import NewPost from './pages/admin/NewPost';
import EditPost from './pages/admin/EditPost';
import { StorageService } from './services/storage';
import { ForumService } from './services/forumService';
import { Post, Category, Tag, Comment, NewsletterSubscriber, SiteSettings, AdminStats } from './types';

function MainApp() {
  const location = useLocation();
  const { showToast } = useToast();
  const { user, role, isAdmin, signOut, loading } = useAuth();

  // Navigation State - Inicijalizovano direktno iz URL-a radi stabilnosti pri osvežavanju stranice (F5)
  const [currentView, setCurrentView] = useState<string>(() => {
    const p = window.location.pathname;
    if (p === '/admin/vesti/nova') return 'admin_new_post';
    if (p.startsWith('/admin/vesti/') && p.includes('/izmena')) return 'admin_edit_post';
    if (p === '/admin/vesti') return 'admin_posts';
    if (p === '/admin') return 'admin';
    if (p === '/admin/login') return 'admin_login';
    if (p === '/admin/register') return 'admin_register';
    if (p.startsWith('/forum/thread/')) return 'thread';
    if (p.startsWith('/forum')) return 'forum';
    if (p === '/profile' || p === '/profil' || p.startsWith('/u/')) return 'profile';
    if (p === '/reset-password') return 'reset_password';
    return 'home';
  });

  const [viewParam, setViewParam] = useState<string>(() => {
    const p = window.location.pathname;
    if (p.startsWith('/admin/vesti/') && p.includes('/izmena')) {
      return p.replace('/admin/vesti/', '').replace('/izmena', '');
    }
    if (p.startsWith('/forum/thread/')) return p.replace('/forum/thread/', '');
    if (p.startsWith('/forum/')) return p.replace('/forum/', '');
    if (p.startsWith('/u/')) return decodeURIComponent(p.replace('/u/', ''));
    return '';
  });

  // User Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isSecurityAuditOpen, setIsSecurityAuditOpen] = useState<boolean>(false);

  // App Data State
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(StorageService.getSettings());
  const [adminStats, setAdminStats] = useState<AdminStats>(StorageService.getAdminStats());
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);

  // Refresh all state from StorageService
  const refreshData = useCallback(() => {
    StorageService.init();
    setPosts(StorageService.getPosts({ status: 'all' }));
    setCategories(StorageService.getCategories());
    setTags(StorageService.getTags());
    setComments(StorageService.getComments());
    setSubscribers(StorageService.getSubscribers());
    setSettings(StorageService.getSettings());
    setAdminStats(StorageService.getAdminStats());
    setBookmarkedIds(StorageService.getBookmarks());
    setIsAdminLoggedIn(Boolean(user && role === 'admin'));
  }, [user, role]);

  // Učitaj sačuvane članke iz baze pri prijavi (autoritativno stanje za profil)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    ForumService.getMyBookmarksAsync()
      .then(ids => {
        if (cancelled || !Array.isArray(ids)) return;
        StorageService.setBookmarks(ids);
        setBookmarkedIds(ids);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    refreshData();

    // Sprečavamo preuranjeno preusmeravanje ili brisanje rute dok traje provera sesije (F5 refresh)
    if (loading) {
      return;
    }

    const pathname = location.pathname;

    if (pathname === '/login') {
      if (!user) {
        setAuthModalMode('login');
        setIsAuthModalOpen(true);
      }
      setCurrentView('home');
    } else if (pathname === '/register') {
      if (!user) {
        setAuthModalMode('register');
        setIsAuthModalOpen(true);
      }
      setCurrentView('home');
    } else if (pathname === '/admin/vesti/nova') {
      if (role === 'user') {
        showToast('CMS je dostupan samo za administratore.', 'error');
        setCurrentView('home');
      } else if (role === 'admin') {
        setCurrentView('admin_new_post');
      } else {
        setCurrentView('admin_login');
      }
    } else if (pathname.startsWith('/admin/vesti/') && pathname.includes('/izmena')) {
      if (role === 'user') {
        showToast('CMS je dostupan samo za administratore.', 'error');
        setCurrentView('home');
      } else if (role === 'admin') {
        const idPart = pathname.replace('/admin/vesti/', '').replace('/izmena', '');
        setViewParam(idPart);
        setCurrentView('admin_edit_post');
      } else {
        setCurrentView('admin_login');
      }
    } else if (pathname === '/admin/vesti') {
      if (role === 'user') {
        showToast('CMS je dostupan samo za administratore.', 'error');
        setCurrentView('home');
      } else if (role === 'admin') {
        setCurrentView('admin_posts');
      } else {
        setCurrentView('admin_login');
      }
    } else if (pathname === '/admin/login') {
      if (user) {
        if (role === 'admin') {
          setCurrentView('admin');
        } else {
          setCurrentView('home');
        }
      } else {
        setCurrentView('admin_login');
      }
    } else if (pathname === '/admin/register') {
      if (user) {
        if (role === 'admin') {
          setCurrentView('admin');
        } else {
          setCurrentView('home');
        }
      } else {
        setCurrentView('admin_register');
      }
    } else if (pathname === '/admin') {
      if (role === 'user') {
        showToast('CMS je dostupan samo za administratore.', 'error');
        setCurrentView('home');
      } else if (role === 'admin') {
        setCurrentView('admin');
      } else {
        setCurrentView('admin_login');
      }
    } else if (pathname.startsWith('/forum/thread/')) {
      const slugPart = pathname.replace('/forum/thread/', '');
      setViewParam(slugPart);
      setCurrentView('thread');
    } else if (pathname.startsWith('/forum/')) {
      const subPart = pathname.replace('/forum/', '');
      setViewParam(subPart);
      setCurrentView('forum');
    } else if (pathname === '/forum') {
      setViewParam('');
      setCurrentView('forum');
    } else if (pathname === '/profile' || pathname === '/profil') {
      setViewParam('');
      setCurrentView('profile');
    } else if (pathname.startsWith('/u/')) {
      const userPart = pathname.replace('/u/', '');
      setViewParam(decodeURIComponent(userPart));
      setCurrentView('profile');
    } else if (pathname === '/reset-password') {
      setCurrentView('reset_password');
    }
  }, [location.pathname, refreshData, user, role, loading, showToast]);

  const navigate = (view: string, param: string = '') => {
    if (view === 'user_login') {
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return;
    } else if (view === 'user_register') {
      setAuthModalMode('register');
      setIsAuthModalOpen(true);
      return;
    }

    setCurrentView(view);
    setViewParam(param);
    if (view === 'admin_login') {
      window.history.pushState(null, '', '/admin/login');
    } else if (view === 'admin_register') {
      window.history.pushState(null, '', '/admin/register');
    } else if (view === 'admin') {
      window.history.pushState(null, '', '/admin');
    } else if (view === 'admin_posts') {
      window.history.pushState(null, '', '/admin/vesti');
    } else if (view === 'admin_new_post') {
      window.history.pushState(null, '', '/admin/vesti/nova');
    } else if (view === 'admin_edit_post') {
      window.history.pushState(null, '', `/admin/vesti/${param}/izmena`);
    } else if (view === 'forum') {
      window.history.pushState(null, '', param ? `/forum/${param}` : '/forum');
    } else if (view === 'thread') {
      window.history.pushState(null, '', `/forum/thread/${param}`);
    } else if (view === 'profile') {
      window.history.pushState(null, '', param ? `/u/${encodeURIComponent(param)}` : '/profile');
    } else if (view === 'home') {
      window.history.pushState(null, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };



  const handleToggleBookmark = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const isSaved = StorageService.toggleBookmark(id);
    setBookmarkedIds(StorageService.getBookmarks());
    // Sinhronizuj sa bazom kako bi sačuvani članci bili vidljivi na profilu
    if (user) {
      ForumService.syncBookmarkAsync(id, isSaved).catch(() => {});
    }
    showToast(isSaved ? 'Vest je sačuvana u vašim zabeleškama.' : 'Uklonjeno iz sačuvanih.', 'info');
  };

  const handleLoginSuccess = (userRole?: string, isFromAdminLogin: boolean = false) => {
    refreshData();
    const activeRole = userRole || role;
    const isUserAdmin = activeRole === 'admin';
    setIsAdminLoggedIn(isUserAdmin);

    if (isFromAdminLogin && isUserAdmin) {
      showToast('Uspešna prijava u CMS Admin Panel.', 'success');
      navigate('admin');
    } else if (isFromAdminLogin && !isUserAdmin) {
      showToast('Prijavljeni ste na portal. CMS panel je rezervisan za administratore.', 'info');
      navigate('home');
    } else {
      showToast(
        isUserAdmin
          ? 'Dobrodošli nazad! Prijavljeni ste na portal NEXUS GG.'
          : 'Uspešno ste se prijavili na portal NEXUS GG!',
        'success'
      );
      navigate('home');
    }
  };

  const handleLogout = async () => {
    await signOut();
    StorageService.logout();
    setIsAdminLoggedIn(false);
    showToast('Uspešno ste se odjavili.', 'info');
    navigate('home');
  };

  // Rutiranje za Admin Postove
  if (currentView === 'admin_new_post') {
    return (
      <ProtectedRoute>
        <NewPost />
      </ProtectedRoute>
    );
  }

  if (currentView === 'admin_edit_post') {
    return (
      <ProtectedRoute>
        <EditPost />
      </ProtectedRoute>
    );
  }

  if (currentView === 'admin_posts') {
    return (
      <ProtectedRoute>
        <Posts />
      </ProtectedRoute>
    );
  }

  // If in Admin Section
  if (currentView === 'admin') {
    return (
      <ProtectedRoute>
        <AdminLayout
          stats={adminStats}
          posts={posts}
          categories={categories}
          tags={tags}
          comments={comments}
          subscribers={subscribers}
          settings={settings}
          onLogout={handleLogout}
          onNavigatePublic={(slug?: string) => {
            if (slug) {
              navigate('post', slug);
            } else {
              navigate('home');
            }
          }}
          onRefreshData={refreshData}
        />
      </ProtectedRoute>
    );
  }

  if (loading && (currentView === 'admin_login' || currentView === 'admin_register')) {
    return (
      <div className="min-h-screen bg-[#08080c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          <p className="text-xs text-zinc-400">Provera sesije...</p>
        </div>
      </div>
    );
  }

  if (currentView === 'admin_login') {
    if (isAdminLoggedIn) {
      return (
        <AdminLayout
          stats={adminStats}
          posts={posts}
          categories={categories}
          tags={tags}
          comments={comments}
          subscribers={subscribers}
          settings={settings}
          onLogout={handleLogout}
          onNavigatePublic={(slug?: string) => {
            if (slug) {
              navigate('post', slug);
            } else {
              navigate('home');
            }
          }}
          onRefreshData={refreshData}
        />
      );
    }
    return (
      <Login
        onSuccess={(r) => handleLoginSuccess(r, true)}
        onNavigateRegister={() => navigate('admin_register')}
        redirectUrl="/admin"
      />
    );
  }

  if (currentView === 'admin_register') {
    if (isAdminLoggedIn) {
      return (
        <AdminLayout
          stats={adminStats}
          posts={posts}
          categories={categories}
          tags={tags}
          comments={comments}
          subscribers={subscribers}
          settings={settings}
          onLogout={handleLogout}
          onNavigatePublic={(slug?: string) => {
            if (slug) {
              navigate('post', slug);
            } else {
              navigate('home');
            }
          }}
          onRefreshData={refreshData}
        />
      );
    }
    return (
      <Register
        onSuccess={(r) => handleLoginSuccess(r, false)}
        onNavigateLogin={() => navigate('admin_login')}
        redirectUrl="/"
      />
    );
  }

  if (currentView === 'reset_password') {
    return <ResetPasswordView onNavigateHome={() => navigate('home')} />;
  }

  const activeCategory = viewParam
    ? categories.find(c => c.slug === viewParam) || categories[0]
    : categories[0];

  return (
    /* Opcija 1: Čisto crna pozadina #0a0a0a svuda bez gradienta i glow efekata */
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] flex flex-col justify-between selection:bg-purple-600/30 selection:text-white">
      {/* Header */}
      <Header
        currentPath={currentView === 'category' ? `category/${viewParam}` : currentView}
        onNavigate={navigate}
        savedCount={bookmarkedIds.length}
        isAdminLoggedIn={isAdminLoggedIn}
        onOpenAuthModal={(mode) => {
          setAuthModalMode(mode || 'login');
          setIsAuthModalOpen(true);
        }}
        onOpenSecurityAudit={() => setIsSecurityAuditOpen(true)}
      />

      {/* Sadržaj u centru (max-w-[1440px] mx-auto, px-6 sm:px-8), čisto crna pozadina sa strane i u centru */}
      <div className="flex-grow w-full max-w-[1440px] mx-auto px-6 sm:px-8 bg-[#0a0a0a]">
        <ErrorBoundary fallbackTitle="Greška u prikazivanju sadržaja portala">
          <main>
            {currentView === 'home' && (
              <HomeView
                onSelectPost={(slug: string) => navigate('post', slug)}
                onSelectCategory={(slug: string) => navigate('category', slug)}
                onNavigateForum={(subId?: string) => navigate('forum', subId)}
                onSelectThread={(slug: string) => navigate('thread', slug)}
                bookmarkedIds={bookmarkedIds}
                onToggleBookmark={handleToggleBookmark}
              />
            )}


            {currentView === 'post' && (
              <PostDetailView
                slug={viewParam}
                onNavigateBack={() => navigate('home')}
                onSelectPost={(slug: string) => navigate('post', slug)}
                onSelectCategory={(slug: string) => navigate('category', slug)}
                isBookmarked={
                  posts.find(p => p.slug === viewParam)
                    ? bookmarkedIds.includes(posts.find(p => p.slug === viewParam)!.id)
                    : false
                }
                onToggleBookmark={handleToggleBookmark}
              />
            )}

            {currentView === 'category' && (
              <CategoryView
                category={activeCategory}
                posts={posts}
                onSelectPost={(slug: string) => navigate('post', slug)}
                onNavigateHome={() => navigate('home')}
                bookmarkedIds={bookmarkedIds}
                onToggleBookmark={handleToggleBookmark}
              />
            )}

            {currentView === 'search' && (
              <SearchView
                posts={posts}
                categories={categories}
                onSelectPost={(slug: string) => navigate('post', slug)}
                bookmarkedIds={bookmarkedIds}
                onToggleBookmark={handleToggleBookmark}
              />
            )}

            {currentView === 'bookmarks' && (
              <BookmarksView
                posts={posts}
                bookmarkedIds={bookmarkedIds}
                onSelectPost={(slug: string) => navigate('post', slug)}
                onNavigateHome={() => navigate('home')}
                onToggleBookmark={handleToggleBookmark}
              />
            )}

            {currentView === 'forum' && (
              <ForumHomeView
                onSelectThread={(slug: string) => navigate('thread', slug)}
                onSelectMember={(uname: string) => navigate('profile', uname)}
                initialSubforumId={viewParam}
              />
            )}

            {currentView === 'thread' && (
              <ThreadDetailView
                slug={viewParam}
                onNavigateBack={() => navigate('forum')}
                onSelectSubforum={(subId: string) => navigate('forum', subId)}
                onSelectAuthor={(uname: string) => navigate('profile', uname)}
              />
            )}


            {currentView === 'profile' && (
              <ProfileView
                username={viewParam}
                onNavigateBack={() => navigate('forum')}
                onSelectThread={(slug: string) => navigate('thread', slug)}
                onSelectPost={(slug: string) => navigate('post', slug)}
                onNavigateForum={() => navigate('forum')}
              />
            )}

            {currentView === 'about' && (
              <AboutView onNavigateHome={() => navigate('home')} />
            )}


            {currentView === 'contact' && <ContactView />}
          </main>
        </ErrorBoundary>
      </div>


      {/* Footer */}
      <Footer onNavigate={navigate} />

      {/* Korisnički Modal za Prijavu i Registraciju */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onSuccess={(userRole) => {
          handleLoginSuccess(userRole);
        }}
        onNavigateAdminLogin={() => {
          setIsAuthModalOpen(false);
          navigate('admin_login');
        }}
      />

      {/* Sigurnosni Audit Modal na root nivou sa najvišim z-indexom */}
      <SecurityAuditModal
        isOpen={isSecurityAuditOpen}
        onClose={() => setIsSecurityAuditOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <MainApp />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
