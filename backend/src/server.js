import express from 'express';
import cors from 'cors';
import { port } from './config/index.js';
import router from './routes/index.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(router);

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
