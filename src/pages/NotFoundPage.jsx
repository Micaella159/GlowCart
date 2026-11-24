import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section className="empty-state">
      <h2>Page not found</h2>
      <p>That GlowCart page does not exist.</p>
      <Link to="/">Back to GlowCart</Link>
    </section>
  )
}
