export default function Spinner() {
  return (
    <output
      className="block h-10 w-10 animate-spin rounded-full border-4 border-t-mk border-gray-200"
      data-testid="spinner"
    >
      <span className="sr-only">Loading...</span>
    </output>
  );
}
