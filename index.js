import express from 'express';
import cors from 'cors';
import { instances } from './api/index.js';
import { getCurrentPrismInstance } from './lib/prism.js';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const mockHandler = async function(req, res) {
  const instanceId = req.params.mockid;
  const prism = await getCurrentPrismInstance(instanceId);
  if (!prism) {
    return res.status(400).json({ error: 'Mock server not running' });
  }

  const response = await prism.request(req);
  if (response.left) {
    return res.status(response.left?.status || 400).send(response.left);
  }
  return res
    .status(response.right?.output.statusCode || 200)
    .send(response.right.output.body);
};

app.use('/mocks/:mockid', mockHandler);
app.use('/instances', instances);
app.listen(port, () => {
  console.log(`Mock server listening on port ${port}`);
});
