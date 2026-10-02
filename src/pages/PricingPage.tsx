import { Pricing } from '../components/Pricing'

export function PricingPage() {
  return (
    <div className="stack loose">
      <section className="hero">
        <p className="film-kicker">Ribbon Plus</p>
        <h1>Pay once when the guest list outgrows the free plan.</h1>
      </section>
      <Pricing />
    </div>
  )
}
