import { render, screen } from '@testing-library/react';
import { MetricCard } from '../metric-card';
import { Users, TrendingUp, TrendingDown } from 'lucide-react';

describe('MetricCard', () => {
  const defaultProps = {
    title: 'Active Users',
    value: 1234,
    icon: Users,
  };

  describe('Rendering', () => {
    it('renders with basic props', () => {
      render(<MetricCard {...defaultProps} />);
      
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('1234')).toBeInTheDocument();
    });

    it('renders with custom test ID', () => {
      render(<MetricCard {...defaultProps} testId="custom-metric" />);
      
      expect(screen.getByTestId('custom-metric')).toBeInTheDocument();
    });

    it('renders icon when provided', () => {
      const { container } = render(<MetricCard {...defaultProps} />);
      
      // Check that an svg element exists (icon)
      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });

    it('renders without icon when not provided', () => {
      const { container } = render(
        <MetricCard title="Metric" value={100} icon={undefined} />
      );
      
      expect(screen.getByText('Metric')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('renders with subtitle', () => {
      render(
        <MetricCard {...defaultProps} subtitle="Total number of active users" />
      );
      
      expect(screen.getByText('Total number of active users')).toBeInTheDocument();
    });

    it('renders string values', () => {
      render(<MetricCard {...defaultProps} value="1,234" />);
      
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });

    it('renders numeric values', () => {
      render(<MetricCard {...defaultProps} value={5678} />);
      
      expect(screen.getByText('5678')).toBeInTheDocument();
    });
  });

  describe('Trend Indicator', () => {
    it('renders positive trend', () => {
      render(
        <MetricCard
          {...defaultProps}
          trend={{ value: 12.5, label: 'from last week', positive: true }}
        />
      );
      
      expect(screen.getByText('+12.5%')).toBeInTheDocument();
    });

    it('renders negative trend', () => {
      render(
        <MetricCard
          {...defaultProps}
          trend={{ value: 8.3, label: 'from last week', positive: false }}
        />
      );
      
      expect(screen.getByText('-8.3%')).toBeInTheDocument();
    });

    it('applies correct styling to positive trend', () => {
      render(
        <MetricCard
          {...defaultProps}
          trend={{ value: 10, label: 'from last week', positive: true }}
          testId="metric-with-trend"
        />
      );
      
      const trendElement = screen.getByTestId('metric-with-trend-trend');
      expect(trendElement).toHaveClass('text-green-600');
    });

    it('applies correct styling to negative trend', () => {
      render(
        <MetricCard
          {...defaultProps}
          trend={{ value: 10, label: 'from last week', positive: false }}
          testId="metric-with-trend"
        />
      );
      
      const trendElement = screen.getByTestId('metric-with-trend-trend');
      expect(trendElement).toHaveClass('text-red-600');
    });

    it('renders trend without subtitle', () => {
      render(
        <MetricCard
          {...defaultProps}
          trend={{ value: 5.0, label: 'change', positive: true }}
        />
      );
      
      expect(screen.getByText('+5.0%')).toBeInTheDocument();
    });

    it('renders trend with subtitle', () => {
      render(
        <MetricCard
          {...defaultProps}
          trend={{ value: 5.0, label: 'from last month', positive: true }}
          subtitle="Monthly growth"
        />
      );
      
      expect(screen.getByText('+5.0%')).toBeInTheDocument();
      expect(screen.getByText('Monthly growth')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows skeleton when isLoading is true', () => {
      render(<MetricCard {...defaultProps} isLoading={true} />);
      
      // The skeleton should be rendered
      const skeletons = screen.getAllByTestId(/^skeleton-/);
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('hides content when loading', () => {
      render(<MetricCard {...defaultProps} isLoading={true} />);
      
      // Content should not be visible
      expect(screen.queryByText('Active Users')).not.toBeInTheDocument();
      expect(screen.queryByText('1234')).not.toBeInTheDocument();
    });

    it('shows content when not loading', () => {
      render(<MetricCard {...defaultProps} isLoading={false} />);
      
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('1234')).toBeInTheDocument();
    });
  });

  describe('Icon Color', () => {
    it('applies custom icon color', () => {
      const { container } = render(
        <MetricCard {...defaultProps} iconColor="text-chart-2" />
      );
      
      // Check that the color class is applied to the icon container
      const iconContainer = container.querySelector('.text-chart-2');
      expect(iconContainer).toBeInTheDocument();
    });

    it('uses default chart-1 color when no color specified', () => {
      const { container } = render(<MetricCard {...defaultProps} />);
      
      const iconContainer = container.querySelector('.text-chart-1');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides test ID for value element', () => {
      render(<MetricCard {...defaultProps} testId="user-count" />);
      
      expect(screen.getByTestId('user-count')).toBeInTheDocument();
    });

    it('provides test ID for trend element when trend exists', () => {
      render(
        <MetricCard
          {...defaultProps}
          testId="user-count"
          trend={{ value: 10, label: 'change', positive: true }}
        />
      );
      
      expect(screen.getByTestId('user-count-trend')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero value', () => {
      render(<MetricCard {...defaultProps} value={0} />);
      
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles large numbers', () => {
      render(<MetricCard {...defaultProps} value={999999} />);
      
      expect(screen.getByText('999999')).toBeInTheDocument();
    });

    it('handles decimal trend values', () => {
      render(
        <MetricCard
          {...defaultProps}
          trend={{ value: 3.14159, label: 'change', positive: true }}
        />
      );
      
      expect(screen.getByText('+3.14159%')).toBeInTheDocument();
    });

    it('handles negative numeric values', () => {
      render(<MetricCard {...defaultProps} value={-50} />);
      
      expect(screen.getByText('-50')).toBeInTheDocument();
    });

    it('handles empty string value', () => {
      render(<MetricCard {...defaultProps} value="" />);
      
      // Should still render the component
      expect(screen.getByText('Active Users')).toBeInTheDocument();
    });
  });

  describe('Card Interaction', () => {
    it('applies hover elevation classes', () => {
      const { container } = render(<MetricCard {...defaultProps} />);
      
      const card = container.querySelector('.hover-elevate');
      expect(card).toBeInTheDocument();
    });
  });
});
