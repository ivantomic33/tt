import { Request, Response } from 'express';
import { getAdminSupabaseClient } from '../db/supabaseClient';

// In-memory store for SSE clients listening to live post reactions
const sseClients = new Map<number, Set<Response>>();

interface LocalReactionEntry {
  postId: number;
  reactionType: 'like' | 'gg' | 'hype';
  clientId: string;
}

const localReactionsStore: LocalReactionEntry[] = [
  { postId: 1, reactionType: 'hype', clientId: 'seed_client_1' },
  { postId: 1, reactionType: 'hype', clientId: 'seed_client_2' },
  { postId: 1, reactionType: 'gg', clientId: 'seed_client_3' },
  { postId: 1, reactionType: 'like', clientId: 'seed_client_4' },
  { postId: 2, reactionType: 'hype', clientId: 'seed_client_1' },
  { postId: 2, reactionType: 'gg', clientId: 'seed_client_2' },
  { postId: 5, reactionType: 'gg', clientId: 'seed_client_1' },
];

/**
 * Serverless okruženja (Vercel) prekidaju dugotrajne HTTP odgovore (SSE), zato
 * se stream endpoint u takvom okruženju degradira na jednokratni odgovor.
 */
const IS_SERVERLESS = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

export class ReactionsController {
  /**
   * SSE Stream endpoint for live post reaction updates
   * GET /api/posts/:id/reactions/stream
   */
  static async streamReactions(req: Request, res: Response): Promise<void> {
    const postId = Number(req.params.id);
    if (isNaN(postId) || postId <= 0) {
      res.status(400).json({ success: false, error: 'Neispravan ID posta.' });
      return;
    }

    const clientId =
      (typeof req.query.clientId === 'string' && req.query.clientId.slice(0, 120)) ||
      (typeof req.headers['x-client-id'] === 'string' && req.headers['x-client-id'].slice(0, 120)) ||
      'anon';

    // Serverless (Vercel): bez dugotrajne SSE konekcije i bez intervala.
    if (IS_SERVERLESS) {
      const snapshot = await ReactionsController.calculatePostReactions(postId, clientId);
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
      });
      res.end(
        `data: ${JSON.stringify({
          type: 'reaction_updated',
          postId,
          counts: snapshot.counts,
          timestamp: new Date().toISOString(),
        })}\n\n`
      );
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.write(
      `data: ${JSON.stringify({ type: 'connected', postId, timestamp: new Date().toISOString() })}\n\n`
    );

    if (!sseClients.has(postId)) {
      sseClients.set(postId, new Set());
    }
    const clientsSet = sseClients.get(postId)!;
    clientsSet.add(res);

