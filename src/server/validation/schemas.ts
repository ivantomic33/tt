import { z } from 'zod';

/**
 * Server-side XSS sanitization helpers.
 * Strips dangerous script/iframe/object/event-handler vectors from user-provided strings.
 */
export function sanitizePlainText(input: string): string {
  return input
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}

export function sanitizeRichHtml(input: string): string {
  return input
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*(iframe|object|embed|applet|meta|link|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(iframe|object|embed|applet|meta|link)[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .trim();
}

/**
 * Strict Zod Schemas for Request Validation (Whitelist Approach)
 */

// 1. User Registration
export const RegisterSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email je obavezan.')
      .email('Neispravan format email adrese.')
      .max(100, 'Email ne može biti duži od 100 karaktera.')
      .transform((val) => val.trim().toLowerCase()),
    password: z
      .string()
      .min(8, 'Lozinka mora imati najmanje 8 karaktera.')
      .max(128, 'Lozinka ne može biti duža od 128 karaktera.')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9])/,
        'Lozinka mora sadržati veliko slovo, malo slovo, broj i specijalni karakter.'
      ),
    name: z
      .string()
      .min(2, 'Korisničko ime mora imati najmanje 2 karaktera.')
      .max(50, 'Korisničko ime ne može biti duže od 50 karaktera.')
      .regex(
        /^[a-zA-Z0-9šđčćžŠĐČĆŽ\s_.-]+$/,
        'Korisničko ime sadrži nedozvoljene karaktere.'
      )
      .transform((val) => sanitizePlainText(val))
      .optional(),
    termsAccepted: z
      .boolean()
      .refine(
        (val) => val === true,
        'Morate prihvatiti Pravila zajednice, Uslove korišćenja i Politiku privatnosti.'
      ),
  })
  .strict();

// 2. User Login
export const LoginSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email je obavezan.')
      .email('Neispravan format email adrese.')
      .max(100)
      .transform((val) => val.trim().toLowerCase()),
    password: z.string().min(1, 'Unesite lozinku.').max(128),
  })
  .strict();

// 3. Create Post
export const PostSchema = z.object({
  title: z
    .string()
    .min(5, 'Naslov mora imati najmanje 5 karaktera.')
    .max(200, 'Naslov ne može biti duži od 200 karaktera.')
    .transform((val) => sanitizePlainText(val)),
  slug: z
    .string()
    .min(3)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'Slug može sadržati samo mala slova, brojeve i crtice.')
    .transform((val) => val.trim().toLowerCase())
    .optional(),
  excerpt: z
    .string()
    .min(10, 'Kratak opis mora imati najmanje 10 karaktera.')
    .max(500, 'Kratak opis ne može biti duži od 500 karaktera.')
    .transform((val) => sanitizePlainText(val))
    .optional(),
  content: z
    .string()
    .min(20, 'Sadržaj mora imati najmanje 20 karaktera.')
    .max(50000, 'Sadržaj ne može biti duži od 50,000 karaktera.')
    .transform((val) => sanitizeRichHtml(val)),
  category_id: z.number().int().positive('Mora biti važeći ID kategorije.').optional(),
  category: z.union([z.string(), z.number()]).optional(),
  status: z.enum(['published', 'draft']).default('published'),
  cover_image: z.string().url('Cover image mora biti validan URL.').optional(),
  image_url: z.string().optional(),
  reading_time: z.number().int().min(1).max(120).optional(),
  featured: z.boolean().optional(),
});

// 3b. Update Post
export const UpdatePostSchema = PostSchema.partial();

// 4. Create Comment
export const CommentSchema = z.object({
  post_id: z.union([z.string(), z.number()]).optional(),
  author_name: z
    .string()
    .min(2, 'Ime mora imati najmanje 2 karaktera.')
    .max(50, 'Ime ne može biti duže od 50 karaktera.')
    .regex(/^[a-zA-Z0-9šđčćžŠĐČĆŽ\s_.-]+$/, 'Ime sadrži nedozvoljene karaktere.')
    .transform((val) => sanitizePlainText(val))
    .optional(),
  author_email: z
    .string()
    .email('Neispravan email format.')
    .max(100)
    .transform((val) => val.trim().toLowerCase())
    .optional(),
  content: z
    .string()
    .min(2, 'Komentar mora imati najmanje 2 karaktera.')
    .max(1000, 'Komentar ne može biti duži od 1,000 karaktera.')
    .transform((val) => sanitizePlainText(val)),
});

// 5. Newsletter Subscription
export const NewsletterSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email je obavezan.')
      .email('Neispravna email adresa.')
      .max(100)
      .transform((val) => val.trim().toLowerCase()),
  })
  .strict();

// 6. Forgot Password
export const ForgotPasswordSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email je obavezan.')
      .email('Neispravna email adresa.')
      .max(100)
      .transform((val) => val.trim().toLowerCase()),
  })
  .strict();

// 7. Reset Password
export const ResetPasswordSchema = z
  .object({
    token: z.string().min(10, 'Neispravan reset token.'),
    newPassword: z
      .string()
      .min(8, 'Nova lozinka mora imati najmanje 8 karaktera.')
      .max(128)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Lozinka mora sadržati najmanje jedno veliko slovo, jedno malo slovo i jedan broj.'
      ),
  })
  .strict();

// 8. Post Reaction Schema
export const ReactionSchema = z.object({
  reactionType: z.enum(['like', 'gg', 'hype']),
  clientId: z.string().max(120).optional(),
});

