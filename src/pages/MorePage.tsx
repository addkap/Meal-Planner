// The More tab: batches now; the weight tracker (phase 7) and Settings (phase 8) come next.
import { useNav } from '../nav';

export default function MorePage() {
  const { open } = useNav();
  return (
    <>
      <h1>More</h1>
      <button className="btn big" onClick={() => open({ name: 'weight' })}>Weight</button>
      <button className="btn big" onClick={() => open({ name: 'batches' })}>Your batches</button>
      <div className="card">
        <p className="muted">Settings (targets, stores, rules, sync): coming in phase 8.</p>
      </div>
    </>
  );
}
