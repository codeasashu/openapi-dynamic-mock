import express from 'express';
import {
  createPrismInstance,
  deleteCurrentPrismInstance,
} from '../lib/prism.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const spec = req.body?.spec;
  if (!spec) {
    return res.status(400).json({ error: 'Invalid OAS json' });
  }

  const instanceId = spec["x-mock-id"];
  const instance = await createPrismInstance(instanceId, spec);
  const status = !!instance;
  res.json({ status });
});

router.delete('/', async (req, res) => {
  const status = deleteCurrentPrismInstance();
  res.json({ status });
});

export default router;
