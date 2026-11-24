import { useEffect, useRef, useState } from 'react'
import { discoverProducts } from '../api/beautyAI.js'
import ProductCard from '../components/ProductCard.jsx'

export default function BeautyAIPage() {
  const [prompt, setPrompt] = useState('')
  const [recommendations, setRecommendations] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const controllerRef = useRef(null)

  useEffect(() => () => controllerRef.current?.abort(), [])

  async function handleSubmit(event) {
    event.preventDefault()
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setError('')
    setRecommendations(null)
    setLoading(true)
    try {
      const results = await discoverProducts(prompt, { signal: controller.signal })
      if (!controller.signal.aborted) setRecommendations(results)
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason.message || 'Beauty AI could not complete your request.')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  return (
    <section className="ai-page">
      <p className="section-eyebrow">PERSONALIZED DISCOVERY</p>
      <h2 className="page-title">Beauty AI</h2>
      <p className="auth-intro">Describe your beauty goal and get suggestions from GlowCart’s in-stock catalog.</p>
      <p className="ai-privacy">Do not include sensitive personal information. Your prompt is processed by our AI provider.</p>
      <form className="ai-form" onSubmit={handleSubmit}>
        <label htmlFor="beauty-goal">What are you looking for?</label>
        <textarea
          id="beauty-goal"
          minLength={5}
          maxLength={500}
          required
          value={prompt}
          onChange={event => setPrompt(event.target.value)}
          placeholder="For example: a gentle moisturizer for dry skin"
        />
        <button className="primary-button auth-submit" type="submit" disabled={loading}>
          {loading ? 'Finding products…' : 'Discover products'}
        </button>
      </form>
      {loading && <p className="state-message" role="status">Checking the catalog and finding suitable products…</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {recommendations?.length === 0 && (
        <div className="empty-state" role="status">
          <h3>No matching in-stock products</h3>
          <p>Try describing your goal another way.</p>
        </div>
      )}
      {recommendations?.length > 0 && (
        <section className="ai-results" aria-label="Beauty AI recommendations">
          <h3>Catalog recommendations</h3>
          <div className="product-grid">
            {recommendations.map(({ product, reason }) => (
              <div className="ai-recommendation" key={product.id}>
                <ProductCard product={product} />
                <p className="ai-reason">{reason}</p>
                <p className="ai-stock">Current stock: {product.stock}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  )
}
