FROM langchain/langgraph-api:3.13-wolfi

WORKDIR /app

ADD . /app

RUN PYTHONDONTWRITEBYTECODE=1 uv pip install --system --no-cache-dir -c /api/constraints.txt -e .

ENV LANGSERVE_GRAPHS='{"pipeline": "/app/src/pipeline/graph.py:graph"}'
