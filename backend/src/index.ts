import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initDatabase } from './database';
import clientsRouter from './routes/clients';
import billsRouter from './routes/bills';
import calculatorRouter from './routes/calculator';
import uploadRouter from './routes/upload';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// CORS - allow all origins in development
app.use(cors());

// JSON body parsing with 50MB limit (for large spreadsheet imports)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically (for document retrieval)
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Serve frontend static files in production
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}

// API Routes
app.use('/api/clients', clientsRouter);
app.use('/api/bills', billsRouter);
app.use('/api/calculator', calculatorRouter);
app.use('/api/upload', uploadRouter);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Catch-all: serve frontend index.html for SPA routing (production)
if (fs.existsSync(frontendDist)) {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Initialize database and start server
try {
  initDatabase();
  console.log('Database initialized successfully.');
} catch (err) {
  console.error('Failed to initialize database:', err);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`CA Supplemental Tax Analyzer backend running on http://localhost:${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api/`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

export default app;
