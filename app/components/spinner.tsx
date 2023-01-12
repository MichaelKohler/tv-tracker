export default function Spinner() {
  return (
    <div
      className="block h-10 w-10 animate-spin rounded-full border-4 border-t-neutral-900"
      role="status"
      data-testid="spinner"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
