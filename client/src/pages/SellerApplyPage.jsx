import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, apiPostForm } from '../services/api';
import { useToast } from '../hooks/useToast';
import '../styles/pages/seller-apply.css';

export default function SellerApplyPage() {
  const showToast = useToast();
  const navigate = useNavigate();
  const [status, setStatus] = useState('none'); 
  const [businessName, setBusinessName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileNames, setFileNames] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      const res = await apiFetch('/api/profile');
      if (!res?.success) return;
      if (res.data.sellerStatus === 'approved') { navigate('/seller/dashboard'); return; }
      if (res.data.sellerStatus === 'pending_review') setStatus('pending_review');
      if (res.data.sellerStatus === 'rejected') setStatus('rejected');
    })();
  }, [navigate]);

  function handleFiles(files) {
    const arr = Array.from(files);
    setSelectedFiles(arr);
    setFileNames(arr.map((f) => f.name).join(', '));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!businessName.trim()) { showToast('Business name is required.', true); return; }
    setSubmitting(true);
    const formData = new FormData();
    formData.append('businessName', businessName);
    selectedFiles.forEach((f) => formData.append('documents', f));
    const res = await apiPostForm('/api/seller/apply', formData);
    if (res?.success) { showToast('Application submitted!'); setStatus('pending_review'); }
    else { showToast(res?.message || 'Failed to submit.', true); setSubmitting(false); }
  }

  return (
    <div className="seller-apply-wrapper">
      <main className="apply-page">
        {status === 'pending_review' ? (
          <div className="status-card cyan-frame"><div className="status-icon">⏳</div><h2>Application Under Review</h2><p>We're reviewing your documents. You'll be notified once approved.</p></div>
        ) : (
          <div className="apply-card cyan-frame">
            {status === 'rejected' && <div className="rejected-notice">Your previous application was rejected. You may reapply below.</div>}
            <h1>Become a Seller</h1>
            <p className="subtitle">Submit your business details and verification documents</p>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label>Business Name</label><input type="text" placeholder="Enter your business name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required /></div>
              <div className="form-group"><label>Verification Documents</label>
                <div className="drop-zone" onClick={() => fileInputRef.current.click()}
                  onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}>
                  <span className="drop-icon">📂</span>
                  <p style={{ color: fileNames ? '#00E5FF' : undefined }}>{fileNames || 'Drag & drop files or click to upload'}</p>
                  <p className="drop-hint">PDF, PNG, JPG — Max 5MB</p>
                  <input type="file" ref={fileInputRef} accept=".pdf,.jpg,.jpeg,.png" multiple style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />
                </div>
              </div>
              <button type="submit" className="btn-submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Application'}</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
