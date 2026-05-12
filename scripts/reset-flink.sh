#!/bin/bash
# Cancel all running Flink jobs

set -e

echo "🔄 Cancelling all Flink jobs..."

# Check if Flink is running
if ! curl -sf http://localhost:8081/overview > /dev/null 2>&1; then
  echo "⚠️  Flink cluster not running"
  exit 0
fi

# Get all running job IDs
JOBS=$(curl -s http://localhost:8081/jobs 2>/dev/null || echo '{"jobs":[]}')
JOB_IDS=$(echo "$JOBS" | jq -r '.jobs[] | select(.status == "RUNNING") | .id' 2>/dev/null || true)

if [ -z "$JOB_IDS" ]; then
  echo "✓ No running jobs to cancel"
  exit 0
fi

# Cancel each job
COUNT=0
for JOB_ID in $JOB_IDS; do
  echo "  Cancelling job: $JOB_ID"
  curl -X PATCH "http://localhost:8081/jobs/$JOB_ID" > /dev/null 2>&1 || true
  COUNT=$((COUNT + 1))
done

echo "✓ Cancelled $COUNT job(s)"
