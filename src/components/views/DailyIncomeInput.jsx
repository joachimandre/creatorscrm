import { useState, useEffect } from 'react';
import { useStore } from '../../store.js';
import { DollarSign } from 'lucide-react';
import * as db from '../../db/index.js';

const DailyIncomeInput = () => {
  const agencies = useStore(state => state.agencies);
  const creators = useStore(state => state.creators);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [earnings, setEarnings] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
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
    <div className="p-lg h-full overflow-auto space-y-lg">
      <h1 className="text-3xl font-bold text-text-primary flex items-center gap-md">
        <DollarSign size={32} className="text-accent-orange" />
        Daily Income Input
      </h1>

      <div className="neu-card rounded-xl p-lg space-y-lg max-w-2xl">
        {/* Date selector */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-sm">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full max-w-xs rounded-lg px-lg py-sm text-text-primary focus:outline-none focus:border-accent-cyan transition-all"
          />
        </div>

        {/* Creator inputs grouped by agency */}
        <div className="space-y-lg">
          {Object.entries(groupedCreators).map(([agencyId, { name, creators: agencyCreators }]) => (
            agencyCreators.length > 0 && (
              <div key={agencyId}>
                <h3 className="text-sm font-semibold text-accent-orange mb-sm uppercase tracking-wider">
                  {name}
                </h3>
                <div className="space-y-md neu-card-inset rounded-lg p-md">
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
                          className="w-32 rounded-lg px-md py-sm text-text-primary font-mono text-right focus:outline-none focus:border-accent-cyan transition-all"
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
        <div className="border-t border-accent-cyan/20 pt-lg space-y-md">
          <div className="neu-card-inset rounded-lg p-md">
            <p className="text-sm text-text-secondary">Total for {selectedDate}</p>
            <p className="text-2xl font-bold text-accent-lime font-mono">
              ${totalEarnings.toFixed(2)}
            </p>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full px-lg py-md bg-gradient-to-r from-accent-orange to-accent-pink text-bg-primary font-semibold rounded-lg hover:shadow-glow-pink transition-all active:scale-95"
          >
            Submit Daily Earnings
          </button>

          {submitted && (
            <div className="bg-accent-lime/10 border border-accent-lime/30 rounded-lg p-md animate-slide-up">
              <p className="text-sm text-accent-lime">✓ Earnings saved successfully</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyIncomeInput;
