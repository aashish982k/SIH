/**
 * BM25 (Okapi) lexical scoring — used by the hybrid retrieval pipeline as the
 * lexical candidate-generation leg alongside Qdrant vector search.
 *
 * Scores documents (chunk texts) against a query. k1/b are the standard Okapi
 * defaults; they do not need tuning for candidate generation because final
 * ordering is handled by RRF fusion (+ optional reranker).
 */

const TOKEN_RE = /[a-z0-9]+/g;

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(TOKEN_RE) ?? []);
}

export interface Bm25Doc {
  id: string;
  text: string;
}

/**
 * Score all docs against the query. Returns a Map of docId -> score.
 * Documents with score 0 are still included (their fusion contribution is 0).
 */
export function bm25Score(query: string, docs: Bm25Doc[]): Map<string, number> {
  const k1 = 1.5;
  const b = 0.75;

  const queryTokens = tokenize(query);
  const docTokens = docs.map((d) => tokenize(d.text));
  const docLens = docTokens.map((t) => t.length || 1);
  const avgdl = docLens.reduce((a, v) => a + v, 0) / (docLens.length || 1);

  // Document frequency per term.
  const df = new Map<string, number>();
  for (const tokens of docTokens) {
    for (const term of new Set(tokens)) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  const nDocs = docs.length;
  const scores = new Map<string, number>();

  docTokens.forEach((tokens, i) => {
    const tf = new Map<string, number>();
    for (const term of tokens) {
      tf.set(term, (tf.get(term) ?? 0) + 1);
    }

    let score = 0;
    for (const term of queryTokens) {
      const termFreq = tf.get(term);
      if (!termFreq) continue;
      const docFreq = df.get(term) ?? 0;
      const idf = Math.log(1 + (nDocs - docFreq + 0.5) / (docFreq + 0.5));
      score +=
        idf *
        ((termFreq * (k1 + 1)) /
          (termFreq + k1 * (1 - b + b * (docLens[i] / (avgdl || 1)))));
    }

    scores.set(docs[i].id, score);
  });

  return scores;
}
