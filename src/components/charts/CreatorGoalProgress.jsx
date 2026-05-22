import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import * as db from '../../db/index.js';
import { format, getYear, getMonth } from 'date-fns';

const CreatorGoalProgress = ({ agencyId, agencyName }) => {
  const getCreatorGoalData = () => {
    const creators = db.getCreatorsByAgency(agencyId, false);
    const currentYear = getYear(new Date());
    const currentMonth = getMonth(new Date()) + 1;

    return creators.map(creator => {
      const earnings = db.getEarningsForCreatorMonth(creator.id, currentYear, currentMonth);
      const totalEarned = earnings.reduce((sum, e) => sum + e.amount, 0);
      const monthlyGoal = creator.monthly_goal || 1;
      const percentage = Math.min((totalEarned / monthlyGoal) * 100, 100);

      return {
        name: creator.stage_name,
        earned: totalEarned,
        goal: monthlyGoal,
        percentage: Math.round(percentage),
        color:
          percentage >= 100 ? '#00ff88' : percentage >= 80 ? '#ff6b35' : '#ff006e',
      };
    });
  };

  const data = getCreatorGoalData();

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-bg-primary border border-accent-cyan/50 rounded-lg p-md text-sm">
          <p className="text-text-primary font-semibold">{data.name}</p>
          <p className="text-accent-cyan">Earned: ${data.earned.toFixed(2)}</p>
          <p className="text-text-secondary">Goal: ${data.goal.toFixed(2)}</p>
          <p className="text-accent-lime font-bold">{data.percentage}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gradient-to-br from-bg-tertiary to-bg-secondary border border-accent-orange/30 rounded-xl p-lg">
      <h3 className="text-lg font-semibold text-text-primary mb-lg">
        {agencyName} - Creator Goal Progress (This Month)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="name" stroke="#a8b2d1" angle={-45} textAnchor="end" height={100} />
          <YAxis stroke="#a8b2d1" />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="earned" name="Earned" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Progress indicators */}
      <div className="mt-lg space-y-sm">
        {data.map(creator => (
          <div key={creator.name} className="space-y-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">{creator.name}</span>
              <span className="text-sm font-semibold" style={{ color: creator.color }}>
                {creator.percentage}%
              </span>
            </div>
            <div className="w-full bg-bg-secondary/50 rounded-full h-2 border border-accent-orange/20">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${creator.percentage}%`,
                  backgroundColor: creator.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CreatorGoalProgress;
