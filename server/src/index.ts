import './http-proxy.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRouter from './routes/health.js';
import modelsRouter from './routes/models.js';
import coreRouter from './routes/core.js';
import siteRouter from './routes/site.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);
app.use('/api/models', modelsRouter);
app.use('/api/core', coreRouter);
app.use('/api/site', siteRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
