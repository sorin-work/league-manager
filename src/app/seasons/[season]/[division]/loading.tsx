export default function DivisionLoading() {
  return (
    <div className="container" aria-busy="true" aria-live="polite">
      <div className="skeleton title" />
      <div className="skeleton tabs" />
      <div className="card">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="skeleton line" />
        ))}
      </div>
    </div>
  );
}
