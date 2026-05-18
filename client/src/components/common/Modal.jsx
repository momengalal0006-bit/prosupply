export default function Modal({ isOpen, onClose, children, className = '' }) {
  if (!isOpen) return null;

  return (
    <div
      className={`modal-overlay active ${className}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div className="modal-card cyan-frame">{children}</div>
    </div>
  );
}
