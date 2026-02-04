import { Router } from 'express';
import {createMatchSchema, listMatchesQuerySchema} from "../validation/matches.js";
import {db} from "../db/db.js";
import {matches} from "../db/schema.js";
import {getMatchStatus} from "../utils/match-status.js";
import {desc} from "drizzle-orm";

export const matchRouter = Router();

const MAX_LIMIT = 100;

matchRouter.get('/', async(req, res) => {
    const parsed = listMatchesQuerySchema.safeParse(req.query);
    if(!parsed.success){
        return res.status(400).json({error: 'Invalid query.', details: JSON.stringify(parsed.error.issues)});
    }

    const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);
    try{
        const data = await db.select().from(matches).orderBy((desc(matches.createdAt))).limit(limit);
        res.json({data});
    } catch(e){
        res.status(500).json({error: 'Failed to list matches.'});
    }
});

matchRouter.post('/', async(req, res) => {
    const parsed = createMatchSchema.safeParse(req.body);
    if(!parsed.success){
        return res.status(400).json({error: 'Invalid payload.', details: JSON.stringify(parsed.error.issues)});
    }
    const { startTime, endTime, homeScore, awayScore } = parsed.data;
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())){
        return res.status(400).json({error: 'Invalid payload.', details: JSON.stringify([{path: ['startTime', 'endTime'], message: 'Invalid datetime values.'}])});
    }

    try{
        const [event] = await db.insert(matches).values({
            ...parsed.data,
            startTime: startDate,
            endTime: endDate,
            homeScore: homeScore ?? 0,
            awayScore: awayScore ?? 0,
            status: getMatchStatus(startDate, endDate),
        }).returning();

        if(res.app.locals.broadcastMatchCreated){
            res.app.locals.broadcastMatchCreated(event);
        }

        res.status(201).json({data: event});
    }
    catch(e){
        const message = e?.message ?? String(e);
        res.status(500).json({error: 'Failed to create match.', details: JSON.stringify({message})});
    }
})
