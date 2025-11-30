import tailwindStylesheetUrl from "../styles/tailwind.css?url";

export const VisualTestContainer = ({
  children,
  testid,
}: {
  children: React.ReactNode;
  testid?: string;
}) => {
  return (
    <div data-testid={testid}>
      <link rel="stylesheet" href={tailwindStylesheetUrl} />
      {children}
    </div>
  );
};