// 9. Forum Thread Creation & Update Schemas
export const CreateThreadSchema = z.object({
  title: z
    .string()
    .min(3, 'Naslov teme mora imati najmanje 3 karaktera.')
    .max(200, 'Naslov teme ne može biti duži od 200 karaktera.')
    .transform((val) => sanitizePlainText(val)),
  subforumId: z.string().min(1, 'Potforum je obavezan.').max(64),
  content: z
    .string()
    .min(2, 'Sadržaj teme je obavezan.')
    .max(20000, 'Sadržaj teme je predugačak.')
    .transform((val) => sanitizeRichHtml(val)),
  tags: z
    .array(z.string().max(32).transform((t) => sanitizePlainText(t)))
    .max(10)
    .optional(),
  poll: z
    .object({
      id: z.string().max(64),
      question: z.string().min(2).max(200).transform((v) => sanitizePlainText(v)),
      options: z
        .array(
          z.object({
            id: z.string().max(64),
            text: z.string().min(1).max(120).transform((v) => sanitizePlainText(v)),
            votes: z.number().int().min(0).default(0),
          })
        )
        .min(2)
        .max(10),
      totalVotes: z.number().int().min(0).default(0),
    })
    .nullable()
    .optional(),
  authorName: z
    .string()
    .max(60)
    .transform((val) => sanitizePlainText(val))
    .optional(),
  authorRole: z.string().max(40).optional(),
  authorAvatar: z.string().max(500).nullable().optional(),
});

export const UpdateThreadSchema = z.object({
  title: z
    .string()
    .min(3)
    .max(200)
    .transform((val) => sanitizePlainText(val))
    .optional(),
  content: z
    .string()
    .min(2)
    .max(20000)
    .transform((val) => sanitizeRichHtml(val))
    .optional(),
  subforumId: z.string().min(1).max(64).optional(),
  tags: z.array(z.string().max(32).transform((t) => sanitizePlainText(t))).max(10).optional(),
  isPinned: z.boolean().optional(),
  isLocked: z.boolean().optional(),
});

// 10. Forum Reply Schema
export const CreateReplySchema = z.object({
  parentId: z.string().max(64).nullable().optional(),
  content: z
    .string()
    .min(1, 'Sadržaj odgovora ne može biti prazan.')
    .max(5000, 'Odgovor ne može biti duži od 5,000 karaktera.')
    .transform((val) => sanitizeRichHtml(val)),
  authorName: z
    .string()
    .max(60)
    .transform((val) => sanitizePlainText(val))
    .optional(),
  authorRole: z.string().max(40).optional(),
  authorAvatar: z.string().max(500).nullable().optional(),
  mentions: z.array(z.string().max(50)).max(20).optional(),
});

// 11. Forum Vote & Poll Vote Schemas
export const VoteSchema = z.object({
  voteType: z.enum(['up', 'down']),
  clientId: z.string().max(120).optional(),
});

export const PollVoteSchema = z.object({
  optionId: z.string().min(1).max(64),
  clientId: z.string().max(120).optional(),
});

// 12. Subforum CRUD Schemas
export const SubforumSchema = z.object({
  name: z
    .string()
    .min(2, 'Naziv potforuma je obavezan.')
    .max(80)
    .transform((val) => sanitizePlainText(val)),
  slug: z.string().max(80).optional(),
  description: z
    .string()
    .max(400)
    .transform((val) => sanitizePlainText(val))
    .optional(),
  icon: z.string().max(40).optional(),
  color: z.string().max(30).optional(),
  badge: z.string().max(40).nullable().optional(),
  display_order: z.number().int().min(0).max(999).optional(),
});

export const UpdateSubforumSchema = SubforumSchema.partial();

// 13. Forum Member & Karma Schemas
export const MemberUpdateSchema = z.object({
  role: z.string().max(40).optional(),
  avatar: z.string().max(500).optional(),
  coverBanner: z.string().max(500).optional(),
  baseKarma: z.number().int().min(0).max(1000000).optional(),
  isOnline: z.boolean().optional(),
  bio: z
    .string()
    .max(500)
    .transform((val) => sanitizePlainText(val))
    .optional(),
  gamingAccounts: z
    .object({
      steamId: z.string().max(150).optional(),
      discordTag: z.string().max(100).optional(),
      twitch: z.string().max(150).optional(),
      youtube: z.string().max(150).optional(),
      psnId: z.string().max(100).optional(),
      xboxGamertag: z.string().max(100).optional(),
    })
    .optional(),
  badges: z.array(z.record(z.string(), z.unknown())).max(30).optional(),
});

export const BadgeSchema = z.object({
  badgeId: z.string().max(64).optional(),
  badgeName: z
    .string()
    .min(1)
    .max(60)
    .transform((val) => sanitizePlainText(val)),
  description: z
    .string()
    .max(200)
    .transform((val) => sanitizePlainText(val))
    .optional(),
  icon: z.string().max(40).optional(),
  color: z.string().max(30).optional(),
  assignedBy: z.string().max(60).optional(),
});

export const AdjustKarmaSchema = z.object({
  amount: z.number().int().min(-100000).max(100000),
  reason: z
    .string()
    .max(250)
    .transform((val) => sanitizePlainText(val))
    .optional(),
});

// 14. Sačuvani članci (bookmarks)
export const BookmarkSchema = z.object({
  postId: z.number().int().positive(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type PostInput = z.infer<typeof PostSchema>;
export type CommentInput = z.infer<typeof CommentSchema>;
export type NewsletterInput = z.infer<typeof NewsletterSchema>;
