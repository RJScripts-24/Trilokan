# PowerShell script to set up the ML environment for identity-verifier
# Usage: .\scripts\setup_ml_env.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Identity Verifier ML Environment Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if conda is installed
Write-Host "[1/4] Checking for Conda installation..." -ForegroundColor Yellow
$condaCommand = Get-Command conda -ErrorAction SilentlyContinue

if (-not $condaCommand) {
    Write-Host "ERROR: Conda is not installed or not in PATH." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Miniconda or Anaconda:" -ForegroundColor Yellow
    Write-Host "  https://docs.conda.io/en/latest/miniconda.html" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "After installation, restart your terminal and run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Conda found: $($condaCommand.Source)" -ForegroundColor Green
Write-Host ""

# Get the script directory and project root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$envFile = Join-Path $projectRoot "envs\idv-ml.yml"

# Check if environment file exists
if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: Environment file not found at: $envFile" -ForegroundColor Red
    exit 1
}

# Check if environment already exists
Write-Host "[2/4] Checking if 'idv-ml' environment exists..." -ForegroundColor Yellow
$envExists = conda env list | Select-String -Pattern "^idv-ml\s"

if ($envExists) {
    Write-Host "⚠ Environment 'idv-ml' already exists." -ForegroundColor Yellow
    $response = Read-Host "Do you want to remove and recreate it? (y/N)"
    
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host "Removing existing environment..." -ForegroundColor Yellow
        conda env remove -n idv-ml -y
        Write-Host "✓ Environment removed" -ForegroundColor Green
    } else {
        Write-Host "Skipping environment creation. Using existing environment." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "[3/4] Activating environment..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To activate the environment, run:" -ForegroundColor Cyan
        Write-Host "  conda activate idv-ml" -ForegroundColor Green
        Write-Host ""
        exit 0
    }
}

# Create the environment
Write-Host "[3/4] Creating 'idv-ml' environment from $envFile..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Yellow
Write-Host ""

conda env create -f $envFile

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Failed to create environment." -ForegroundColor Red
    Write-Host "Please check the error messages above." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✓ Environment created successfully" -ForegroundColor Green
Write-Host ""

# Print activation and usage instructions
Write-Host "[4/4] Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Activate the environment:" -ForegroundColor Yellow
Write-Host "   conda activate idv-ml" -ForegroundColor Green
Write-Host ""
Write-Host "2. Verify PyTorch installation:" -ForegroundColor Yellow
Write-Host "   python -c ""import torch; print('PyTorch version:', torch.__version__)""" -ForegroundColor Green
Write-Host ""
Write-Host "3. Run Grad-CAM tests:" -ForegroundColor Yellow
Write-Host "   pytest tests/test_cnn_deepfake.py::TestGradCAM -v" -ForegroundColor Green
Write-Host ""
Write-Host "4. Run CNN model wrapper tests:" -ForegroundColor Yellow
Write-Host "   pytest tests/test_cnn_deepfake.py::TestModelWrappers -v" -ForegroundColor Green
Write-Host ""
Write-Host "5. Run the demo:" -ForegroundColor Yellow
Write-Host "   python demo/run_demo.py" -ForegroundColor Green
Write-Host ""
Write-Host "6. Test Grad-CAM inference:" -ForegroundColor Yellow
Write-Host "   python -c ""from explain.gradcam_utils import generate_gradcam; print('Grad-CAM available!')""" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Important Notes" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠ Python 3.12 is NOT compatible with current PyTorch wheels on Windows" -ForegroundColor Yellow
Write-Host "  This environment uses Python 3.11 for stability" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠ CPU-only PyTorch is installed for portability" -ForegroundColor Yellow
Write-Host "  For GPU support, modify envs/idv-ml.yml and reinstall" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠ The core pipeline can run without this ML environment" -ForegroundColor Yellow
Write-Host "  Grad-CAM and CNN models will be skipped gracefully" -ForegroundColor Yellow
Write-Host ""
