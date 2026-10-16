export interface Category {
  id: number;
  name: string;
  slug: string;
  color: string;
  description?: string;
  postCount?: number;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
}

export interface Author {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  category_id: number;
  category: Category;
  author: Author;
  status: 'draft' | 'published';
  views: number;
  likes: number;
  reading_time: number;
  featured?: boolean;
  tags: Tag[];
  created_at: string;
  updated_at: string;
  published_at: string;
}

export interface Comment {
  id: string;
  post_id: number;
  author_name: string;
  author_email: string;
  content: string;
  status: 'approved' | 'pending' | 'spam';
  created_at: string;
  likes: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  avatar?: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribed_at: string;
  active: boolean;
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  description: string;
  contactEmail: string;
  socialLinks: {
    twitter: string;
    discord: string;
    youtube: string;
    steam: string;
    twitch: string;
  };
}

export type ReactionType = 'like' | 'gg' | 'hype';

export interface ReactionCounts {
  like: number;
  gg: number;
  hype: number;
}

export interface UserReactions {
  like: boolean;
  gg: boolean;
  hype: boolean;
}

export interface PostReactionState {
  counts: ReactionCounts;
  userReactions: UserReactions;
}

export interface ReactionEventPayload {
  type: 'reaction_updated';
  postId: number;
  counts: ReactionCounts;
  triggeringClientId: string;
  reactionType: ReactionType;
  action: 'added' | 'removed';
  timestamp: string;
}

export interface AdminStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalViews: number;
  totalComments: number;
  pendingComments: number;
  totalSubscribers: number;
}

// ==========================================
// GAMING FORUM & DISCUSSIONS SYSTEM TYPES
// ==========================================

export type ForumSubforumId =
  | 'pc-gaming'
  | 'consoles'
  | 'esports'
  | 'hardware'
  | 'lfg'
  | 'off-topic'
  | (string & {});

export interface ForumSubforum {
  id: ForumSubforumId;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  badge?: string;
  display_order?: number;
  threadCount: number;
  replyCount: number;
  latestActivity?: {
    threadTitle: string;
    threadSlug: string;
    authorName: string;
    time: string;
  };
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  voterIds?: string[];
}

export interface ForumPoll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  allowMultiple?: boolean;
  expiresAt?: string;
}

export type VoteType = 'up' | 'down';

export interface ForumReply {
  id: string;
  threadId: string;
  parentId: string | null; // For hierarchical / nested comments
  authorId: string;
  authorName: string;
  authorRole?: string;
  authorAvatar?: string;
  authorKarma?: number;
  content: string;
  upvotes: number;
  downvotes: number;
  score: number; // karma net: upvotes - downvotes
  userVote?: VoteType | null;
  createdAt: string;
  updatedAt?: string;
  mentions?: string[]; // e.g. ["GamerPro", "CyberIvan"]
  replies?: ForumReply[];
  hasSpoilers?: boolean;
}

export interface ForumThread {
  id: string;
  title: string;
  slug: string;
  subforumId: ForumSubforumId;
  authorId: string;
  authorName: string;
  authorRole?: string;
  authorAvatar?: string;
  authorKarma?: number;
  content: string;
  tags: string[];
  poll?: ForumPoll;
  views: number;
  upvotes: number;
  downvotes: number;
  score: number; // Reddit-style Karma score (upvotes - downvotes)
  userVote?: VoteType | null;
  replyCount: number;
  isPinned?: boolean;
  isLocked?: boolean;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  hasSpoilers?: boolean;
}

export type ThreadSortOption = 'hot' | 'top' | 'new' | 'discussed';

export interface GamingAccounts {
  steamId?: string;
  discordTag?: string;
  twitch?: string;
  youtube?: string;
  psnId?: string;
  xboxGamertag?: string;
}

export interface UserBadge {
  id: string;
  name: string; // e.g. "Pro Reviewer", "Esports Mod", "Guild Leader", "Top Contributor"
  description: string;
  icon: string; // lucide icon identifier or emoji
  color: string; // hex color or tailwind gradient
  isAutomated?: boolean;
  assignedBy?: string;
  assignedAt: string;
}

export interface MemberReputation {
  total: number;
  base: number;
  fromThreads: number;
  fromReplies: number;
  tier: {
    name: string;
    color: string;
    min: number;
    nextTier: { name: string; color: string; min: number } | null;
  };
  level: number;
  xp: number;
  nextLevelXp: number;
  currentFloor: number;
  progressPercent: number;
}

export interface ForumMemberKarma {
  id?: string;
  name: string;
  email?: string;
  karma: number;
  role: string;
  avatar: string;
  coverBanner?: string;
  threadCount: number;
  replyCount: number;
  rank: number;
  isOnline?: boolean;
  baseKarma?: number;
  bio?: string;
  joinedDate?: string;
  gamingAccounts?: GamingAccounts;
  badges?: UserBadge[];
  level?: number;
  xp?: number;
  nextLevelXp?: number;
  rankTitle?: string;
  reputation?: MemberReputation;
  recentThreads?: ForumThread[];
  recentReplies?: ForumReply[];
  savedPosts?: Post[];
  savedCount?: number;
}




