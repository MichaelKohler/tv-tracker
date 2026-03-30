export const VisualTestContainer = ({
  children,
  testid,
}: {
  children: React.ReactNode;
  testid?: string;
}) => {
  return <div data-testid={testid}>{children}</div>;
};
