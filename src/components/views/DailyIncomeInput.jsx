import { useState, useEffect } from 'react';
import { useStore } from '../../store.js';
import { DollarSign } from 'lucide-react';
import Card from '../Card';
import Button from '../Button';
import * as db from '../../db/index.js';

const DailyIncomeInput = () => {
  const agencies = useStore(state => state.agencies);
  const creators = useStore(state => state.creators);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [earnings, setEarnings] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Load existing earnings for the selected date
    const newEarnings = {};
    creators.forEach(creator => {
      const existing = db.getEarningsForCreator(creator.id, selectedDate);
      newEarnings[creator.id] = existing?.amount || '';
    });
    setEarnings(newEarnings);
    setSubmitted(false);
  }, [selectedDate, creators]);

  const handleEarningChange = (creatorId, value) => {
    setEarnings({
      ...earnings,
      [creatorId]: value,
    });
  };

  const handleSubmit = () => {
    let hasData = false;
    Object.entries(earnings).forEach(([creatorId, amount]) => {
      if (amount && parseFloat(amount) > 0) {
        db.addDailyEarning(parseInt(creatorId), selectedDate, parseFloat(amount));
        hasData = true;
      }
    });

    if (hasData) {
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    }
  };

  const activeCreators = creators.filter(c => c.is_active);
  const groupedCreators = {};

  agencies.forEach(agency => {
    groupedCreators[agency.id] = {
      name: agency.name,
      creators: activeCreators.filter(c => c.agency_id === agency.id),
    };
  });

  const totalEarnings = Object.values(earnings).reduce((sum, amount) => {
    return sum + (parseFloat(amount) || 0);
  }, 0);

  return (
    <div className="p-lg bg-surface-0 h-full overflow-auto">
      <h1 className="text-3xl font-bold text-text-primary mb-lg flex items-center gap-md">
        <DollarSign size={32} className="text-accent-success" />
        Daily Income Input
      </h1>

      <Card className="mb-lg">
        <div className="space-y-lg">
          {/* Date selector */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-sm">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full max-w-xs bg-surface-0 border border-surface-2 rounded-lg px-lg py-sm text-text-primary focus:border-accent-primary focus:outline-none"
            />
          </div>

          {/* Creator inputs grouped by agency */}
          <div className="space-y-lg">
            {Object.entries(groupedCreators).map(([agencyId, { name, creators: agencyCreators }]) => (
              agencyCreators.length > 0 && (
                <div key={agencyId}>
                  <h3 className="text-sm font-semibold text-text-secondary mb-sm uppercase tracking-wider">
                    {name}
                  </h3>
                  <div className="space-y-md bg-surface-1 rounded-lg p-md">
                    {agencyCreators.map(creator => (
                      <div key={creator.id} className="flex items-center gap-lg">
                        <label className="flex-1 text-sm text-text-primary font-medium">
                          {creator.stage_name}
                        </label>
                        <div className="flex items-center gap-sm">
                          <span className="text-text-tertiary">$</span>
                          <input
                            type="number"
                            value={earnings[creator.id]}
                            onChange={(e) => handleEarningChange(creator.id, e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            className="w-32 bg-surface-0 border border-surface-2 rounded-lg px-md py-sm text-text-primary font-mono text-right focus:border-accent-primary focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>

          {/* Summary and submit */}
          <div className="border-t border-surface-2 pt-lg space-y-md">
            <div className="bg-accent-primary bg-opacity-10 border border-accent-primary border-opacity-20 rounded-lg p-md">
              <p className="text-sm text-text-secondary">Total for {selectedDate}</p>
              <p className="text-2xl font-bold text-accent-success font-mono">
                ${totalEarnings.toFixed(2)}
              </p>
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full"
              size="lg"
            >
              Submit Daily Earnings
            </Button>

            {submitted && (
              <div className="bg-accent-success bg-opacity-10 border border-accent-success border-opacity-20 rounded-lg p-md">
                <p className="text-sm text-accent-success">✓ Earnings saved successfully</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DailyIncomeInput;
