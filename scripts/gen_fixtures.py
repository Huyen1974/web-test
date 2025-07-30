#!/usr/bin/env python3
"""
Golden Fixtures Generator for Langroid Agent Pipeline

This script generates mock fixtures for testing Langroid agent compatibility.
All outputs are mocked to avoid external API calls during testing.

Usage:
    python scripts/gen_fixtures.py

Output:
    Generates fixture files in agent_data/fixtures/
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Any


def load_sample_queries() -> dict[str, str]:
    """Load sample query files from fixtures directory."""
    fixtures_dir = Path("agent_data/fixtures")
    queries = {}

    # MOCK: Load sample queries without actual Langroid agent
    for i in [1, 2]:
        query_file = fixtures_dir / f"sample_query_{i}.txt"
        if query_file.exists():
            with open(query_file, encoding="utf-8") as f:
                queries[f"query_{i}"] = f.read().strip()

    return queries


def mock_langroid_docchat_agent(query: str) -> dict[str, Any]:
    """
    MOCK: Simulate Langroid DocChatAgent response

    In real implementation, this would:
    1. Initialize DocChatAgent from langroid
    2. Process the query through the agent
    3. Return actual ToolMessage response

    For fixtures, we return structured mock data.
    """
    # MOCK: Generate timestamp for mock response
    timestamp = datetime.utcnow().isoformat() + "Z"

    # MOCK: Simulate different response types based on query content
    if "machine learning" in query.lower() or "deployment" in query.lower():
        return {
            "type": "ToolMessage",
            "content": {
                "query": query,
                "response": "Based on the document search, here are the key findings about ML model deployment strategies:\n\n**Containerization Approaches:**\n- Docker containers provide consistent deployment environments\n- Kubernetes orchestration for scalable model serving\n- Container registries for version management\n\n**Production Best Practices:**\n- Model versioning and A/B testing frameworks\n- Automated CI/CD pipelines for model updates\n- Health checks and monitoring endpoints\n\n**Monitoring Solutions:**\n- Model performance metrics tracking\n- Data drift detection systems\n- Resource utilization monitoring\n\nThe documents emphasize the importance of reproducible environments and robust monitoring for successful ML production deployments.",
                "sources": [
                    {
                        "document_id": "ml_deployment_guide_2024",
                        "relevance_score": 0.89,
                        "excerpt": "Container-based deployment provides isolation and reproducibility...",
                    },
                    {
                        "document_id": "production_ml_best_practices",
                        "relevance_score": 0.85,
                        "excerpt": "Monitoring model performance in production requires comprehensive metrics...",
                    },
                ],
            },
            "metadata": {
                "timestamp": timestamp,
                "processing_time_ms": 1250,
                "model_version": "langroid-0.58.0",
                "search_type": "semantic_similarity",
                "mock_data": True,
            },
        }
    else:
        # MOCK: Vector embeddings explanation response
        return {
            "type": "ToolMessage",
            "content": {
                "query": query,
                "response": "Vector embeddings are numerical representations of text, images, or other data that capture semantic meaning in high-dimensional space.\n\n**Core Concepts:**\n- Transform discrete data into continuous vector representations\n- Similar items have similar vector representations in embedding space\n- Enable mathematical operations on semantic content\n\n**Semantic Search Applications:**\n- Query and document vectors compared for relevance\n- Cosine similarity commonly used for text similarity\n- Dense retrieval systems outperform traditional keyword matching\n\n**Similarity Calculations:**\n- Cosine similarity: measures angle between vectors\n- Euclidean distance: measures geometric distance\n- Dot product: combines magnitude and direction\n\n**Dimensionality Reduction:**\n- PCA (Principal Component Analysis) for linear reduction\n- t-SNE for visualization of high-dimensional data\n- UMAP for preserving local and global structure\n- Helps reduce computational complexity while preserving semantic relationships",
                "vector_summary": {
                    "embedding_dimension": 384,
                    "similarity_threshold": 0.7,
                    "retrieval_method": "dense_passage_retrieval",
                },
            },
            "metadata": {
                "timestamp": timestamp,
                "processing_time_ms": 980,
                "model_version": "langroid-0.58.0",
                "response_type": "explanation",
                "mock_data": True,
            },
        }


def generate_fixtures():
    """Generate golden fixtures for Langroid agent testing."""
    print("🔧 Generating Golden Fixtures for Langroid Agent Pipeline...")

    # Load sample queries
    queries = load_sample_queries()

    if not queries:
        print("❌ No sample queries found in agent_data/fixtures/")
        return

    fixtures_dir = Path("agent_data/fixtures")

    # MOCK: Process each query and generate mock outputs
    for query_key, query_text in queries.items():
        print(f"📝 Processing {query_key}...")

        # MOCK: Simulate Langroid DocChatAgent processing
        mock_response = mock_langroid_docchat_agent(query_text)

        # Generate output filename
        query_num = query_key.split("_")[1]
        output_file = fixtures_dir / f"expected_output_{query_num}.json"

        # Save mock response to JSON file
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(mock_response, f, indent=2, ensure_ascii=False)

        print(f"✅ Generated {output_file}")

    print(f"\n🎯 Golden fixtures generated in {fixtures_dir}")
    print("📋 Fixture files:")
    for file in sorted(fixtures_dir.glob("*")):
        print(f"   - {file.name}")

    print("\n🔍 Next steps:")
    print("   1. Run: pytest -m fixture --cov=agent_data --disable-warnings")
    print("   2. Verify fixture structure in tests")
    print("   3. Update documentation in README_FIXTURES.md")


if __name__ == "__main__":
    generate_fixtures()
