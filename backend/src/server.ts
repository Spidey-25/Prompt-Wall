import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRoutes from './routes/health.routes';
import agentRoutes from './routes/agent.routes';
import uploadRoutes from './routes/upload.routes';
import evaluationRoutes from './routes/evaluation.routes';
import { errorHandler } from './middleware/errorHandler';
import { setupWebSocket } from './websocket/socket';

dotenv.config();

const app = express();
const server = http.createServer(app);

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({ origin: frontendUrl }));
app.use(express.json());

// Routes
app.use('/api', healthRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api', uploadRoutes);
app.use('/api/evaluation', evaluationRoutes);


// Centralized error handler
app.use(errorHandler);

// WebSocket
setupWebSocket(server);

const PORT = process.env.NODE_PORT || 5000;

server.listen(PORT, () => {
  console.log(`[PromptWall Node] Server running on port ${PORT}`);
});
