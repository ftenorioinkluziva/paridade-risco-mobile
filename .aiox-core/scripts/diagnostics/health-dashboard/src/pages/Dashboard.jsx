import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  TrendChart,
  HealthScore,
  DomainCard,
  IssuesList,
  TechDebtList,
  AutoFixLog
} from '../components';
import { useHealthData, useAutoRefresh } from '../hooks';
import './Dashboard.css';

/**
 * Main dashboard page
 */
function Dashboard() {
  const navigate = useNavigate();
  const { data, loading, error, lastUpdated, refresh } = useHealthData();
  const [actionNotice, setActionNotice] = useState(null);
  const autoRefresh = useAutoRefresh({
    interval: 30000,
    onRefresh: refresh
  });

  const handleIssueAction = async (issue, action) => {
    const domainPath = issue.domain ? `/domain/${issue.domain}` : '/';

    if (action === 'guide') {
      setActionNotice({
        type: 'info',
        title: `Manual guide: ${issue.checkId}`,
        message: 'Opening the related domain details. Follow the failed check details to resolve this manually.'
      });
      navigate(domainPath);
      return;
    }

    if (action === 'confirm' || action === 'autofix') {
      const shouldRun = action === 'autofix' || window.confirm(
        `Run fix for ${issue.checkId} (${issue.name})?`
      );

      if (!shouldRun) {
        return;
      }

      try {
        const response = await fetch('/api/health-fix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkId: issue.checkId,
            action: issue.autoFix?.action,
            domain: issue.domain
          })
        });

        if (!response.ok) {
          throw new Error('Fix API is not available');
        }

        setActionNotice({
          type: 'success',
          title: `Fix requested: ${issue.checkId}`,
          message: 'The fix request was accepted. Refreshing health data.'
        });
        refresh();
      } catch {
        setActionNotice({
          type: 'warning',
          title: `Fix not executed: ${issue.checkId}`,
          message: 'This dashboard is running without the fix API. Opening the domain details so you can review the failing check.'
        });
        navigate(domainPath);
      }
    }
  };

  if (loading && !data) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading health data...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="dashboard-error">
        <h2>Error loading data</h2>
        <p>{error.message}</p>
        <button onClick={refresh}>Retry</button>
      </div>
    );
  }

  const { overall, domains, issues, autoFixed, techDebt, history } = data || {};

  return (
    <div className="dashboard">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>System Health</h1>
          <div className="dashboard-meta">
            {lastUpdated && (
              <span className="last-updated">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              className="refresh-btn"
              onClick={refresh}
              disabled={autoRefresh.isRefreshing}
            >
              {autoRefresh.isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
        <div className="auto-refresh-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={autoRefresh.isEnabled}
              onChange={autoRefresh.toggle}
            />
            <span>Auto-refresh</span>
          </label>
          {autoRefresh.isEnabled && (
            <span className="countdown">Next: {autoRefresh.countdown}s</span>
          )}
        </div>
      </div>

      {/* Overview Section */}
      <div className="dashboard-overview">
        <Card className="overview-score">
          <div className="score-content">
            <HealthScore score={overall?.score || 0} size="xl" />
            <div className="score-stats">
              <div className="stat">
                <span className="stat-value">{overall?.issuesCount || 0}</span>
                <span className="stat-label">Issues</span>
              </div>
              <div className="stat stat--success">
                <span className="stat-value">{overall?.autoFixedCount || 0}</span>
                <span className="stat-label">Auto-Fixed</span>
              </div>
              {history?.scoreDelta !== undefined && (
                <div className={`stat ${history.scoreDelta >= 0 ? 'stat--success' : 'stat--danger'}`}>
                  <span className="stat-value">
                    {history.scoreDelta >= 0 ? '+' : ''}{history.scoreDelta}
                  </span>
                  <span className="stat-label">vs Previous</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="overview-trend" title="Health Trend">
          <TrendChart data={history?.trend || []} height={180} />
        </Card>
      </div>

      {/* Domain Cards */}
      <section className="dashboard-section">
        <h2 className="section-title">Health by Domain</h2>
        <div className="domain-grid">
          {domains && Object.entries(domains).map(([domainId, domainData]) => (
            <DomainCard
              key={domainId}
              domain={domainId}
              data={domainData}
            />
          ))}
        </div>
      </section>

      {/* Issues and Actions */}
      <section className="dashboard-section">
        {actionNotice && (
          <div className={`action-notice action-notice--${actionNotice.type}`}>
            <div>
              <strong>{actionNotice.title}</strong>
              <p>{actionNotice.message}</p>
            </div>
            <button type="button" onClick={() => setActionNotice(null)}>
              Dismiss
            </button>
          </div>
        )}
        <div className="issues-row">
          <div className="issues-col">
            <IssuesList issues={issues} maxItems={5} onAction={handleIssueAction} />
          </div>
          <div className="issues-col">
            <div className="stacked-panels">
              <AutoFixLog items={autoFixed} maxItems={3} />
              <TechDebtList items={techDebt} maxItems={3} />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>
          AIOX Health Check v{data?.version || '1.0.0'} |
          Mode: {data?.mode || 'full'} |
          Duration: {data?.duration || 'N/A'}
        </p>
      </footer>
    </div>
  );
}

export default Dashboard;
