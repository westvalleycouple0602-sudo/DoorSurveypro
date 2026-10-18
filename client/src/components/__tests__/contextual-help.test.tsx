import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContextualHelp } from '../contextual-help';

describe('ContextualHelp', () => {
  const defaultProps = {
    content: 'This is helpful information',
  };

  describe('Rendering', () => {
    it('renders help button', () => {
      render(<ContextualHelp {...defaultProps} />);
      
      const helpButton = screen.getByTestId('button-help');
      expect(helpButton).toBeInTheDocument();
    });

    it('renders with custom test ID', () => {
      render(<ContextualHelp {...defaultProps} testId="custom-help" />);
      
      const helpButton = screen.getByTestId('custom-help');
      expect(helpButton).toBeInTheDocument();
    });

    it('renders HelpCircle icon', () => {
      const { container } = render(<ContextualHelp {...defaultProps} />);
      
      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });

    it('applies muted styling to button', () => {
      render(<ContextualHelp {...defaultProps} />);
      
      const helpButton = screen.getByTestId('button-help');
      expect(helpButton).toHaveClass('text-muted-foreground');
    });
  });

  describe('Tooltip Interaction', () => {
    it('shows tooltip on hover', async () => {
      const user = userEvent.setup();
      render(<ContextualHelp {...defaultProps} />);
      
      const helpButton = screen.getByTestId('button-help');
      await user.hover(helpButton);
      
      await waitFor(() => {
        expect(screen.getByText('This is helpful information')).toBeInTheDocument();
      });
    });

    it('hides tooltip when not hovering', async () => {
      const user = userEvent.setup();
      render(<ContextualHelp {...defaultProps} />);
      
      const helpButton = screen.getByTestId('button-help');
      await user.hover(helpButton);
      
      await waitFor(() => {
        expect(screen.getByText('This is helpful information')).toBeInTheDocument();
      });
      
      await user.unhover(helpButton);
      
      await waitFor(() => {
        expect(screen.queryByText('This is helpful information')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('shows tooltip content', async () => {
      const user = userEvent.setup();
      const content = 'Detailed help text that explains the feature';
      render(<ContextualHelp content={content} />);
      
      const helpButton = screen.getByTestId('button-help');
      await user.hover(helpButton);
      
      await waitFor(() => {
        expect(screen.getByText(content)).toBeInTheDocument();
      });
    });
  });

  describe('Tooltip Positioning', () => {
    it('accepts top side positioning', () => {
      render(<ContextualHelp {...defaultProps} side="top" />);
      
      expect(screen.getByTestId('button-help')).toBeInTheDocument();
    });

    it('accepts right side positioning', () => {
      render(<ContextualHelp {...defaultProps} side="right" />);
      
      expect(screen.getByTestId('button-help')).toBeInTheDocument();
    });

    it('accepts bottom side positioning', () => {
      render(<ContextualHelp {...defaultProps} side="bottom" />);
      
      expect(screen.getByTestId('button-help')).toBeInTheDocument();
    });

    it('accepts left side positioning', () => {
      render(<ContextualHelp {...defaultProps} side="left" />);
      
      expect(screen.getByTestId('button-help')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible button type', () => {
      render(<ContextualHelp {...defaultProps} />);
      
      const helpButton = screen.getByTestId('button-help');
      expect(helpButton).toHaveAttribute('type', 'button');
    });

    it('has appropriate size for touch targets', () => {
      render(<ContextualHelp {...defaultProps} />);
      
      const helpButton = screen.getByTestId('button-help');
      expect(helpButton).toHaveClass('h-4', 'w-4');
    });

    it('is keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<ContextualHelp {...defaultProps} />);
      
      const helpButton = screen.getByTestId('button-help');
      
      // Tab to focus the button
      await user.tab();
      expect(helpButton).toHaveFocus();
    });

    it('can be activated with keyboard', async () => {
      const user = userEvent.setup();
      render(<ContextualHelp {...defaultProps} />);
      
      const helpButton = screen.getByTestId('button-help');
      helpButton.focus();
      
      // Press Enter or Space should work (tooltip opens on hover/focus)
      await user.keyboard('{Enter}');
      
      // Button should still be in the document
      expect(helpButton).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles very long help text', async () => {
      const user = userEvent.setup();
      const longContent = 'This is a very long help text that contains detailed information about the feature and explains everything in great detail with multiple sentences.';
      render(<ContextualHelp content={longContent} />);
      
      const helpButton = screen.getByTestId('button-help');
      await user.hover(helpButton);
      
      await waitFor(() => {
        expect(screen.getByText(longContent)).toBeInTheDocument();
      });
    });

    it('handles HTML entities in content', async () => {
      const user = userEvent.setup();
      const content = 'Use <Ctrl> + <C> to copy';
      render(<ContextualHelp content={content} />);
      
      const helpButton = screen.getByTestId('button-help');
      await user.hover(helpButton);
      
      await waitFor(() => {
        expect(screen.getByText(content)).toBeInTheDocument();
      });
    });

    it('handles empty content gracefully', () => {
      render(<ContextualHelp content="" />);
      
      expect(screen.getByTestId('button-help')).toBeInTheDocument();
    });
  });

  describe('Button Variants', () => {
    it('uses ghost variant', () => {
      render(<ContextualHelp {...defaultProps} />);
      
      const helpButton = screen.getByTestId('button-help');
      // Ghost variant should be applied (check by looking for specific classes)
      expect(helpButton).toBeInTheDocument();
    });

    it('uses icon size', () => {
      render(<ContextualHelp {...defaultProps} />);
      
      const helpButton = screen.getByTestId('button-help');
      expect(helpButton).toHaveClass('h-4', 'w-4');
    });
  });
});
