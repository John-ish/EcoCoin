# EcoCoin Startup Helper Script
Write-Host "======================================================" -ForegroundColor Green
Write-Host "         🌱 Starting EcoCoin Application              " -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green

Write-Host "`n[1/2] Starting Python FastAPI Computer Vision Backend on port 8000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python main.py"

Write-Host "`n[2/2] Starting Vite React Frontend on port 5173..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "`nServices started!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "Backend API docs: http://127.0.0.1:8000/docs" -ForegroundColor White
