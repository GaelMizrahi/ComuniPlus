import express from 'express';
import cors from 'cors';
import { port } from './config/index.js';
import router from './routes/index.js';

const app = express();
app.use(cors());
app.use('/api/mercado', express.json({ limit: '7mb' }));
app.use(express.json());
app.use(router);


app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
