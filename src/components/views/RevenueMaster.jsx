import { useState, useEffect } from 'react';
import { useStore } from '../../store.js';
import { BarChart3, Copy, ChevronDown } from 'lucide-react';
import Card from '../Card';
import Button from '../Button';
import * as db from '../../db/index.js';

const RevenueMaster = () => {
  const agencies = useStore(state => state.agencies);
  const creators = useStore(state => state.creators);
  const [agencyFilter, setAgencyFilter] = useState(null);
  const [earnings, setEarnings] = useState({});
  const [expandedInactive, setExpandedInactive] = useState(false);
  const [copiedAgency, setCopiedAgency] = useState(null);

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  useEffect(() => {
    loadEarnings();
  }, []);

  const loadEarnings = () => {
    const allEarnings = {};
    creators.forEach(creator => {
      const monthEarnings = db.getEarningsForCreatorMonth(creator.id, currentYear, currentMonth);
      allEarnings[creator.id] = monthEarnings;
    });
    setEarnings(allEarnings);
  };

  const getEarningForDay = (creatorId, day) => {
    const date = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEarnings = earnings[creatorId] || [];
    const found = dayEarnings.find(e => e.date === date);
    return found?.amount || 0;
  };

  const getWeeklyTotal = (creatorId) => {
    // Current week: from Monday of this week to today or Sunday
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    let total = 0;
    const dayEarnings = earnings[creatorId] || [];
    dayEarnings.forEach(e => {
      const eDate = new Date(e.date);
      if (eDate >= startOfWeek && eDate <= today) {
        total += e.amount;
      }
    });
    return total;
  };

  const getMonthlyTotal = (creatorId) => {
    return (earnings[creatorId] || []).reduce((sum, e) => sum + e.amount, 0);
  };

  const getPercentageOfAgencyRevenue = (creatorId, agencyId) => {
    const creatorTotal = getMonthlyTotal(creatorId);
    let agencyTotal = 0;
    creators
      .filter(c => c.agency_id === agencyId && c.is_active)
      .forEach(c => {
        agencyTotal += getMonthlyTotal(c.id);
      });
    return agencyTotal > 0 ? ((creatorTotal / agencyTotal) * 100).toFixed(1) : 0;
  };

  const getColorForGoal = (earned, goal) => {
    if (goal === 0 || earned === 0) return 'bg-surface-1';
    const percentage = earned / goal;
    if (percentage >= 1) return 'bg-accent-success bg-opacity-20 text-accent-success';
    if (percentage >= 0.8) return 'bg-accent-warning bg-opacity-20 text-accent-warning';
    return 'bg-accent-danger bg-opacity-20 text-accent-danger';
  };

  const copyAgencyReport = (agencyId) => {
    const agency = agencies.find(a => a.id === agencyId);
    const agencyCreators = creators.filter(c => c.agency_id === agencyId && c.is_active);

    let totalRevenue = 0;
    let topCreator = null;
    let topCreatorEarnings = 0;

    agencyCreators.forEach(creator => {
      const weeklyTotal = getWeeklyTotal(creator.id);
      totalRevenue += weeklyTotal;
      if (weeklyTotal > topCreatorEarnings) {
        topCreatorEarnings = weeklyTotal;
        topCreator = creator;
      }
    });

    const report = `
📊 ${agency.name} Weekly Report
Week of ${new Date().toLocaleDateString()}

Total Revenue: $${totalRevenue.toFixed(2)}
Top Performer: ${topCreator?.stage_name || 'N/A'} ($${topCreatorEarnings.toFixed(2)})
    `.trim();

    navigator.clipboard.writeText(report);
    setCopiedAgency(agencyId);
    setTimeout(() => setCopiedAgency(null), 2000);
  };

  const activeCreators = creators.filter(c => c.is_active);
  const inactiveCreators = creators.filter(c => !c.is_active);
  const filteredActive = agencyFilter
    ? activeCreators.filter(c => c.agency_id === agencyFilter)
    : activeCreators;
  const filteredInactive = agencyFilter
    ? inactiveCreators.filter(c => c.agency_id === agencyFilter)
    : inactiveCreators;

  return (
    <div className="p-lg bg-surface-0 h-full overflow-auto">
      <h1 className="text-3xl font-bold text-text-primary mb-lg flex items-center gap-md">
        <BarChart3 size={32} />
        Revenue Master Sheet
      </h1>

      {/* Filter */}
      <div className="mb-lg">
        <select
          value={agencyFilter || ''}
          onChange={(e) => setAgencyFilter(e.target.value ? parseInt(e.target.value) : null)}
          className="bg-surface-1 border border-surface-2 rounded-lg px-lg py-sm text-text-primary focus:border-accent-primary focus:outline-none"
        >
          <option value="">All Agencies</option>
          {agencies.map(agency => (
            <option key={agency.id} value={agency.id}>
              {agency.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 sticky top-0 border-b border-surface-2">
            <tr>
              <th className="text-left px-lg py-md font-semibold text-text-secondary text-xs uppercase">Creator</th>
              <th className="text-right px-lg py-md font-semibold text-text-secondary text-xs uppercase">% Revenue</th>
              <th className="text-right px-lg py-md font-semibold text-text-secondary text-xs uppercase">Weekly</th>
              <th className="text-right px-lg py-md font-semibold text-text-secondary text-xs uppercase">Monthly</th>
              <th className="text-right px-lg py-md font-semibold text-text-secondary text-xs uppercase">Daily Goal</th>
              {/* Day columns */}
              {Array.from({ length: Math.min(daysInMonth, 31) }, (_, i) => (
                <th key={`day-${i + 1}`} className="text-right px-md py-md font-semibold text-text-secondary text-xs">
                  {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-2">
            {filteredActive.length === 0 ? (
              <tr>
                <td colSpan="100" className="text-center py-xl text-text-tertiary">
                  No active creators
                </td>
              </tr>
            ) : (
              filteredActive.map(creator => (
                <tr key={creator.id} className="hover:bg-surface-1 transition-colors">
                  <td className="px-lg py-md text-text-primary font-medium">{creator.stage_name}</td>
                  <td className="text-right px-lg py-md font-mono text-accent-primary">
                    {getPercentageOfAgencyRevenue(creator.id, creator.agency_id)}%
                  </td>
                  <td className="text-right px-lg py-md font-mono font-semibold text-accent-success">
                    ${getWeeklyTotal(creator.id).toFixed(2)}
                  </td>
                  <td className={`text-right px-lg py-md font-mono font-semibold ${getColorForGoal(getMonthlyTotal(creator.id), creator.monthly_goal)}`}>
                    ${getMonthlyTotal(creator.id).toFixed(2)}
                  </td>
                  <td className="text-right px-lg py-md font-mono text-text-tertiary">
                    ${creator.daily_goal.toFixed(2)}
                  </td>
                  {/* Day columns */}
                  {Array.from({ length: Math.min(daysInMonth, 31) }, (_, i) => {
                    const dayEarning = getEarningForDay(creator.id, i + 1);
                    const dailyGoal = creator.daily_goal;
                    return (
                      <td key={`${creator.id}-day-${i + 1}`} className={`text-right px-md py-md font-mono text-xs ${getColorForGoal(dayEarning, dailyGoal)}`}>
                        {dayEarning > 0 ? `$${dayEarning.toFixed(0)}` : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Offboarded creators section */}
      {filteredInactive.length > 0 && (
        <div className="mt-xl">
          <button
            onClick={() => setExpandedInactive(!expandedInactive)}
            className="flex items-center gap-md text-text-secondary hover:text-text-primary mb-lg transition-colors"
          >
            <ChevronDown size={20} className={`transition-transform ${expandedInactive ? 'rotate-180' : ''}`} />
            <span className="font-semibold">Inactive Creators ({filteredInactive.length})</span>
          </button>

          {expandedInactive && (
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-sm opacity-60">
                <thead className="bg-surface-2 sticky top-0 border-b border-surface-2">
                  <tr>
                    <th className="text-left px-lg py-md font-semibold text-text-secondary text-xs uppercase">Creator</th>
                    <th className="text-right px-lg py-md font-semibold text-text-secondary text-xs uppercase">% Revenue</th>
                    <th className="text-right px-lg py-md font-semibold text-text-secondary text-xs uppercase">Weekly</th>
                    <th className="text-right px-lg py-md font-semibold text-text-secondary text-xs uppercase">Monthly</th>
                    <th className="text-right px-lg py-md font-semibold text-text-secondary text-xs uppercase">Daily Goal</th>
                    {Array.from({ length: Math.min(daysInMonth, 31) }, (_, i) => (
                      <th key={`inactive-day-${i + 1}`} className="text-right px-md py-md font-semibold text-text-secondary text-xs">
                        {i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-2">
                  {filteredInactive.map(creator => (
                    <tr key={creator.id} className="hover:bg-surface-1 transition-colors">
                      <td className="px-lg py-md text-text-primary font-medium">{creator.stage_name}</td>
                      <td className="text-right px-lg py-md font-mono text-accent-primary">
                        {getPercentageOfAgencyRevenue(creator.id, creator.agency_id)}%
                      </td>
                      <td className="text-right px-lg py-md font-mono font-semibold">
                        ${getWeeklyTotal(creator.id).toFixed(2)}
                      </td>
                      <td className="text-right px-lg py-md font-mono font-semibold">
                        ${getMonthlyTotal(creator.id).toFixed(2)}
                      </td>
                      <td className="text-right px-lg py-md font-mono text-text-tertiary">
                        ${creator.daily_goal.toFixed(2)}
                      </td>
                      {Array.from({ length: Math.min(daysInMonth, 31) }, (_, i) => {
                        const dayEarning = getEarningForDay(creator.id, i + 1);
                        return (
                          <td key={`${creator.id}-day-${i + 1}`} className="text-right px-md py-md font-mono text-xs">
                            {dayEarning > 0 ? `$${dayEarning.toFixed(0)}` : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* Agency report buttons */}
      {!agencyFilter && agencies.length > 0 && (
        <div className="mt-xl">
          <h3 className="text-sm font-semibold text-text-secondary mb-md uppercase">Quick Actions</h3>
          <div className="flex flex-wrap gap-md">
            {agencies.map(agency => (
              <Button
                key={agency.id}
                variant="secondary"
                size="sm"
                onClick={() => copyAgencyReport(agency.id)}
                className="flex items-center gap-sm"
              >
                <Copy size={14} />
                {copiedAgency === agency.id ? 'Copied!' : `${agency.name} Report`}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueMaster;
