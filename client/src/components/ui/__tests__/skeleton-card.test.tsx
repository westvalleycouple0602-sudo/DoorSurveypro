import { render, screen } from '@testing-library/react';
import { SkeletonCard, SkeletonTable } from '../skeleton-card';

describe('SkeletonCard', () => {
  describe('Rendering', () => {
    it('renders skeleton card', () => {
      const { container } = render(<SkeletonCard />);
      
      const card = container.querySelector('.border.bg-card');
      expect(card).toBeInTheDocument();
    });

    it('renders header skeleton', () => {
      const { container } = render(<SkeletonCard />);
      
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders default number of content lines (3)', () => {
      const { container } = render(<SkeletonCard />);
      
      // Header (1) + content lines (3) = 4 skeleton elements
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBe(4);
    });

    it('renders custom number of content lines', () => {
      const { container } = render(<SkeletonCard contentLines={5} />);
      
      // Header (1) + content lines (5) = 6 skeleton elements
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBe(6);
    });

    it('renders with zero lines', () => {
      const { container } = render(<SkeletonCard contentLines={0} showHeader={true} />);
      
      // Only header skeleton
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBe(1);
    });

    it('renders with many lines', () => {
      const { container } = render(<SkeletonCard contentLines={10} />);
      
      // Header (1) + content lines (10) = 11 skeleton elements
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBe(11);
    });
  });

  describe('Styling', () => {
    it('has proper spacing', () => {
      const { container } = render(<SkeletonCard />);
      
      const content = container.querySelector('.space-y-3');
      expect(content).toBeInTheDocument();
    });

    it('has card border and background', () => {
      const { container } = render(<SkeletonCard />);
      
      const card = container.querySelector('.border.bg-card');
      expect(card).toBeInTheDocument();
    });

    it('has proper padding', () => {
      const { container } = render(<SkeletonCard />);
      
      const card = container.querySelector('.p-6');
      expect(card).toBeInTheDocument();
    });
  });
});

describe('SkeletonTable', () => {
  describe('Rendering', () => {
    it('renders skeleton table', () => {
      const { container } = render(<SkeletonTable />);
      
      const table = container.querySelector('.space-y-3');
      expect(table).toBeInTheDocument();
    });

    it('renders default number of rows (5)', () => {
      const { container } = render(<SkeletonTable />);
      
      // Count table rows
      const rows = container.querySelectorAll('.flex.gap-4.items-center');
      expect(rows.length).toBe(5);
    });

    it('has fixed 4 columns', () => {
      const { container } = render(<SkeletonTable />);
      
      // Count cells in first row (header row)
      const firstRow = container.querySelector('.border-b');
      const cells = firstRow?.querySelectorAll('.animate-pulse');
      expect(cells?.length).toBe(4);
    });

    it('renders custom number of rows', () => {
      const { container } = render(<SkeletonTable rows={8} />);
      
      // Count non-header rows
      const rows = container.querySelectorAll('.flex.gap-4.items-center');
      expect(rows.length).toBe(8);
    });
  });

  describe('Styling', () => {
    it('has table structure', () => {
      const { container} = render(<SkeletonTable />);
      
      const wrapper = container.querySelector('.space-y-3');
      expect(wrapper).toBeInTheDocument();
    });

    it('has proper spacing', () => {
      const { container } = render(<SkeletonTable />);
      
      const gaps = container.querySelectorAll('.gap-4');
      expect(gaps.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles single row', () => {
      const { container } = render(<SkeletonTable rows={1} />);
      
      const rows = container.querySelectorAll('.flex.gap-4.items-center');
      expect(rows.length).toBe(1);
    });

    it('handles many rows', () => {
      const { container } = render(<SkeletonTable rows={20} />);
      
      const rows = container.querySelectorAll('.flex.gap-4.items-center');
      expect(rows.length).toBe(20);
    });
  });

  describe('Animation', () => {
    it('has pulse animation on all skeletons', () => {
      const { container } = render(<SkeletonTable rows={2} />);
      
      const animatedElements = container.querySelectorAll('.animate-pulse');
      // Header row (4 cells) + 2 data rows (4 cells each) = 12 total
      expect(animatedElements.length).toBe(12);
    });
  });
});
