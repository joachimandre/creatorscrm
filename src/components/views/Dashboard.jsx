import { useState, useEffect } from 'react';
import { useStore } from '../../store.js';
import { Star, ChevronRight } from 'lucide-react';
import Card from '../Card';
import BookmarkedTasks from '../panels/BookmarkedTasks';
import AgencyCreatorDirectory from '../panels/AgencyCreatorDirectory';
import CreatorWorkspace from '../panels/CreatorWorkspace';
import * as db from '../../db/index.js';

const Dashboard = () => {
  const [bookmarkedTasks, setBookmarkedTasks] = useState([]);
  const agencies = useStore(state => state.agencies);
  const selectedCreatorId = useStore(state => state.selectedCreatorId);
  const selectedCreator = useStore(state => state.getSelectedCreator());

  useEffect(() => {
    const tasks = db.getBookmarkedTasks();
    setBookmarkedTasks(tasks);
  }, []);

  return (
    <div className="p-lg bg-surface-0 h-full overflow-auto">
      <h1 className="text-3xl font-bold text-text-primary mb-lg">Dashboard</h1>

      {/* Top panels grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg mb-xl">
        {/* Bookmarked Tasks */}
        <BookmarkedTasks />

        {/* Agency/Creator Directory */}
        <AgencyCreatorDirectory />
      </div>

      {/* Creator Workspace */}
      {selectedCreatorId ? (
        <CreatorWorkspace creator={selectedCreator} />
      ) : (
        <Card className="text-center py-xl">
          <p className="text-text-secondary text-base">Select a creator from the directory above to view their workspace</p>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
