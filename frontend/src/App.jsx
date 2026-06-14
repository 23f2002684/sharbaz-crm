import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Check, CheckCheck, Clock, MessageCircle, BarChart3, Users, Sun, Moon, XCircle } from 'lucide-react';
import axios from 'axios';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler);

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [kpis, setKpis] = useState(null);
  const [insight, setInsight] = useState('');
  const [predictive, setPredictive] = useState(null);
  const [segmentQuery, setSegmentQuery] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [liveCommunications, setLiveCommunications] = useState([]);
  const [draftVariantA, setDraftVariantA] = useState('');
  const [draftVariantB, setDraftVariantB] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);

  useEffect(() => {
    document.body.setAttribute('data-theme', 'dark');
    ChartJS.defaults.color = '#94a3b8';
    ChartJS.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
    ChartJS.defaults.font.family = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";
    ChartJS.defaults.font.size = 11;
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchCampaigns();
  }, []);

  useEffect(() => {
    let interval;
    if (activeTab === 'campaigns') {
      fetchCommunications();
      fetchCampaigns();
      interval = setInterval(() => {
        fetchCommunications();
        fetchCampaigns();
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchCommunications = async () => {
    try {
      const res = await axios.get(`${API_BASE}/communications/latest`);
      setLiveCommunications(res.data);
    } catch (e) {
      console.log('Error fetching communications', e);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(`${API_BASE}/dashboard/insights`);
      setKpis(res.data.kpis);
      setInsight(res.data.ai_insight);
      
      const predRes = await axios.get(`${API_BASE}/dashboard/predictive`);
      setPredictive(predRes.data);
    } catch (e) {
      console.log('Error fetching dashboard', e);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await axios.get(`${API_BASE}/campaigns`);
      setCampaigns(res.data);
    } catch (e) {
      console.log('Error fetching campaigns', e);
    }
  };

  const generateDraft = async () => {
    if (!segmentQuery) return;
    setIsDrafting(true);
    try {
      const res = await axios.post(`${API_BASE}/campaigns/draft`, {
        segment_query: segmentQuery
      });
      setDraftVariantA(res.data.draft.variant_a);
      setDraftVariantB(res.data.draft.variant_b);
    } catch (e) {
      console.error(e);
      alert("Error generating draft");
    } finally {
      setIsDrafting(false);
    }
  };

  const executeCampaign = async () => {
    if (!segmentQuery || !draftVariantA || !draftVariantB) return;
    try {
      await axios.post(`${API_BASE}/campaigns`, {
        name: `Campaign ${new Date().toLocaleDateString()}`,
        segment_query: segmentQuery,
        variant_a_template: draftVariantA,
        variant_b_template: draftVariantB
      });
      setSegmentQuery('');
      setDraftVariantA('');
      setDraftVariantB('');
      fetchCampaigns();
      alert("A/B Campaign Dispatched via Celery!");
    } catch (e) {
      console.error(e);
      alert("Error dispatching campaign");
    }
  };

  const deleteCampaign = async (id) => {
    try {
      await axios.delete(`${API_BASE}/campaigns/${id}`);
      fetchCampaigns();
    } catch (e) {
      console.error(e);
      alert("Error deleting campaign");
    }
  };

  return (
    <>
      <nav className="top-nav">
        <div className="nav-container">
          <div className="nav-brand">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: '#6366f1'}}>
              <path d="m21 16-7.17 4.12a2 2 0 0 1-1.92 0L4.74 16c-.95-.55-1.54-1.56-1.54-2.66V8.66c0-1.1.59-2.11 1.54-2.66l7.17-4.12a2 2 0 0 1 1.92 0l7.17 4.12c.95.55 1.54 1.56 1.54 2.66v4.68c0 1.1-.59 2.11-1.54 2.66z"></path>
              <path d="m12 22v-9"></path>
              <path d="m3.3 7 8.7 5 8.7-5"></path>
            </svg>
            Sharbaz CRM
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div className="nav-links">
              <div 
                className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <BarChart3 size={18} /> Dashboard
              </div>
              <div 
                className={`nav-link ${activeTab === 'campaigns' ? 'active' : ''}`}
                onClick={() => setActiveTab('campaigns')}
              >
                <MessageCircle size={18} /> Campaigns
              </div>
            </div>
            <div className="status-indicator">
              <span className="pulse-dot"></span>
              System Online
            </div>
          </div>
        </div>
      </nav>

      <main className="main-container">
        {activeTab === 'dashboard' && (
          <div>
            <h1>Admin Dashboard</h1>
            
            {insight && (
              <div className="card ai-insight-card">
                <h3 className="ai-insight-title">✨ Sharbaz AI Engine</h3>
                <p className="ai-insight-desc">{insight}</p>
              </div>
            )}

            <div className="grid-kpi">
              <div className="card kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-title">Total Customers</span>
                  <div className="kpi-icon-wrapper text-indigo">
                    <Users size={20} />
                  </div>
                </div>
                <div className="kpi-value">{kpis?.total_customers || 0}</div>
                <div className="kpi-trend trend-up">
                  <span className="trend-dot"></span> Active Segment DB
                </div>
              </div>
              <div className="card kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-title">Total Orders</span>
                  <div className="kpi-icon-wrapper text-emerald">
                    <BarChart3 size={20} />
                  </div>
                </div>
                <div className="kpi-value">{kpis?.total_orders || 0}</div>
                <div className="kpi-trend trend-neutral">
                  <span className="trend-dot"></span> Transactions Synced
                </div>
              </div>
              <div className="card kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-title">Active Campaigns</span>
                  <div className="kpi-icon-wrapper text-amber">
                    <MessageCircle size={20} />
                  </div>
                </div>
                <div className="kpi-value">{kpis?.active_campaigns || 0}</div>
                <div className="kpi-trend trend-active">
                  <span className="trend-dot pulse"></span> Celery Worker Online
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div className="card" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
                <h3>Sales by Category</h3>
                <div style={{ flexGrow: 1, position: 'relative' }}>
                  <Bar 
                    data={{
                      labels: ['Apparel', 'Beauty', 'Beverage'],
                      datasets: [{
                        label: 'Sales (₹)',
                        data: [15000, 8000, 4500],
                        backgroundColor: [
                          'rgba(99, 102, 241, 0.85)',
                          'rgba(16, 185, 129, 0.85)',
                          'rgba(245, 158, 11, 0.85)'
                        ],
                        borderRadius: 8,
                        borderSkipped: false
                      }]
                    }} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        x: { 
                          grid: { display: false },
                          ticks: { color: 'var(--text-secondary)' } 
                        },
                        y: { 
                          grid: { color: 'rgba(255, 255, 255, 0.05)' },
                          ticks: { color: 'var(--text-secondary)' } 
                        }
                      },
                      plugins: { 
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: '#121214',
                          titleColor: '#fafafa',
                          bodyColor: '#fafafa',
                          borderColor: 'rgba(255, 255, 255, 0.08)',
                          borderWidth: 1,
                          padding: 12,
                          cornerRadius: 8
                        }
                      }
                    }}
                  />
                </div>
              </div>
              <div className="card" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
                <h3>Customer Segments</h3>
                <div style={{ flexGrow: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ width: '220px', height: '220px' }}>
                    <Doughnut 
                      data={{
                        labels: ['High Value', 'At Risk', 'Frequent'],
                        datasets: [{
                          data: [40, 25, 35],
                          backgroundColor: ['#6366f1', '#ef4444', '#10b981'],
                          borderColor: '#121214',
                          borderWidth: 2
                        }]
                      }} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '75%',
                        plugins: { 
                          legend: { 
                            position: 'bottom',
                            labels: { 
                              color: 'var(--text-secondary)',
                              boxWidth: 10,
                              padding: 15
                            }
                          },
                          tooltip: {
                            backgroundColor: '#121214',
                            titleColor: '#fafafa',
                            bodyColor: '#fafafa',
                            borderColor: 'rgba(255, 255, 255, 0.08)',
                            borderWidth: 1,
                            padding: 12,
                            cornerRadius: 8
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            {predictive && (
              <>
                <h2 style={{ marginTop: '3rem' }}>Predictive Analytics</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                  <div className="card" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
                    <h3>30-Day Revenue Forecast</h3>
                    <div style={{ flexGrow: 1, position: 'relative' }}>
                      <Line 
                        data={{
                          labels: predictive.revenue_forecast.labels.map(l => l.substring(5)),
                          datasets: [{
                            label: 'Projected Revenue (₹)',
                            data: predictive.revenue_forecast.values,
                            borderColor: '#10b981',
                            backgroundColor: (context) => {
                              const chart = context.chart;
                              const { ctx, chartArea } = chart;
                              if (!chartArea) return null;
                              const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                              gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
                              gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
                              return gradient;
                            },
                            fill: true,
                            tension: 0.4,
                            pointRadius: 3,
                            pointHoverRadius: 6,
                            pointBackgroundColor: '#10b981',
                            pointBorderColor: 'rgba(255, 255, 255, 0.1)',
                            pointBorderWidth: 1
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            x: { 
                              grid: { display: false },
                              ticks: { color: 'var(--text-secondary)' } 
                            },
                            y: { 
                              grid: { color: 'rgba(255, 255, 255, 0.05)' },
                              ticks: { color: 'var(--text-secondary)' } 
                            }
                          },
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              backgroundColor: '#121214',
                              titleColor: '#fafafa',
                              bodyColor: '#fafafa',
                              borderColor: 'rgba(255, 255, 255, 0.08)',
                              borderWidth: 1,
                              padding: 12,
                              cornerRadius: 8
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="card">
                    <h3>Churn Risk</h3>
                    <div style={{ width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                        <span style={{ color: '#ef4444', fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span>
                          High Risk (&gt;45 days)
                        </span>
                        <span style={{ fontWeight: '600' }}>{predictive.churn_risk.high_risk} customers</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                        <span style={{ color: '#10b981', fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                          Safe
                        </span>
                        <span style={{ fontWeight: '600' }}>{predictive.churn_risk.safe} customers</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-secondary)' }}></span>
                          New / Inactive
                        </span>
                        <span style={{ fontWeight: '600' }}>{predictive.churn_risk.new_or_inactive} customers</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
            <div>
              <h1>Campaign Manager</h1>
              <div className="card" style={{ marginBottom: '2rem' }}>
                <h3>✨ AI Shopper Segmentation</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  Describe your target customer audience using natural language.
                </p>
                <textarea 
                  rows="3" 
                  placeholder="e.g. Customers in Delhi who bought Coffee in the last 30 days"
                  value={segmentQuery}
                  onChange={(e) => setSegmentQuery(e.target.value)}
                  style={{ marginBottom: '1.25rem' }}
                />
                
                {!(draftVariantA && draftVariantB) ? (
                  <button onClick={generateDraft} disabled={isDrafting}>
                    {isDrafting ? 'Drafting...' : 'Generate A/B Variants'}
                  </button>
                ) : (
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                      <div style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)', background: 'rgba(245, 158, 11, 0.02)' }}>
                        <h4 style={{ marginTop: 0, color: '#fbbf24', fontSize: '0.9rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24' }}></span>
                          Variant A (Emotion/FOMO)
                        </h4>
                        <textarea 
                          rows="6" 
                          value={draftVariantA}
                          onChange={(e) => setDraftVariantA(e.target.value)}
                          style={{ marginBottom: 0, border: '1px solid rgba(245, 158, 11, 0.1)' }}
                        />
                      </div>
                      <div style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.2)', background: 'rgba(99, 102, 241, 0.02)' }}>
                        <h4 style={{ marginTop: 0, color: '#818cf8', fontSize: '0.9rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#818cf8' }}></span>
                          Variant B (Logic/Discount)
                        </h4>
                        <textarea 
                          rows="6" 
                          value={draftVariantB}
                          onChange={(e) => setDraftVariantB(e.target.value)}
                          style={{ marginBottom: 0, border: '1px solid rgba(99, 102, 241, 0.1)' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button onClick={generateDraft} className="btn-secondary" disabled={isDrafting}>
                        {isDrafting ? 'Drafting...' : 'Regenerate'}
                      </button>
                      <button onClick={executeCampaign}>
                        Approve & Dispatch A/B Split
                      </button>
                    </div>
                  </div>
                )}

                {isDrafting && (
                  <div style={{ marginTop: '1.5rem', padding: '1rem', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.01)' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="pulse-dot pulse"></span> Sharbaz AI is drafting campaign variants...
                    </div>
                    <div className="skeleton-wave" style={{ width: '80%' }}></div>
                    <div className="skeleton-wave" style={{ width: '95%' }}></div>
                    <div className="skeleton-wave" style={{ width: '60%' }}></div>
                  </div>
                )}
              </div>

              <div className="card">
                <h3>Recent Campaigns</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Query</th>
                        <th>Status</th>
                        <th>Sent</th>
                        <th>Failed</th>
                        <th>Var A Read</th>
                        <th>Var B Read</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map(c => (
                        <tr key={c.id}>
                          <td><span className="badge badge-info">#{c.id}</span></td>
                          <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-secondary)' }} title={c.segment_query}>
                            {c.segment_query}
                          </td>
                          <td>
                            <span className={`badge ${c.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}>
                              {c.status}
                            </span>
                          </td>
                          <td>{c.stats?.Sent || 0}</td>
                          <td style={{ color: '#ef4444', fontWeight: 'bold' }}>{c.stats?.Failed || 0}</td>
                          <td style={{ color: '#fbbf24', fontWeight: 'bold' }}>{c.variant_stats?.A?.Read || 0}</td>
                          <td style={{ color: '#818cf8', fontWeight: 'bold' }}>{c.variant_stats?.B?.Read || 0}</td>
                          <td>
                            <button 
                              className="btn-secondary"
                              onClick={() => deleteCampaign(c.id)} 
                              style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--danger)', borderRadius: '8px' }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div>
              <h2 style={{ marginTop: 0 }}>Live Preview</h2>
              <div className="phone-mockup">
                <div className="phone-island"></div>
                <div className="phone-status-bar">
                  <span>19:42</span>
                  <div className="phone-status-icons">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '2px' }}><path d="M12 20h.01M17 16h.01M22 12h.01M7 24H2c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2h5c1.1 0 2 .9 2 2v15c0 1.1-.9 2-2 2z"></path></svg>
                    <span>5G</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', marginLeft: '4px' }}>🔋 84%</span>
                  </div>
                </div>
                
                <div className="phone-header">
                  <div className="phone-header-avatar">💬</div>
                  <div className="phone-header-info">
                    <span className="phone-header-title">Sharbaz Live Logs</span>
                    <span className="phone-header-subtitle">
                      <span className="pulse-dot"></span> active
                    </span>
                  </div>
                </div>

                <div className="wa-container">
                  <div style={{ textAlign: 'center', color: '#475569', fontSize: '0.7rem', margin: '4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today</div>
                  
                  {liveCommunications.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '40px', color: '#475569', fontSize: '0.85rem' }}>No incoming logs</div>
                  ) : (
                    liveCommunications.map((msg, i) => {
                      let Icon = Clock;
                      let iconColor = "#64748b";
                      let iconClass = "";
                      if (msg.status === 'Sent') { Icon = Check; }
                      else if (msg.status === 'Delivered') { Icon = CheckCheck; }
                      else if (msg.status === 'Read' || msg.status === 'Clicked' || msg.status === 'Converted') { 
                        Icon = CheckCheck; 
                        iconClass = "tick-read"; 
                      }
                      else if (msg.status === 'Failed') {
                        Icon = XCircle;
                        iconColor = "#ef4444";
                      }

                      const initials = msg.customer_name 
                        ? msg.customer_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                        : '??';

                      return (
                        <div key={msg.id || i} className="wa-bubble-wrapper">
                          <div className="wa-bubble-avatar">{initials}</div>
                          <div className="wa-bubble">
                            <div className="wa-bubble-meta">
                              <span className="wa-bubble-name">{msg.customer_name}</span>
                              {msg.variant && (
                                <span className={`wa-bubble-variant ${msg.variant === 'A' ? 'variant-a-tag' : 'variant-b-tag'}`}>
                                  Var {msg.variant}
                                </span>
                              )}
                            </div>
                            <div>{msg.message}</div>
                            <div className="wa-status">
                              {new Date(msg.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                              <Icon size={12} color={iconColor} className={iconClass} style={{ marginLeft: '2px' }} />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                
                <div className="phone-footer">
                  <div className="phone-home-indicator"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default App;
