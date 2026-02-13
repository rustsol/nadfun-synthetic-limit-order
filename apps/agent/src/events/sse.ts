import type { Request, Response } from 'express';
import { agentEvents } from './emitter.js';

export function handleSSE(req: Request, res: Response) {
  const wallet = (req.query.wallet as string)?.toLowerCase();
  if (!wallet) {
    res.status(400).json({ error: 'wallet query param required' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  res.write(`data: ${JSON.stringify({ type: 'connected', wallet })}\n\n`);

  const onTriggered = (event: any) => {
    if (event.walletAddress === wallet) {
      res.write(`data: ${JSON.stringify({ type: 'order:triggered', ...event })}\n\n`);
    }
  };

  const onExecuted = (event: any) => {
    if (event.walletAddress === wallet) {
      res.write(`data: ${JSON.stringify({ type: 'order:executed', ...event })}\n\n`);
    }
  };

  const onFailed = (event: any) => {
    if (event.walletAddress === wallet) {
      res.write(`data: ${JSON.stringify({ type: 'order:failed', ...event })}\n\n`);
    }
  };

  const onExpired = (event: any) => {
    if (event.walletAddress === wallet) {
      res.write(`data: ${JSON.stringify({ type: 'order:expired', ...event })}\n\n`);
    }
  };

  const onAborted = (event: any) => {
    if (event.walletAddress === wallet) {
      res.write(`data: ${JSON.stringify({ type: 'order:aborted', ...event })}\n\n`);
    }
  };

  agentEvents.on('order:triggered', onTriggered);
  agentEvents.on('order:executed', onExecuted);
  agentEvents.on('order:failed', onFailed);
  agentEvents.on('order:expired', onExpired);
  agentEvents.on('order:aborted', onAborted);

  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
    agentEvents.off('order:triggered', onTriggered);
    agentEvents.off('order:executed', onExecuted);
    agentEvents.off('order:failed', onFailed);
    agentEvents.off('order:expired', onExpired);
    agentEvents.off('order:aborted', onAborted);
  });
}
