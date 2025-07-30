# Golden Fixtures for Langroid Agent Testing

## Purpose

This directory contains golden fixtures for testing Langroid agent compatibility and ensuring consistent pipeline behavior. These fixtures provide reproducible test data for validating agent responses without making external API calls.

### What are Golden Fixtures?

Golden fixtures are static reference data that represent expected inputs and outputs for testing. They serve as:

- **Regression Testing**: Ensure changes don't break existing functionality
- **Offline Testing**: Test pipeline structure without external dependencies
- **Consistency Validation**: Verify response formats and data structures
- **Development Baseline**: Provide examples for new development

## Fixture Files

### Input Files

- **`sample_query_1.txt`**: User prompt about document lookup and ML deployment strategies
- **`sample_query_2.txt`**: User prompt requesting LLM explanation of vector embeddings

### Expected Output Files

- **`expected_output_1.json`**: Example ToolMessage response for document search query
- **`expected_output_2.json`**: Example response for explanation query with vector summary

## Output Structure

All expected outputs follow the ToolMessage format:

```json
{
  "type": "ToolMessage",
  "content": {
    "query": "Original user query",
    "response": "Agent response text",
    "sources": [...],      // Optional: for document search
    "vector_summary": {...} // Optional: for vector operations
  },
  "metadata": {
    "timestamp": "ISO 8601 timestamp",
    "processing_time_ms": 1250,
    "model_version": "langroid-0.58.0",
    "search_type": "semantic_similarity",
    "mock_data": true
  }
}
```

## Regenerating Fixtures

To regenerate the fixtures (if input queries change):

```bash
python scripts/gen_fixtures.py
```

This script:

1. Loads sample query files from `agent_data/fixtures/`
2. Processes each query through mock Langroid DocChatAgent
3. Generates structured JSON responses
4. Updates expected output files

**Note**: The generation script uses mock data (marked with `mock_data: true`) to avoid external API calls during testing.

## Running Fixture Tests

```bash
# Run all fixture tests
pytest -m fixture --cov=agent_data --disable-warnings

# Run with verbose output
pytest -m fixture --cov=agent_data --disable-warnings -v

# Run specific fixture test
pytest tests/test_fixture_pipeline.py -v
```

### Test Markers

- `@pytest.mark.fixture`: Identifies fixture-related tests
- `@pytest.mark.slow`: Marks tests that may take longer to run

## Consistency and Reproducibility

### Key Principles

1. **Deterministic**: Same input always produces same output
2. **Offline**: No external API dependencies
3. **Versioned**: Tied to specific Langroid version (0.58.0)
4. **Structured**: Consistent JSON schema for all outputs

### Validation

The test suite validates:

- File existence and accessibility
- JSON structure and required fields
- Content quality and completeness
- Metadata consistency across fixtures
- Offline mode compliance (mock_data flag)

## Integration with CI/CD

Fixture tests are designed to run in CI environments:

- No external dependencies required
- Fast execution (< 5 seconds)
- Clear pass/fail criteria
- Coverage reporting included

## Future Enhancements

When connecting to real Langroid agents:

1. Update `scripts/gen_fixtures.py` to use actual DocChatAgent
2. Remove `# MOCK` flags and implement real agent calls
3. Add environment variable support for API keys
4. Expand test coverage for edge cases

## File Organization

```
agent_data/fixtures/
├── sample_query_1.txt          # Input query about ML deployment
├── sample_query_2.txt          # Input query about vector embeddings
├── expected_output_1.json      # Expected response for query 1
└── expected_output_2.json      # Expected response for query 2
```

## Version History

- **v0.1.0** (2024-07-30): Initial golden fixtures for Langroid 0.58.0
- Mock-based implementation for CI safety
- Comprehensive test suite with structure validation

---

For questions or issues with fixtures, see the test suite in `tests/test_fixture_pipeline.py` or run the generator script for debugging.
