export function AboutPage() {
  return (
    <main className="page">
      <section className="section">
        <div className="section-heading">
          <p className="section-kicker">About</p>
          <h1>Nexaris builds with engineering clarity.</h1>
        </div>
        <div className="content-grid">
          <article className="content-card">
            <h3>What Nexaris is building</h3>
            <p>
              A production-oriented software company presence and an internal platform for project
              delivery, hiring workflows, collaboration, and operational oversight.
            </p>
          </article>
          <article className="content-card">
            <h3>How the work is approached</h3>
            <p>
              With modular architecture, validated inputs, secure role boundaries, and incremental
              product delivery instead of large unverified drops.
            </p>
          </article>
          <article className="content-card">
            <h3>Why the current release matters</h3>
            <p>
              Phase 2 establishes a real public website, intake pipeline, careers flow, and
              authentication surface on top of the verified Phase 1 schema.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
