import 'dotenv/config';
import { createServer } from './server.js';
import { startMonitorLoop } from './monitor/loop.js';

const PORT = parseInt(process.env.PORT || process.env.AGENT_PORT || '3001');

const app = createServer();

app.listen(PORT, () => {
  console.log(`Agent server running on port ${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/events?wallet=0x...`);
  console.log(`Health: http://localhost:${PORT}/health`);
  startMonitorLoop();
});
