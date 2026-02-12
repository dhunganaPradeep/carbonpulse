FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    CMDSTAN_PATH=/opt/cmdstan

WORKDIR /app

# System dependencies (build-essential for building packages, git for cmdstanpy)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential \
       git \
       wget \
    && rm -rf /var/lib/apt/lists/*

# Create cmdstan directory with proper permissions
RUN mkdir -p /opt/cmdstan && chmod 755 /opt/cmdstan

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-install CmdStan for Prophet (required for forecasting)
# This prevents timeout during forecast execution
RUN python -c "import cmdstanpy; cmdstanpy.install_cmdstan(overwrite=True, quiet=False)" || echo "Warning: CmdStan pre-install skipped"

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
