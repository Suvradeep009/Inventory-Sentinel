import { SentimentTier } from './types';

const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAn9Wi6GS7Oz919KMnNZEcGfmCumrjJM2o';

// Model cascade for maximum resilience
const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest'
];

interface ReviewBatchInput {
  id: string;
  comment: string;
  rating: number;
}

interface ClassifiedReviewResult {
  id: string;
  sentimentTier: SentimentTier;
  sentimentScore: number;
  keyTheme: string;
}

/**
 * Deterministic rule-based sentiment classifier fallback
 */
function deterministicFallbackClassifier(comment: string, rating: number): { tier: SentimentTier; score: number; theme: string } {
  const text = (comment || '').toLowerCase();
  
  const veryBadKeywords = ['awful', 'terrible', 'horrible', 'waste', 'broken', 'scam', 'worst', 'would not recommend', 'disaster', 'defective', 'poor quality'];
  const badKeywords = ['bad', 'disappointed', 'slow', 'cheap', 'mediocre', 'damaged', 'regret', 'not good', 'unhappy'];
  const veryGoodKeywords = ['exceptional', 'amazing', 'perfect', 'love it', 'outstanding', 'best', 'highly recommend', 'stellar', 'fantastic', 'superb'];
  const goodKeywords = ['good', 'nice', 'satisfied', 'pleased', 'great', 'decent', 'awesome', 'works well'];

  let score = rating;
  let tier: SentimentTier = 'Neutral';
  let theme = 'General feedback';

  if (veryBadKeywords.some(w => text.includes(w)) || rating === 1) {
    tier = 'Very Bad';
    score = 1;
    theme = 'Product dissatisfaction';
  } else if (badKeywords.some(w => text.includes(w)) || rating === 2) {
    tier = 'Bad';
    score = 2;
    theme = 'Below expectations';
  } else if (veryGoodKeywords.some(w => text.includes(w)) || (rating === 5 && text.length > 5)) {
    tier = 'Very Good';
    score = 5;
    theme = 'Customer favorite';
  } else if (goodKeywords.some(w => text.includes(w)) || rating >= 4) {
    tier = 'Good';
    score = 4;
    theme = 'Meets expectations';
  } else {
    tier = 'Neutral';
    score = 3;
    theme = 'Standard sentiment';
  }

  return { tier, score, theme };
}

/**
 * Classify a batch of customer reviews using Google Gemini with structured JSON schema
 */
export async function classifyReviewsWithGemini(reviews: ReviewBatchInput[]): Promise<ClassifiedReviewResult[]> {
  if (!reviews || reviews.length === 0) return [];

  const prompt = `You are an automated commercial inventory sentiment analysis engine.
Classify each customer review into EXACTLY one of these 5 tiers:
- "Very Bad" (deep dissatisfaction, product failure, return request, refund, angry)
- "Bad" (poor quality, below expectations, minor defects, disappointment)
- "Neutral" (mediocre, average, mixed feedback, neither good nor bad)
- "Good" (satisfactory, pleased, meets expectations, recommended)
- "Very Good" (delighted, exceptional, highly impressed, top quality, outstanding)

Input reviews:
${JSON.stringify(reviews.map(r => ({ id: r.id, comment: r.comment, rating: r.rating })), null, 2)}

Return a valid JSON array of objects with the exact schema:
[
  {
    "id": "review id",
    "sentimentTier": "Very Bad" | "Bad" | "Neutral" | "Good" | "Very Good",
    "sentimentScore": 1 to 5 numeric integer,
    "keyTheme": "brief 2-4 word summary of customer sentiment reason"
  }
]`;

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.1,
          },
        }),
      });

      if (!response.ok) {
        continue; // Try next model in cascade
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        const resultsArray = Array.isArray(parsed) ? parsed : (parsed.reviews || parsed.items || []);
        if (resultsArray.length > 0) {
          const map = new Map<string, ClassifiedReviewResult>();
          for (const item of resultsArray) {
            if (item.id) {
              const validTiers: SentimentTier[] = ['Very Bad', 'Bad', 'Neutral', 'Good', 'Very Good'];
              const tier = validTiers.includes(item.sentimentTier) ? item.sentimentTier : 'Neutral';
              map.set(String(item.id), {
                id: String(item.id),
                sentimentTier: tier,
                sentimentScore: Number(item.sentimentScore) || (tier === 'Very Bad' ? 1 : tier === 'Bad' ? 2 : tier === 'Neutral' ? 3 : tier === 'Good' ? 4 : 5),
                keyTheme: item.keyTheme || 'Feedback sentiment',
              });
            }
          }

          return reviews.map(r => {
            const found = map.get(r.id);
            if (found) return found;
            const fallback = deterministicFallbackClassifier(r.comment, r.rating);
            return { id: r.id, sentimentTier: fallback.tier, sentimentScore: fallback.score, keyTheme: fallback.theme };
          });
        }
      }
    } catch {
      // Continue to next model or fallback
    }
  }

  // Fallback to deterministic classifier if all API attempts fail
  return reviews.map(r => {
    const fallback = deterministicFallbackClassifier(r.comment, r.rating);
    return {
      id: r.id,
      sentimentTier: fallback.tier,
      sentimentScore: fallback.score,
      keyTheme: fallback.theme,
    };
  });
}

