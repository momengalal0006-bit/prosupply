import { useState } from 'react';

export default function StarSelector({ value = 0, onChange }) {
  const [hover, setHover] = useState(0);

  const handleClick = (star) => {
    onChange(star === value ? 0 : star);
  };

  return (
    <div className="star-selector" data-value={value}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star${(hover || value) >= star ? ' active' : ''}`}
          onClick={() => handleClick(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
        >
          ★
        </span>
      ))}
    </div>
  );
}
