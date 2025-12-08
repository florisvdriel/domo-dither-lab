import DomoDitherTool from './components/App';
import ErrorBoundary from './components/ui/ErrorBoundary';

export default function Home() {
  return (
    <ErrorBoundary>
      <DomoDitherTool />
    </ErrorBoundary>
  );
}

