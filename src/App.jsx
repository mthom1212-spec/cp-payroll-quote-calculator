import PayrollQuoteCalculator from './components/PayrollQuoteCalculator';

// Keep the original interface available for comparison on this preview branch.
export default function App() {
  const preview = new URLSearchParams(window.location.search).get('experience') !== 'classic';
  return <PayrollQuoteCalculator preview={preview} />;
}
