import './loadEnv';
import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Cross-Origin Resource Sharing
app.use(cors({
  origin: '*', // For local dev, allows all connections. Can lock down in staging
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Express middleware to parse json bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register API routes
app.use('/api', apiRouter);

// Fallback error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error occurrence.' });
});

// Start listening
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  AI STUDY PLANNER BACKEND SERVER RUNNING           `);
    console.log(`  PORT: ${PORT}                                     `);
    console.log(`  ENVIRONMENT: ${process.env.NODE_ENV || 'development'}`);
    console.log(`====================================================`);
  });
}

export default app;
export { app };
