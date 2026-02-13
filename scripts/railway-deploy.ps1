# Railway Deploy Script for Nad.fun Synthetic Limit Orders
# Run this in PowerShell where `railway whoami` works

Set-Location "C:\Users\yltri\dependent\nadfun-synthetic-limit-order"

Write-Host "`n=== Step 1: Create Railway Project ===" -ForegroundColor Cyan
railway init --name nadfun-limit-orders

Write-Host "`n=== Step 2: Add MySQL Database ===" -ForegroundColor Cyan
railway add --database mysql

Write-Host "`n=== Step 3: Link to project ===" -ForegroundColor Cyan
railway link

Write-Host "`n=== Step 4: Set Environment Variables ===" -ForegroundColor Cyan
railway variable set MONAD_RPC_URL="https://rpc.monad.xyz"
railway variable set AGENT_ENCRYPTION_KEY="98d183a4ab889783cc128ff28e38b718871b920f0f23b8f1f427a06a84c0e464"
railway variable set AGENT_PORT="3001"
railway variable set PORT="3001"
railway variable set NODE_ENV="production"

Write-Host "`n=== Step 5: Deploy ===" -ForegroundColor Cyan
railway up --detach

Write-Host "`n=== Step 6: Generate Public Domain ===" -ForegroundColor Cyan
railway domain

Write-Host "`n=== DONE ===" -ForegroundColor Green
Write-Host "Copy the domain URL above - you'll need it for Vercel NEXT_PUBLIC_AGENT_URL" -ForegroundColor Yellow
