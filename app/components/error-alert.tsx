interface Props {
  title: string;
  message: string;
}

export default function ErrorAlert({ title, message }: Props) {
  return (
    <div className="rounded-lg border-2 border-mkerror bg-mkerror-muted py-4 px-4">
      <h2 className="font-title text-2xl">{title}</h2>
      <p className="mt-4 text-sm">{message}</p>
    </div>
  );
}
