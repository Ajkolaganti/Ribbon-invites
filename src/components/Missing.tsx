import { Link } from 'react-router-dom'

export function Missing({ title, body }: { title: string; body: string }) {
  return (
    <section className="panel stack">
      <h1>{title}</h1>
      <p className="muted">{body}</p>
      <Link className="btn" to="/">
        Back home
      </Link>
    </section>
  )
}
