import { Router } from 'express'

export const healthRouter = Router()

healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'gath3r-backend',
    chain: 'kaolin',
    chainId: 60138453025,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
})
