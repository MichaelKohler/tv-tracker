interface Props {
  title: string;
  value: string | number;
  description?: string;
  className?: string;
}

export default function StatCard({ title, value, description, className = "" }: Props) {
  return (
    <div className={`rounded-lg border border-mklight-100 bg-white p-6 shadow-sm ${className}`}>
      <h3 className="text-lg font-medium text-mk-text">{title}</h3>
      <div className="mt-2 text-3xl font-bold text-mk">{value}</div>
      {description && (
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      )}
    </div>
  );
}
