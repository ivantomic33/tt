import { Router } from 'express';
import { PostsController } from '../controllers/postsController';
import { ReactionsController } from '../controllers/reactionsController';
import { authorizeResourceOwnership } from '../security/bolaMiddleware';
import { optionalAuth, requireAuth } from '../security/authMiddleware';
import { commentRateLimiter, voteRateLimiter } from '../security/rateLimiter';
import { validateBody } from '../validation/validateMiddleware';
import { PostSchema, UpdatePostSchema, CommentSchema, ReactionSchema } from '../validation/schemas';
import { getAdminSupabaseClient, getDbSecurityAuditSummary } from '../db/supabaseClient';

const router = Router();

/**
 * POSTS, REACTIONS & COMMENTS ROUTES
 * Protected with Express JWT Auth Middleware, BOLA/IDOR Ownership Verification,
 * Zod Input Validation, Rate Limiting, and Real-time SSE Reactions.
 */

// 1. Public / Optional-Auth Post Listing & Detail (supports pagination & draft filtering)
router.get('/', optionalAuth, PostsController.getAllPosts);
router.get('/security/audit', (_req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    dbSecurityArchitecture: getDbSecurityAuditSummary(),
  });
});
router.get('/:id', optionalAuth, PostsController.getPostById);

// 1.1 Real-time Post Reactions (Rate Limited & Zod Validated)
router.get('/:id/reactions', ReactionsController.getReactions);
router.post(
  '/:id/reactions',
  voteRateLimiter,
  validateBody(ReactionSchema),
  ReactionsController.toggleReaction
);
router.get('/:id/reactions/stream', ReactionsController.streamReactions);

// 2. Create Post (Requires Authenticated User + Strict Zod Validation)
router.post('/', requireAuth, validateBody(PostSchema), PostsController.createPost);

// 3. Update Post (BOLA Ownership Middleware + Zod Validation)
router.patch(
  '/:id',
  authorizeResourceOwnership(async (req) => {
    try {
      const client = getAdminSupabaseClient();
      const isNumeric = /^\d+$/.test(req.params.id);
      let query = client.from('posts').select('author_id');
      if (isNumeric) {
        query = query.eq('id', Number(req.params.id));
      } else {
        query = query.eq('slug', req.params.id);
      }
      const { data } = await query.maybeSingle();
      return data?.author_id || null;
    } catch {
      return null;
    }
  }),
  validateBody(UpdatePostSchema),
  PostsController.updatePost
);

// 4. Delete Post (BOLA Ownership Middleware)
router.delete(
  '/:id',
  authorizeResourceOwnership(async (req) => {
    try {
      const client = getAdminSupabaseClient();
      const isNumeric = /^\d+$/.test(req.params.id);
      let query = client.from('posts').select('author_id');
      if (isNumeric) {
        query = query.eq('id', Number(req.params.id));
      } else {
        query = query.eq('slug', req.params.id);
      }
      const { data } = await query.maybeSingle();
      return data?.author_id || null;
    } catch {
      return null;
    }
  }),
  PostsController.deletePost
);

// 5. Add Comment to Post (Rate Limited + Optional Auth + Zod Validation)
router.post(
  '/:id/comments',
  commentRateLimiter,
  optionalAuth,
  validateBody(CommentSchema),
  PostsController.addComment
);

export default router;
