import { useState } from 'react';
import { useStore } from '../../store.js';
import { Building2, Plus, UserPlus } from 'lucide-react';
import Button from '../Button';
import Modal from '../Modal';
import * as db from '../../db/index.js';

const AgencyCreatorDirectory = () => {
  const agencies = useStore(state => state.agencies);
  const creators = useStore(state => state.creators);
  const selectedCreatorId = useStore(state => state.selectedCreatorId);
  const setSelectedCreator = useStore(state => state.setSelectedCreator);
  const addAgency = useStore(state => state.addAgency);
  const addCreator = useStore(state => state.addCreator);

  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState(false);
  const [isCreatorModalOpen, setIsCreatorModalOpen] = useState(false);
  const [agencyFormData, setAgencyFormData] = useState({ name: '', notes: '' });
  const [creatorFormData, setCreatorFormData] = useState({
    agencyId: '',
    stageName: '',
    dailyGoal: 0,
    weeklyGoal: 0,
    monthlyGoal: 0,
  });

  const handleAddAgency = () => {
    if (!agencyFormData.name.trim()) return;
    addAgency(agencyFormData.name, agencyFormData.notes);
    setAgencyFormData({ name: '', notes: '' });
    setIsAgencyModalOpen(false);
  };

  const handleAddCreator = () => {
    if (!creatorFormData.stageName.trim() || !creatorFormData.agencyId) return;
    addCreator(
      parseInt(creatorFormData.agencyId),
      creatorFormData.stageName,
      parseFloat(creatorFormData.dailyGoal),
      parseFloat(creatorFormData.weeklyGoal),
      parseFloat(creatorFormData.monthlyGoal)
    );
    setCreatorFormData({ agencyId: '', stageName: '', dailyGoal: 0, weeklyGoal: 0, monthlyGoal: 0 });
    setIsCreatorModalOpen(false);
  };

  return (
    <>
      <div className="neu-card p-lg">
        <div className="flex items-center justify-between mb-lg">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-sm">
            <Building2 size={20} />
            Directory
          </h2>
          <div className="flex gap-sm">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAgencyModalOpen(true)}
              className="flex items-center gap-sm"
            >
              <Plus size={16} /> Agency
            </Button>
          </div>
        </div>

        <div className="space-y-sm max-h-64 overflow-y-auto">
          {agencies.length === 0 ? (
            <p className="text-text-tertiary text-sm text-center py-lg">No agencies yet</p>
          ) : (
            agencies.map(agency => {
              const agencyCreators = creators.filter(c => c.agency_id === agency.id && c.is_active);
              return (
                <div key={agency.id} className="neu-card-inset rounded-xl p-md">
                  <div className="flex items-center justify-between mb-sm">
                    <h3 className="font-semibold text-text-primary text-sm">{agency.name}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCreatorModalOpen(true)}
                      className="flex items-center gap-xs p-xs"
                    >
                      <UserPlus size={14} />
                    </Button>
                  </div>

                  <div className="space-y-xs">
                    {agencyCreators.length === 0 ? (
                      <p className="text-text-tertiary text-xs">No active creators</p>
                    ) : (
                      agencyCreators.map(creator => (
                        <button
                          key={creator.id}
                          onClick={() => setSelectedCreator(creator.id)}
                          className={`
                            w-full text-left px-sm py-xs rounded-lg text-sm transition-all
                            ${selectedCreatorId === creator.id
                              ? 'bg-accent-cyan/15 text-accent-cyan font-semibold'
                              : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                            }
                          `}
                        >
                          • {creator.stage_name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Agency Modal */}
      <Modal
        isOpen={isAgencyModalOpen}
        onClose={() => setIsAgencyModalOpen(false)}
        title="Add Agency"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAgencyModalOpen(false)} size="sm">Cancel</Button>
            <Button onClick={handleAddAgency} size="sm">Add</Button>
          </>
        }
      >
        <div className="space-y-md">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-sm">Agency Name</label>
            <input
              type="text"
              value={agencyFormData.name}
              onChange={(e) => setAgencyFormData({ ...agencyFormData, name: e.target.value })}
              placeholder="e.g., Elite Talent Agency"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-sm">Notes</label>
            <textarea
              value={agencyFormData.notes}
              onChange={(e) => setAgencyFormData({ ...agencyFormData, notes: e.target.value })}
              placeholder="Optional notes about this agency"
              rows="2"
              className="w-full resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Add Creator Modal */}
      <Modal
        isOpen={isCreatorModalOpen}
        onClose={() => setIsCreatorModalOpen(false)}
        title="Add Creator"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreatorModalOpen(false)} size="sm">Cancel</Button>
            <Button onClick={handleAddCreator} size="sm">Add</Button>
          </>
        }
      >
        <div className="space-y-md">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-sm">Agency</label>
            <select
              value={creatorFormData.agencyId}
              onChange={(e) => setCreatorFormData({ ...creatorFormData, agencyId: e.target.value })}
              className="w-full"
            >
              <option value="">Select an agency</option>
              {agencies.map(agency => (
                <option key={agency.id} value={agency.id}>{agency.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-sm">Stage Name</label>
            <input
              type="text"
              value={creatorFormData.stageName}
              onChange={(e) => setCreatorFormData({ ...creatorFormData, stageName: e.target.value })}
              placeholder="Creator's stage name"
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-3 gap-sm">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-xs">Daily Goal</label>
              <input
                type="number"
                value={creatorFormData.dailyGoal}
                onChange={(e) => setCreatorFormData({ ...creatorFormData, dailyGoal: e.target.value })}
                placeholder="0"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-xs">Weekly Goal</label>
              <input
                type="number"
                value={creatorFormData.weeklyGoal}
                onChange={(e) => setCreatorFormData({ ...creatorFormData, weeklyGoal: e.target.value })}
                placeholder="0"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-xs">Monthly Goal</label>
              <input
                type="number"
                value={creatorFormData.monthlyGoal}
                onChange={(e) => setCreatorFormData({ ...creatorFormData, monthlyGoal: e.target.value })}
                placeholder="0"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AgencyCreatorDirectory;
