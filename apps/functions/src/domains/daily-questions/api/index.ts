import { onRequest } from 'firebase-functions/v2/https';
import express from 'express';
import cors from 'cors';

import { REGION_CLOUD } from '@/libs/firebase-admin';

import { handleReindexMonths } from './handlers/handleReindexMonths';
import { requireAdmin } from './middlewares/requireAdmin';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Everything here writes to data shared by every user, so the whole app sits
// behind the admin check rather than each route repeating it.
app.use(requireAdmin);

app.post('/reindex-months', handleReindexMonths);

export const dailyQuestionsApi = onRequest({
  region: REGION_CLOUD,
}, app);
