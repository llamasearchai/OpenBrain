# syntax=docker/dockerfile:1
FROM ghcr.io/berriai/litellm:main

# Default config uses Ollama local endpoint and maps common model aliases
ENV LITELLM_PORT=4000 \
    OLLAMA_BASE_URL=http://ollama:11434 \
    LITELLM_LOG=info

EXPOSE 4000

# Simple startup uses built-in server
CMD ["bash", "-lc", "litellm --host 0.0.0.0 --port $LITELLM_PORT --num_workers 1 --adapter ollama --base_url $OLLAMA_BASE_URL"]

