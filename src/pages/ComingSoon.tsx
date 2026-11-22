export default function ComingSoon({ title, phase, text }: { title: string; phase: number; text: string }) {
  return (
    <>
      <h1>{title}</h1>
      <div className="card">
        <p>{text}</p>
        <p className="muted">Coming in phase {phase}.</p>
      </div>
    </>
  );
}