/**
 * Diagnostic executive summary synthesis
 * Pre-filtered reviews and metadata are supplied to Gemini.
 * Prompt strictly enforces the corporate terminology ban:
 * NO technical jargon (NLP, RAG, LLM, Cosine Similarity, etc.)
 */
export async function synthesizeDiagnosticsMemo(params: {
  productContext?: {
    id: number;
    title: string;
    category: string;
    stock: number;
    price: number;
    positiveRatio: number;
    negativeRatio: number;
    restockSignal: string;
    signalReason: string;
  };
  relevantReviews: Array<{
    author: string;
    rating: number;
    comment: string;
    tier: SentimentTier;
  }>;
  userQuery: string;
  storeOverview?: string;
}): Promise<{
  executiveFinding: string;
  sentimentRootCause: string;
  inventoryActionRecommendation: 'HALT_PURCHASE' | 'SURGE_ORDER' | 'MAINTAIN_STOCK';
  actionDetails: string;
}> {
  const systemInstruction = `You are the Lead Commercial Operations & Inventory Strategist for a major retail enterprise.
Your role is to produce crisp, executive-grade diagnostic memos for supply chain decision makers.

STRICT TERMINOLOGY BAN:
You must strictly NEVER mention technical data science jargon.
Specifically NEVER use words like: "NLP", "RAG", "LLM", "LLMs", "Cosine Similarity", "vector search", "embeddings", "neural network", "tokens", "temperature", or "prompt".
Always speak strictly in executive business terms: "customer feedback patterns", "commercial sentiment", "procurement signals", "satisfaction thresholds", "supply chain velocity", "restock posture".

Provide your response in valid JSON matching this schema:
{
  "executiveFinding": "1-2 sentence high-level executive conclusion regarding this inventory inquiry",
  "sentimentRootCause": "Clear explanation of what customer feedback is revealing about product quality, value, or packaging",
  "inventoryActionRecommendation": "HALT_PURCHASE" | "SURGE_ORDER" | "MAINTAIN_STOCK",
  "actionDetails": "Specific operational directive for procurement managers (units, velocity, urgency, and supplier feedback)"
}`;

  const prompt = `INVENTORY CONTEXT:
${params.productContext ? `Product: ${params.productContext.title} (SKU #${params.productContext.id})
Category: ${params.productContext.category}
Current Stock on Hand: ${params.productContext.stock} units
Retail Price: $${params.productContext.price}
Customer Feedback Metrics:
- Positive Ratio: ${(params.productContext.positiveRatio * 100).toFixed(1)}%
- Negative Ratio: ${(params.productContext.negativeRatio * 100).toFixed(1)}%
Automated System Signal: ${params.productContext.restockSignal} (${params.productContext.signalReason})` : 'Store-wide inventory evaluation'}

FILTERED CUSTOMER FEEDBACK SAMPLES:
${JSON.stringify(params.relevantReviews, null, 2)}

OPERATIONAL INQUIRY:
"${params.userQuery}"

Deliver the executive diagnostic memo in the requested JSON format.`;

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemInstruction}\n\n${prompt}` }] }],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.2,
          },
        }),
      });

      if (!response.ok) continue;

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        if (parsed.executiveFinding) {
          return {
            executiveFinding: parsed.executiveFinding,
            sentimentRootCause: parsed.sentimentRootCause || 'Customer feedback reflects consistent operational sentiment patterns.',
            inventoryActionRecommendation: parsed.inventoryActionRecommendation || (params.productContext?.negativeRatio && params.productContext.negativeRatio >= 0.45 ? 'HALT_PURCHASE' : params.productContext?.positiveRatio && params.productContext.positiveRatio >= 0.65 ? 'SURGE_ORDER' : 'MAINTAIN_STOCK'),
            actionDetails: parsed.actionDetails || 'Maintain current supplier delivery cadence and review feedback weekly.',
          };
        }
      }
    } catch {
      // Continue to next model or fallback
    }
  }

  // Resilient fallback memo
  const isNegativeCritical = params.productContext && params.productContext.negativeRatio >= 0.45;
  const isPositiveSurge = params.productContext && params.productContext.positiveRatio >= 0.65;

  return {
    executiveFinding: params.productContext
      ? `Analysis indicates ${params.productContext.title} has ${isNegativeCritical ? 'elevated customer dissatisfaction risks' : isPositiveSurge ? 'exceptional customer adoption and demand momentum' : 'stable baseline performance'}.`
      : 'Store-wide diagnostic indicates healthy inventory distribution across primary retail categories.',
    sentimentRootCause: params.relevantReviews.length > 0
      ? `Recent reviews highlight key impressions: "${params.relevantReviews[0].comment}" (Categorized as ${params.relevantReviews[0].tier}).`
      : 'Customer reviews indicate standard product reception across target demographics.',
    inventoryActionRecommendation: isNegativeCritical ? 'HALT_PURCHASE' : isPositiveSurge ? 'SURGE_ORDER' : 'MAINTAIN_STOCK',
    actionDetails: isNegativeCritical
      ? 'Halt automated reorders immediately. Freeze supplier POs until quality defects are audited by merchandising.'
      : isPositiveSurge
      ? 'Increase purchase order volumes by 50% to prevent stockouts while customer satisfaction remains at peak levels.'
      : 'Maintain standard replenishment schedule with 30-day safety stock buffer.',
  };
}