    const heartbeatInterval = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(heartbeatInterval);
      }
    }, 15000);
    // Ne drži Node proces budnim samo zbog heartbeat intervala.
    heartbeatInterval.unref?.();

    req.on('close', () => {
      clearInterval(heartbeatInterval);
      clientsSet.delete(res);
      if (clientsSet.size === 0) {
        sseClients.delete(postId);
      }
    });
  }

  /**
   * GET /api/posts/:id/reactions
   */
  static async getReactions(req: Request, res: Response): Promise<void> {
    try {
      const postId = Number(req.params.id);
      const clientId =
        (typeof req.query.clientId === 'string' && req.query.clientId.slice(0, 120)) ||
        (typeof req.headers['x-client-id'] === 'string' && req.headers['x-client-id'].slice(0, 120)) ||
        'anon';

      if (isNaN(postId) || postId <= 0) {
        res.status(400).json({ success: false, error: 'Neispravan ID posta.' });
        return;
      }

      const reactionData = await ReactionsController.calculatePostReactions(postId, clientId);

      res.json({
        success: true,
        postId,
        counts: reactionData.counts,
        userReactions: reactionData.userReactions,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Greška pri učitavanju reakcija.';
      res.status(500).json({ success: false, error: msg });
    }
  }

  /**
   * POST /api/posts/:id/reactions
   */
  static async toggleReaction(req: Request, res: Response): Promise<void> {
    try {
      const postId = Number(req.params.id);
      const { reactionType, clientId } = req.body || {};

      if (isNaN(postId) || postId <= 0) {
        res.status(400).json({ success: false, error: 'Neispravan ID posta.' });
        return;
      }

      if (!['like', 'gg', 'hype'].includes(reactionType)) {
        res.status(400).json({
          success: false,
          error: 'Neispravan tip reakcije. Dozvoljeno: like, gg, hype.',
        });
        return;
      }

      const activeClientId =
        (typeof clientId === 'string' && clientId.trim()) ||
        (typeof req.headers['x-client-id'] === 'string' && req.headers['x-client-id'].trim()) ||
        'anon_client_' + Date.now();

      let action: 'added' | 'removed' = 'added';
      let dbUpdated = false;

      try {
        const client = getAdminSupabaseClient();
        const { data: existing, error: selectErr } = await client
          .from('post_reactions')
          .select('id')
          .eq('post_id', postId)
          .eq('reaction_type', reactionType)
          .eq('client_id', activeClientId)
          .maybeSingle();

        if (!selectErr) {
          if (existing) {
            const { error: delErr } = await client
              .from('post_reactions')
              .delete()
              .eq('id', existing.id);
            if (!delErr) {
              action = 'removed';
              dbUpdated = true;
            }
          } else {
            const { error: insErr } = await client.from('post_reactions').insert({
              post_id: postId,
              reaction_type: reactionType,
              client_id: activeClientId,
            });
            if (!insErr) {
              action = 'added';
              dbUpdated = true;
            }
          }
        }
      } catch (dbErr) {
        console.warn('[ReactionsController] DB update fallback to in-memory:', dbErr);
      }

      const localIdx = localReactionsStore.findIndex(
        (r) =>
          r.postId === postId &&
          r.reactionType === reactionType &&
          r.clientId === activeClientId
      );
      if (localIdx >= 0) {
        localReactionsStore.splice(localIdx, 1);
        if (!dbUpdated) action = 'removed';
      } else {
        localReactionsStore.push({
          postId,
          reactionType,
          clientId: activeClientId,
        });
        if (!dbUpdated) action = 'added';
      }

      const updatedData = await ReactionsController.calculatePostReactions(postId, activeClientId);

      const ssePayload = {
        type: 'reaction_updated',
        postId,
        counts: updatedData.counts,
        triggeringClientId: activeClientId,
        reactionType,
        action,
        timestamp: new Date().toISOString(),
      };

      ReactionsController.broadcastSSE(postId, ssePayload);

      res.json({
        success: true,
        postId,
        action,
        reactionType,
        counts: updatedData.counts,
        userReactions: updatedData.userReactions,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Greška pri snimanju reakcije.';
      res.status(500).json({ success: false, error: msg });
    }
  }

  static async calculatePostReactions(
    postId: number,
    clientId: string
  ): Promise<{
    counts: { like: number; gg: number; hype: number };
    userReactions: { like: boolean; gg: boolean; hype: boolean };
  }> {
    const counts = { like: 0, gg: 0, hype: 0 };
    const userReactions = { like: false, gg: false, hype: false };

    try {
      const client = getAdminSupabaseClient();
      const { data, error } = await client
        .from('post_reactions')
        .select('reaction_type, client_id')
        .eq('post_id', postId);

      if (!error && data) {
        data.forEach((row: { reaction_type: string; client_id: string }) => {
          const type = row.reaction_type as 'like' | 'gg' | 'hype';
          if (counts[type] !== undefined) {
            counts[type]++;
          }
          if (row.client_id === clientId && userReactions[type] !== undefined) {
            userReactions[type] = true;
          }
        });
        return { counts, userReactions };
      }
    } catch {
      // Fallback to local memory store
    }

    localReactionsStore
      .filter((r) => r.postId === postId)
      .forEach((r) => {
        if (counts[r.reactionType] !== undefined) {
          counts[r.reactionType]++;
        }
        if (r.clientId === clientId && userReactions[r.reactionType] !== undefined) {
          userReactions[r.reactionType] = true;
        }
      });

    return { counts, userReactions };
  }

  private static broadcastSSE(postId: number, payload: Record<string, unknown>): void {
    const clientsSet = sseClients.get(postId);
    if (clientsSet && clientsSet.size > 0) {
      const dataStr = `data: ${JSON.stringify(payload)}\n\n`;
      clientsSet.forEach((res) => {
        try {
          res.write(dataStr);
        } catch {
          clientsSet.delete(res);
        }
      });
    }
  }
}
