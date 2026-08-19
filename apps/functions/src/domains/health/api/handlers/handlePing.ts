import type { Request, Response } from 'express';

export const handlePing = (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'statowrel-functions' });
};
