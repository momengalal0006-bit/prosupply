export default function Spinner({ text = 'Loading...' }) {
  return (
    <div className="loading-spinner">
      <div className="spinner"></div>
      <p>{text}</p>
    </div>
  );
}
