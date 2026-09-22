import AccessGate from './components/AccessGate';
import PayrollQuoteCalculator from './components/PayrollQuoteCalculator';

function App() {
  return (
    <AccessGate>
      <PayrollQuoteCalculator />
    </AccessGate>
  );
}

export default App;
