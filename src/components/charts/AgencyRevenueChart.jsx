import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import * as db from '../../db/index.js';
import { subDays, format } from 'date-fns';

const AgencyRevenueChart = ({ agencyId, agencyName }) => {
  // Get data for last 7 days
  const getLast7DaysData = () => {
    const data = [];
    const creators = db.getCreatorsByAgency(agencyId, false);

    for (let i = 6; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const displayDate = format(subDays(new Date(), i), 'MMM dd');
      let total = 0;

      creators.forEach(creator => {
        const earning = db.getEarningsForCreator(creator.id, date);
        if (earning) {
          total += earning.amount;
        }
      });

      data.push({
        date: displayDate,
        revenue: total,
      });
    }

    return data;
  };

  const data = getLast7DaysData();

  return (
    <div className="bg-gradient-to-br from-bg-tertiary to-bg-secondary border border-accent-cyan/30 rounded-xl p-lg">
      <h3 className="text-lg font-semibold text-text-primary mb-lg">{agencyName} - Revenue Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="date" stroke="#a8b2d1" />
          <YAxis stroke="#a8b2d1" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1f3a',
              border: '1px solid #00d9ff',
              borderRadius: '8px',
              color: '#ffffff',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#00d9ff"
            strokeWidth={3}
            dot={{ fill: '#00d9ff', r: 5 }}
            activeDot={{ r: 7 }}
            name="Daily Revenue"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AgencyRevenueChart;
