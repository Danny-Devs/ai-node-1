/**
 * Represents a summarized piece of text with metadata
 */
export interface Summary {
  summary: string;
  keyTerms: string[];
}

/**
 * Handles the progressive summarization of text content
 * Uses OpenAI's API to generate increasingly concise summaries
 * while preserving key information and context
 */
export class SummarizationService {
  // Simple token estimation - roughly 4 chars per token
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Summarizes text content while preserving key information
   */
  async summarize(text: string): Promise<Summary> {
    try {
      const tokenCount = this.estimateTokens(text);
      console.log(`Estimated text length in tokens: ${tokenCount}`);

      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          tokenCount
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get summary');
      }

      return await response.json();
    } catch (error) {
      console.error('Error in summarization:', error);
      return {
        summary: 'Failed to generate summary',
        keyTerms: []
      };
    }
  }
}
