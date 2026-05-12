# Full-Text Search: Text Analysis & Matching

## What

Demonstrates Elasticsearch's core strength: full-text search with text analysis, relevance scoring, and different query types (match, match_phrase, fuzzy, multi_match).

## Why

Full-text search is the primary use case for Elasticsearch. Understanding how text is analyzed (tokenized, lowercased, stemmed) and how queries are scored is critical for building search features in e-commerce, content platforms, and document management systems.

## How

The example demonstrates book catalog search:
- **Match Query**: Find documents containing search terms (tokenized)
- **Match Phrase**: Find exact phrase matches (order matters)
- **Fuzzy Query**: Handle typos with edit distance
- **Multi-Match**: Search across multiple fields simultaneously

## Key Commands

- `match` - Tokenized term matching
- `match_phrase` - Exact phrase with term order
- `fuzzy` - Typo-tolerant search with edit distance
- `multi_match` - Search multiple fields with combined scoring

## Try It

Run the example and observe:
1. Relevance scores (_score) - higher is more relevant
2. How "great" matches both "Great Gatsby" and "Great Expectations"
3. Match phrase requires terms in order ("american dream" vs "dream american")
4. Fuzzy search handles typos like "expctations" → "expectations"
5. Multi-match searches title and description with combined scoring

Check query execution time and document relevance ranking.

## Production Considerations

**Text Analysis:**
- Text fields are analyzed: tokenized, lowercased, stopwords removed, stemmed
- Keyword fields are not analyzed - exact match only
- Custom analyzers can define language-specific rules
- Analysis happens at index time and query time

**Query Types:**
- match: Best for general search, handles phrases as tokens
- match_phrase: Use for exact phrases, quoted searches
- fuzzy: Good for autocorrect, but can be slow on large fields
- multi_match: Search multiple fields, but more expensive than single field

**Performance:**
- Relevance scoring (TF-IDF) requires doc_values and inverted index
- Fuzzy queries are expensive - limit fuzziness and field length
- Multi-match queries execute multiple searches internally
- Use filters (must not contribute to scoring) when exact matching

**Relevance Tuning:**
- Boost specific fields: `{"multi_match": {"query": "...", "fields": ["title^3", "description"]}}`
- Use function_score for custom scoring (recency, popularity)
- minimum_should_match for precision control
- Analyze query performance with _explain API

**Alternatives:**
- For exact keyword matching, use term queries (faster)
- For small datasets, Postgres full-text search may suffice
- For autocomplete, use completion suggester or edge n-grams
- For semantic search, use dense_vector with embeddings

## Further Reading

- [Full-Text Queries](https://www.elastic.co/guide/en/elasticsearch/reference/current/full-text-queries.html)
- [Text Analysis](https://www.elastic.co/guide/en/elasticsearch/reference/current/analysis.html)
- [Relevance Scoring](https://www.elastic.co/guide/en/elasticsearch/guide/current/scoring-theory.html)
