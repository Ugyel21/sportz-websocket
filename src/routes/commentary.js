import { Router } from 'express';
import { db } from '../db/db.js';
import { commentary } from '../db/schema.js';
import { matchIdParamSchema } from '../validation/matches.js';
import { createCommentarySchema, listCommentaryQuerySchema } from '../validation/commentary.js';
import { desc, eq } from 'drizzle-orm';

export const commentaryRouter = Router({ mergeParams: true });

const MAX_LIMIT = 100;

commentaryRouter.get('/', async (req, res) => {
    const paramsParsed = matchIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
        return res.status(400).json({ error: 'Invalid match ID.', details: JSON.stringify(paramsParsed.error.issues) });
    }

    const queryParsed = listCommentaryQuerySchema.safeParse(req.query);
    if (!queryParsed.success) {
        return res.status(400).json({ error: 'Invalid query parameters.', details: JSON.stringify(queryParsed.error.issues) });
    }

    const limit = Math.min(queryParsed.data.limit ?? 100, MAX_LIMIT);

    try {
        const data = await db
            .select()
            .from(commentary)
            .where(eq(commentary.matchId, paramsParsed.data.id))
            .orderBy(desc(commentary.createdAt))
            .limit(limit);
        res.json({ data });
    } catch (e) {
        res.status(500).json({ error: 'Failed to list commentary.' });
    }
});

commentaryRouter.post('/', async (req, res) => {
    const paramsParsed = matchIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
        return res.status(400).json({ error: 'Invalid params.', details: JSON.stringify(paramsParsed.error.issues) });
    }

    const bodyParsed = createCommentarySchema.safeParse(req.body);
    if (!bodyParsed.success) {
        return res.status(400).json({ error: 'Invalid commentary payload.', details: JSON.stringify(bodyParsed.error.issues) });
    }

    const { minute, minutes, eventType, period, ...rest } = bodyParsed.data;
    const payload = {
        ...rest,
        matchId: paramsParsed.data.id,
        minute: minute ?? minutes,
        period: eventType ?? period,
    };

    try {
        const [entry] = await db.insert(commentary).values(payload).returning();
        if(res.app.locals.broadcastCommentary) {
            res.app.locals.broadcastCommentary(entry.matchId, entry);
        }

        res.status(201).json({ data: entry });
    } catch (e) {
        const message = e?.message ?? String(e);
        res.status(500).json({ error: 'Failed to create commentary.', details: JSON.stringify({ message }) });
    }
});
