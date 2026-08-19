import { onRequest } from 'firebase-functions/v2/https';
import express from 'express';
import cors from 'cors';

import { REGION_CLOUD } from '@/libs/firebase-admin';

import { handlePing } from './handlers/handlePing';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get('/ping', handlePing);

export const healthApi = onRequest({
  region: REGION_CLOUD,
}, app);
