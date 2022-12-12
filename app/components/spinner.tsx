export default function Spinner() {
  return (
    <div
      className="block h-8 w-8 animate-spin rounded-full border-4 border-t-neutral-900"
      role="status"
      test-id="spinner"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
