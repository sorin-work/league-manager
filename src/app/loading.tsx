export default function Loading() {
  return (
    <div className="container" aria-busy="true" aria-live="polite">
      <div className="skeleton title" />
      <div className="card">
        <div className="skeleton line" />
        <div className="skeleton line" />
        <div className="skeleton line short" />
      </div>
    </div>
  );
}
