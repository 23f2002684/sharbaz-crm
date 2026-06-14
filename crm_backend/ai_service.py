import os
import json
import google.generativeai as genai
from groq import Groq
import numpy as np

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

class VectorStore:
    def __init__(self):
        self.documents = []
        self.embeddings = []
    
    def add_document(self, doc_text: str, metadata: dict):
        if not GEMINI_API_KEY:
            self.documents.append({"text": doc_text, "metadata": metadata})
            return
            
        try:
            result = genai.embed_content(
                model="models/embedding-001",
                content=doc_text,
                task_type="retrieval_document"
            )
            embedding = result['embedding']
            self.documents.append({"text": doc_text, "metadata": metadata})
            self.embeddings.append(embedding)
        except Exception as e:
            print(f"Embedding error: {e}")
            self.documents.append({"text": doc_text, "metadata": metadata})

    def search(self, query_text: str, top_k: int = 3):
        if not self.documents:
            return []
        if not GEMINI_API_KEY or not self.embeddings or len(self.embeddings) != len(self.documents):
            return self.documents[:top_k]
            
        try:
            query_embedding = genai.embed_content(
                model="models/embedding-001",
                content=query_text,
                task_type="retrieval_query"
            )['embedding']
            
            query_vec = np.array(query_embedding)
            doc_vecs = np.array(self.embeddings)
            
            similarities = np.dot(doc_vecs, query_vec) / (np.linalg.norm(doc_vecs, axis=1) * np.linalg.norm(query_vec))
            top_indices = np.argsort(similarities)[::-1][:top_k]
            
            return [self.documents[i] for i in top_indices]
        except Exception as e:
            print(f"Search error: {e}")
            return self.documents[:top_k]

# Global instance for the MVP
vector_store = VectorStore()

def parse_segment_query(natural_query: str) -> dict:
    """Uses LLM to parse natural language into structured filters."""
    prompt = f'''
    Convert this natural language query into a JSON object for database filtering.
    Query: "{natural_query}"
    
    Fields available:
    - min_spend (number)
    - max_spend (number)
    - location (string)
    - recency_days (number - e.g. "last 30 days" means 30)
    - category (string)
    
    Output ONLY valid JSON, nothing else.
    '''
    
    if groq_client:
        try:
            completion = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
                response_format={"type": "json_object"}
            )
            return json.loads(completion.choices[0].message.content)
        except Exception as e:
            print(f"LLM parse error: {e}")
    
    # Fallback
    return {"min_spend": 500, "recency_days": 30}

def generate_campaign_draft(segment_info: dict, product_context: str) -> dict:
    prompt = f"""Draft TWO distinct WhatsApp promotional message templates for a customer segment.
Segment details: {segment_info}.
Product focus: {product_context}.

Variant A should be Emotion and FOMO focused. Make it urgent, exciting, and hype-driven.
Variant B should be Logic and Discount focused. Focus on the value, the numbers, and the practical benefits.

CRITICAL RULES:
- Start BOTH messages with "Hi {{name}}," exactly like that (using the curly braces) so we can inject their name later.
- Use 'Sharbaz' as the sender brand name. Do NOT use placeholders like [Your Brand Name].
- A clear Call-to-Action (CTA) driving them to 'www.sharbaz.com'. Do NOT use any other URLs.
- Make up a specific, cool product name based on the product focus (e.g. 'Sharbaz Brew Master', 'Glow Serum Pro').
- Output ONLY a raw, valid JSON object with EXACTLY two keys: "variant_a" and "variant_b". Do NOT output markdown formatting like ```json.
Example format:
{{
  "variant_a": "Hi {{name}}, ...",
  "variant_b": "Hi {{name}}, ..."
}}"""
    if groq_client:
        try:
            completion = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": "You are an expert marketing copywriter and JSON generator."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1024
            )
            resp = completion.choices[0].message.content.strip()
            # Clean up markdown if any
            if resp.startswith("```json"):
                resp = resp[7:]
            if resp.endswith("```"):
                resp = resp[:-3]
            return json.loads(resp)
        except Exception as e:
            print(f"Error calling Groq for draft: {e}")
            return {
                "variant_a": f"Hi {{name}}, [Emotion Variant] Check out our {product_context}!",
                "variant_b": f"Hi {{name}}, [Logic Variant] Save 20% on {product_context}!"
            }
    else:
        return {
            "variant_a": f"Hi {{name}}, check out our latest {product_context}!",
            "variant_b": f"Hi {{name}}, get 10% off on {product_context} today!"
        }

def generate_insight(dashboard_data: dict) -> str:
    prompt = f"Given this dashboard data: {json.dumps(dashboard_data)}, generate a 2-sentence highly insightful business commentary."
    if groq_client:
        try:
            completion = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.5
            )
            return completion.choices[0].message.content
        except Exception:
            pass
    return "Revenue has seen steady growth. Focus on retaining high-value customers in top locations."
