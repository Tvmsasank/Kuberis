import React from 'react';
import { Upload, FolderSync, FileText, CheckCircle2, AlertCircle, Clock, ExternalLink } from 'lucide-react';

export default function DocumentsTab({
  documents = [],
  settings = {},
  onOpenImport
}) {
  const rawDriveName = settings.driveFolder?.name || 'Kuberis Financial Inbox';
  const cleanDriveName = rawDriveName.replace(/Ledgerly/gi, 'Kuberis').replace(/WealthPulse/gi, 'Kuberis');
  const driveFolder = {
    ...settings.driveFolder,
    name: cleanDriveName,
    url: settings.driveFolder?.url || 'https://drive.google.com/drive/my-drive'
  };
  const driveSync = settings.driveSync || {
    schedule: '08:00 AM Daily',
    timezone: 'Asia/Kolkata',
    lastSyncedAt: null,
    lastStatus: 'idle',
    lastImportedCount: 0
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Documents & Drive Inbox</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Secure R2 storage vault & automated Google Drive synchronization</p>
        </div>

        <button className="btn btn-primary" onClick={onOpenImport}>
          <Upload size={16} /> Upload Documents
        </button>
      </div>

      {/* Top 2 Primary Cards */}
      <div className="grid-2" style={{ marginBottom: '28px' }}>
        {/* Upload Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ padding: '8px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 'var(--radius-md)' }}>
                <Upload size={20} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Manual Document Upload</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Upload receipts, invoices, bank statements, spreadsheets, images, or PDFs up to 20 MB each.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={onOpenImport} style={{ alignSelf: 'flex-start' }}>
            Choose File to Store in R2 Vault
          </button>
        </div>

        {/* Google Drive Inbox Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', background: 'var(--success-light)', color: 'var(--success)', borderRadius: 'var(--radius-md)' }}>
                  <FolderSync size={20} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Google Drive Inbox</h3>
              </div>
              <span className="badge badge-success">
                {driveSync.schedule} ({driveSync.timezone})
              </span>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Dedicated Folder: <strong>{driveFolder.name}</strong>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '16px' }}>
              <span>Last sync: <strong>{driveSync.lastSyncedAt ? new Date(driveSync.lastSyncedAt).toLocaleString() : 'Pending scheduled run'}</strong></span>
              <span>Status: <strong style={{ color: 'var(--success)' }}>{driveSync.lastStatus}</strong></span>
            </div>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
            <a
              href={driveFolder.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--primary)' }}
            >
              Open Drive Folder <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>

      {/* Document Vault List */}
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '14px' }}>
          Document Vault ({documents.length})
        </h3>

        {documents.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Source</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th>Uploaded Date</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr key={doc.id}>
                    <td>
                      <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} style={{ color: 'var(--primary)' }} />
                        {doc.filename}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{doc.objectKey}</div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>
                      <span className="badge badge-secondary">{doc.source}</span>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {(doc.size / 1024).toFixed(1)} KB
                    </td>
                    <td>
                      <span className={`badge ${
                        doc.status === 'stored' ? 'badge-success' : doc.status === 'review' ? 'badge-warning' : 'badge-info'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon"><FileText size={28} /></div>
            <div className="empty-state-title">No documents yet</div>
            <div className="empty-state-text">
              Upload a file or add one to your Drive inbox.
            </div>
            <button className="btn btn-primary" onClick={onOpenImport}>
              Upload Document
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
