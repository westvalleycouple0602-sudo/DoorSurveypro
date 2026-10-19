interface RecentProject {
  id: string;
  name: string;
  viewedAt: number;
}

const STORAGE_KEY = 'recentProjects';
const MAX_RECENT = 5;

export function useRecentProjects() {
  function addRecentProject(projectId: string, projectName: string) {
    try {
      const recent = getRecentProjects();
      const updated = [
        { id: projectId, name: projectName, viewedAt: Date.now() },
        ...recent.filter((p) => p.id !== projectId)
      ].slice(0, MAX_RECENT);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recent project:', error);
    }
  }
  
  function getRecentProjects(): RecentProject[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to load recent projects:', error);
      return [];
    }
  }
  
  function clearRecentProjects() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear recent projects:', error);
    }
  }
  
  return { addRecentProject, getRecentProjects, clearRecentProjects };
}
