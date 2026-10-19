import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FormWizard, type WizardStep } from '../form-wizard';

describe('FormWizard', () => {
  const mockSteps: WizardStep[] = [
    {
      id: 'step-1',
      title: 'Personal Info',
      description: 'Enter your personal details',
      content: <div data-testid="step-1-content">Step 1 Content</div>,
    },
    {
      id: 'step-2',
      title: 'Address',
      description: 'Enter your address',
      content: <div data-testid="step-2-content">Step 2 Content</div>,
    },
    {
      id: 'step-3',
      title: 'Review',
      description: 'Review your information',
      content: <div data-testid="step-3-content">Step 3 Content</div>,
    },
  ];

  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with basic props', () => {
      render(<FormWizard steps={mockSteps} onComplete={mockOnComplete} />);
      
      expect(screen.getAllByText('Personal Info')).toHaveLength(2); // Step indicator and current panel title
      expect(screen.getByTestId('step-1-content')).toBeInTheDocument();
    });

    it('renders optional title and description', () => {
      render(
        <FormWizard
          steps={mockSteps}
          onComplete={mockOnComplete}
          title="Setup Wizard"
          description="Complete all steps to finish setup"
        />
      );
      
      expect(screen.getByText('Setup Wizard')).toBeInTheDocument();
      expect(screen.getByText('Complete all steps to finish setup')).toBeInTheDocument();
    });

    it('shows progress indicator with correct percentage', () => {
      render(<FormWizard steps={mockSteps} onComplete={mockOnComplete} />);
      
      const progress = screen.getByTestId('wizard-progress');
      expect(progress).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
      expect(screen.getByText('33% complete')).toBeInTheDocument();
    });

    it('renders all step titles', () => {
      render(<FormWizard steps={mockSteps} onComplete={mockOnComplete} />);
      
      expect(screen.getAllByText('Personal Info')).toHaveLength(2); // Step indicator and current panel title
      expect(screen.getByText('Address')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
    });

    it('shows current step description', () => {
      render(<FormWizard steps={mockSteps} onComplete={mockOnComplete} />);
      
      expect(screen.getByText('Enter your personal details')).toBeInTheDocument();
    });

    it('renders step content', () => {
      render(<FormWizard steps={mockSteps} onComplete={mockOnComplete} />);
      
      expect(screen.getByTestId('step-1-content')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('navigates to next step when Next is clicked', async () => {
      render(<FormWizard steps={mockSteps} onComplete={mockOnComplete} />);
      
      const nextButton = screen.getByTestId('wizard-button-next');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('step-2-content')).toBeInTheDocument();
        expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
      });
    });

    it('navigates to previous step when Previous is clicked', async () => {
      render(<FormWizard steps={mockSteps} onComplete={mockOnComplete} />);
      
      // Go to step 2 first
      const nextButton = screen.getByTestId('wizard-button-next');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('step-2-content')).toBeInTheDocument();
      });
      
      // Then go back
      const previousButton = screen.getByTestId('wizard-button-previous');
      fireEvent.click(previousButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('step-1-content')).toBeInTheDocument();
      });
    });

    it('disables Previous button on first step', () => {
      render(<FormWizard steps={mockSteps} onComplete={mockOnComplete} />);
      
      const previousButton = screen.getByTestId('wizard-button-previous');
      expect(previousButton).toBeDisabled();
    });

    it('enables Previous button on non-first steps', async () => {
      render(<FormWizard steps={mockSteps} onComplete={mockOnComplete} />);
      
      const nextButton = screen.getByTestId('wizard-button-next');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        const previousButton = screen.getByTestId('wizard-button-previous');
        expect(previousButton).not.toBeDisabled();
      });
    });

    it('allows clicking on previous steps', async () => {
      render(<FormWizard steps={mockSteps} onComplete={mockOnComplete} />);
      
      // Navigate to step 3
      const nextButton = screen.getByTestId('wizard-button-next');
      fireEvent.click(nextButton);
      await waitFor(() => expect(screen.getByTestId('step-2-content')).toBeInTheDocument());
      
      fireEvent.click(nextButton);
      await waitFor(() => expect(screen.getByTestId('step-3-content')).toBeInTheDocument());
      
      // Click on step 1 indicator
      const step1Button = screen.getByTestId('wizard-step-0');
      fireEvent.click(step1Button);
      
      await waitFor(() => {
        expect(screen.getByTestId('step-1-content')).toBeInTheDocument();
      });
    });

    it('prevents clicking on future steps', () => {
      render(<FormWizard steps={mockSteps} onComplete={mockOnComplete} />);
      
      const step3Button = screen.getByTestId('wizard-step-2');
      fireEvent.click(step3Button);
      
      // Should still be on step 1
      expect(screen.getByTestId('step-1-content')).toBeInTheDocument();
    });
  });

  describe('Completion', () => {
    it('shows Complete button on last step', async () => {
      render(<FormWizard steps={mockSteps} onComplete={mockOnComplete} />);
      
      // Navigate to last step
      const nextButton = screen.getByTestId('wizard-button-next');
      fireEvent.click(nextButton);
      await waitFor(() => expect(screen.getByTestId('step-2-content')).toBeInTheDocument());
      
      fireEvent.click(nextButton);
      await waitFor(() => {
        expect(screen.getByTestId('step-3-content')).toBeInTheDocument();
        expect(screen.getByText('Complete')).toBeInTheDocument();
      });
    });

    it('calls onComplete when Complete button is clicked', async () => {
      render(<FormWizard steps={mockSteps} onComplete={mockOnComplete} />);
      
      // Navigate to last step
      const nextButton = screen.getByTestId('wizard-button-next');
      fireEvent.click(nextButton);
      await waitFor(() => expect(screen.getByTestId('step-2-content')).toBeInTheDocument());
      
      fireEvent.click(nextButton);
      await waitFor(() => expect(screen.getByTestId('step-3-content')).toBeInTheDocument());
      
      // Click Complete
      const completeButton = screen.getByTestId('wizard-button-next');
      fireEvent.click(completeButton);
      
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
      });
    });

    it('shows submitting state when isSubmitting is true', () => {
      render(<FormWizard steps={mockSteps} onComplete={mockOnComplete} isSubmitting={true} />);
      
      expect(screen.getByText('Submitting...')).toBeInTheDocument();
      
      const previousButton = screen.getByTestId('wizard-button-previous');
      const nextButton = screen.getByTestId('wizard-button-next');
      
      expect(previousButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
    });
  });

  describe('Validation', () => {
    it('validates step before proceeding', async () => {
      const validateFn = jest.fn().mockResolvedValue(false);
      const stepsWithValidation: WizardStep[] = [
        {
          id: 'step-1',
          title: 'Step 1',
          content: <div>Content 1</div>,
          validate: validateFn,
        },
        {
          id: 'step-2',
          title: 'Step 2',
          content: <div>Content 2</div>,
        },
      ];
      
      render(<FormWizard steps={stepsWithValidation} onComplete={mockOnComplete} />);
      
      const nextButton = screen.getByTestId('wizard-button-next');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(validateFn).toHaveBeenCalled();
      });
      
      // Should still be on step 1 because validation failed
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('proceeds when validation passes', async () => {
      const validateFn = jest.fn().mockResolvedValue(true);
      const stepsWithValidation: WizardStep[] = [
        {
          id: 'step-1',
          title: 'Step 1',
          content: <div data-testid="content-1">Content 1</div>,
          validate: validateFn,
        },
        {
          id: 'step-2',
          title: 'Step 2',
          content: <div data-testid="content-2">Content 2</div>,
        },
      ];
      
      render(<FormWizard steps={stepsWithValidation} onComplete={mockOnComplete} />);
      
      const nextButton = screen.getByTestId('wizard-button-next');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(validateFn).toHaveBeenCalled();
        expect(screen.getByTestId('content-2')).toBeInTheDocument();
      });
    });

    it('handles synchronous validation', async () => {
      const validateFn = jest.fn().mockReturnValue(true);
      const stepsWithValidation: WizardStep[] = [
        {
          id: 'step-1',
          title: 'Step 1',
          content: <div data-testid="content-1">Content 1</div>,
          validate: validateFn,
        },
        {
          id: 'step-2',
          title: 'Step 2',
          content: <div data-testid="content-2">Content 2</div>,
        },
      ];
      
      render(<FormWizard steps={stepsWithValidation} onComplete={mockOnComplete} />);
      
      const nextButton = screen.getByTestId('wizard-button-next');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(validateFn).toHaveBeenCalled();
        expect(screen.getByTestId('content-2')).toBeInTheDocument();
      });
    });
  });

  describe('Progress Tracking', () => {
    it('tracks completed steps', async () => {
      render(<FormWizard steps={mockSteps} onComplete={mockOnComplete} />);
      
      expect(screen.getByText('0 of 3 steps completed')).toBeInTheDocument();
      
      const nextButton = screen.getByTestId('wizard-button-next');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByText('1 of 3 steps completed')).toBeInTheDocument();
      });
    });

    it('shows checkmark on completed steps', async () => {
      render(<FormWizard steps={mockSteps} onComplete={mockOnComplete} />);
      
      const nextButton = screen.getByTestId('wizard-button-next');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        const step1Button = screen.getByTestId('wizard-step-0');
        expect(step1Button).toHaveClass('bg-muted');
      });
    });

    it('highlights current step', () => {
      render(<FormWizard steps={mockSteps} onComplete={mockOnComplete} />);
      
      const currentStepButton = screen.getByTestId('wizard-step-0');
      expect(currentStepButton).toHaveClass('bg-primary/10');
    });
  });

  describe('Edge Cases', () => {
    it('handles single step wizard', () => {
      const singleStep: WizardStep[] = [
        {
          id: 'only-step',
          title: 'Only Step',
          content: <div>Only content</div>,
        },
      ];
      
      render(<FormWizard steps={singleStep} onComplete={mockOnComplete} />);
      
      expect(screen.getAllByText('Only Step')).toHaveLength(2);
      expect(screen.getByText('Complete')).toBeInTheDocument();
      expect(screen.getByTestId('wizard-button-previous')).toBeDisabled();
    });

    it('renders step with icon', () => {
      const stepsWithIcon: WizardStep[] = [
        {
          id: 'step-1',
          title: 'Step with Icon',
          content: <div>Content</div>,
          icon: <div data-testid="step-icon">📝</div>,
        },
      ];
      
      render(<FormWizard steps={stepsWithIcon} onComplete={mockOnComplete} />);
      
      expect(screen.getByTestId('step-icon')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides test ids for all interactive elements', () => {
      render(<FormWizard steps={mockSteps} onComplete={mockOnComplete} />);
      
      expect(screen.getByTestId('wizard-progress')).toBeInTheDocument();
      expect(screen.getByTestId('wizard-step-0')).toBeInTheDocument();
      expect(screen.getByTestId('wizard-step-1')).toBeInTheDocument();
      expect(screen.getByTestId('wizard-step-2')).toBeInTheDocument();
      expect(screen.getByTestId('wizard-button-previous')).toBeInTheDocument();
      expect(screen.getByTestId('wizard-button-next')).toBeInTheDocument();
    });
  });
});
